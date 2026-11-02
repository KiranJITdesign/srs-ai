// Vercel serverless function: streams Claude's answer back as plain text.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const code = process.env.ACCESS_CODE;
  if (code && req.headers["x-access-code"] !== code) return res.status(401).end();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set" });
  const prompt = req.body && req.body.prompt;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 80000) return res.status(400).end();
  const up = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5", max_tokens: 12000, stream: true, messages: [{ role: "user", content: prompt }] }),
  });
  if (!up.ok) return res.status(up.status === 429 ? 429 : 502).end();
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  const dec = new TextDecoder();
  let buf = "";
  for await (const chunk of up.body) {
    buf += dec.decode(chunk, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      try {
        const e = JSON.parse(l.slice(5));
        if (e.type === "content_block_delta" && e.delta.type === "text_delta") res.write(e.delta.text);
        else if (e.type === "message_delta" && e.delta.stop_reason === "max_tokens") res.write("\u0001CUT");
      } catch (_) {}
    }
  }
  res.end();
};
