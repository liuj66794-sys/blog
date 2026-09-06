<script setup>
import SubjectCards from './SubjectCards.vue'
</script>

<template>
  <section class="prep-dashboard" aria-labelledby="prep-courses-heading"><div class="learning-section__heading"><div><p class="learning-eyebrow">先选科目，再开始学习</p><h2 id="prep-courses-heading">今天，从哪一科开始？</h2></div></div><SubjectCards /><div class="prep-dashboard__hint"><span>边读边练</span><span aria-hidden="true">→</span><span>主动回忆</span><span aria-hidden="true">→</span><span>每周回顾</span></div></section>
</template>
