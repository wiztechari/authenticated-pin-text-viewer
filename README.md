# GitHub PIN Lookup React App (Local JSON)

This React + Vite app reads mock JSON files from `public/mock-api/` inside the same project.

## How it works
- Enter a 6-digit PIN
- The app fetches `/mock-api/<PIN>.json` from the same site
- No external API is called

## Sample files
- `public/mock-api/123456.json`
- `public/mock-api/654321.json`

## Run
```bash
npm install
npm run dev
```

## Deploy
Update `vite.config.js` with your real repo name before deploying to GitHub Pages.
