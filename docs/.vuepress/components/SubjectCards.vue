<script setup>
import { computed } from 'vue'
import { withBase } from 'vuepress/client'
import { prepSubjects } from '../learning-data.mjs'
import { prepCatalog } from '../prep-catalog.mjs'
import { subjectProgress } from '../../../scripts/runtime/study-state.mjs'
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
</script>

<template>
  <div class="subject-grid">
    <article v-for="subject in prepSubjects" :key="subject.slug" class="subject-card" :data-tone="subject.tone">
      <div class="subject-card__top"><span class="subject-mark" aria-hidden="true">{{ subject.mark }}</span><span class="learning-meta">{{ subject.count }} 节讲义</span></div>
      <h3><a :href="withBase(knowledge ? `/knowledge/${subject.slug}/` : `/courses/${subject.slug}/`)">{{ subject.name }} <span aria-hidden="true">↗</span></a></h3>
      <p>{{ knowledge ? subject.topics : subject.description }}</p>
      <div v-if="!knowledge && progress[subject.slug].started" class="subject-progress">
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
      </div>
      <div class="subject-actions">
        <a :href="withBase(knowledge ? `/knowledge/${subject.slug}/` : `/courses/${subject.slug}/`)">{{ knowledge ? '浏览资料' : '课程与进度' }} <span aria-hidden="true">→</span></a>
        <a :href="withBase(knowledge ? `/courses/${subject.slug}/` : `/prep/${subject.prep}/`)">{{ knowledge ? '课程与练习' : '学习计划' }}</a>
      </div>
    </article>
  </div>
</template>
