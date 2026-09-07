import {useMemo} from 'react'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {oneDark,oneLight} from 'react-syntax-highlighter/dist/esm/styles/prism'
import type {RepoFile, Theme} from '../types'

export function CodeDocument({file,content,theme}:{file:RepoFile;content:string;theme:Theme}){
  const lang=file.language||'text'
  const lines=useMemo(()=>content.split('\n').length,[content])
  const copy=()=>navigator.clipboard?.writeText(content)
  return <article className="code-document">
    <div className="doc-kicker">{file.language||'TEXT'} · {lines} lines</div>
    <h1>{file.name}</h1>
    <p className="source-path">{file.path}</p>
    <div className="code-wrap large">
      <div className="code-head"><span>{lang}</span><button onClick={copy} aria-label={`Copy ${file.name}`}>Copy</button></div>
      <SyntaxHighlighter language={lang} style={theme==='dark'?oneDark:oneLight} showLineNumbers customStyle={{margin:0,background:'transparent',fontSize:'13.5px',lineHeight:1.7,padding:'20px 16px'}} codeTagProps={{style:{fontFamily:'var(--font-mono)'}}}>
        {content}
      </SyntaxHighlighter>
    </div>
  </article>
}
