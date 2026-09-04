#!/usr/bin/env node
/**
 * gen-covers.mjs —— 课程 og 分享封面生成器（零依赖，程序化像素绘制）。
 *
 * 输出 docs/.vuepress/public/images/covers/<slug>.png（1200×630，og 标准比例）。
 * 扁平极简几何风：品牌靛蓝 #2563eb，每课一个主题图形（K 线/终端/齿轮/气泡/书）。
 * 2× 超采样抗锯齿后降采样；PNG 手写编码（IHDR/IDAT/IEND + zlib + CRC32）。
 *
 * 用法：node scripts/gen-covers.mjs   （封面构图改动后重跑 + git 提交产物）
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { COURSES } from '../docs/.vuepress/site-meta.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '..', 'docs', '.vuepress', 'public', 'images', 'covers')

const W = 1200
const H = 630
const SS = 2 // 超采样倍数

/* ---------------- 画布与基元 ---------------- */

function makeCanvas() {
  return { w: W * SS, h: H * SS, px: new Uint8Array(W * SS * H * SS * 3) }
}

function blend(c, x, y, [r, g, b], a = 1) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return
  const i = (y * c.w + x) * 3
  c.px[i] = Math.round(c.px[i] * (1 - a) + r * a)
  c.px[i + 1] = Math.round(c.px[i + 1] * (1 - a) + g * a)
  c.px[i + 2] = Math.round(c.px[i + 2] * (1 - a) + b * a)
}

const fillRect = (c, x, y, w, h, col, a = 1) => {
  for (let yy = Math.round(y * SS); yy < Math.round((y + h) * SS); yy++)
    for (let xx = Math.round(x * SS); xx < Math.round((x + w) * SS); xx++) blend(c, xx, yy, col, a)
}

const fillCircle = (c, cx, cy, r, col, a = 1) => {
  for (let yy = Math.floor((cy - r) * SS); yy <= Math.ceil((cy + r) * SS); yy++)
    for (let xx = Math.floor((cx - r) * SS); xx <= Math.ceil((cx + r) * SS); xx++) {
      const d = Math.hypot(xx - cx * SS, yy - cy * SS)
      if (d <= r * SS) blend(c, xx, yy, col, a)
    }
}

const fillRing = (c, cx, cy, r, thickness, col, a = 1) => {
  for (let yy = Math.floor((cy - r) * SS); yy <= Math.ceil((cy + r) * SS); yy++)
    for (let xx = Math.floor((cx - r) * SS); xx <= Math.ceil((cx + r) * SS); xx++) {
      const d = Math.hypot(xx - cx * SS, yy - cy * SS)
      if (d <= r * SS && d >= (r - thickness) * SS) blend(c, xx, yy, col, a)
    }
}

/** 点在三角形内（重心法），用于气泡尾巴/书签飘带 */
const fillTriangle = (c, [x1, y1], [x2, y2], [x3, y3], col, a = 1) => {
  const minX = Math.floor(Math.min(x1, x2, x3) * SS), maxX = Math.ceil(Math.max(x1, x2, x3) * SS)
  const minY = Math.floor(Math.min(y1, y2, y3) * SS), maxY = Math.ceil(Math.max(y1, y2, y3) * SS)
  const sign = (ax, ay, bx, by, cx2, cy2) => (ax - cx2) * (by - cy2) - (bx - cx2) * (ay - cy2)
  for (let yy = minY; yy <= maxY; yy++)
    for (let xx = minX; xx <= maxX; xx++) {
      const px2 = xx / SS, py = yy / SS
      const d1 = sign(px2, py, x1, y1, x2, y2), d2 = sign(px2, py, x2, y2, x3, y3), d3 = sign(px2, py, x3, y3, x1, y1)
      const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0
      if (!(neg && pos)) blend(c, xx, yy, col, a)
    }
}

/** 粗线（沿线段撒圆），自带圆头 */
const strokeLine = (c, x1, y1, x2, y2, width, col, a = 1) => {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const steps = Math.max(1, Math.ceil(len * SS))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    fillCircle(c, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, col, a)
  }
}

/* ---------------- 调色板 ---------------- */

const C = {
  bg: [248, 250, 252],        // near-white
  indigo: [37, 99, 235],      // #2563eb 品牌主色
  dark: [30, 64, 175],        // #1e40af
  light: [147, 197, 253],     // #93c5fd
  pale: [219, 234, 254],      // #dbeafe
  slate: [100, 116, 139],     // #64748b
  white: [255, 255, 255],
  paper: [30, 41, 59],        // #1e293b（终端深底）
}

/** 通用背景：近白底 + 左上大淡圆 + 右下品牌色细环 */
function backdrop(c) {
  fillRect(c, 0, 0, W, H, C.bg)
  fillCircle(c, 130, 90, 190, C.pale, 0.55)
  fillRing(c, 1090, 560, 130, 7, C.light, 0.5)
}

/* ---------------- 各课构图（主题图形居中偏左，右侧留白给平台标题区） ---------------- */

const COMPOSITIONS = {
  'a-shares': (c) => {
    // 五根上升 K 线（靛蓝实心 + 灰影线）+ 趋势虚线上扬
    const bars = [[300, 330, 52, 150], [410, 280, 52, 200], [520, 310, 52, 160], [630, 230, 52, 250], [740, 170, 52, 300]]
    bars.forEach(([x, y, w, h], i) => {
      strokeLine(c, x + w / 2, y - 34, x + w / 2, y + h + 34, 5, C.slate, 0.85)
      fillRect(c, x, y, w, h, i === 2 ? C.dark : C.indigo)
    })
    strokeLine(c, 250, 420, 860, 130, 9, C.light, 0.9)
    fillCircle(c, 860, 130, 14, C.indigo)
  },
  'pi-agent': (c) => {
    // 终端窗口：深底圆角矩形（圆角用四角圆贴）+ 三灯 + 提示符 > 与光标
    const x = 230, y = 190, w = 620, h = 320, r = 22
    fillRect(c, x + r, y, w - 2 * r, h, C.paper)
    fillRect(c, x, y + r, w, h - 2 * r, C.paper)
    fillCircle(c, x + r, y + r, r, C.paper); fillCircle(c, x + w - r, y + r, r, C.paper)
    fillCircle(c, x + r, y + h - r, r, C.paper); fillCircle(c, x + w - r, y + h - r, r, C.paper)
    fillRect(c, x, y, w, 12, C.dark)
    ;[[C.light], [C.indigo], [C.white]].forEach(([, ], i) => {})
    fillCircle(c, x + 26, y + 30, 6, C.light); fillCircle(c, x + 48, y + 30, 6, C.indigo); fillCircle(c, x + 70, y + 30, 6, C.slate)
    strokeLine(c, x + 40, y + 110, x + 78, y + 150, 12, C.light)
    strokeLine(c, x + 40, y + 190, x + 78, y + 150, 12, C.light)
    fillRect(c, x + 110, y + 138, 180, 24, C.light)
    fillRect(c, x + 320, y + 138, 60, 24, C.indigo)
    fillRect(c, x + 40, y + 230, 340, 16, C.slate, 0.4)
    fillRect(c, x + 40, y + 262, 240, 16, C.slate, 0.4)
    fillRing(c, 960, 350, 90, 12, C.indigo, 0.9)
    fillCircle(c, 960, 350, 34, C.light, 0.9)
  },
  'engineering-skills': (c) => {
    // 两个啮合齿轮（齿=环绕小圆）+ 蓝图网格底纹
    for (let gx = 300; gx <= 880; gx += 58) strokeLine(c, gx, 140, gx, 500, 1, C.pale, 0.9)
    for (let gy = 140; gy <= 500; gy += 58) strokeLine(c, 300, gy, 880, gy, 1, C.pale, 0.9)
    const gear = (cx, cy, r, col, hole) => {
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2
        fillCircle(c, cx + Math.cos(a) * (r + 14), cy + Math.sin(a) * (r + 14), 15, col)
      }
      fillCircle(c, cx, cy, r, col)
      fillCircle(c, cx, cy, hole, C.bg)
    }
    gear(560, 300, 92, C.indigo, 34)
    gear(742, 390, 62, C.dark, 24)
  },
  'english': (c) => {
    // 两个对话气泡（圆角矩形 + 三角尾）+ 三个圆点表示语言节奏
    const bubble = (x, y, w, h, col, tailDir) => {
      const r = 26
      fillRect(c, x + r, y, w - 2 * r, h, col)
      fillRect(c, x, y + r, w, h - 2 * r, col)
      fillCircle(c, x + r, y + r, r, col); fillCircle(c, x + w - r, y + r, r, col)
      fillCircle(c, x + r, y + h - r, r, col); fillCircle(c, x + w - r, y + h - r, r, col)
      const tx = tailDir > 0 ? x + 70 : x + w - 70
      fillTriangle(c, [tx, y + h - 4], [tx + 46, y + h - 4], [tx + tailDir * 26, y + h + 42], col)
    }
    bubble(280, 170, 330, 150, C.indigo, 1)
    fillCircle(c, 360, 245, 11, C.white); fillCircle(c, 415, 245, 11, C.white); fillCircle(c, 470, 245, 11, C.white)
    bubble(520, 330, 330, 150, C.light, -1)
    fillCircle(c, 600, 405, 11, C.white); fillCircle(c, 655, 405, 11, C.white); fillCircle(c, 710, 405, 11, C.white)
  },
  'policy': (c) => {
    // 一摞书（三本错位横条 + 书脊色带）+ 圆形印章 + 书签飘带
    const book = (x, y, w, h, col, spine) => {
      fillRect(c, x, y, w, h, col)
      fillRect(c, x + 18, y, 16, h, spine)
      fillRect(c, x + w - 34, y + h / 2 - 22, 14, 44, C.bg)
    }
    book(300, 380, 480, 52, C.light, C.dark)
    book(330, 318, 480, 52, C.pale, C.indigo)
    book(300, 256, 480, 52, C.indigo, C.dark)
    fillRing(c, 800, 190, 84, 14, C.dark, 0.95)
    fillCircle(c, 800, 190, 30, C.dark, 0.95)
    fillTriangle(c, [770, 308], [830, 308], [800, 352], C.indigo)
  },
  'zsb-math': (c) => {
    // 坐标系 + 上扬抛物线 + 两颗函数点：高数的“图像思维”
    strokeLine(c, 260, 470, 900, 470, 8, C.slate, 0.9)
    strokeLine(c, 300, 520, 300, 120, 8, C.slate, 0.9)
    for (let t = 0; t <= 60; t++) {
      const x = 300 + t * 9.5
      const y = 440 - Math.pow(t / 60, 2) * 300
      fillCircle(c, x, y, 7, C.indigo)
    }
    fillCircle(c, 590, 320, 16, C.dark)
    fillCircle(c, 830, 180, 16, C.dark)
    fillRing(c, 830, 180, 30, 6, C.light, 0.9)
  },
  'zsb-english': (c) => {
    // 三张错位词卡 + 右上对话环：从词汇积累到对话运用
    const card = (x, y) => {
      fillRect(c, x, y, 200, 130, C.white)
      fillRect(c, x, y, 200, 14, C.indigo)
      fillRect(c, x + 28, y + 48, 110, 16, C.pale)
      fillRect(c, x + 28, y + 82, 76, 12, C.light)
    }
    card(280, 220); card(430, 262); card(580, 196)
    fillRing(c, 870, 220, 70, 12, C.indigo, 0.9)
    fillCircle(c, 870, 220, 24, C.light, 0.95)
  },
  'zsb-politics': (c) => {
    // 旗杆 + 两段旗面（三个递淡圆点）+ 底座：纲领与时间线
    strokeLine(c, 320, 130, 320, 496, 10, C.slate, 0.95)
    fillRect(c, 326, 150, 330, 74, C.indigo)
    fillRect(c, 326, 232, 240, 60, C.light)
    fillCircle(c, 386, 187, 17, C.white)
    fillCircle(c, 438, 187, 17, C.white, 0.75)
    fillCircle(c, 490, 187, 17, C.white, 0.5)
    fillRect(c, 250, 496, 380, 18, C.pale)
    fillRing(c, 850, 300, 95, 13, C.indigo, 0.35)
  },
  'zsb-cs': (c) => {
    // 大括号 { } 夹循环箭头：程序设计 + 数据结构
    const brace = (x, dir) => {
      strokeLine(c, x + dir * 30, 150, x, 210, 14, C.indigo)
      strokeLine(c, x, 210, x, 400, 14, C.indigo)
      strokeLine(c, x, 400, x + dir * 30, 460, 14, C.indigo)
    }
    brace(430, 1)
    brace(700, -1)
    fillRing(c, 565, 305, 78, 12, C.light, 0.95)
    fillTriangle(c, [565, 215], [625, 247], [565, 247], C.indigo)
  },
}

/* ---------------- PNG 编码输出 ---------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** 超采样画布 → 2×2 平均降采样 → RGB8 PNG */
function encodePng(c) {
  const raw = Buffer.alloc((W * 3 + 1) * H)
  let p = 0
  for (let y = 0; y < H; y++) {
    raw[p++] = 0 // filter: None
    for (let x = 0; x < W; x++) {
      for (let ch = 0; ch < 3; ch++) {
        const sx = x * SS, sy = y * SS
        const v = (c.px[(sy * c.w + sx) * 3 + ch] + c.px[(sy * c.w + sx + 1) * 3 + ch]
          + c.px[((sy + 1) * c.w + sx) * 3 + ch] + c.px[((sy + 1) * c.w + sx + 1) * 3 + ch]) / 4
        raw[p++] = Math.round(v)
      }
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------------- 主流程 ---------------- */

fs.mkdirSync(OUT_DIR, { recursive: true })
for (const { slug } of COURSES) {
  const draw = COMPOSITIONS[slug]
  if (!draw) { console.warn(`[gen-covers] 无 ${slug} 构图，跳过`); continue }
  const canvas = makeCanvas()
  backdrop(canvas)
  draw(canvas)
  const file = path.join(OUT_DIR, `${slug}.png`)
  fs.writeFileSync(file, encodePng(canvas))
  console.log(`[gen-covers] ✓ ${slug} → ${path.relative(process.cwd(), file)}（${(fs.statSync(file).size / 1024).toFixed(0)}KB）`)
}
