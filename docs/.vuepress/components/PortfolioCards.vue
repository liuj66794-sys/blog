<script setup>
import { computed } from 'vue'
import { withBase } from 'vuepress/client'
import { caseStudies } from '../portfolio-data.mjs'

const props = defineProps({
  limit: { type: Number, default: 0 },
})

const projects = computed(() => (props.limit ? caseStudies.slice(0, props.limit) : caseStudies))

function trackCase(project) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'portfolio_case_open', { case_slug: project.slug })
  }
}
</script>

<template>
  <div class="portfolio-grid">
    <article
      v-for="project in projects"
      :key="project.slug"
      class="portfolio-card"
      :class="`is-${project.accent}`"
    >
      <div class="portfolio-card__visual" aria-hidden="true">
        <span class="portfolio-card__monogram">{{ project.name.slice(0, 2) }}</span>
        <span class="portfolio-card__line" />
      </div>
      <div class="portfolio-card__body">
        <p class="commercial-kicker">{{ project.category }}</p>
        <h3>{{ project.name }}</h3>
        <p>{{ project.summary }}</p>
        <ul class="portfolio-card__chips" aria-label="主要技术">
          <li v-for="technology in project.technologies.slice(0, 4)" :key="technology">
            {{ technology }}
          </li>
        </ul>
      </div>
      <div class="portfolio-card__footer">
        <a
          class="commercial-link"
          :href="withBase(`/projects/${project.slug}/`)"
          @click="trackCase(project)"
        >
          查看案例 <span aria-hidden="true">→</span>
        </a>
        <a
          v-if="project.source"
          class="commercial-link is-muted"
          :href="project.source"
          target="_blank"
          rel="noreferrer"
        >
          源码 <span class="sr-only">（在新窗口打开）</span>
        </a>
      </div>
    </article>
  </div>
</template>
