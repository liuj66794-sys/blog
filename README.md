# L1U.J 学习博客与开发者作品集

学习博客与开发者作品集（[liuj66794-sys.github.io/blog](https://liuj66794-sys.github.io/blog/)）：首页提供课程、四科备考、知识库和学习手记入口，开发服务与项目案例保留独立页面。

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
├── courses/               # 专题课程与四科备考讲义（doc 集合）
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
pnpm sync:prep        # 同步四科互动课、全文讲义、课程目录与 29 周计划
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

备考区的课程源位于知识库 `专升本/{高数,英语,政治/课程,计算机}`，周计划来自《29周冲刺计划》。更新原始课程后执行 `pnpm sync:prep`，同步互动 HTML、公开配套资源、可搜索的阅读讲义以及 `prep-catalog.mjs`。首页课数、备考卡片与四科目录都读取这一目录数据；错题本等工具单独列出，不计为课次。相关术语见 [CONTEXT.md](./CONTEXT.md)。

同步会先校验全部课号和测验提取结果，遇到重复课号、未知功能页或漏题时中止。英语同一页的多组测验与共享选项都会进入讲义，合并表格按原列关系展开。网站的导航、字体处理和高数逐题续学增强由博客仓库维护；课程内容在知识库编辑。周打卡和课程记录保存在当前浏览器，不回写知识库。

四科更新的发布检查：`pnpm sync:prep` → `pnpm test` → `pnpm typecheck` → `pnpm docs:build` → `node scripts/check-links.mjs`。检查目录筛选、移动端、答题和返回续学后，提交并推送 `main`，等待 Pages 工作流成功。CI 使用已提交生成物，不依赖本机知识库。

讲义为独立 HTML（含随堂测交互），过渡期原样托管在 `/lessons/<课程>/`；后续逐步转为 Markdown 纳入主题体系（见 方案.md §4.1 方案 C）。

## 迁移到根域名（可选）

当前部署在项目站点 `liuj66794-sys.github.io/blog/`（`blog` 仓库）。原因：用户站仓库 `liuj66794-sys.github.io` 的 Pages 设置无法通过 gh token API 修改（PATCH /pages 返回 404，且用户站不允许停用 Pages），只能网页 UI 手动切换。

如需迁移到根路径 `liuj66794-sys.github.io/`：

1. `docs/.vuepress/site-meta.mjs` 中 `base` 改回 `'/'`（config.ts 的 base、theme.ts 的 canonical、sync-learn/check-links 的链接拼接全部派生自这里，改一处即可）
2. 推送代码到 `user-site` 远端（即 `liuj66794-sys.github.io` 仓库，main 分支）
3. 网页打开 仓库 Settings → Pages → Source 选择 **GitHub Actions**（一次性手动操作）
