<script setup>
import { withBase } from 'vuepress/client'
import { prepSubjects } from '../learning-data.mjs'
defineProps({ knowledge: Boolean })
</script>

<template>
  <div class="subject-grid">
    <article v-for="subject in prepSubjects" :key="subject.slug" class="subject-card" :data-tone="subject.tone">
      <div class="subject-card__top"><span class="subject-mark" aria-hidden="true">{{ subject.mark }}</span><span class="learning-meta">{{ subject.count }} 节讲义</span></div>
      <h3><a :href="withBase(knowledge ? `/knowledge/${subject.slug}/` : `/courses/${subject.slug}/`)">{{ subject.name }} <span aria-hidden="true">↗</span></a></h3>
      <p>{{ knowledge ? subject.topics : subject.description }}</p>
      <div class="subject-actions">
        <a :href="withBase(knowledge ? `/knowledge/${subject.slug}/` : `/courses/${subject.slug}/`)">{{ knowledge ? '浏览资料' : '课程与进度' }} <span aria-hidden="true">→</span></a>
        <a :href="withBase(knowledge ? `/courses/${subject.slug}/` : `/prep/${subject.prep}/`)">{{ knowledge ? '课程与练习' : '学习计划' }}</a>
      </div>
    </article>
  </div>
</template>
