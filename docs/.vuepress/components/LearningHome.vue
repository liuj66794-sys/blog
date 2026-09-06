<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { withBase } from 'vuepress/client'
import { prepSubjects, topicCourses } from '../learning-data.mjs'
import { readRecent, resumeUrl, READING_EVENT } from '../../../scripts/runtime/reading-state.mjs'
import SubjectCards from './SubjectCards.vue'

const recent = ref(null)
const total = prepSubjects.reduce((sum, subject) => sum + subject.count, 0)
const resume = computed(() => resumeUrl(recent.value, __VUEPRESS_BASE__))
const stamp = computed(() => recent.value ? new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(recent.value.updatedAt) : '')
function refresh() { recent.value = readRecent(__VUEPRESS_BASE__) }
onMounted(() => {
  refresh()
  window.addEventListener('pageshow', refresh)
  window.addEventListener('storage', refresh)
  window.addEventListener(READING_EVENT, refresh)
})
onUnmounted(() => {
  window.removeEventListener('pageshow', refresh)
  window.removeEventListener('storage', refresh)
  window.removeEventListener(READING_EVENT, refresh)
})
</script>

<template>
  <main class="learning-surface learning-home">
    <header class="study-welcome">
      <div><p class="learning-eyebrow">L1U.J / 学习空间</p><h1>今天，继续学一点。</h1><p class="study-welcome__lead">读懂一个概念，做好一道练习。让理解慢慢积累。</p></div>
      <span class="study-welcome__meta">4 门备考课程 <span aria-hidden="true">·</span> {{ total }} 课</span>
    </header>

    <div class="study-start-grid">
      <section class="study-resume" aria-labelledby="resume-heading">
        <div class="study-resume__top"><span class="study-label"><span class="status-dot" />{{ recent ? '接着上次，继续往前' : '从一节课开始' }}</span><span class="study-resume__number" aria-hidden="true">01</span></div>
        <template v-if="recent">
          <p class="study-resume__subject">{{ recent.subject }} <span> / {{ recent.mode === 'interactive' ? '互动课程' : '阅读讲义' }}</span></p>
          <h2 id="resume-heading">{{ recent.title }}</h2>
          <p class="study-resume__context">{{ recent.chapter && recent.chapter !== recent.title ? `上次读到：${recent.chapter}` : '回到上次的阅读位置，接着完成这一课。' }}</p>
          <div class="learning-buttons"><a class="learn-button" :href="resume">继续学习 <span aria-hidden="true">→</span></a><a class="learning-text-link" :href="withBase(`/courses/${recent.slug}/`)">课程目录</a></div>
          <p class="study-resume__footnote">最近学习 {{ stamp }} <span>· 记录保存在此设备</span></p>
        </template>
        <template v-else>
          <h2 id="resume-heading">选一门课，<br>开始今天的学习。</h2>
          <p class="study-resume__context">阅读与练习在同一页。下次回来，可以接着上次的位置继续。</p>
          <div class="study-first-subjects"><a v-for="subject in prepSubjects" :key="subject.slug" :href="withBase(subject.interactive)"><span>{{ subject.short }}</span><span aria-hidden="true">↗</span></a></div>
          <p class="study-resume__footnote">从感兴趣的一课开始，也可以按章节循序渐进。</p>
        </template>
      </section>

      <aside class="study-week" aria-labelledby="week-heading">
        <div class="study-week__top"><Icon name="ph:calendar-blank" size="24" /><span class="learning-meta">学习有节奏</span></div>
        <h2 id="week-heading">给本周，<br>一个小目标。</h2>
        <p>看看四科计划，安排学习与回顾的时间。</p>
        <a class="learning-text-link" :href="withBase('/prep/')">查看本周计划 <span aria-hidden="true">→</span></a>
        <div class="study-week__loop"><span>理解</span><span aria-hidden="true">→</span><span>练习</span><span aria-hidden="true">→</span><span>回顾</span></div>
      </aside>
    </div>

    <section class="learning-section" aria-labelledby="home-prep-heading">
      <div class="learning-section__heading"><div><p class="learning-eyebrow">系统备考</p><h2 id="home-prep-heading">你的四门课程</h2></div><a class="learning-text-link" :href="withBase('/courses/')">全部课程 <span aria-hidden="true">→</span></a></div>
      <SubjectCards />
    </section>

    <section class="learning-section" aria-labelledby="home-topics-heading">
      <div class="learning-section__heading"><div><p class="learning-eyebrow">持续探索</p><h2 id="home-topics-heading">课本之外，也有好奇心</h2></div></div>
      <div class="topic-grid"><article v-for="course in topicCourses.filter(c => c.group !== '已归档')" :key="course.slug" class="topic-card"><span class="topic-card__number" aria-hidden="true">{{ course.mark }}</span><h3><a :href="withBase(course.interactive)">{{ course.name }}</a></h3><p>{{ course.description }}</p><a class="learning-text-link" :href="withBase(course.interactive)">开始学习 <span aria-hidden="true">→</span></a></article></div>
    </section>

    <div class="study-library-links"><a :href="withBase('/knowledge/')"><Icon name="ph:books" size="24" /><span><strong>知识库</strong><small>概念、速查与参考资料</small></span><span aria-hidden="true">↗</span></a><a :href="withBase('/blog/')"><Icon name="ph:pencil-line" size="24" /><span><strong>学习手记</strong><small>留下自己的理解，也记录问题</small></span><span aria-hidden="true">↗</span></a></div>
    <div class="learning-project-footer"><span>学习、实践，也把想法做成作品。</span><a :href="withBase('/projects/')">查看项目</a><a :href="withBase('/hire/')">找我开发 <span aria-hidden="true">↗</span></a></div>
  </main>
</template>
