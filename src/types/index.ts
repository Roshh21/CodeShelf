export type NodeType = 'repository' | 'directory' | 'file'
export type FileKind = 'markdown' | 'code' | 'text' | 'other'
export type Theme = 'light' | 'dark' | 'system'
export interface RepoFile { name:string; path:string; sha:string; type:'file'; size?:number; url:string; htmlUrl:string; kind:FileKind; language?:string; content?:string; }
export interface RepoDirectory { name:string; path:string; type:'directory'; children:RepoNode[] }
export type RepoNode = RepoFile | RepoDirectory
export interface RepositoryModel { owner:string; name:string; branch:string; description?:string; htmlUrl:string; root:RepoDirectory; files:RepoFile[]; }
export interface ParsedGithubUrl { owner:string; repo:string; kind:'repository'|'directory'|'file'; branch?:string; path:string; normalized:string }
