<script setup>
import { computed, ref } from 'vue'
import { useRoute, withBase } from 'vuepress/client'
import { prepCatalog } from '../prep-catalog.mjs'
import { filterPrepLessons } from '../../../scripts/lib/prep-catalog.mjs'
import { useCourseFilters } from '../composables/useCourseFilters.mjs'
import { useStudyUpdates } from '../composables/useStudyUpdates.mjs'
import { subjectProgress, withStudyContext, matchesStudyFilter, STUDY_FILTERS } from '../../../scripts/runtime/study-state.mjs'
import { makeSearchReturnTo } from '../lesson-search.mjs'
import CourseSearch from './CourseSearch.vue'

const props = defineProps({ slug: { type: String, required: true } })
const course = computed(() => prepCatalog[props.slug])
const route = useRoute()
const searchField = ref(null)
const { query, group, status, ready, currentQuery, reset } = useCourseFilters('', { withStatus: true })
const groups = computed(() => [...new Set(course.value.lessons.map((lesson) => lesson.group).filter(Boolean))])
const {revision,storage} = useStudyUpdates()
const progress = computed(() => { revision.value; return subjectProgress(props.slug, course.value.lessons, __VUEPRESS_BASE__, storage.value) })
const statuses = computed(() => progress.value.statuses)
const next = computed(() => progress.value.continueLesson)
const searched = computed(() => filterPrepLessons(course.value.lessons, query.value, group.value))
const matches = computed(() => searched.value.filter(lesson => matchesStudyFilter(statuses.value[lesson.id], status.value)))
const filters = computed(() => STUDY_FILTERS.map(filter => ({ ...filter, count: searched.value.filter(lesson => matchesStudyFilter(statuses.value[lesson.id], filter.value)).length })))
const filterLabel = computed(() => STUDY_FILTERS.find(filter => filter.value === status.value)?.label)
const isFiltered = computed(() => Boolean(query.value || group.value || status.value !== 'all'))
const origin = computed(() => makeSearchReturnTo(route.path, currentQuery.value, route.hash, __VUEPRESS_BASE__))
const continueHref = computed(() => next.value ? withStudyContext(progress.value.continueHref, origin.value, __VUEPRESS_BASE__) : '')
const nextLabel = computed(() => next.value && statuses.value[next.value.id].state === 'learning' ? '继续学习' : '开始下一课')
const studyAdvice = computed(() => ({
  'zsb-math': '先看定义域与适用条件，再独立做 4–6 题。能说清为什么这样变形，比记住答案更重要；次日用错题复测检查理解。',
  'zsb-english': '1–17 课侧重语法，18–24 课练篇章与输出，25–36 课为模拟材料自核对。长课按题组分次完成；阅读题要回到文章找证据。',
  'zsb-politics': '先闭卷回忆概念关系，再做章节题和材料提纲。无答案、存疑题不计分；部分章节原课件缺失，补学范围以课内来源提示为准。',
  'zsb-cs': '先手算程序输出，再运行核对；排序和指针题写出中间步骤。指针扩展、文件读写、归并与基数排序等缺口需结合教材补学。',
}[props.slug]))
const isReadingMock = lesson => props.slug === 'zsb-english' && Number(lesson.id) >= 25
function lessonHref(lesson,reading=false) {
  const extra = !reading && statuses.value[lesson.id]?.state === 'learning' ? { resume: '1' } : {}
  return withStudyContext(reading?lesson.href:lesson.interactive,origin.value,__VUEPRESS_BASE__,extra)
}
function resetFilters() { reset(); searchField.value?.focus() }
function actionLabel(lesson) {
  if (isReadingMock(lesson)) return '阅读并核对 →'
  const state = statuses.value[lesson.id]?.state
  return state === 'learning' ? '继续学习 →' : state === 'complete' ? '再练一遍 →' : '开始学习 →'
}
</script>

<template>
  <section class="prep-catalog" aria-label="课程目录">
    <div class="prep-catalog__intro">
      <div class="catalog-overview">
        <div><span class="learning-eyebrow">{{ progress.started ? '你的学习进度' : '从一节课开始' }}</span><p><strong>{{ progress.complete }}</strong><span> / {{ course.count }} 课已完成练习</span></p></div>
        <span class="learning-meta">{{ progress.learning }} 课学习中 · {{ progress.review }} 课待巩固</span>
      </div>
      <div class="catalog-progress" role="progressbar" :aria-label="`${course.subject}已完成练习进度`" :aria-valuenow="progress.complete" aria-valuemin="0" :aria-valuemax="course.count"><span :style="{ width: `${course.count ? progress.complete / course.count * 100 : 0}%` }" /></div>
      <div v-if="next" class="catalog-continue">
        <div><p class="learning-meta">{{ next.label }} · {{ progress.continueEntry ? '接着上次的位置' : nextLabel }}<span v-if="progress.continueEntry"> · {{ progress.continueEntry.mode === 'reading' ? '阅读讲义' : '互动课程' }}</span></p><h2>{{ next.title }}</h2><p v-if="progress.continueEntry?.chapter && progress.continueEntry.chapter !== progress.continueEntry.title" class="learning-meta">上次读到：{{ progress.continueEntry.chapter }}</p></div>
        <a class="learn-button" :href="continueHref">{{ nextLabel }} <span aria-hidden="true">→</span></a>
      </div>
      <div v-else class="catalog-continue">
        <div><h2>本轮练习已完成</h2><p class="learning-meta">{{ progress.review ? `还有 ${progress.review} 课需要巩固，再回顾一下薄弱点。` : '可以重新练习，或回到学习计划安排复测。' }}</p></div>
        <button v-if="progress.review" class="learn-button" type="button" @click="status = 'review'">查看待巩固 →</button>
      </div>
      <p class="catalog-progress-note learning-meta">进度保存在此设备 · 完成练习不等同于掌握</p>
    </div>
    <nav class="prep-catalog__tools" aria-label="课程资料与练习工具">
      <a :href="withBase(`/prep/${course.prep}/`)">学习计划</a>
      <a :href="withBase(`/knowledge/${slug}/`)">知识速查</a>
      <a :href="withBase(`/review/?subject=${slug}`)">错题复习</a>
      <a v-for="tool in course.tools.filter(t => !/错题/.test(t.title))" :key="tool.href" :href="withBase(tool.href)">{{ tool.title }} ↗</a>
    </nav>
    <p class="learning-meta catalog-study-advice">{{ studyAdvice }}</p>
    <div class="prep-catalog__toolbar" :aria-busy="!ready">
      <CourseSearch ref="searchField" :id="`${slug}-search`" v-model="query" :disabled="!ready" :label="`筛选${course.subject}讲义`" placeholder="输入课号或知识点" />
      <div v-if="groups.length > 1" class="course-filters" role="group" aria-label="讲义分类">
        <button :disabled="!ready" :aria-pressed="group === ''" @click="group = ''">全部</button>
        <button v-for="name in groups" :key="name" :disabled="!ready" :aria-pressed="group === name" @click="group = name">{{ name }}</button>
      </div>
    </div>
    <div class="catalog-state-filters" role="group" aria-label="学习状态筛选">
      <button v-for="filter in filters" :key="filter.value" type="button" :disabled="!ready" :aria-pressed="status === filter.value" @click="status = filter.value">{{ filter.label }} <span>{{ filter.count }}</span></button>
    </div>
    <div class="catalog-result-summary">
      <p class="learning-meta" aria-live="polite" aria-atomic="true">显示 {{ matches.length }} / {{ course.count }} 节讲义<span v-if="status !== 'all'"> · {{ filterLabel }}</span><span v-if="query"> · “{{ query }}”</span><span v-if="group"> · {{ group }}</span></p>
      <button v-if="isFiltered" type="button" class="catalog-reset" @click="resetFilters">重置筛选</button>
    </div>
    <p v-if="status === 'review'" class="learning-meta catalog-filter-hint">待巩固包含答错过或待核对的练习，也可能出现在已完成的课程中。</p>
    <ol v-if="matches.length" class="prep-catalog__lessons">
      <li v-for="lesson in matches" :key="lesson.id" :data-lesson-id="lesson.id" class="prep-catalog__lesson">
        <div>
          <span class="learning-meta">{{ lesson.group }} {{ lesson.label }}</span>
          <span class="lesson-status" :data-state="statuses[lesson.id].state">{{statuses[lesson.id].label}}<template v-if="statuses[lesson.id].total"> · {{statuses[lesson.id].answered}}/{{statuses[lesson.id].total}}</template></span>
          <a class="prep-catalog__title" :href="lessonHref(lesson)">{{ lesson.title }}</a>
          <p v-if="isReadingMock(lesson)" class="learning-meta">模拟材料 · 手动核对答案</p>
          <p v-if="statuses[lesson.id].reviewNeeded" class="learning-meta">{{statuses[lesson.id].reviewNeeded}} 题答错过或待核对</p>
        </div>
        <div class="prep-catalog__actions">
          <a :href="lessonHref(lesson)" :aria-label="`${isReadingMock(lesson) ? '阅读并核对' : '互动练习'}：${lesson.title}`">{{ actionLabel(lesson) }}</a>
          <a :href="lessonHref(lesson,true)" :aria-label="`阅读讲义：${lesson.title}`">阅读版</a>
        </div>
      </li>
    </ol>
    <div v-else class="learning-empty">
      <h2>当前条件下没有讲义</h2>
      <p><template v-if="query">没有找到含“{{ query }}”的{{ status === 'all' ? '' : filterLabel }}讲义。</template><template v-else>当前{{ group ? `“${group}”分类下` : '' }}没有{{ status === 'all' ? '匹配的' : filterLabel }}讲义。</template>可以换个关键词，或查看全部课程。</p>
      <button class="learn-button is-secondary" type="button" @click="resetFilters">清除全部筛选</button>
    </div>
    <p class="learning-meta catalog-updated">{{ course.count }} 节讲义 · 内容更新 {{ course.updatedAt }}</p>
  </section>
</template>
