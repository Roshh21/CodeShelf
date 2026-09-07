import {X,BookOpen} from 'lucide-react'
import type {RepoDirectory,RepoFile} from '../types'
import {Tree} from './Tree'
import {MOBILE_BREAKPOINT} from '../utils/layout'

export function Sidebar({repoName,root,activePath,onSelect,open,onClose}:{repoName:string;root:RepoDirectory;activePath:string;onSelect:(f:RepoFile)=>void;open:boolean;onClose:()=>void}){
  function handleSelect(file:RepoFile){
    onSelect(file)
    // Only the mobile off-canvas drawer should auto-close on selection; the persistent
    // desktop column stays exactly as the person left it.
    if(typeof window!=='undefined'&&window.innerWidth<=MOBILE_BREAKPOINT)onClose()
  }
  return <aside className={`sidebar ${open?'is-open':'is-closed'}`} aria-label="Repository contents" aria-hidden={!open}>
    <div className="side-head">
      <div className="side-title"><BookOpen size={17}/><span>{repoName}</span></div>
      <button className="drawer-close" onClick={onClose} aria-label="Close contents" tabIndex={open?0:-1}><X size={18}/></button>
    </div>
    <div className="contents-label">CONTENTS</div>
    <Tree root={root} activePath={activePath} onSelect={handleSelect}/>
  </aside>
}
