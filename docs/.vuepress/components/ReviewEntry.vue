<script setup>
import { computed } from 'vue'
import { useStudyUpdates } from '../composables/useStudyUpdates.mjs'
import { readMistakes } from '../../../scripts/runtime/mistake-store.mjs'
import { reviewOverview, reviewHref } from '../review-session.mjs'

const { revision, storage } = useStudyUpdates()
const overview = computed(() => { revision.value; return reviewOverview(readMistakes(storage.value)) })
const href = computed(() => reviewHref({}, __VUEPRESS_BASE__, overview.value.due ? 'practice' : ''))
const nextDate = computed(() => overview.value.nextAt ? new Date(overview.value.nextAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) : '')
</script>

<template>
  <section class="home-review" aria-labelledby="home-review-heading">
    <div class="home-review__mark" aria-hidden="true">↺</div>
    <div class="home-review__copy"><p class="learning-eyebrow">复习也是向前走</p><h2 id="home-review-heading">{{ overview.due ? `${overview.due} 道错题，现在可以再试一次。` : '给学过的知识，再一次回想。' }}</h2>
      <p>{{ overview.due ? `从 ${Math.min(5, overview.due)} 题开始，先独立作答，再对照解析。` : nextDate ? `下一批复测：${nextDate}。也可以查看错因与已巩固的记录。` : '课堂错题自动收集，回忆、订正和复测都从这里继续。' }}</p>
    </div>
    <a class="learn-button" :href="href">{{ overview.due ? `复习 ${Math.min(5, overview.due)} 题` : '打开错题本' }} <span aria-hidden="true">→</span></a>
  </section>
</template>

<style scoped>
.home-review{display:flex;align-items:center;gap:22px;padding:24px 28px;border:1px solid var(--study-line);border-radius:14px;background:var(--study-panel);min-width:0}.home-review__mark{font-size:38px;color:var(--study-accent);line-height:1}.home-review__copy{flex:1;min-width:0}.home-review .learning-eyebrow{margin:0 0 6px;font-size:11px}.home-review h2{font-size:20px;margin:0 0 6px;line-height:1.6}.home-review__copy>p:last-child{font-size:13px;color:var(--study-muted);margin:0;line-height:1.8}.home-review>.learn-button{flex-shrink:0;min-height:44px;font-size:14px}.home-review a:focus-visible{outline:3px solid var(--study-accent);outline-offset:3px}
@media(max-width:600px){.home-review{padding:20px;gap:12px;flex-wrap:wrap}.home-review__mark{display:none}.home-review__copy{flex-basis:100%}.home-review h2{font-size:18px}.home-review>.learn-button{width:100%}}
</style>
