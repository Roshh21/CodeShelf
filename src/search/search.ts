import type {RepoFile} from '../types'
export function searchFiles(files:RepoFile[],query:string){ const q=query.trim().toLowerCase(); if(!q)return []; return files.filter(f=>`${f.name} ${f.path} ${f.content||''}`.toLowerCase().includes(q)).slice(0,30) }
