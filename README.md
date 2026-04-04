# GitHub PIN Lookup React App

A basic React app that allows the user to enter a 6-digit PIN. As soon as the PIN reaches 6 digits, the app automatically calls an API and displays the response.

## Features
- 6-digit numeric PIN input
- Auto API call when PIN is complete
- Loading, success, and error states
- API response viewer
- Ready for GitHub Pages deployment

## Setup

1. Install dependencies:
   npm install

2. Start local development:
   npm run dev

3. Build for production:
   npm run build

## Update API settings
Edit `src/App.jsx`:
- `API_URL`
- `REQUEST_METHOD`
- request payload format

## GitHub Pages Deployment
- Push the repo to GitHub
- Go to **Settings → Pages**
- Set **Source** to **GitHub Actions**
- Push to `main`
- The workflow will build and deploy automatically

## Important
Your API must allow CORS from your GitHub Pages domain.
