/* quiz.js — 课程互动组件：选择题测验、回忆卡、本课进度、进度存储
 *
 * 用法：
 * 1. 选择题
 *    <div class="quiz" data-answer="B">
 *      <span class="quiz-no">随堂测 1</span>
 *      <p class="quiz-q">题干……</p>
 *      <div class="quiz-opts">
 *        <button data-k="A">选项A</button> …
 *      </div>
 *      <div class="quiz-verdict"></div>
 *      <div class="quiz-exp">解析（答对后显示）</div>
 *    </div>
 * 2. 回忆卡
 *    <div class="recall">
 *      <span class="recall-tag">回忆卡</span>
 *      <p class="recall-q">先回忆……</p>
 *      <div class="recall-a">答案</div>
 *      <div class="recall-actions">
 *        <button class="reveal-btn">先回忆，再揭晓</button>
 *        <button class="good-btn">记住了</button>
 *        <button class="bad-btn">没记住</button>
 *      </div>
 *      <div class="self-msg"></div>
 *    </div>
 * 3. 进度条（可选）
 *    <div class="lesson-progress" data-total-quiz="4" data-total-recall="3"></div>
 * 4. 页面 body 标记 <body data-lesson-id="0001">，进度按此记录。
 */
(function () {
  'use strict';

  window.ZC = window.ZC || {};

  var STORE_KEY = 'zc-progress-v1';
  var LESSON_ID = (document.body && document.body.dataset.lessonId) ||
    (location.pathname.split('/').pop() || 'index');

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveAll(d) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) { /* 隐私模式等 */ }
  }
  function rec() {
    var d = loadAll();
    if (!d[LESSON_ID]) d[LESSON_ID] = { visits: 0, quizRight: 0, quizTotal: 0, recallOk: 0, recallNo: 0 };
    return d[LESSON_ID];
  }
  function commit(r) {
    var d = loadAll();
    d[LESSON_ID] = r;
    saveAll(d);
    ZC.refreshProgress();
    document.dispatchEvent(new CustomEvent('zc-progress'));
  }

  /* 标记访问（每次会话只记一次） */
  function markVisit() {
    try {
      if (!sessionStorage.getItem('zc-visited-' + LESSON_ID)) {
        sessionStorage.setItem('zc-visited-' + LESSON_ID, '1');
        var r = rec();
        r.visits = (r.visits || 0) + 1;
        commit(r);
      }
    } catch (e) { /* sessionStorage 不可用则跳过 */ }
  }

  /* ---------- 选择题 ---------- */
  function setupQuiz(quiz) {
    var answer = quiz.dataset.answer;
    var opts = quiz.querySelectorAll('.quiz-opts button');
    var verdict = quiz.querySelector('.quiz-verdict');
    var exp = quiz.querySelector('.quiz-exp');
    var attempts = 0;

    opts.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (quiz.classList.contains('done')) return;
        attempts++;
        var k = btn.dataset.k;
        if (k === answer) {
          btn.classList.add('correct');
          opts.forEach(function (b) { b.disabled = true; });
          quiz.classList.add('done');
          /* 计分在答对时结算：首次点击即答对记 right */
          var r = rec();
          if (quiz.dataset.counted !== '1') {
            r.quizTotal++;
            if (attempts === 1) r.quizRight++;
            quiz.dataset.counted = '1';
          }
          if (verdict) {
            verdict.textContent = attempts === 1 ? '✓ 一次答对，漂亮！' : '✓ 答对了（第一次选错了，别急，看清错在哪）';
            verdict.className = 'quiz-verdict ok';
          }
          commit(r);
        } else {
          btn.classList.add('wrong');
          if (verdict) {
            verdict.textContent = '✗ 再想想——先别急着看解析。';
            verdict.className = 'quiz-verdict no';
          }
        }
      });
    });
  }

  /* ---------- 回忆卡 ---------- */
  function setupRecall(card) {
    var reveal = card.querySelector('.reveal-btn');
    var good = card.querySelector('.good-btn');
    var bad = card.querySelector('.bad-btn');
    var msg = card.querySelector('.self-msg');

    if (reveal) reveal.addEventListener('click', function () {
      card.classList.add('shown');
      if (window.ZC.renderMath) ZC.renderMath(card);
    });
    if (good) good.addEventListener('click', function () {
      if (card.dataset.voted) return;
      card.dataset.voted = '1';
      card.classList.add('voted-good');
      var r = rec(); r.recallOk++; commit(r);
      if (msg) msg.textContent = '已记录。隔天和一周后回来再测这张卡。';
    });
    if (bad) bad.addEventListener('click', function () {
      if (card.dataset.voted) return;
      card.dataset.voted = '1';
      card.classList.add('voted-bad');
      var r = rec(); r.recallNo++; commit(r);
      if (msg) msg.textContent = '已记录——"没记住"的卡才是最值得练的。建议现在重读一遍，明天再来。';
    });
  }

  /* ---------- 本课进度条 ---------- */
  function setupProgress(bar) {
    bar.dataset.totalQuiz = bar.dataset.totalQuiz ||
      String(document.querySelectorAll('.quiz').length);
    bar.dataset.totalRecall = bar.dataset.totalRecall ||
      String(document.querySelectorAll('.recall').length);
    ZC.refreshProgress();
  }

  ZC.refreshProgress = function () {
    document.querySelectorAll('.lesson-progress').forEach(function (bar) {
      var r = loadAll()[LESSON_ID] || {};
      var tq = parseInt(bar.dataset.totalQuiz || '0', 10);
      var tr = parseInt(bar.dataset.totalRecall || '0', 10);
      var parts = [];
      if (tq > 0) parts.push('随堂测 ' + (r.quizRight || 0) + '/' + tq + ' 首次答对');
      if (tr > 0) parts.push('回忆卡 ' + ((r.recallOk || 0) + (r.recallNo || 0)) + '/' + tr + ' 已测');
      if (parts.length) bar.textContent = '📊 ' + parts.join(' · ');
    });
  };

  /* ---------- 首页课程地图（可选） ---------- */
  ZC.decorateIndex = function () {
    var d = loadAll();
    document.querySelectorAll('a[data-lesson]').forEach(function (a) {
      var id = a.dataset.lesson;
      var li = a.closest('li');
      if (!li) return;
      var st = li.querySelector('.status');
      var r = d[id];
      if (r && r.visits) {
        a.classList.add('visited');
        var bits = [];
        if (r.visits) bits.push('学过' + (r.visits > 1 ? '×' + r.visits : ''));
        if ((r.quizTotal || 0) + (r.recallOk || 0) + (r.recallNo || 0) > 0) {
          if (r.quizTotal) bits.push('测 ' + r.quizRight + '/' + r.quizTotal);
          var rc = (r.recallOk || 0) + (r.recallNo || 0);
          if (rc) bits.push('卡 ' + (r.recallOk || 0) + '/' + rc);
        }
        if (st) { st.textContent = '✓ ' + bits.join(' · '); st.className = 'status visited'; }
      }
    });
  };

  function init() {
    markVisit();
    document.querySelectorAll('.quiz').forEach(setupQuiz);
    document.querySelectorAll('.recall').forEach(setupRecall);
    document.querySelectorAll('.lesson-progress').forEach(setupProgress);
    if (document.body.dataset.indexPage === '1') ZC.decorateIndex();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
