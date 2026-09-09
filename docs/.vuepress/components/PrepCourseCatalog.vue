<script setup>
import { computed } from 'vue'
import { withBase } from 'vuepress/client'
import { prepCatalog } from '../prep-catalog.mjs'
import { filterPrepLessons } from '../../../scripts/lib/prep-catalog.mjs'
import { useCourseFilters } from '../composables/useCourseFilters.mjs'
import { useStudyUpdates } from '../composables/useStudyUpdates.mjs'
import { lessonStatus, withStudyContext } from '../../../scripts/runtime/study-state.mjs'

const props = defineProps({ slug: { type: String, required: true } })
const course = computed(() => prepCatalog[props.slug])
const { query, group, ready } = useCourseFilters()
const groups = computed(() => [...new Set(course.value.lessons.map((lesson) => lesson.group).filter(Boolean))])
const matches = computed(() => filterPrepLessons(course.value.lessons, query.value, group.value))
const {revision,storage} = useStudyUpdates()
const statuses = computed(()=>{revision.value;return Object.fromEntries(course.value.lessons.map(lesson=>[lesson.id,lessonStatus(props.slug,lesson,__VUEPRESS_BASE__,storage.value)]))})
const next = computed(()=>course.value.lessons.find(lesson=>statuses.value[lesson.id].state==='learning') || course.value.lessons.find(lesson=>statuses.value[lesson.id].state==='new') || course.value.lessons[0])
const completed = computed(()=>Object.values(statuses.value).filter(status=>status.state==='complete').length)
function lessonHref(lesson,reading=false) {
  const params = new URLSearchParams()
  if(query.value) params.set('q',query.value)
  if(group.value) params.set('group',group.value)
  const origin = withBase(`/courses/${props.slug}/`) + (params.size ? '?' + params : '')
  const extra = !reading && statuses.value[lesson.id]?.state === 'learning' ? { resume: '1' } : {}
  return withStudyContext(reading?lesson.href:lesson.interactive,origin,__VUEPRESS_BASE__,extra)
}
function actionLabel(lesson) {
  const state = statuses.value[lesson.id]?.state
  return state === 'learning' ? '继续学习 →' : state === 'complete' ? '再练一遍 →' : '开始学习 →'
}
</script>

<template>
  <section class="prep-catalog" aria-label="课程目录">
    <div class="prep-catalog__intro">
      <p class="learning-meta">{{ course.count }} 节讲义 · 内容更新 {{ course.updatedAt }}</p>
      <p>章节、练习和学习状态集中在这里；每一课都可以开始互动练习或查看完整讲义。</p>
      <p class="learning-meta">{{completed}} / {{course.count}} 课已完成练习 · 完成情况依据本轮作答，不等同于掌握</p>
      <div class="subject-actions">
        <a v-if="next" :href="lessonHref(next)">继续：{{next.label}} {{next.title}} →</a>
        <a :href="withBase(`/prep/${course.prep}/`)">{{ course.subject }}学习计划</a>
        <a :href="withBase('/prep/')">备考中心</a>
        <a :href="withBase(`/knowledge/${slug}/`)">知识速查</a>
      </div>
    </div>
    <nav v-if="course.tools.length" class="prep-catalog__tools" aria-label="练习与复习工具">
      <span>练习与复习</span>
      <a v-for="tool in course.tools" :key="tool.href" :href="withBase(tool.href)">{{ tool.title }} ↗</a>
    </nav>
    <div class="prep-catalog__toolbar" :aria-busy="!ready">
      <label class="course-search">
        <span class="sr-only">筛选{{ course.subject }}讲义</span>
        <input v-model="query" type="search" :disabled="!ready" :aria-label="`筛选${course.subject}讲义`" :placeholder="ready?'输入课号或知识点':'正在加载筛选…'" />
      </label>
      <div v-if="groups.length > 1" class="course-filters" role="group" aria-label="讲义分类">
        <button :disabled="!ready" :aria-pressed="group === ''" @click="group = ''">全部</button>
        <button v-for="name in groups" :key="name" :disabled="!ready" :aria-pressed="group === name" @click="group = name">{{ name }}</button>
      </div>
    </div>
    <p class="learning-meta" aria-live="polite">显示 {{ matches.length }} / {{ course.count }} 节讲义</p>
    <ol v-if="matches.length" class="prep-catalog__lessons">
      <li v-for="lesson in matches" :key="lesson.id" class="prep-catalog__lesson">
        <div>
          <span class="learning-meta">{{ lesson.group }} {{ lesson.label }}</span>
          <span class="lesson-status" :data-state="statuses[lesson.id].state">{{statuses[lesson.id].label}}<template v-if="statuses[lesson.id].total"> · {{statuses[lesson.id].answered}}/{{statuses[lesson.id].total}}</template></span>
          <a class="prep-catalog__title" :href="lessonHref(lesson)">{{ lesson.title }}</a>
          <p v-if="statuses[lesson.id].reviewNeeded" class="learning-meta">{{statuses[lesson.id].reviewNeeded}} 题答错过或待核对</p>
        </div>
        <div class="prep-catalog__actions">
          <a :href="lessonHref(lesson)" :aria-label="`互动练习：${lesson.title}`">{{ actionLabel(lesson) }}</a>
          <a :href="lessonHref(lesson,true)" :aria-label="`阅读讲义：${lesson.title}`">阅读版</a>
        </div>
      </li>
    </ol>
    <div v-else class="learning-empty">
      <p>没有找到对应讲义，试试更短的知识点名称。</p>
      <button class="learn-button is-secondary" @click="query = ''; group = ''">清除筛选</button>
    </div>
  </section>
</template>
