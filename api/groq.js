// Vercel serverless function: streams Groq's answer back as plain text.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const code = process.env.ACCESS_CODE;
  if (code && req.headers["x-access-code"] !== code) return res.status(401).end();
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: "GROQ_API_KEY is not set" });
  const prompt = req.body && req.body.prompt;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 80000) return res.status(400).end();

  let upstream;
  try {
    upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        max_tokens: 12000,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return res.status(502).json({ error: "Could not connect to Groq. Please try again." });
  }

  if (!upstream.ok) {
    if (upstream.status === 429) return res.status(429).json({ error: "Groq rate limit reached. Wait a moment and retry." });
    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(502).json({ error: "Groq rejected the API key. Check the GROQ_API_KEY environment variable." });
    }
    return res.status(502).json({ error: `Groq request failed (${upstream.status}). Check the GROQ_MODEL setting and try again.` });
  }

  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  const dec = new TextDecoder();
  let buf = "";
  for await (const chunk of upstream.body) {
    buf += dec.decode(chunk, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const event = JSON.parse(data);
      const choice = event.choices && event.choices[0];
      if (choice && choice.delta && typeof choice.delta.content === "string") res.write(choice.delta.content);
      if (choice && choice.finish_reason === "length") res.write("\u0001CUT");
    }
  }
  res.end();
};
