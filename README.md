# srs-ai (SpecSmith)

Turns raw company documents (emails, notes, SOPs, RFPs) into a traceable IEEE 29148 style Software Requirements Specification, in five steps: Intake, Ore, Draft, Audit, Ship.

## Deploy (GitHub + Vercel)
1. Push this folder to https://github.com/KiranJITdesign/srs-ai
2. On vercel.com choose Add New > Project, import the repo, then open Environment Variables.
3. Add `ANTHROPIC_API_KEY` (from console.anthropic.com). Optional: `ACCESS_CODE` (visitors must enter it, protects your key from strangers) and `CLAUDE_MODEL`.
4. Deploy. The API key stays on the server and never appears in the page or the repo.

## Run locally
`npx vercel dev` (set the same variables in a `.env` file, which is git-ignored).

## Notes
- Files: `index.html` (the app), `api/claude.js` (server proxy that streams Claude's reply).
- GitHub Pages alone cannot run the AI, it has no server. Use Vercel (or Netlify with a similar function).
- Long drafts: if a request times out, choose Quick depth or fewer documents.
