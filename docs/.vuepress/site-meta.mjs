/**
 * 站点元数据单一数据来源。
 * config.ts（base / feed hostname / favicon）、theme.ts（canonical / 导航 / 集合 / 分类名）、
 * scripts/sync-learn.mjs 与 scripts/check-links.mjs（链接拼接与校验）全部派生自这里。
 * 迁移根域名时只需把 base 改回 '/'（见 README §迁移到根域名）。
 */
export const base = '/blog/'
export const origin = 'https://liuj66794-sys.github.io'

/**
 * 课程名单（slug → 显示名，数组顺序即导航与总览页顺序）。
 * theme.ts 的导航/集合/分类名从这里派生；sync-learn.mjs 的 PROJECTS
 * 启动时与它做一致性断言。新增课程：此处登记 + sync-learn PROJECTS
 * 补源仓库信息，两处缺一都会在构建/sync 时快速失败。
 */
export const COURSES = [
  { slug: 'a-shares', name: 'A 股入门' },
  { slug: 'pi-agent', name: 'TypeScript Agent' },
  { slug: 'engineering-skills', name: '工程技能' },
  { slug: 'english', name: '英语教学' },
  { slug: 'policy', name: '政策学习' },
]

/** 站内绝对路径拼 base：withBase('/lessons/x') → '/blog/lessons/x' */
export const withBase = (p) => `${base.replace(/\/$/, '')}${p}`

/** 站点完整 URL 前缀（canonical / og 用）：origin + base（去尾斜杠） */
export const siteUrl = `${origin}${base.replace(/\/$/, '')}`
