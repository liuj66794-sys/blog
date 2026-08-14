# L1U.J 的学习宇宙

个人技术博客站点（[liuj66794-sys.github.io/blog](https://liuj66794-sys.github.io/blog/)）：学习内容 + 课程 + GitHub 项目 + 个人主页，四合一。

- **框架**：VuePress 2 + [vuepress-theme-plume](https://theme-plume.vuejs.press/)
- **部署**：GitHub Actions → GitHub Pages（推送 `main` 自动发布）

## 目录结构

```
docs/
├── .vuepress/
│   ├── config.ts          # VuePress 配置
│   ├── theme.ts           # Plume 主题配置（集合/导航/搜索）
│   └── public/lessons/    # 讲义 HTML 原样托管（sync-learn 生成）
├── README.md              # 首页
├── blog/                  # 博客（post 集合，学习记录）
├── courses/               # 课程目录页（doc 集合 × 5 门课）
├── knowledge/             # 知识库（doc 集合：总纲/术语/ADR）
└── projects/              # 项目墙（fetch-projects 生成）
scripts/
├── sync-learn.mjs         # D:\01-Documents\learn → 站点内容
└── fetch-projects.mjs     # GitHub API → 项目墙
```

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm sync             # 同步学习仓库（讲义/学习记录/知识库/课程目录）
pnpm fetch-projects   # 刷新 GitHub 项目墙
pnpm docs:dev         # 本地开发（http://localhost:8080）
pnpm docs:build       # 构建
pnpm build            # sync + fetch-projects + build 全流程
```

## 内容更新流程

1. 在学习仓库产出新的讲义 / 学习记录
2. `pnpm sync` → 检查 `git status` 确认变更
3. 提交并推送到 `main`，GitHub Actions 自动构建发布

讲义为独立 HTML（含随堂测交互），过渡期原样托管在 `/lessons/<课程>/`；后续逐步转为 Markdown 纳入主题体系（见 方案.md §4.1 方案 C）。
