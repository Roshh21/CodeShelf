import {Menu, Search, Sun, Moon, Monitor, ExternalLink, History as HistoryIcon, House} from 'lucide-react'
import {FiGithub} from 'react-icons/fi'
import type {RepositoryModel,Theme} from '../types'

export function ReaderHeader({repo,theme,setTheme,sidebarOpen,onMenu,onSearch,onHome,onHistory}:{repo:RepositoryModel;theme:Theme;setTheme:(t:Theme)=>void;sidebarOpen:boolean;onMenu:()=>void;onSearch:()=>void;onHome:()=>void;onHistory:()=>void}){
  return <header className="reader-header">
    <button className="menu-toggle icon-button" onClick={onMenu} aria-label={sidebarOpen?'Close contents':'Open contents'} aria-expanded={sidebarOpen}><Menu size={19}/></button>
    <button className="brand-small brand-button" onClick={onHome} aria-label="Go to CodeShelf home"><span className="brand-mark">CS</span><span>CodeShelf</span></button>
    <div className="header-repo"><span>{repo.owner}</span><b>/</b><strong>{repo.name}</strong></div>
    <nav className="header-nav" aria-label="Primary navigation">
      <button onClick={onHome}><House size={14}/> Home</button>
      <button onClick={onHistory}><HistoryIcon size={14}/> History</button>
    </nav>
    <div className="header-actions">
      <button className="icon-button" onClick={onSearch} aria-label="Search repository"><Search size={18}/></button>
      <div className="theme-compact" role="group" aria-label="Theme">
        <button aria-label="Use light theme" className={theme==='light'?'selected':''} onClick={()=>setTheme('light')}><Sun size={15}/></button>
        <button aria-label="Use dark theme" className={theme==='dark'?'selected':''} onClick={()=>setTheme('dark')}><Moon size={15}/></button>
        <button aria-label="Use system theme" className={theme==='system'?'selected':''} onClick={()=>setTheme('system')}><Monitor size={15}/></button>
      </div>
      <a className="github-link" href={repo.htmlUrl} target="_blank" rel="noreferrer"><FiGithub size={17}/> <span>GitHub</span> <ExternalLink size={13}/></a>
    </div>
  </header>
}
