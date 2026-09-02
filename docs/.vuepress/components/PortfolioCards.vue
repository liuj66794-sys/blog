<script setup>
import { computed } from 'vue'
import { withBase } from 'vuepress/client'
import { trackPortfolioEvent } from '../analytics.mjs'
import { caseStudies } from '../portfolio-data.mjs'

const props = defineProps({
  limit: { type: Number, default: 0 },
})

const projects = computed(() => (props.limit ? caseStudies.slice(0, props.limit) : caseStudies))

</script>

<template>
  <div class="portfolio-grid">
    <article
      v-for="project in projects"
      :key="project.slug"
      class="portfolio-card"
      :class="`is-${project.accent}`"
    >
      <div class="portfolio-card__visual" :class="{ 'has-cover': project.cover }">
        <img
          v-if="project.cover"
          :src="withBase(project.cover.src)"
          :alt="project.cover.alt"
          loading="lazy"
        >
        <template v-else>
          <span class="portfolio-card__monogram" aria-hidden="true">{{ project.name.slice(0, 2) }}</span>
          <span class="portfolio-card__line" aria-hidden="true" />
        </template>
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
          @click="trackPortfolioEvent('portfolio_case_open', { case_slug: project.slug, location: 'case_card' })"
        >
          查看案例 <span aria-hidden="true">→</span>
        </a>
        <a
          v-if="project.source"
          class="commercial-link is-muted"
          :href="project.source"
          target="_blank"
          rel="noreferrer"
          @click="trackPortfolioEvent('portfolio_source_open', { case_slug: project.slug, location: 'case_card' })"
        >
          源码 <span class="sr-only">（在新窗口打开）</span>
        </a>
      </div>
    </article>
  </div>
</template>
