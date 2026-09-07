import {Moon, Monitor, Sun} from 'lucide-react'
import type {Theme} from '../types'
export function ThemeSwitcher({theme,setTheme}:{theme:Theme;setTheme:(t:Theme)=>void}){
  return <div className="theme-switch" role="group" aria-label="Theme preference">
    <button className={theme==='light'?'active':''} aria-label="Use light theme" onClick={()=>setTheme('light')}><Sun size={14}/><span>Light</span></button>
    <button className={theme==='dark'?'active':''} aria-label="Use dark theme" onClick={()=>setTheme('dark')}><Moon size={14}/><span>Dark</span></button>
    <button className={theme==='system'?'active':''} aria-label="Use system theme" onClick={()=>setTheme('system')}><Monitor size={14}/><span>System</span></button>
  </div>
}
