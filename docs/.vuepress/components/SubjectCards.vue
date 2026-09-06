<script setup>
import { withBase } from 'vuepress/client'
import { prepSubjects } from '../learning-data.mjs'
defineProps({ knowledge: Boolean })
</script>

<template>
  <div class="subject-grid">
    <article v-for="subject in prepSubjects" :key="subject.slug" class="subject-card" :data-tone="subject.tone">
      <div class="subject-card__top"><span class="subject-mark" aria-hidden="true">{{ subject.mark }}</span><span class="learning-meta">{{ subject.count }} 节讲义</span></div>
      <h3><a :href="withBase(knowledge ? `/knowledge/${subject.slug}/` : subject.interactive)">{{ subject.name }} <span aria-hidden="true">↗</span></a></h3>
      <p>{{ knowledge ? subject.topics : subject.description }}</p>
      <div class="subject-actions">
        <a :href="withBase(knowledge ? `/knowledge/${subject.slug}/` : subject.interactive)">{{ knowledge ? '浏览资料' : '互动学习' }} <span aria-hidden="true">→</span></a>
        <a :href="withBase(knowledge ? `/prep/${subject.prep}/` : `/courses/${subject.slug}/`)">{{ knowledge ? '学习计划' : '课程目录 / 阅读版' }}</a>
      </div>
    </article>
  </div>
</template>
