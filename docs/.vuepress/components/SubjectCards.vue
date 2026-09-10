<script setup>
import { computed } from 'vue'
import { withBase } from 'vuepress/client'
import { prepSubjects } from '../learning-data.mjs'
import { prepCatalog } from '../prep-catalog.mjs'
import { subjectProgress, withStudyContext } from '../../../scripts/runtime/study-state.mjs'
import { useStudyUpdates } from '../composables/useStudyUpdates.mjs'
defineProps({ knowledge: Boolean })
const { revision, storage } = useStudyUpdates()
const progress = computed(() => {
  revision.value
  return Object.fromEntries(prepSubjects.map((subject) => [
    subject.slug,
    subjectProgress(subject.slug, prepCatalog[subject.slug]?.lessons ?? [], __VUEPRESS_BASE__, storage.value),
  ]))
})
function continueHref(subject) {
  return withStudyContext(progress.value[subject.slug].continueHref, withBase(`/courses/${subject.slug}/`), __VUEPRESS_BASE__)
}
function continueLabel(slug) {
  const current = progress.value[slug]
  return current.statuses[current.continueLesson.id].state === 'learning' ? '继续学习' : current.started ? '开始下一课' : '开始第 1 课'
}
</script>

<template>
  <div class="subject-grid">
    <article v-for="subject in prepSubjects" :key="subject.slug" class="subject-card" :data-tone="subject.tone">
      <div class="subject-card__top"><span class="subject-mark" aria-hidden="true">{{ subject.mark }}</span><span class="learning-meta">{{ subject.count }} 节讲义</span></div>
      <h3><a :href="withBase(knowledge ? `/knowledge/${subject.slug}/` : `/courses/${subject.slug}/`)">{{ subject.name }} <span aria-hidden="true">↗</span></a></h3>
      <p>{{ knowledge ? subject.topics : subject.description }}</p>
      <div v-if="!knowledge" class="subject-progress" :class="{ 'is-empty': !progress[subject.slug].started }">
        <template v-if="progress[subject.slug].started">
          <div
            class="subject-progress__bar"
            role="progressbar"
            :aria-label="`${subject.name}已完成练习进度`"
            :aria-valuenow="progress[subject.slug].complete"
            aria-valuemin="0"
            :aria-valuemax="progress[subject.slug].total"
          ><span :style="{ width: `${(progress[subject.slug].complete / progress[subject.slug].total) * 100}%` }" /></div>
          <p class="learning-meta">
            已完成练习 {{ progress[subject.slug].complete }}/{{ progress[subject.slug].total }} 课<template v-if="progress[subject.slug].learning"> · {{ progress[subject.slug].learning }} 课学习中</template>
          </p>
        </template>
        <template v-else>
          <div class="subject-progress__bar" aria-hidden="true"><span style="width: 0" /></div>
          <p class="learning-meta">尚未开始 · 从第 1 课开始</p>
        </template>
      </div>
      <div class="subject-actions">
        <template v-if="knowledge">
          <a :href="withBase(`/knowledge/${subject.slug}/`)">浏览资料 <span aria-hidden="true">→</span></a>
          <a :href="withBase(`/courses/${subject.slug}/`)">课程与练习</a>
        </template>
        <template v-else>
          <a v-if="progress[subject.slug].continueLesson" class="subject-continue-link" :href="continueHref(subject)" :aria-label="`${continueLabel(subject.slug)}：${progress[subject.slug].continueLesson.title}`">{{ continueLabel(subject.slug) }} <span aria-hidden="true">→</span></a>
          <a :href="withBase(`/courses/${subject.slug}/`)">{{ progress[subject.slug].continueLesson ? '课程与进度' : '查看课程与复习' }}</a>
          <a :href="withBase(`/prep/${subject.prep}/`)">学习计划</a>
        </template>
      </div>
    </article>
  </div>
</template>
