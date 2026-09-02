<script setup>
import { computed } from 'vue'
import { usePageFrontmatter, withBase } from 'vuepress/client'
import { trackPortfolioEvent } from '../analytics.mjs'
import { getCaseStudy } from '../portfolio-data.mjs'
import ContactPanel from './ContactPanel.vue'

const frontmatter = usePageFrontmatter()
const project = computed(() => getCaseStudy(frontmatter.value.caseSlug))
</script>

<template>
  <main v-if="project" class="commercial-page case-page">
    <nav class="case-breadcrumb" aria-label="面包屑">
      <a :href="withBase('/projects/')">项目案例</a><span aria-hidden="true">/</span><span>{{ project.name }}</span>
    </nav>

    <header class="case-hero" :class="`is-${project.accent}`">
      <div>
        <p class="commercial-kicker">{{ project.category }}</p>
        <h1>{{ project.name }}</h1>
        <p class="case-hero__summary">{{ project.summary }}</p>
        <div class="case-actions">
          <a
            v-if="project.source"
            class="commercial-button"
            :href="project.source"
            target="_blank"
            rel="noreferrer"
            @click="trackPortfolioEvent('portfolio_source_open', { case_slug: project.slug, location: 'case_hero' })"
          >
            <Icon name="ph:github-logo" size="20" /> 查看源码
          </a>
          <a
            v-if="project.screenshots.length"
            class="commercial-button is-secondary"
            href="#screenshots"
            @click="trackPortfolioEvent('portfolio_screenshots_open', { case_slug: project.slug, location: 'case_hero' })"
          >
            项目截图
          </a>
          <a
            v-if="project.demo"
            class="commercial-button is-secondary"
            :href="project.demo"
            target="_blank"
            rel="noreferrer"
            @click="trackPortfolioEvent('portfolio_demo_open', { case_slug: project.slug, location: 'case_hero' })"
          >
            Demo
          </a>
        </div>
      </div>
      <div v-if="project.cover" class="case-hero__media">
        <img :src="withBase(project.cover.src)" :alt="project.cover.alt">
      </div>
      <div v-else class="case-hero__mark" aria-hidden="true">{{ project.name.slice(0, 2) }}</div>
    </header>

    <div class="case-story-grid">
      <section class="case-panel case-problem" aria-labelledby="problem-heading">
        <p class="commercial-kicker">THE PROBLEM</p>
        <h2 id="problem-heading">解决的问题</h2>
        <p>{{ project.problem }}</p>
      </section>

      <section class="case-panel" aria-labelledby="responsibilities-heading">
        <p class="commercial-kicker">MY SCOPE</p>
        <h2 id="responsibilities-heading">独立实现范围</h2>
        <ul class="responsibility-list">
          <li v-for="item in project.responsibilities" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>

    <section class="case-verification" aria-labelledby="verification-heading">
      <div class="case-verification__heading">
        <p class="commercial-kicker">VERIFIABLE EVIDENCE</p>
        <h2 id="verification-heading">可核验证据</h2>
      </div>
      <dl>
        <div v-for="item in project.verification" :key="item.label">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
        </div>
      </dl>
      <p v-if="project.evidenceNote" class="case-verification__note">{{ project.evidenceNote }}</p>
    </section>

    <section class="commercial-section case-features" aria-labelledby="features-heading">
      <div class="commercial-section__heading">
        <div>
          <p class="commercial-kicker">WHAT I BUILT</p>
          <h2 id="features-heading">实现功能</h2>
        </div>
      </div>
      <ol>
        <li v-for="(feature, index) in project.features" :key="feature">
          <span>{{ String(index + 1).padStart(2, '0') }}</span><p>{{ feature }}</p>
        </li>
      </ol>
    </section>

    <section v-if="project.screenshots.length" id="screenshots" class="commercial-section" aria-labelledby="screenshots-heading">
      <div class="commercial-section__heading">
        <div>
          <p class="commercial-kicker">REAL SCREENS</p>
          <h2 id="screenshots-heading">项目截图</h2>
        </div>
        <p>以下图片来自本地运行记录或项目资料，不使用概念图替代。</p>
      </div>
      <div class="screenshot-gallery">
        <figure v-for="screenshot in project.screenshots" :key="screenshot.src">
          <a
            :href="withBase(screenshot.src)"
            target="_blank"
            rel="noreferrer"
            @click="trackPortfolioEvent('portfolio_screenshot_view', { case_slug: project.slug, screenshot: screenshot.src })"
          >
            <img :src="withBase(screenshot.src)" :alt="screenshot.alt" loading="lazy">
          </a>
          <figcaption>{{ screenshot.alt }}</figcaption>
        </figure>
      </div>
    </section>

    <section class="tech-strip" aria-labelledby="technology-heading">
      <h2 id="technology-heading">技术实现</h2>
      <ul><li v-for="technology in project.technologies" :key="technology">{{ technology }}</li></ul>
    </section>

    <aside v-if="project.note" class="case-note"><strong>项目说明</strong><p>{{ project.note }}</p></aside>

    <ContactPanel />
  </main>

  <main v-else class="commercial-page">
    <h1>未找到该项目案例</h1>
    <p><a :href="withBase('/projects/')">返回项目页</a></p>
  </main>
</template>
