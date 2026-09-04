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
 * 启动时做一致性断言：PROJECTS 的每个 slug 必须登记到 COURSES 且显示名
 * 一致（违反即退出码 1）；COURSES 多出 PROJECTS 的条目仅告警——
 * source:'vault' 的条目（sync-prep 从知识库同步）连告警都没有。
 * 新增 learn 课程：此处登记 + sync-learn PROJECTS 补源仓库信息。
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
  // 2026-09-05 备考区（/prep/）上线后归档：迷你课被备考区系统课程取代，
  // 页面与学情保留（备考总览「历史学情」有入口），改名即从导航语义上撤下
  { slug: 'english', name: '英语教学（已归档）', lessonMd: true },
  { slug: 'policy', name: '政策学习（已归档）', lessonMd: true },
  // 2026-09-05 专升本四科：内容源是知识库课程站（D 盘 Obsidian 库），由
  // sync-prep.mjs 镜像+转换，不走 learn 仓库——PROJECTS 无对应条目，
  // source:'vault' 让 sync-learn 的一致性告警静音
  { slug: 'zsb-math', name: '备考·高数', lessonMd: false, source: 'vault' },
  { slug: 'zsb-english', name: '备考·英语', lessonMd: false, source: 'vault' },
  { slug: 'zsb-politics', name: '备考·政治', lessonMd: false, source: 'vault' },
  { slug: 'zsb-cs', name: '备考·计算机', lessonMd: false, source: 'vault' },
]

/** 站内绝对路径拼 base：withBase('/lessons/x') → '/blog/lessons/x' */
export const withBase = (p) => `${base.replace(/\/$/, '')}${p}`

/** 站点完整 URL 前缀（canonical / og 用）：origin + base（去尾斜杠） */
export const siteUrl = `${origin}${base.replace(/\/$/, '')}`
