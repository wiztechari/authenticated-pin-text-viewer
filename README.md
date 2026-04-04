# GitHub PIN Lookup React App - Local JSON Version

This version does not call any external API.

It fetches JSON files from inside the same React app using files like:
- public/mock-api/123456.json
- public/mock-api/654321.json

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Important

Before deploying to GitHub Pages, update `vite.config.js`:

```js
base: '/your-repo-name/'
```

Replace `your-repo-name` with your actual repository name.

## How it works

For PIN `123456`, the app fetches:

```text
/your-repo-name/mock-api/123456.json
```

For PIN `654321`, the app fetches:

```text
/your-repo-name/mock-api/654321.json
```

If the file does not exist, the app shows a not found message.
