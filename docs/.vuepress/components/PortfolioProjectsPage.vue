<script setup>
import { withBase } from 'vuepress/client'
import PortfolioCards from './PortfolioCards.vue'
</script>

<template>
  <main class="commercial-page projects-landing">
    <header class="page-hero">
      <p class="commercial-kicker">SELECTED WORK</p>
      <h1>项目不是技术清单，<br><span>而是交付能力的证据</span></h1>
      <p>从要解决的问题、完整功能到我的实现范围，了解每个产品是怎么真正落地的。</p>
    </header>

    <section class="commercial-section" aria-labelledby="projects-heading">
      <h2 id="projects-heading" class="sr-only">精选项目案例</h2>
      <PortfolioCards />
    </section>

    <section class="repository-callout">
      <div>
        <p class="commercial-kicker">OPEN SOURCE</p>
        <h2>还想看更多代码？</h2>
        <p>完整公开仓库、语言分布和最近更新仍由 GitHub API 在构建时自动刷新。</p>
      </div>
      <a class="commercial-button is-secondary" :href="withBase('/projects/repositories/')">
        浏览全部 GitHub 仓库 <span aria-hidden="true">→</span>
      </a>
    </section>
  </main>
</template>
