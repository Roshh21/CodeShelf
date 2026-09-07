import type { ParsedGithubUrl } from '../types'
export function parseGithubUrl(raw:string):ParsedGithubUrl {
  let url:URL
  try { url = new URL(raw.trim()) } catch { throw new Error('Enter a valid GitHub URL.') }
  if (url.hostname.toLowerCase() !== 'github.com') throw new Error('CodeShelf currently supports GitHub URLs only.')
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length < 2) throw new Error('That does not look like a GitHub repository URL.')
  const owner = parts[0], repo = parts[1].replace(/\.git$/,'')
  if (!owner || !repo) throw new Error('We could not identify the repository.')
  if (parts.length === 2) return {owner,repo,kind:'repository',path:'',normalized:`https://github.com/${owner}/${repo}`}
  const mode = parts[2]
  if (mode !== 'tree' && mode !== 'blob') throw new Error('Use a repository, /tree/... directory, or /blob/... file URL.')
  if (!parts[3]) throw new Error('The GitHub URL is missing its branch.')
  const branch = decodeURIComponent(parts[3])
  const path = parts.slice(4).map(decodeURIComponent).join('/')
  if (!path && mode === 'blob') throw new Error('That file URL is incomplete.')
  return {owner,repo,kind:mode === 'tree' ? 'directory':'file',branch,path,normalized:`https://github.com/${owner}/${repo}/${mode}/${parts.slice(3).join('/')}`}
}
