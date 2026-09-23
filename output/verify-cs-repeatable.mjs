import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
const root = process.cwd()
const roots = ['docs/.vuepress/public/lessons/zsb-cs','docs/courses/zsb-cs']
const files = []
function walk(dir) { for(const entry of fs.readdirSync(dir,{withFileTypes:true})) { const file=path.join(dir,entry.name); if(entry.isDirectory()) walk(file); else files.push(file) } }
roots.forEach(walk)
files.push('docs/.vuepress/public/learning/cs-pointer.css','docs/.vuepress/public/learning/cs-pointer.mjs','docs/.vuepress/public/learning/questions-zsb-cs.json','docs/.vuepress/prep-catalog.mjs','docs/.vuepress/lesson-search-index.mjs')
const snapshot = () => Object.fromEntries(files.map(file=>[file,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]))
const before=snapshot()
execFileSync(process.execPath,['scripts/sync-prep.mjs','--cs-only'],{cwd:root,stdio:'pipe'})
const after=snapshot(), changed=files.filter(file=>before[file]!==after[file])
const report={files:files.length,changed}
fs.writeFileSync('output/cs-course-audit-2026-09-22/repeatability.json',JSON.stringify(report,null,2))
console.log(JSON.stringify(report))
if(changed.length) process.exitCode=1
