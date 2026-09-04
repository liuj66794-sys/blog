# L1U.J 开发者作品集

商业作品集与学习博客（[liuj66794-sys.github.io/blog](https://liuj66794-sys.github.io/blog/)）：首页先展示可承接的开发服务、完整项目案例和合作流程，同时保留课程、博客与知识库。

- **框架**：VuePress 2 + [vuepress-theme-plume](https://theme-plume.vuejs.press/)
- **部署**：GitHub Actions → GitHub Pages（推送 `main` 自动发布）

## 目录结构

```
docs/
├── .vuepress/
│   ├── config.ts          # VuePress 配置
│   ├── theme.ts           # Plume 主题配置（集合/导航/搜索，课程部分派生自 site-meta）
│   ├── site-meta.mjs      # 站点元数据单一数据源（base/origin/课程名单）
│   ├── portfolio-data.mjs # 服务、案例、联系信息与合作流程的共享数据
│   ├── components/        # 商业首页、Hire Me、项目案例与联系组件
│   ├── styles/            # 商业作品集共享样式
│   ├── public/images/     # 微信二维码与可核验的项目截图
│   └── public/lessons/    # 讲义 HTML 原样托管（sync-learn 生成）
├── README.md              # 首页
├── hire/                  # Hire Me / 找我开发
├── blog/                  # 博客（post 集合，学习记录）
├── courses/               # 课程目录页（doc 集合 × 5 门课）
├── prep/                  # 备考区（doc 集合：计划总览 + 四科周打卡，sync-prep 生成）
├── knowledge/             # 知识库（doc 集合：总纲/术语/ADR）
└── projects/              # 精选案例 + 自动生成的公开仓库目录
scripts/
├── sync-learn.mjs         # D:\01-Documents\learn → 站点内容
├── sync-prep.mjs          # 知识库《29周冲刺计划》→ 备考区（内容源路径见脚本头注释）
├── fetch-projects.mjs     # GitHub API → 公开仓库目录（不覆盖精选案例页）
├── check-links.mjs        # 站内死链校验（CI 门禁）
├── serve.mjs              # 本地预览构建产物（与线上 base 一致）
└── lib/                   # 共享纯函数 + node:test 单测
```

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm sync             # 同步学习仓库（讲义/学习记录/知识库/课程目录）
pnpm sync:prep        # 同步备考区（知识库 29周冲刺计划 → docs/prep）
pnpm fetch-projects   # 刷新 GitHub 项目墙
pnpm docs:dev         # 本地开发（http://localhost:8080）
pnpm docs:build       # 构建
pnpm build            # sync + fetch-projects + build 全流程
pnpm preview          # 本地预览构建产物（http://localhost:4173/blog/）
pnpm test             # node:test 单测（scripts/lib）
pnpm typecheck        # tsc 类型检查（VuePress 配置）
pnpm verify           # 一键门禁：typecheck + test + build + 死链校验
```

新增课程：在 `docs/.vuepress/site-meta.mjs` 的 `COURSES` 登记（导航/集合/分类名派生），并在 `scripts/sync-learn.mjs` 的 `PROJECTS` 补源仓库信息；两处缺一会在 sync/build 时快速失败。

## 内容更新流程

1. 在学习仓库产出新的讲义 / 学习记录
2. `pnpm sync` → 检查 `git status` 确认变更
3. 提交并推送到 `main`，GitHub Actions 自动构建发布

备考区（`/prep/`）的内容源是知识库《29周冲刺计划》md：改计划 → `pnpm sync:prep` → 随下次提交发布；周打卡勾选存在浏览器 localStorage，不回写知识库。

讲义为独立 HTML（含随堂测交互），过渡期原样托管在 `/lessons/<课程>/`；后续逐步转为 Markdown 纳入主题体系（见 方案.md §4.1 方案 C）。

## 迁移到根域名（可选）

当前部署在项目站点 `liuj66794-sys.github.io/blog/`（`blog` 仓库）。原因：用户站仓库 `liuj66794-sys.github.io` 的 Pages 设置无法通过 gh token API 修改（PATCH /pages 返回 404，且用户站不允许停用 Pages），只能网页 UI 手动切换。

如需迁移到根路径 `liuj66794-sys.github.io/`：

1. `docs/.vuepress/site-meta.mjs` 中 `base` 改回 `'/'`（config.ts 的 base、theme.ts 的 canonical、sync-learn/check-links 的链接拼接全部派生自这里，改一处即可）
2. 推送代码到 `user-site` 远端（即 `liuj66794-sys.github.io` 仓库，main 分支）
3. 网页打开 仓库 Settings → Pages → Source 选择 **GitHub Actions**（一次性手动操作）
