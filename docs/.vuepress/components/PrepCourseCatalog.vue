<script setup>
import { computed, ref } from 'vue'
import { withBase } from 'vuepress/client'
import { prepCatalog } from '../prep-catalog.mjs'
import { filterPrepLessons } from '../../../scripts/lib/prep-catalog.mjs'

const props = defineProps({ slug: { type: String, required: true } })
const course = computed(() => prepCatalog[props.slug])
const query = ref('')
const group = ref('')
const groups = computed(() => [...new Set(course.value.lessons.map((lesson) => lesson.group).filter(Boolean))])
const matches = computed(() => filterPrepLessons(course.value.lessons, query.value, group.value))
</script>

<template>
  <section class="prep-catalog" aria-label="课程目录">
    <div class="prep-catalog__intro">
      <p class="learning-meta">{{ course.count }} 节讲义 · 内容更新 {{ course.updatedAt }}</p>
      <p>按知识点找到一课，先读讲义，再用互动练习检验理解。</p>
      <div class="subject-actions">
        <a :href="withBase(course.interactive)">开始互动学习 →</a>
        <a :href="withBase(`/prep/${course.prep}/`)">{{ course.subject }}学习计划</a>
        <a :href="withBase('/prep/')">备考中心</a>
      </div>
    </div>
    <nav v-if="course.tools.length" class="prep-catalog__tools" aria-label="练习与复习工具">
      <span>练习与复习</span>
      <a v-for="tool in course.tools" :key="tool.href" :href="withBase(tool.href)">{{ tool.title }} ↗</a>
    </nav>
    <div class="prep-catalog__toolbar">
      <label class="course-search">
        <span class="sr-only">筛选{{ course.subject }}讲义</span>
        <input v-model="query" type="search" :aria-label="`筛选${course.subject}讲义`" placeholder="输入课号或知识点" />
      </label>
      <div v-if="groups.length > 1" class="course-filters" role="group" aria-label="讲义分类">
        <button :aria-pressed="group === ''" @click="group = ''">全部</button>
        <button v-for="name in groups" :key="name" :aria-pressed="group === name" @click="group = name">{{ name }}</button>
      </div>
    </div>
    <p class="learning-meta" aria-live="polite">显示 {{ matches.length }} / {{ course.count }} 节讲义</p>
    <ol v-if="matches.length" class="prep-catalog__lessons">
      <li v-for="lesson in matches" :key="lesson.id" class="prep-catalog__lesson">
        <div>
          <span class="learning-meta">{{ lesson.group }} {{ lesson.label }}</span>
          <a class="prep-catalog__title" :href="withBase(lesson.href)">{{ lesson.title }}</a>
        </div>
        <div class="prep-catalog__actions">
          <a :href="withBase(lesson.href)" :aria-label="`阅读讲义：${lesson.title}`">阅读讲义</a>
          <a :href="withBase(lesson.interactive)" :aria-label="`互动练习：${lesson.title}`">互动练习 →</a>
        </div>
      </li>
    </ol>
    <div v-else class="learning-empty">
      <p>没有找到对应讲义，试试更短的知识点名称。</p>
      <button class="learn-button is-secondary" @click="query = ''; group = ''">清除筛选</button>
    </div>
  </section>
</template>
