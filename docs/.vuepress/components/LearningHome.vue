<script setup>
import { withBase } from 'vuepress/client'
import { learningEntrances, prepSubjects, topicCourses } from '../learning-data.mjs'
import SubjectCards from './SubjectCards.vue'
</script>

<template>
  <main class="learning-surface learning-home">
    <section class="learning-hero" aria-labelledby="home-heading">
      <div class="learning-hero__copy">
        <p class="learning-eyebrow"><span class="status-dot" /> L1U.J 的学习空间</p>
        <h1 id="home-heading">把知识学明白。<br><span>把想法做出来。</span></h1>
        <p class="learning-lead">从一节讲义、一道练习开始。<br>在这里学习、回顾，把每一次理解慢慢积累起来。</p>
        <div class="learning-buttons"><a class="learn-button" :href="withBase('/courses/')">开始学习 <span aria-hidden="true">→</span></a><a class="learn-button is-secondary" :href="withBase('/knowledge/')">浏览知识库</a></div>
        <p class="hero-footnote">课程讲义 / 互动练习 / 学习手记</p>
      </div>
      <aside class="study-board" aria-labelledby="study-board-heading">
        <div class="study-board__header"><span>FOCUS / 专升本</span><span class="board-dot" aria-hidden="true" /></div>
        <h2 id="study-board-heading">为下一个目标，<br>踏实向前一步。</h2>
        <p>四门课程，一条清晰的学习路径。</p>
        <div class="study-board__subjects"><a v-for="s in prepSubjects" :key="s.slug" :href="withBase(`/courses/${s.slug}/`)"><span>{{ s.short }}</span><span>{{ s.count }} 课 <span aria-hidden="true">↗</span></span></a></div>
        <a class="study-board__footer" :href="withBase('/prep/')">进入备考中心 <span aria-hidden="true">→</span></a>
      </aside>
    </section>

    <nav class="learning-entrances" aria-label="学习快捷入口"><a v-for="item in learningEntrances" :key="item.href" :href="withBase(item.href)"><Icon :name="item.icon" size="23" /><span><strong>{{ item.title }}</strong><small>{{ item.subtitle }}</small></span><span aria-hidden="true">↗</span></a></nav>

    <section class="learning-section" aria-labelledby="home-prep-heading">
      <div class="learning-section__heading"><div><p class="learning-eyebrow">01 / 系统备考</p><h2 id="home-prep-heading">选一门课，开始今天的学习</h2></div><a class="learning-text-link" :href="withBase('/prep/')">查看学习计划 <span aria-hidden="true">→</span></a></div>
      <SubjectCards />
    </section>

    <section class="learning-section" aria-labelledby="home-topics-heading">
      <div class="learning-section__heading"><div><p class="learning-eyebrow">02 / 持续探索</p><h2 id="home-topics-heading">课本之外，也有好奇心</h2></div><a class="learning-text-link" :href="withBase('/courses/')">全部课程 <span aria-hidden="true">→</span></a></div>
      <div class="topic-grid"><a v-for="s in topicCourses.filter(c => c.group !== '已归档')" :key="s.slug" class="topic-card" :href="withBase(`/courses/${s.slug}/`)"><span class="topic-card__number" aria-hidden="true">{{ s.mark }}</span><h3>{{ s.name }}</h3><p>{{ s.description }}</p><span class="learning-text-link">查看课程 <span aria-hidden="true">→</span></span></a></div>
    </section>

    <section class="learning-note" aria-labelledby="home-note-heading"><div><p class="learning-eyebrow">LEARN · BUILD · REFLECT</p><h2 id="home-note-heading">学过的东西，留下自己的理解。</h2><p>阅读学习手记，看看概念如何在练习与项目中变得具体。</p></div><a class="learn-button is-secondary" :href="withBase('/blog/')">阅读手记 <span aria-hidden="true">→</span></a></section>
    <div class="learning-project-footer"><span>也在用代码把想法变成作品。</span><a :href="withBase('/projects/')">查看项目</a><a :href="withBase('/hire/')">找我开发 <span aria-hidden="true">↗</span></a></div>
  </main>
</template>
