#!/usr/bin/env node
/**
 * check-external-links.mjs —— 站外链接巡检（周定时，报告型，不进部署门禁）。
 *
 * 站内死链由 check-links.mjs 在每次部署时把关；外链（上交所/MDN/Node 官方
 * 文档等）会随时间腐坏，这里做定期探测：
 * - HEAD 请求，被拒（405/被反爬挡住）时降级 GET
 * - 403/429/401 等"站点活着但不让机器人看"归为软失败——告警不判死
 * - 404/410/5xx/DNS 失败/超时（重试后）判死链，退出码 1 触发 CI 失败通知
 *
 * 用法：node scripts/check-external-links.mjs [distDir]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { origin } from '../docs/.vuepress/site-meta.mjs'
import { walk } from './lib/learn-utils.mjs'
import { extractExternalRefs, classifyStatus } from './lib/external-link-utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(process.argv[2] ?? path.join(__dirname, '..', 'docs', '.vuepress', 'dist'))

/** 单个请求超时；整链（含重定向）计 */
const REQ_TIMEOUT = 15_000
/** 网络层错误（DNS/连接/超时）的重试次数 */
const NET_RETRIES = 1
/** 相邻请求间隔，礼貌抓取 */
const POLITENESS_MS = 400

const files = fs.existsSync(DIST) ? walk(DIST) : []
if (!files.length) {
  console.error(`[check-external-links] dist 为空或不存在：${DIST}（先执行构建）`)
  process.exit(1)
}

// 外链 → 引用它的产物文件集合（报告需要知道从哪改）
const refSources = new Map()
for (const file of files) {
  const rel = path.relative(DIST, file).replace(/\\/g, '/')
  if (!/\.(html|xml)$/.test(rel)) continue
  const text = fs.readFileSync(file, 'utf8')
  for (const url of extractExternalRefs(text, origin)) {
    if (!refSources.has(url)) refSources.set(url, new Set())
    refSources.get(url).add(rel)
  }
}

if (!refSources.size) {
  console.log('[check-external-links] 未发现外链，无事可查')
  process.exit(0)
}

/** 探测单个 URL：HEAD → 遇 405/软状态码降级 GET；网络错误重试一次 */
async function probe(url) {
  const attempt = async (method) => {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(REQ_TIMEOUT),
      headers: { 'user-agent': 'Mozilla/5.0 (link-audit; +https://liuj66794-sys.github.io/blog/)' },
    })
    return res.status
  }
  for (let i = 0; ; i++) {
    try {
      let status = await attempt('HEAD')
      // HEAD 被拒或反爬状态码：改 GET 再确认（不少站点只禁 HEAD）
      if (status === 405 || status === 403 || status === 999 || status === 501) {
        try {
          status = await attempt('GET')
        } catch {
          // GET 网络失败但 HEAD 已有状态码：按 HEAD 结果算
        }
      }
      return { kind: classifyStatus(status), status }
    } catch (err) {
      if (i < NET_RETRIES) continue
      const cause = err?.cause?.code ?? err?.name ?? String(err)
      return { kind: 'net', status: cause } // DNS/超时/连接层失败，调用方归入死链
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const results = { ok: [], soft: [], dead: [] }
let n = 0
for (const [url, sources] of refSources) {
  n++
  const r = await probe(url)
  results[r.kind === 'net' ? 'dead' : r.kind].push({ url, status: r.status, sources: [...sources] })
  process.stdout.write(`\r[check-external-links] ${n}/${refSources.size} ${r.kind === 'ok' ? '✓' : r.kind === 'soft' ? '?' : '✗'} ${url.slice(0, 70)}`.padEnd(100))
  if (n < refSources.size) await sleep(POLITENESS_MS)
}
process.stdout.write('\n')

const line = (icon, list) => list.map((x) => `  ${icon} [${x.status}] ${x.url}\n      引用：${x.sources.slice(0, 3).join('、')}${x.sources.length > 3 ? ` 等 ${x.sources.length} 处` : ''}`).join('\n')

let report = `## 外链巡检报告\n\n共 ${refSources.size} 个外链：✓ ${results.ok.length} ／ ？软失败（反爬/需登录，无法判定）${results.soft.length} ／ ✗ 死链 ${results.dead.length}\n`
console.log(`\n[check-external-links] 共 ${refSources.size} 个外链：ok ${results.ok.length} ｜ 软失败 ${results.soft.length} ｜ 死链 ${results.dead.length}`)
if (results.soft.length) {
  console.log('\n— 软失败（站点可达但拒绝机器人，人工抽查看是否真死）—')
  console.log(line('?', results.soft))
  report += `\n### 软失败（无法判定）\n\n\`\`\`\n${results.soft.map((x) => `[${x.status}] ${x.url}`).join('\n')}\n\`\`\`\n`
}
if (results.dead.length) {
  console.log('\n— 死链 —')
  console.log(line('✗', results.dead))
  report += `\n### 死链\n\n\`\`\`\n${results.dead.map((x) => `[${x.status}] ${x.url}\n  引用：${x.sources.join('、')}`).join('\n')}\n\`\`\`\n`
}
// GitHub Actions 步骤摘要（存在才写）
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n')
}

if (results.dead.length) {
  console.error(`\n[check-external-links] ✗ 发现 ${results.dead.length} 个死链，请更新内容或源讲义`)
  process.exit(1)
}
console.log('[check-external-links] ✓ 无死链（软失败见上文，需要时人工复核）')
