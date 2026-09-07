import {X,Search} from 'lucide-react'
import type {RepoFile} from '../types'
export function SearchPanel({open,query,setQuery,results,onSelect,onClose}:{open:boolean;query:string;setQuery:(q:string)=>void;results:RepoFile[];onSelect:(f:RepoFile)=>void;onClose:()=>void}){
  if(!open)return null
  return <div className="search-overlay" onMouseDown={onClose} role="presentation"><div className="search-panel" role="dialog" aria-modal="true" aria-label="Search repository" onMouseDown={e=>e.stopPropagation()}>
    <div className="search-top"><Search size={19}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search repository..." aria-label="Search repository files"/><button onClick={onClose} aria-label="Close search"><X size={18}/></button></div>
    {query&&<div className="search-count">{results.length} result{results.length===1?'':'s'}</div>}
    <div className="search-results">{query&&!results.length?<div className="empty-search">No matching files found.</div>:results.map(f=><button key={f.path} className="search-result" onClick={()=>{onSelect(f);onClose()}}><span className="result-name">{f.name}</span><span className="result-path">{f.path}</span></button>)}</div>
  </div></div>
}
