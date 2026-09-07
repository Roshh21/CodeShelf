# CodeShelf GitHub API backend

CodeShelf now keeps GitHub authentication on the server.

## Local development

1. Create a GitHub personal access token with the minimum permissions needed for public repository reading.
2. Copy `.env.example` to `.env`.
3. Put the token in `GITHUB_TOKEN`.
4. Run:

```bash
npm install
npm run server
```

In another terminal:

```bash
npm run dev
```

The API runs on `http://localhost:8787`.

## API-call strategy

Repository opening uses:
- 1 request for repository metadata
- 1 recursive tree request

It does NOT request every directory separately.

File content is fetched only when needed and cached for one hour.
Repository payloads are cached for 30 minutes.
Identical concurrent repository requests are deduplicated so they share one in-flight GitHub request.

The token is server-side only. Never put `GITHUB_TOKEN` in a `VITE_*` variable or frontend source.

## Production

Deploy the frontend and backend separately, or adapt the Express handlers to your hosting provider's serverless function format. Set `GITHUB_TOKEN` as a server-side secret and set `VITE_API_URL` to the backend URL if they are deployed separately.
