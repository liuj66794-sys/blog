export const developer = {
  brand: 'L1U.J',
  role: 'Full-stack · Windows · Android · AI Developer',
  promise: '从需求梳理到源码交付，独立完成 Web、桌面、Android 与 AI 产品。',
  github: 'https://github.com/liuj66794-sys',
}

export const contact = {
  email: '386239680@qq.com',
  emailSubject: '项目开发咨询',
  wechat: 'Aa6635613',
  wechatQr: '/images/contact/wechat-qr-source.jpg',
}

export const services = [
  {
    icon: 'ph:browser',
    title: 'Web 全栈开发',
    description: '从响应式前端、业务后端到部署上线，交付完整可用的 Web 产品。',
  },
  {
    icon: 'ph:windows-logo',
    title: 'Windows 桌面软件',
    description: '面向办公、数据处理和 AI 场景的桌面程序，含安装包与交付文档。',
  },
  {
    icon: 'ph:android-logo',
    title: 'Android App',
    description: '移动端页面、业务流程、账号体系、云端数据与 Android 调试交付。',
  },
  {
    icon: 'ph:brain',
    title: 'AI 应用 / Agent',
    description: '文档分析、RAG、模型接入、工具调用与可落地的 AI 工作流。',
  },
  {
    icon: 'ph:wrench',
    title: 'Vibe Coding 项目修复',
    description: '接管 AI 生成或中途卡住的项目，诊断、补测试、修复并恢复可维护性。',
  },
  {
    icon: 'ph:rocket-launch',
    title: 'MVP 快速开发',
    description: '先锁定核心价值，用可验收的小步版本快速验证想法。',
  },
  {
    icon: 'ph:student',
    title: '个性化 AI 学习课程',
    description: '围绕你的目标和项目定制路线、讲义、练习与阶段验收。',
  },
]

export const workflow = [
  { title: '需求沟通', description: '对齐目标、用户和必须解决的问题。' },
  { title: '报价', description: '明确范围、交付物、周期与费用。' },
  { title: '原型', description: '先确认关键流程与界面，减少返工。' },
  { title: '开发', description: '按可演示、可验收的阶段持续推进。' },
  { title: '阶段验收', description: '用真实场景检查功能，及时收敛偏差。' },
  { title: '交付源码', description: '交付源码、构建产物和必要的运行文档。' },
  { title: '售后', description: '处理交付后问题，支持后续迭代。' },
]

export const caseStudies = [
  {
    slug: 'policy-analyzer-pro',
    name: 'PolicyAnalyzerPro',
    category: 'Windows · AI 文档分析',
    summary: '从 0 到 1 完成的 Windows 离线政策文档分析软件。',
    problem: '内网、政务和研究场景需要在无互联网环境下处理长篇 PDF、Word 和扫描文档，同时保持分析过程可控、结果可导出。',
    features: [
      'TXT / DOCX / PDF 解析，扫描 PDF 支持 OCR 回退与缓存',
      '单篇分析、双篇语义比对与批量汇总',
      '核心议题、措辞演变、新增/删减内容与摘要生成',
      'Markdown / HTML / JSON 报告导出与环境诊断报告',
      '启动自检、离线模型预热、OCR 管线与 Windows 安装包构建',
    ],
    responsibilities: ['产品设计', 'UI 与交互', 'Python 后端', 'NLP / AI', '文档数据处理', 'Windows 打包与交付'],
    technologies: ['Python', 'PySide6', 'SentenceTransformers', 'TextRank', 'PyMuPDF', 'Tesseract', 'PyInstaller'],
    source: 'https://github.com/liuj66794-sys/PolicyAnalyzerPro',
    screenshots: [],
    demo: '',
    accent: 'blue',
  },
  {
    slug: 'tlisily',
    name: 'Tlisily',
    category: 'Windows · AI 角色应用',
    summary: '面向中文用户的本地优先 AI 角色扮演与聊天桌面应用。',
    problem: '用户需要在一个桌面产品中管理不同 AI 服务、角色设定与长对话资料，同时保护本地凭据和会话数据。',
    features: [
      '多 AI 后端与 OpenAI 兼容接口，支持流式聊天',
      'SillyTavern V2 / V3 角色卡、世界书和 Persona 管理',
      '对话摘要、RAG、翻译、TTS、图像生成与联网搜索',
      'SQLite 本地存储、SecretStore 凭据管理与 Rust 策略代理',
      'Windows NSIS 安装包、安装后冒烟测试与 SHA-256 校验',
    ],
    responsibilities: ['产品与技术方案', 'Svelte 前端', 'Tauri / Rust', '本地数据层', 'AI 服务集成', 'Windows 发布流程'],
    technologies: ['Svelte 5', 'TypeScript', 'Tauri 2', 'Rust', 'SQLite', 'Tailwind CSS', 'Vitest'],
    source: 'https://github.com/liuj66794-sys/Tlisily',
    screenshots: [],
    demo: '',
    accent: 'violet',
  },
  {
    slug: 'boxuegu',
    name: '博学谷',
    category: 'Android · Web · Serverless',
    summary: '学生端 App、Web 管理后台和 Serverless 后端一体化的在线学习平台。',
    problem: '在线教育项目需要打通课程发布、学习、练习、进度和后台运营，又希望减少独立服务器的运维成本。',
    features: [
      '学生端课程浏览、章节学习、视频播放与进度上报',
      '习题练习、结果统计、错题本、笔记和个人中心',
      'Web 后台的分类、课程树、轮播、推荐与数据中心',
      'uniCloud 云函数、文档数据库与管理端/学生端实时同步',
      '账号认证、Android 运行调试和多端页面适配',
    ],
    responsibilities: ['学生端 App', 'Web 管理后台', '云函数与数据库', '账号与权限', 'Android 调试', '产品文档'],
    technologies: ['uni-app-x', 'Vue 3', 'UTS', 'uniCloud', 'MongoDB', 'Android'],
    source: 'https://github.com/liuj66794-sys/boxuegu',
    screenshots: [
      { src: '/images/projects/boxuegu/course-home.png', alt: '博学谷学生端真实运行首页' },
    ],
    demo: '',
    note: '该项目是学习/期末大作业项目，用于展示完整产品链路，不宣称为已投产的商业系统。',
    accent: 'orange',
  },
]

export const learningLinks = [
  { icon: 'ph:notebook', title: '博客', description: '学习记录、工程复盘与实战经验。', href: '/blog/' },
  { icon: 'ph:graduation-cap', title: '课程', description: '系统讲义、练习与可检索的学习路径。', href: '/courses/' },
  { icon: 'ph:tree-structure', title: '知识库', description: '总纲、术语、ADR 与参考资料的长期沉淀。', href: '/knowledge/' },
]

export function getCaseStudy(slug) {
  return caseStudies.find((item) => item.slug === slug)
}

export function validatePortfolioData(items = caseStudies) {
  const errors = []
  const slugs = new Set()

  for (const item of items) {
    if (!/^[a-z0-9-]+$/.test(item.slug)) errors.push(`${item.name}: slug 不合法`)
    if (slugs.has(item.slug)) errors.push(`${item.name}: slug 重复`)
    slugs.add(item.slug)

    for (const key of ['name', 'category', 'summary', 'problem']) {
      if (!item[key]?.trim()) errors.push(`${item.slug}: ${key} 不能为空`)
    }
    if (!item.features?.length) errors.push(`${item.slug}: 缺少功能列表`)
    if (!item.responsibilities?.length) errors.push(`${item.slug}: 缺少实现范围`)
    if (item.source && !item.source.startsWith('https://')) errors.push(`${item.slug}: 源码链接必须使用 HTTPS`)
    if (item.demo && !item.demo.startsWith('https://')) errors.push(`${item.slug}: Demo 链接必须使用 HTTPS`)
    for (const screenshot of item.screenshots ?? []) {
      if (!screenshot.src?.startsWith('/') || !screenshot.alt?.trim()) {
        errors.push(`${item.slug}: 截图需要站内绝对路径和替代文本`)
      }
    }
  }

  return errors
}
