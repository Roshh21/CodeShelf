import {useEffect,useState} from 'react'
import type {Theme} from '../types'

const KEY = 'codeshelf-theme'

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
  } catch {
    return 'system'
  }
}

function resolveTheme(theme: Theme) {
  return theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme
}

export function useTheme(){
  const [theme,setThemeState]=useState<Theme>(getInitialTheme)

  useEffect(()=>{
    const root=document.documentElement
    const apply=()=>{root.dataset.theme=resolveTheme(theme)}
    apply()
    if (theme !== 'system') return
    const media=window.matchMedia('(prefers-color-scheme: dark)')
    const onChange=()=>apply()
    media.addEventListener?.('change', onChange)
    return ()=>media.removeEventListener?.('change', onChange)
  },[theme])

  const setTheme=(next:Theme)=>{
    setThemeState(next)
    try { localStorage.setItem(KEY,next) } catch { /* storage can be unavailable */ }
  }

  const resolvedTheme = theme==='system' ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme
  return {theme,setTheme,resolvedTheme}
}
