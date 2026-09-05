<script setup>
import { withBase } from 'vuepress/client'
import { topicCourses } from '../learning-data.mjs'
import SubjectCards from './SubjectCards.vue'
</script>

<template>
  <main class="learning-surface learning-hub">
    <header class="learning-page-heading"><p class="learning-eyebrow">KNOWLEDGE / 知识库</p><h1>让零散知识，重新连起来。</h1><p>按主题找到课程、速查资料与学习脉络。需要练习时，可以直接进入互动课程。</p></header>
    <section aria-labelledby="knowledge-prep-heading"><div class="learning-section__heading"><div><p class="learning-eyebrow">专升本备考</p><h2 id="knowledge-prep-heading">四科资料，一处查找</h2></div><a class="learning-text-link" :href="withBase('/prep/')">备考计划 <span aria-hidden="true">→</span></a></div><SubjectCards knowledge /></section>
    <section class="learning-section" aria-labelledby="knowledge-topic-heading"><div class="learning-section__heading"><div><p class="learning-eyebrow">专题知识</p><h2 id="knowledge-topic-heading">从概念到实践的参考架</h2></div></div><div class="topic-grid"><a v-for="s in topicCourses.filter(c => c.group !== '已归档')" :key="s.slug" class="topic-card" :href="withBase(`/knowledge/${s.slug}/`)"><span class="topic-card__number" aria-hidden="true">{{ s.mark }}</span><h3>{{ s.name }}</h3><p>{{ s.description }}</p><span class="learning-text-link">浏览知识库 <span aria-hidden="true">→</span></span></a></div></section>
    <details class="knowledge-archive"><summary>历史学习资料 <span>英语教学 · 政策学习</span></summary><p>早期学习资料保留查阅；系统备考请使用上方四科入口。</p><div class="learning-buttons"><a v-for="s in topicCourses.filter(c => c.group === '已归档')" :key="s.slug" :href="withBase(`/knowledge/${s.slug}/`)">{{ s.name }} →</a></div></details>
  </main>
</template>
