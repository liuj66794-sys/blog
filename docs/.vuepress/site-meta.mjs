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
 *
 * lessonMd：讲义是否生成站内 Markdown 全文页（方案 B）。2026-08-22 在
 * a-shares 试点，次日转换器扩展到五门课模板族后全量开启。开启后
 * courses/<slug>/l/<no>.md 是转换器（scripts/lib/lesson-convert.mjs）产出
 * 的主题化全文，HTML 镜像保留作交互版入口；关闭则维持摘要卡形态。
 */
export const COURSES = [
  { slug: 'a-shares', name: 'A 股入门', lessonMd: true },
  { slug: 'pi-agent', name: 'TypeScript Agent', lessonMd: true },
  { slug: 'engineering-skills', name: '工程技能', lessonMd: true },
  { slug: 'english', name: '英语教学', lessonMd: true },
  { slug: 'policy', name: '政策学习', lessonMd: true },
]

/** 站内绝对路径拼 base：withBase('/lessons/x') → '/blog/lessons/x' */
export const withBase = (p) => `${base.replace(/\/$/, '')}${p}`

/** 站点完整 URL 前缀（canonical / og 用）：origin + base（去尾斜杠） */
export const siteUrl = `${origin}${base.replace(/\/$/, '')}`
