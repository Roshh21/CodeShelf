import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { LRUCache } from 'lru-cache'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const PORT = Number(process.env.PORT || 8787)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

if (!GITHUB_TOKEN) {
  console.warn('GITHUB_TOKEN is not set. GitHub API calls will be unauthenticated and limited.')
}

type GitHubRepo = {
  owner: string
  name: string
  default_branch: string
  html_url: string
  description: string | null
}

type TreeEntry = {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
  url: string
}

type RepositoryPayload = {
  repo: GitHubRepo
  tree: TreeEntry[]
  source: 'github'
}

const cache = new LRUCache<string, RepositoryPayload>({
  max: 100,
  ttl: 1000 * 60 * 30,
})

const inflight = new Map<string, Promise<RepositoryPayload>>()

const IGNORED_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', '__pycache__',
  '.venv', 'venv', 'target', 'vendor'
])

const IGNORED_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'])
const MAX_FILE_SIZE = 512 * 1024

function parseGitHubUrl(raw: string) {
  const url = new URL(raw)
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
    throw new Error('UNSUPPORTED_URL')
  }

  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length < 2) throw new Error('INVALID_URL')

  const owner = parts[0]
  const repo = parts[1].replace(/\.git$/, '')
  let kind: 'repo' | 'tree' | 'blob' = 'repo'
  let ref = ''
  let path = ''

  if (parts[2] === 'tree' || parts[2] === 'blob') {
    kind = parts[2]
    ref = parts[3] || ''
    path = parts.slice(4).join('/')
  }

  return { owner, repo, kind, ref, path }
}

function shouldKeep(entry: TreeEntry) {
  const segments = entry.path.split('/')
  if (segments.some(s => IGNORED_DIRS.has(s))) return false
  if (entry.type === 'blob' && IGNORED_FILES.has(entry.path.split('/').pop() || '')) return false
  if (entry.type === 'blob' && typeof entry.size === 'number' && entry.size > MAX_FILE_SIZE) return false
  return true
}

function headers() {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
  }
}

async function github(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
  })

  if (response.status === 403 || response.status === 429) {
    throw new Error('RATE_LIMIT')
  }
  if (response.status === 404) throw new Error('NOT_FOUND')
  if (!response.ok) throw new Error(`GITHUB_${response.status}`)
  return response.json()
}

async function loadRepository(owner: string, name: string, requestedRef = ''): Promise<RepositoryPayload> {
  const key = `${owner}/${name}@${requestedRef || 'default'}`
  const cached = cache.get(key)
  if (cached) return cached

  const existing = inflight.get(key)
  if (existing) return existing

  const promise = (async () => {
    // Exactly one metadata request + one recursive tree request for a repository root.
    const repoRaw = await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`) as any
    const repo: GitHubRepo = { owner: typeof repoRaw.owner === 'string' ? repoRaw.owner : repoRaw.owner?.login || owner, name: repoRaw.name, default_branch: repoRaw.default_branch, html_url: repoRaw.html_url, description: repoRaw.description ?? null }
    const ref = requestedRef || repo.default_branch
    const tree = await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/trees/${encodeURIComponent(ref)}?recursive=1`) as { tree: TreeEntry[], truncated: boolean }

    const filtered = tree.tree.filter(shouldKeep)
    const payload = { repo, tree: filtered, source: 'github' as const }
    cache.set(key, payload)
    return payload
  })()

  inflight.set(key, promise)
  try {
    return await promise
  } finally {
    inflight.delete(key)
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, authenticated: Boolean(GITHUB_TOKEN), cacheEntries: cache.size })
})

// GitHub rate-limit status for the server-side authenticated token.
// This endpoint itself does not consume the primary rate limit.
app.get('/api/rate-limit', async (_req, res) => {
  try {
    const data = await github('/rate_limit') as any
    res.json({
      authenticated: Boolean(GITHUB_TOKEN),
      core: data.resources?.core ?? null,
      search: data.resources?.search ?? null,
      code_search: data.resources?.code_search ?? null,
      graphql: data.resources?.graphql ?? null,
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN'
    const status = code === 'RATE_LIMIT' ? 429 : 502
    res.status(status).json({ error: code })
  }
})

app.get('/api/repository', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '')
    if (!rawUrl) return res.status(400).json({ error: 'INVALID_URL' })

    const parsed = parseGitHubUrl(rawUrl)
    const payload = await loadRepository(parsed.owner, parsed.repo, parsed.kind === 'repo' ? '' : parsed.ref)

    // The same single repository-tree request is reused for repo/directory/file URLs.
    let tree = payload.tree
    if (parsed.kind !== 'repo' && parsed.path) {
      const prefix = parsed.path.replace(/\/+$/, '') + '/'
      if (parsed.kind === 'tree') {
        tree = tree.filter(e => e.path === parsed.path || e.path.startsWith(prefix))
      } else {
        tree = tree.filter(e => e.path === parsed.path)
      }
    }

    res.json({ ...payload, repo: { ...payload.repo, owner: typeof payload.repo.owner === 'string' ? payload.repo.owner : (payload.repo as any).owner?.login || parsed.owner }, tree, requested: parsed })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN'
    const status =
      code === 'RATE_LIMIT' ? 429 :
      code === 'NOT_FOUND' ? 404 :
      code === 'UNSUPPORTED_URL' || code === 'INVALID_URL' ? 400 : 502

    res.status(status).json({ error: code })
  }
})

// File contents are fetched only when a document is opened.
// Repeated opens are cached, so they do not consume another GitHub request.
const fileCache = new LRUCache<string, { content: string, encoding: string, size: number }>({
  max: 500,
  ttl: 1000 * 60 * 60,
})

app.get('/api/file', async (req, res) => {
  try {
    const owner = String(req.query.owner || '')
    const repo = String(req.query.repo || '')
    const ref = String(req.query.ref || '')
    const path = String(req.query.path || '')
    if (!owner || !repo || !path) return res.status(400).json({ error: 'INVALID_FILE_REQUEST' })

    const key = `${owner}/${repo}/${ref}/${path}`
    const cached = fileCache.get(key)
    if (cached) return res.json(cached)

    const data = await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref || 'HEAD')}`) as any

    if (Array.isArray(data)) return res.status(400).json({ error: 'NOT_A_FILE' })
    if (data.size > MAX_FILE_SIZE) return res.status(413).json({ error: 'FILE_TOO_LARGE' })

    const content = Buffer.from(data.content || '', 'base64').toString('utf8')
    const result = { content, encoding: 'utf-8', size: data.size || content.length }
    fileCache.set(key, result)
    res.json(result)
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN'
    const status = code === 'RATE_LIMIT' ? 429 : code === 'NOT_FOUND' ? 404 : 502
    res.status(status).json({ error: code })
  }
})

app.listen(PORT, () => {
  console.log(`CodeShelf API running on http://localhost:${PORT}`)
})
