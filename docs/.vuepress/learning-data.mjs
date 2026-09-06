// 学习导航共用的课程描述。路径不含部署前缀，由 VuePress withBase 处理。
import { prepCatalog } from './prep-catalog.mjs'
export const prepSubjects = [
  { slug: 'zsb-math', name: '高等数学', short: '高数', mark: '∫', tone: 'blue', description: '从函数与极限，到微积分与级数。', topics: '函数 · 极限 · 微积分' },
  { slug: 'zsb-english', name: '公共英语', short: '英语', mark: 'Aa', tone: 'green', description: '打牢语法基础，逐步突破各类题型。', topics: '语法 · 阅读 · 写作' },
  { slug: 'zsb-politics', name: '政治理论', short: '政治', mark: '文', tone: 'amber', description: '串起知识脉络，用闪卡与练习巩固。', topics: '毛中特 · 习概 · 时政' },
  { slug: 'zsb-cs', name: '计算机基础', short: '计算机', mark: '</>', tone: 'violet', description: '理解计算机基础，动手练习程序设计。', topics: '计算机基础 · C 语言 · 数据结构' },
].map((subject) => ({
  ...subject,
  count: prepCatalog[subject.slug].count,
  interactive: prepCatalog[subject.slug].interactive,
  prep: prepCatalog[subject.slug].prep,
  updatedAt: prepCatalog[subject.slug].updatedAt,
}))

export const topicCourses = [
  { slug: 'pi-agent', name: 'TypeScript Agent', mark: '{}', tone: 'blue', description: '从零构建命令行 Agent，理解工具调用与运行循环。', topics: 'TypeScript · Agent · 实践', group: '专题学习' },
  { slug: 'engineering-skills', name: '工程技能', mark: '⌘', tone: 'green', description: '从设计、任务拆解到交付，让工程方法成为日常习惯。', topics: '设计 · 开发 · 交付', group: '专题学习' },
  { slug: 'a-shares', name: 'A 股入门', mark: '↗', tone: 'amber', description: '理解基础概念、交易机制与风险，记录自己的判断。', topics: '基础概念 · 交易机制 · 风险', group: '专题学习' },
  { slug: 'english', name: '英语教学', mark: 'Aa', tone: 'green', description: '早期英语薄弱点练习与教学记录，保留查阅。', topics: '历史课程', group: '已归档' },
  { slug: 'policy', name: '政策学习', mark: '文', tone: 'amber', description: '早期政治错题复盘与学习记录，保留查阅。', topics: '历史课程', group: '已归档' },
]

export const learningEntrances = [
  { title: '课程总览', subtitle: '循序渐进，读懂每一课', href: '/courses/', icon: 'ph:books' },
  { title: '备考中心', subtitle: '四科课程与每周学习计划', href: '/prep/', icon: 'ph:calendar-check' },
  { title: '知识库', subtitle: '概念、速查与参考资料', href: '/knowledge/', icon: 'ph:files' },
  { title: '学习手记', subtitle: '记录理解，也记录问题', href: '/blog/', icon: 'ph:pencil-line' },
]
