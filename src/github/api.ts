const API_BASE = import.meta.env.VITE_API_URL || ''

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || 'REQUEST_FAILED')
    ;(error as any).status = response.status
    throw error
  }
  return data
}

export type ApiTreeEntry = {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
  url: string
}

export type RepositoryApiResponse = {
  repo: {
    owner: string
    name: string
    default_branch: string
    html_url: string
    description: string | null
  }
  tree: ApiTreeEntry[]
  requested: {
    owner: string
    repo: string
    kind: 'repo' | 'tree' | 'blob'
    ref: string
    path: string
  }
}

export async function fetchRepository(url: string) {
  return request<RepositoryApiResponse>(`/api/repository?url=${encodeURIComponent(url)}`)
}

export async function fetchFile(owner: string, repo: string, ref: string, path: string) {
  return request<{ content: string; encoding: string; size: number }>(
    `/api/file?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`
  )
}
