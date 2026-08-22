#!/usr/bin/env node
/**
 * serve.mjs —— 本地预览构建产物（与线上 base 路径一致）。
 *
 * 把 docs/.vuepress/dist 挂在站点 base 下（/ 重定向到 /blog/），
 * 替代手工拷贝 dist 到 .serve/ 的做法。仅用于本地验证，不是生产服务器。
 *
 * 用法：pnpm preview [端口]   （缺省 4173；先 pnpm docs:build 或 pnpm build）
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { base } from '../docs/.vuepress/site-meta.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '..', 'docs', '.vuepress', 'dist')
const PORT = Number(process.argv[2] ?? 4173)
const BASE = base.replace(/\/$/, '')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.map': 'application/json',
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[serve] 构建产物不存在，请先执行 pnpm docs:build（或 pnpm build）')
  process.exit(1)
}

http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    pathname = url.pathname
  }
  if (pathname === '/' || pathname === BASE) {
    res.writeHead(302, { Location: `${BASE}/` })
    return res.end()
  }
  if (!pathname.startsWith(`${BASE}/`)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end(`路径不在站点 base（${BASE}/）内`)
  }

  let rel = pathname.slice(BASE.length + 1)
  let file = path.normalize(path.join(DIST, rel))
  // 越界防护要带分隔符：startsWith(DIST) 会放过 DIST-xxx 同前缀兄弟目录；
  // file === DIST 对应 pathname 恰为 base 根（下方按目录回落 index.html）
  if (file !== DIST && !file.startsWith(DIST + path.sep)) {
    res.writeHead(403)
    return res.end()
  }
  // 无尾斜杠的目录形式 → 补斜杠重定向（与静态托管行为一致）
  if (!fs.existsSync(file) && !path.extname(rel) && fs.existsSync(path.join(file, 'index.html'))) {
    res.writeHead(301, { Location: `${pathname}/${url.search}` })
    return res.end()
  }
  if (rel.endsWith('/') || (fs.existsSync(file) && fs.statSync(file).isDirectory())) {
    file = path.join(file, 'index.html')
  }
  if (!fs.existsSync(file)) {
    const notFound = path.join(DIST, '404.html')
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : '404')
  }
  const stream = fs.createReadStream(file)
  // existsSync 与 open 之间文件被删的竞态：挂 error 防止进程崩溃；
  // 此时 200 头已发，只能断开连接
  stream.on('error', () => res.destroy())
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    // 本地预览不缓存：改一版、刷新即所见
    'Cache-Control': 'no-store',
  })
  stream.pipe(res)
}).listen(PORT, () => {
  console.log(`[serve] 预览已启动：http://localhost:${PORT}${BASE}/  （Ctrl+C 停止）`)
})
