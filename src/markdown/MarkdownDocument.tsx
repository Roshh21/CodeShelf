import React, {useMemo} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {oneDark,oneLight} from 'react-syntax-highlighter/dist/esm/styles/prism'
import type {Theme} from '../types'

function slug(text:string){
  return text.toLowerCase().trim().replace(/[*_`]/g,'').replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-')
}

function normalizeHeading(text:string){
  return text.toLowerCase().replace(/[`*_~]/g,'').replace(/\.mdx?$/i,'').replace(/[^a-z0-9]+/g,' ').trim()
}

export function withoutDuplicateLeadingHeading(content:string, candidates:string[]){
  const match=content.match(/^\s*#\s+(.+?)\s*\n(?:\s*\n)?/)
  if(!match) return content
  const heading=normalizeHeading(match[1])
  const duplicate=candidates.some(candidate=>heading && heading===normalizeHeading(candidate))
  return duplicate ? content.slice(match[0].length) : content
}

function CodeBlock({className,children,theme}:{className?:string;children:React.ReactNode;theme:Theme}){
  const lang=className?.replace(/^language-/,'')||'text'
  const code=String(children).replace(/\n$/,'')
  const copy=()=>navigator.clipboard?.writeText(code)
  return <div className="code-wrap">
    <div className="code-head"><span>{lang}</span><button onClick={copy} aria-label={`Copy ${lang} code`}>Copy</button></div>
    <SyntaxHighlighter language={lang} style={theme==='dark'?oneDark:oneLight} customStyle={{margin:0,borderRadius:0,background:'transparent',fontSize:'13.5px',lineHeight:1.7,padding:'18px 20px'}} codeTagProps={{style:{fontFamily:'var(--font-mono)'}}}>
      {code}
    </SyntaxHighlighter>
  </div>
}

export function MarkdownDocument({content,theme,titleToAvoid}:{content:string;theme:Theme;titleToAvoid?:string|string[]}){
  const candidates=Array.isArray(titleToAvoid)?titleToAvoid:titleToAvoid?[titleToAvoid]:[]
  const displayContent=useMemo(()=>withoutDuplicateLeadingHeading(content,candidates),[content,titleToAvoid])
  const headings=useMemo(()=>Array.from(displayContent.matchAll(/^(#{1,3})\s+(.+)$/gm)).map(m=>({text:m[2].replace(/[*_`]/g,''),level:m[1].length,id:slug(m[2])})),[displayContent])

  return <div className="markdown-grid">
    <article className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1:({children})=>{const text=String(children);return <h1 id={slug(text)}>{children}</h1>},
          h2:({children})=>{const text=String(children);return <h2 id={slug(text)}>{children}</h2>},
          h3:({children})=>{const text=String(children);return <h3 id={slug(text)}>{children}</h3>},
          code({className,children}){return <code className={className}>{children}</code>},
          pre({children}){
            const child=React.Children.toArray(children)[0] as React.ReactElement<{className?:string;children?:React.ReactNode}>|undefined
            return <CodeBlock className={child?.props?.className} theme={theme}>{child?.props?.children??children}</CodeBlock>
          },
          a({href,children}){return <a href={href} target={href?.startsWith('http')?'_blank':undefined} rel={href?.startsWith('http')?'noreferrer':undefined}>{children}</a>},
          img({src,alt}){return <img src={src} alt={alt||''} loading="lazy"/>}
        }}
      >{displayContent}</ReactMarkdown>
    </article>
    {headings.length>2&&<aside className="toc">
      <div className="toc-title">ON THIS PAGE</div>
      {headings.map((h,i)=><a key={`${h.id}-${i}`} href={`#${h.id}`} style={{paddingLeft:h.level>1?8:0}}>{h.text}</a>)}
    </aside>}
  </div>
}
