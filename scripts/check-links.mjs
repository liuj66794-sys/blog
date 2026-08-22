#!/usr/bin/env node
/**
 * check-links.mjs —— 站内链接完整性校验（CI 防漂移）。
 *
 * 扫描 dist 全部 HTML 的 href/src、CSS 的 url() 与 sitemap 的 <loc>，
 * 将站内目标映射回 dist 文件验证存在；任一缺失即列出引用方并失败。
 * 防的是生成模板/镜像与产物之间的漂移：死链、漏拷文件、base 拼错。
 *
 * 用法：node scripts/check-links.mjs [distDir]   （缺省 docs/.vuepress/dist）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { base } from '../docs/.vuepress/site-meta.mjs'
import { walk } from './lib/learn-utils.mjs'
import { urlToDistFile as mapUrl } from './lib/link-utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS = path.resolve(__dirname, '..', 'docs')
const DIST = path.resolve(process.argv[2] ?? path.join(DOCS, '.vuepress', 'dist'))

/** 与站点同一数据来源（site-meta.mjs）；base 决定 URL 路径 → dist 文件的映射 */
const SITE_BASE = base.replace(/\/$/, '')

/**
 * client.js fixPostsNavLinks 在运行时改写的裸链接（plume 上游缺陷的兜底）。
 * SSR 产物里它们仍是根路径写法，跳过静态检查；上游修复或兜底移除时同步清理。
 */
const RUNTIME_PATCHED = /^\/(archives|categories|tags)\/$/

/**
 * 契约断言：RUNTIME_PATCHED 豁免以 client.js 的运行时补丁存在为前提。
 * 这三条链接没有任何静态保障——补丁若被删/改名而豁免清单没同步清理，
 * 它们断了 CI 也依然全绿。两处兜底必须同生同死。
 */
{
  const clientSrc = fs.readFileSync(path.join(DOCS, '.vuepress', 'client.js'), 'utf8')
  const patchAlive = /fixPostsNavLinks/.test(clientSrc) && /archives\|categories\|tags/.test(clientSrc)
  if (!patchAlive) {
    console.error('[check-links] client.js 中未找到 fixPostsNavLinks 补丁，但 RUNTIME_PATCHED 豁免清单仍在生效。')
    console.error('  若上游已修复该缺陷：请同步删除 client.js 补丁、本豁免与本断言；否则这三条链接将失去所有保障。')
    process.exit(1)
  }
}

/** 站内 URL 路径 → dist 文件路径；实现在 lib/link-utils.mjs（有 node:test 单测） */
const urlToDistFile = (pathname) => mapUrl(pathname, DIST, SITE_BASE)

const files = fs.existsSync(DIST) ? walk(DIST) : []
if (!files.length) {
  console.error(`[check-links] dist 为空或不存在：${DIST}（先执行构建）`)
  process.exit(1)
}

const misses = []
let checked = 0

function checkRef(ref, fromDistFile) {
  // %23 是 Vite 压缩后 CSS 里的 url(#frag)（SVG 片段引用），不是文件路径
  if (!ref || ref.startsWith('#') || ref.startsWith('%23')) return
  if (RUNTIME_PATCHED.test(ref.split(/[?#]/)[0])) return
  if (/^(?!https?:)[a-z][a-z0-9+.-]*:/i.test(ref)) return // mailto: javascript: data: 等
  if (ref.startsWith('//')) return // 协议相对外链

  let pathname
  if (/^https?:\/\//i.test(ref)) {
    // HTML/CSS 里的 http 外链不校验；只有 sitemap 的同站绝对 URL 会走到这里之外单独处理
    return
  }
  if (ref.startsWith('/')) {
    pathname = ref.split(/[?#]/)[0]
  } else {
    // 相对链接在真实服务器上相对其页面 URL（含 base）解析，镜像讲义的 ./ ../ 同理
    const fromRel = path.relative(DIST, fromDistFile).replace(/\\/g, '/')
    const fromUrl = `http://site${SITE_BASE}/${path.dirname(fromRel)}/`
    pathname = new URL(ref, fromUrl).pathname
  }

  const target = urlToDistFile(pathname)
  if (!target) return // 不带 base 前缀的绝对路径：外站或已知运行时兜底，不归本检查管
  checked++
  if (!fs.existsSync(target)) {
    misses.push({ from: path.relative(DIST, fromDistFile), ref, target: path.relative(DIST, target) })
  }
}

for (const file of files) {
  const rel = path.relative(DIST, file).replace(/\\/g, '/')
  if (rel === 'sitemap.xml') continue
  const ext = path.extname(file)
  if (ext !== '.html' && ext !== '.css') continue
  const text = fs.readFileSync(file, 'utf8')
  if (ext === '.html') {
    for (const m of text.matchAll(/(?:href|src)\s*=\s*"([^"]*)"/g)) checkRef(m[1], file)
    for (const m of text.matchAll(/(?:href|src)\s*=\s*'([^']*)'/g)) checkRef(m[1], file)
  } else {
    for (const m of text.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) checkRef(m[2], file)
  }
}

// sitemap 与 feed 里的同站绝对 URL，直接映射校验
const absoluteSources = [
  { name: 'sitemap.xml', re: /<loc>([^<]+)<\/loc>/g },
  { name: 'rss.xml', re: /<link>([^<]+)<\/link>/g },
  { name: 'atom.xml', re: /<link[^>]*href="([^"]+)"/g },
]
for (const { name, re } of absoluteSources) {
  const file = path.join(DIST, name)
  if (!fs.existsSync(file)) continue
  for (const m of fs.readFileSync(file, 'utf8').matchAll(re)) {
    if (!/^https?:\/\//i.test(m[1])) continue
    const pathname = new URL(m[1]).pathname
    const target = urlToDistFile(pathname)
    if (!target) {
      misses.push({ from: name, ref: m[1], target: '（不在 base 内）' })
      continue
    }
    checked++
    if (!fs.existsSync(target)) {
      misses.push({ from: name, ref: m[1], target: path.relative(DIST, target) })
    }
  }
}

if (misses.length) {
  console.error(`[check-links] 发现 ${misses.length} 个站内死链（已校验 ${checked} 个链接）：`)
  for (const m of misses.slice(0, 30)) {
    console.error(`  ${m.from}\n    → ${m.ref}\n    缺失目标：${m.target}`)
  }
  if (misses.length > 30) console.error(`  …共 ${misses.length} 个`)
  process.exit(1)
}
console.log(`[check-links] ✓ ${checked} 个站内链接全部有效`)
