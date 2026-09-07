import {useEffect,useMemo,useState} from 'react'
import {ArrowLeft,ArrowRight,BookOpen,ExternalLink,FileText,LoaderCircle,Search,X,History as HistoryIcon,Trash2} from 'lucide-react'
import {BrowserRouter,useLocation,useNavigate} from 'react-router-dom'
import {useTheme} from './hooks/useTheme'
import {fetchFile,fetchRepository} from './github/api'
import {parseGithubUrl} from './utils/githubUrl'
import {MarkdownDocument} from './markdown/MarkdownDocument'
import {CodeDocument} from './reader/CodeDocument'
import {Sidebar} from './components/Sidebar'
import {ReaderHeader} from './components/ReaderHeader'
import {SearchPanel} from './components/SearchPanel'
import {ThemeSwitcher} from './components/ThemeSwitcher'
import {searchFiles} from './search/search'
import {clearHistory,getHistory,formatHistoryDate,saveHistory,type HistoryEntry} from './utils/history'
import {MOBILE_BREAKPOINT} from './utils/layout'
import type {RepoFile,RepositoryModel} from './types'
import './styles.css'

type Status={kind:'loading'|'error'|'ready';message?:string}

export default function App(){return <BrowserRouter><AppContent/></BrowserRouter>}

function AppContent(){
 const {theme,setTheme,resolvedTheme}=useTheme()
 const location=useLocation(); const navigate=useNavigate()
 const [repo,setRepo]=useState<RepositoryModel|null>(null); const [active,setActive]=useState<RepoFile|null>(null); const [content,setContent]=useState('')
 const [status,setStatus]=useState<Status>({kind:'ready'}); const [url,setUrl]=useState('')
 // Single source of truth for sidebar visibility. Desktop defaults to open (persistent column),
 // mobile defaults to closed (off-canvas drawer) — same boolean drives both via CSS, no duplicate state.
 const [sidebarOpen,setSidebarOpen]=useState(()=>typeof window==='undefined'?true:window.innerWidth>MOBILE_BREAKPOINT)
 const [searchOpen,setSearchOpen]=useState(false); const [searchQuery,setSearchQuery]=useState(''); const [sectionMode,setSectionMode]=useState(false); const [landing,setLanding]=useState(location.pathname!=='/read')
 const [historyItems,setHistoryItems]=useState<HistoryEntry[]>(()=>getHistory())
 const {files}=repo||{files:[]}

 useEffect(()=>{
   if(location.pathname==='/history'){setLanding(false);return}
   if(location.pathname==='/'&&!location.search){setLanding(true);return}
   const params=new URLSearchParams(location.search); const raw=params.get('url')
   if(raw){setUrl(raw);setLanding(false);openSource(raw)}
 },[location.pathname])

 function recordHistory(raw:string, parsed:any, description?:string){
   const entry={url:raw.trim(),owner:parsed.owner,name:parsed.repo,branch:parsed.branch,path:parsed.path||undefined,description}
   saveHistory(entry);setHistoryItems(getHistory())
 }

 async function openSource(raw:string){
   if(!raw.trim()){setStatus({kind:'error',message:'Paste a GitHub repository, directory, or file URL first.'});return}
   setStatus({kind:'loading',message:'Preparing your shelf…'});setLanding(false)
   try{
     const parsed=parseGithubUrl(raw); const data=await fetchRepository(raw); const r=normalizeRepository(data); setRepo(r)
     recordHistory(raw,parsed,r.description)
     if(parsed.kind==='file'){
       const match=r.files.find(f=>f.path===parsed.path); if(!match)throw new Error('That file is unsupported, missing, or too large to display.')
       const fileData=await fetchFile(r.owner,r.name,r.branch,match.path);match.content=fileData.content;setActive(match);setContent(fileData.content)
     }else{
       const first=findFirst(r.root); if(first){const fileData=await fetchFile(r.owner,r.name,r.branch,first.path);first.content=fileData.content;setActive(first);setContent(fileData.content)}
       else throw new Error('There are no supported readable files in this location.')
     }
     setStatus({kind:'ready'});navigate(`/read?url=${encodeURIComponent(raw.trim())}`,{replace:true})
   }catch(e){setRepo(null);setActive(null);setContent('');setStatus({kind:'error',message:e instanceof Error?e.message:'We could not open that GitHub resource.'})}
 }

 async function selectFile(file:RepoFile){
   if(!repo)return;setSectionMode(false);setStatus({kind:'loading',message:'Opening document…'});setActive(file)
   try{const data=await fetchFile(repo.owner,repo.name,repo.branch,file.path);file.content=data.content;setContent(data.content);setStatus({kind:'ready'})
   }catch(e){setStatus({kind:'error',message:e instanceof Error?e.message:'Could not load this file.'})}
 }

 const ordered=useMemo(()=>repo?.files.filter(f=>f.kind!=='other')||[],[repo]); const idx=active?ordered.findIndex(f=>f.path===active.path):-1
 async function move(delta:number){const next=ordered[idx+delta];if(next)await selectFile(next)}

 async function readSection(){
   if(!repo||!active)return
   setSectionMode(true);setStatus({kind:'loading',message:'Preparing this section…'})
   try{
     const sectionPath=active.path.includes('/')?active.path.split('/').slice(0,-1).join('/'):repo.root.path
     const prefix=sectionPath?`${sectionPath}/`:''
     const sectionFiles=repo.files.filter(f=>!prefix||f.path.startsWith(prefix)).slice(0,30)
     for(const f of sectionFiles){if(f.content===undefined)f.content=(await fetchFile(repo.owner,repo.name,repo.branch,f.path)).content}
     setStatus({kind:'ready'})
   }catch(e){setStatus({kind:'error',message:e instanceof Error?e.message:'Could not read this section.'})}
 }

 function normalizeRepository(data:any):RepositoryModel{
   const parsed=data.requested;const branch=parsed.ref||data.repo.default_branch;const scopedTree=data.tree as any[];const rootPath=parsed.path||''
   const root:any={name:rootPath?rootPath.split('/').pop()||data.repo.name:data.repo.name,path:rootPath,type:'directory',children:[]};const files:RepoFile[]=[]
   const codeExt:Record<string,string>={py:'python',js:'javascript',jsx:'jsx',ts:'typescript',tsx:'tsx',java:'java',cpp:'cpp',c:'c',cs:'csharp',go:'go',rs:'rust',php:'php',rb:'ruby',swift:'swift',kt:'kotlin',html:'html',css:'css',sql:'sql',sh:'shell',bash:'shell',json:'json'}
   const kindFor=(name:string)=>{const lower=name.toLowerCase();if(lower.endsWith('.md')||lower.endsWith('.mdx'))return 'markdown' as const;if(lower.endsWith('.txt'))return 'text' as const;const ext=lower.split('.').pop()||'';return codeExt[ext]?'code' as const:'other' as const}
   for(const x of scopedTree.filter(e=>e.type==='blob')){
     const name=x.path.split('/').pop()||x.path;const kind=kindFor(x.path);if(kind==='other'||['package-lock.json','yarn.lock','pnpm-lock.yaml'].includes(name))continue
     const file:RepoFile={name,path:x.path,sha:x.sha,type:'file',size:x.size,url:x.url,htmlUrl:`https://github.com/${data.repo.owner.login||data.repo.owner}/${data.repo.name}/blob/${encodeURIComponent(branch)}/${x.path}`,kind,language:codeExt[(x.path.toLowerCase().split('.').pop()||'')]}
     files.push(file);insertNode(root,file,rootPath)
   }
   sortNodes(root);return {owner:typeof data.repo.owner==='string'?data.repo.owner:data.repo.owner.login,name:data.repo.name,branch,description:data.repo.description||undefined,htmlUrl:data.repo.html_url,root,files}
 }
 function insertNode(root:any,file:RepoFile,rootPath:string){const rel=rootPath?file.path.slice(rootPath.length).replace(/^\//,''):file.path;const segments=rel.split('/').filter(Boolean);if(!segments.length){root.children.push(file);return}let dir=root;segments.forEach((segment,i)=>{if(i===segments.length-1){dir.children.push(file);return}let child=dir.children.find((n:any)=>n.type==='directory'&&n.name===segment);if(!child){child={name:segment,path:[dir.path,segment].filter(Boolean).join('/'),type:'directory',children:[]};dir.children.push(child)}dir=child})}
 function sortNodes(dir:any){dir.children.sort((a:any,b:any)=>a.type===b.type?a.name.localeCompare(b.name):a.type==='directory'?-1:1);dir.children.forEach((c:any)=>c.type==='directory'&&sortNodes(c))}
 const results=useMemo(()=>searchFiles(files,searchQuery),[files,searchQuery])

 if(location.pathname==='/read'&&!location.search){navigate('/');return null}
 if(location.pathname==='/history')return <HistoryPage theme={theme} setTheme={setTheme} items={historyItems} onClear={()=>{clearHistory();setHistoryItems([])}} onOpen={(item)=>{setUrl(item.url);openSource(item.url)}} onHome={()=>navigate('/')}/>
 if(landing&&!repo&&status.kind!=='loading'&&status.kind!=='error')return <Landing url={url} setUrl={setUrl} onOpen={()=>openSource(url)} theme={theme} setTheme={setTheme} historyItems={historyItems} onHistory={()=>navigate('/history')} onOpenHistory={(item)=>openSource(item.url)}/>
 if(status.kind==='loading'&&!repo)return <Loading message={status.message||'Preparing your shelf…'}/>
 if(status.kind==='error'&&!repo)return <ErrorState message={status.message||'We could not open this resource.'} onHome={()=>{setLanding(true);setStatus({kind:'ready'});navigate('/')}}/>
 if(!repo)return null
 const sectionPath=active?.path.includes('/')?active.path.split('/').slice(0,-1).join('/'):repo.root.path
 const sectionFiles=repo.files.filter(f=>!sectionPath||f.path.startsWith(`${sectionPath}/`)).slice(0,30)
 const sectionTitle=sectionPath?sectionPath.split('/').pop()||repo.name:repo.name
 return <div className="app-shell">
   <ReaderHeader repo={repo} theme={theme} setTheme={setTheme} sidebarOpen={sidebarOpen} onMenu={()=>setSidebarOpen(v=>!v)} onSearch={()=>setSearchOpen(true)} onHome={()=>navigate('/')} onHistory={()=>navigate('/history')}/>
   <div className="reader-layout">
     <Sidebar repoName={repo.name} root={repo.root} activePath={active?.path||''} onSelect={selectFile} open={sidebarOpen} onClose={()=>setSidebarOpen(false)}/>{sidebarOpen&&<button className="drawer-backdrop" onClick={()=>setSidebarOpen(false)} aria-label="Close contents" />}
     <main className="reading-area">
       <div className="reading-top"><div className="breadcrumbs"><span>{repo.owner}/{repo.name}</span><b>/</b><span>{sectionPath||'root'}</span>{active&&<><b>/</b><span>{active.name}</span></>}</div><div className="reading-actions"><button onClick={()=>setSearchOpen(true)} aria-label="Search repository"><Search size={15}/><span>Search</span></button>{active&&<a href={active.htmlUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/><span>View on GitHub</span></a>}</div></div>
       {status.kind==='error'&&<div className="inline-error">{status.message}<button onClick={()=>setStatus({kind:'ready'})} aria-label="Dismiss error"><X size={14}/></button></div>}
       {sectionMode ? <>
         <div className="document-head section-head"><div className="doc-kicker">SECTION READING</div><h1>{sectionTitle}</h1><p>{repo.description||'A focused reading view of the files in this section.'} <span className="section-meta">· {sectionFiles.length} file{sectionFiles.length===1?'':'s'}</span></p><a className="section-source" href={repo.htmlUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> View repository on GitHub</a></div>
         {status.kind==='loading'?<Loading message={status.message||'Preparing this section…'}/>:<SectionReader files={sectionFiles} theme={resolvedTheme} repo={repo}/>} 
       </> : <>
         {active&&<div className="document-head"><div className="doc-kicker">{active.kind.toUpperCase()}</div>{active.kind==='markdown'?<><h1>{active.name.replace(/\.mdx?$/i,'')}</h1><p>{active.path}</p></>:null}</div>}
         {status.kind==='loading'?<Loading message={status.message||'Loading…'}/>:active?.kind==='markdown'?<MarkdownDocument content={content} theme={resolvedTheme} titleToAvoid={active.name}/>:active?<CodeDocument file={active} content={content} theme={resolvedTheme}/>:null}
         {active&&<div className="reader-footer"><button disabled={idx<=0} onClick={()=>move(-1)}><ArrowLeft size={17}/><span>Previous Topic</span></button><button className="section-button" onClick={readSection}><BookOpen size={16}/><span>Read Entire Section</span></button><button disabled={idx<0||idx>=ordered.length-1} onClick={()=>move(1)}><span>Next Topic</span><ArrowRight size={17}/></button></div>}
       </>}
     </main>
   </div>
   <SearchPanel open={searchOpen} query={searchQuery} setQuery={setSearchQuery} results={results} onSelect={selectFile} onClose={()=>setSearchOpen(false)}/>
 </div>
}

function SectionReader({files,theme,repo}:{files:RepoFile[];theme:any;repo:RepositoryModel}){
 return <div className="section-reader">
   {files.map((file,index)=><section className="section-file" key={file.path}>
     <div className="section-file-head"><div><div className="section-file-number">{String(index+1).padStart(2,'0')}</div><h2>{file.name}</h2><p>{file.path}</p></div><a href={file.htmlUrl} target="_blank" rel="noreferrer" aria-label={`View ${file.name} on GitHub`}><ExternalLink size={14}/><span>Source</span></a></div>
     {file.kind==='markdown'?<MarkdownDocument content={file.content||''} theme={theme} titleToAvoid={file.name.replace(/\.mdx?$/i,'')}/>:<CodeDocument file={file} content={file.content||''} theme={theme}/>} 
     <div className="section-file-source"><FileText size={13}/> {file.name} · <a href={file.htmlUrl} target="_blank" rel="noreferrer">View on GitHub</a></div>
   </section>)}
   {!files.length&&<div className="empty-section">No readable files were found in this section.</div>}
 </div>
}

function Landing({url,setUrl,onOpen,theme,setTheme,historyItems,onHistory,onOpenHistory}:{url:string;setUrl:(x:string)=>void;onOpen:()=>void;theme:any;setTheme:(t:any)=>void;historyItems:HistoryEntry[];onHistory:()=>void;onOpenHistory:(item:HistoryEntry)=>void}){
 return <div className="landing"><nav className="landing-nav"><button className="brand brand-button" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}><span className="brand-mark">CS</span>CodeShelf</button><div className="landing-nav-actions"><button className="nav-link" onClick={onHistory}><HistoryIcon size={14}/> History</button><ThemeSwitcher theme={theme} setTheme={setTheme}/></div></nav>
   <section className="hero"><div className="eyebrow">A calmer way to read code</div><h1>Read GitHub repositories<br/><em>like study material.</em></h1><p>Paste a repository, folder, or file and turn scattered source into a clean, focused reading experience.</p><div className="url-box"><span>github.com/</span><input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onOpen()} placeholder="user/repository" aria-label="GitHub repository URL"/><button onClick={onOpen}>Open in CodeShelf <ArrowRight size={16}/></button></div><small>Public GitHub repositories only · no login required</small></section>
   {historyItems.length>0&&<section className="recent"><div className="section-label"><span>RECENT</span><button onClick={onHistory}>View all history <ArrowRight size={14}/></button></div><div className="recent-list">{historyItems.slice(0,4).map(item=><button key={item.url} className="recent-item" onClick={()=>onOpenHistory(item)}><div><strong>{item.owner} / {item.name}</strong><span>{item.path||'Repository root'}</span></div><time>{formatHistoryDate(item.lastOpened)}</time></button>)}</div></section>}
   <section className="how"><div><span>01</span><h3>Paste</h3><p>Give CodeShelf a repository, directory, or single file URL.</p></div><div><span>02</span><h3>Organize</h3><p>CodeShelf understands the existing structure without changing it.</p></div><div><span>03</span><h3>Read</h3><p>Study explanations, implementation, and examples in one calm flow.</p></div></section>
   <section className="preview"><div className="preview-window"><div className="preview-side"><b>CONTENTS</b><span>▾ Python</span><i>Lists</i><i>Dictionaries</i><span>▾ Data Structures</span><i>Array</i><i>Stack</i></div><div className="preview-doc"><small>01 BASICS</small><h2>Python Lists</h2><p>Lists are commonly used to store an ordered collection of values.</p><div className="fake-code">nums = [1, 2, 3]<br/>nums.append(4)</div><h3>Common operations</h3><p className="line"></p><p className="line short"></p></div></div></section>
 </div>
}

function HistoryPage({theme,setTheme,items,onClear,onOpen,onHome}:{theme:any;setTheme:(t:any)=>void;items:HistoryEntry[];onClear:()=>void;onOpen:(item:HistoryEntry)=>void;onHome:()=>void}){
 return <div className="history-page"><header className="history-header"><button className="brand brand-button" onClick={onHome}><span className="brand-mark">CS</span>CodeShelf</button><div className="landing-nav-actions"><button className="nav-link" onClick={onHome}>Home</button><ThemeSwitcher theme={theme} setTheme={setTheme}/></div></header><main className="history-main"><div className="history-title"><div><div className="eyebrow">Your shelf</div><h1>History</h1><p>Your recently opened repositories.</p></div>{items.length>0&&<button className="clear-history" onClick={onClear}><Trash2 size={14}/> Clear history</button>}</div>{items.length>0?<div className="history-list">{items.map(item=><button className="history-item" key={item.url} onClick={()=>onOpen(item)}><div className="history-icon"><HistoryIcon size={17}/></div><div className="history-item-copy"><strong>{item.owner} / {item.name}</strong><span>{item.path||'Repository root'}{item.branch?` · ${item.branch}`:''}</span></div><time>{formatHistoryDate(item.lastOpened)}</time><ArrowRight size={16}/></button>)}</div>:<div className="history-empty"><HistoryIcon size={23}/><h2>No recent repositories yet</h2><p>Repositories you open in CodeShelf will appear here.</p><button onClick={onHome}>Open a repository</button></div>}<div className="coming-soon"><div><span className="eyebrow">Later</span><h2>More history features coming soon</h2></div><ul><li>Reading progress</li><li>Bookmarks</li><li>Saved sections</li><li>Cross-device history</li></ul></div></main></div>
}

function Loading({message}:{message:string}){return <div className="loading-state"><LoaderCircle className="spin" size={24}/><h2>{message}</h2><p>Reading structure and preparing your documents.</p></div>}
function ErrorState({message,onHome}:{message:string;onHome:()=>void}){return <div className="error-page"><div className="brand"><span className="brand-mark">CS</span>CodeShelf</div><div className="error-card"><div className="error-symbol">!</div><h1>We couldn't open this repository.</h1><p>{message}</p><button onClick={onHome}>Return Home</button></div></div>}
function findFirst(root:any):RepoFile|undefined{for(const n of root.children){if(n.type==='file')return n;const f=findFirst(n);if(f)return f}return undefined}
