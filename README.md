# CodeShelf

CodeShelf is a React/Vite/TypeScript SPA that turns GitHub repositories, directories, and files into a focused technical reading experience.

## Run

```bash
npm install
npm run dev:full
```

Build for production:

```bash
npm run build
npm run preview
```

## MVP

- Public GitHub repository / directory / file URL detection
- Server-side authenticated GitHub API access with private `GITHUB_TOKEN`
- Repository tree and file-content caching with in-flight request deduplication
- Markdown + GFM rendering with safe presentation-layer code highlighting
- Previous / next navigation
- Structured Read Entire Section mode
- Repository-wide client-side search
- Breadcrumbs and GitHub source links
- Light / dark / system themes persisted in localStorage
- Responsive sidebar drawer and mobile reading layout
- Local recent repository history (no database, repository contents are never stored in localStorage)
- Home and History routes

## GitHub API architecture

All GitHub requests go through `server/index.ts`. The token is never included in frontend code. Repository loading uses repository metadata plus one recursive tree request, with server-side caching and in-flight request deduplication. File contents are lazy-loaded and cached.

The frontend calls:

- `/api/health`
- `/api/rate-limit`
- `/api/repository`
- `/api/file`

Vite proxies `/api` to the local server during development. `vercel.json` provides the SPA fallback needed for client-side routes such as `/history` and `/read` when deployed as a Vercel frontend.
