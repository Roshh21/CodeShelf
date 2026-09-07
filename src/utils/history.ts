export interface HistoryEntry {
  url: string
  owner: string
  name: string
  branch?: string
  path?: string
  description?: string
  lastOpened: number
}

const KEY = 'codeshelf-history-v1'
const LIMIT = 15

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((entry): entry is HistoryEntry => Boolean(entry && entry.url && entry.owner && entry.name))
      .sort((a, b) => b.lastOpened - a.lastOpened)
  } catch {
    return []
  }
}

export function saveHistory(entry: Omit<HistoryEntry, 'lastOpened'>) {
  const next: HistoryEntry = { ...entry, lastOpened: Date.now() }
  const normalized = entry.url.trim()
  const history = getHistory().filter(item => !(item.owner.toLowerCase() === entry.owner.toLowerCase() && item.name.toLowerCase() === entry.name.toLowerCase() && (item.branch || '') === (entry.branch || '')))
  history.unshift({ ...next, url: normalized })
  localStorage.setItem(KEY, JSON.stringify(history.slice(0, LIMIT)))
}

export function clearHistory() {
  localStorage.removeItem(KEY)
}

export function formatHistoryDate(timestamp: number) {
  const date = new Date(timestamp)
  const diff = Date.now() - timestamp
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return 'Just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
}
