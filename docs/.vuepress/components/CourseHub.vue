<script setup>
import { computed } from 'vue'
import { useRoute, withBase } from 'vuepress/client'
import { prepSubjects, topicCourses } from '../learning-data.mjs'
import {
  appendReturnTo,
  buildLessonSearchIndex,
  makeSearchReturnTo,
  searchLessons,
} from '../lesson-search.mjs'
import { lessonSearchIndex } from '../lesson-search-index.mjs'
import { base } from '../site-meta.mjs'
import { useCourseFilters } from '../composables/useCourseFilters.mjs'

const { query, group, ready } = useCourseFilters('全部')
const route = useRoute()
const groups = ['全部', '专升本备考', '专题学习', '已归档']
const courseMeta = [
  ...prepSubjects.map((subject) => ({ ...subject, group: '专升本备考' })),
  ...topicCourses,
]
const courseMetaBySlug = new Map(courseMeta.map((course) => [course.slug, course]))
const index = buildLessonSearchIndex(lessonSearchIndex)

const matches = computed(() => searchLessons(index, query.value, { group: group.value }).map((result) => {
  const meta = courseMetaBySlug.get(result.slug) ?? {}
  return {
    ...result,
    ...meta,
    group: result.group || meta.group,
    lessonCount: result.lessonCount || meta.count || 0,
    lessonRange: result.lessonRange || (meta.count ? `${meta.count} 节讲义` : ''),
    courseHref: result.courseHref || `/courses/${result.slug}/`,
    interactiveHref: result.interactiveHref || meta.interactive || '',
  }
}))

const matchedItems = computed(() => matches.value.reduce((sum, course) => sum + course.matchedCount, 0))
const hasQuery = computed(() => Boolean(query.value.trim()))
const hasSearchContext = computed(() => hasQuery.value || group.value !== '全部')
const returnTo = computed(() => hasSearchContext.value
  ? makeSearchReturnTo(route.path, route.query, route.hash, base)
  : '')

function linkFor(path) {
  return withBase(appendReturnTo(path, returnTo.value))
}

function hitLink(hit) {
  return linkFor(hit.interactiveHref || hit.readingHref)
}
</script>

<template>
  <main class="learning-surface learning-hub">
    <header class="learning-page-heading">
      <p class="learning-eyebrow">COURSES / 课程</p>
      <h1>找到今天想学的一课。</h1>
      <p>按科目、课次或知识点查找；命中后可以直接开始练习，也可以打开阅读版专注查阅。</p>
    </header>

    <div class="course-toolbar" :aria-busy="!ready">
      <div class="course-filters" role="group" aria-label="课程分类">
        <button v-for="name in groups" :key="name" type="button" :disabled="!ready" :aria-pressed="group === name" @click="group = name">
          {{ name }}
        </button>
      </div>
      <label class="course-search">
        <Icon name="ph:magnifying-glass" size="19" aria-hidden="true" />
        <span class="sr-only">查找课程、课次或知识点</span>
        <input v-model="query" type="search" :disabled="!ready" :placeholder="ready?'查找课程、课次或知识点':'正在加载筛选…'" aria-label="查找课程、课次或知识点">
      </label>
    </div>

    <p class="learning-meta course-results" aria-live="polite">
      <template v-if="hasQuery">
        找到 {{ matches.length }} 门课程
        <span v-if="matchedItems"> · {{ matchedItems }} 个命中课次或资料</span>
        <span v-else-if="matches.length"> · 命中课程名称或简介</span>
      </template>
      <template v-else>
        {{ matches.length }} 门课程
        <span v-if="group === '全部'"> · 历史课程收录在「已归档」</span>
      </template>
    </p>

    <div v-if="matches.length" class="catalog-grid" :class="{'is-searching':hasQuery}">
      <article v-for="course in matches" :key="course.slug" class="subject-card course-result" :data-tone="course.tone">
        <div class="subject-card__top">
          <span class="subject-mark" aria-hidden="true">{{ course.mark }}</span>
          <span class="learning-meta">{{ course.group }} · {{ course.lessonRange }}</span>
        </div>

        <h2><a :href="linkFor(course.courseHref)">{{ course.name }}</a></h2>
        <p>{{ course.description }}</p>
        <small class="course-topics">{{ course.topics }}</small>

        <p v-if="!hasQuery" class="course-result__scope">
          可查 {{ course.lessonRange }}<span v-if="course.references.length"> · {{ course.references.length }} 份速查资料</span>
        </p>

        <section v-if="hasQuery && (course.lessons.length || course.references.length)" class="course-result__hits" :aria-labelledby="`hits-${course.slug}`">
          <h3 :id="`hits-${course.slug}`">命中课次与资料</h3>
          <ol class="course-hit-list">
            <li v-for="hit in [...course.lessons, ...course.references]" :key="`${course.slug}-${hit.id}`" class="course-hit">
              <div class="course-hit__body">
                <div class="course-hit__meta">
                  <span class="course-hit__kind">{{ hit.kindLabel }}</span>
                  <span>{{ hit.label }}</span>
                  <span v-if="hit.group">· {{ hit.group }}</span>
                </div>
                <a class="course-hit__title" :href="hitLink(hit)">{{ hit.title }}</a>
                <p v-if="hit.chapterHits.length" class="course-hit__chapters">
                  命中章节：<span v-for="chapter in hit.chapterHits" :key="chapter.heading">{{ chapter.heading }}</span>
                </p>
              </div>
              <div class="course-hit__actions">
                <a v-if="hit.interactiveHref" :href="linkFor(hit.interactiveHref)" :aria-label="`开始练习：${hit.title}`">开始练习 →</a>
                <a v-if="hit.readingHref" :href="linkFor(hit.readingHref)" :aria-label="`${hit.kind === 'reference' ? '查看速查' : '查看讲义'}：${hit.title}`">
                  {{ hit.kind === 'reference' ? '查看速查' : '查看讲义' }}
                </a>
              </div>
            </li>
          </ol>
        </section>

        <p v-else-if="hasQuery" class="course-result__course-match">命中课程名称或简介 · 可从课程目录继续查找 {{ course.lessonRange }}</p>

        <div class="subject-actions">
          <a :href="linkFor(course.interactiveHref)">互动学习 <span aria-hidden="true">→</span></a>
          <a :href="linkFor(course.courseHref)">课程目录 / 阅读版</a>
        </div>
      </article>
    </div>

    <div v-else class="learning-empty">
      <h2>暂时没有匹配的课程</h2>
      <p>试试“洛必达”“极限”“英语”或课号，也可以清除筛选。</p>
      <button class="learn-button is-secondary" type="button" @click="query = ''; group = '全部'">查看全部课程</button>
    </div>

    <aside class="learning-note">
      <div>
        <h2>读懂 → 练习 → 回顾</h2>
        <p>在一节课里完成阅读与练习，再用自己的话解释一遍。</p>
      </div>
      <a class="learning-text-link" :href="withBase('/prep/')">安排本周学习 <span aria-hidden="true">→</span></a>
    </aside>
  </main>
</template>

<style scoped>
.catalog-grid.is-searching { grid-template-columns: minmax(0,1fr); }
.is-searching .course-hit__title { font-size:16px; }
.is-searching .course-hit__meta,.is-searching .course-hit__chapters { font-size:12px; }
.course-result__scope,
.course-result__course-match {
  margin-top: 14px;
  color: var(--learn-muted);
  font-size: 12px;
  line-height: 1.7;
}

.course-result__hits {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--learn-line);
}

.course-result__hits h3 {
  margin: 0 0 10px;
  color: var(--learn-muted);
  font-size: 12px;
  font-weight: 600;
}

.course-hit-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.course-hit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--learn-line);
  border-radius: 10px;
  background: var(--learn-soft);
}

.course-hit__body {
  min-width: 0;
}

.course-hit__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 7px;
  color: var(--learn-muted);
  font-size: 11px;
  line-height: 1.6;
}

.course-hit__kind {
  color: var(--vp-c-brand-1);
  font-weight: 650;
}

.course-hit__title {
  display: block;
  margin-top: 3px;
  color: var(--learn-ink) !important;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.course-hit__chapters {
  margin: 5px 0 0;
  color: var(--learn-muted);
  font-size: 11px;
  line-height: 1.65;
}

.course-hit__chapters span + span::before {
  content: ' · ';
}

.course-hit__actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px 12px;
}

.course-hit__actions a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--vp-c-brand-1);
  font-size: 12px;
  white-space: nowrap;
}

.course-hit__actions a + a {
  color: var(--learn-muted);
}

@media (max-width: 700px) {
  .course-hit {
    grid-template-columns: 1fr;
  }

  .course-hit__actions {
    justify-content: flex-start;
  }
}
</style>
