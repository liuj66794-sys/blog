/* 专升本计算机课程 — 测验组件 v2
   用法（与 v1 完全兼容，课程页面无需改动）:
   <div class="quiz" data-answer="b">
     <p class="quiz-q">题干</p>
     <ol class="quiz-opts" type="A">
       <li data-opt="a">选项A</li>
       <li data-opt="b">选项B</li>
     </ol>
     <p class="quiz-feedback"></p>
     <p class="quiz-expl">解析(答完后显示)</p>
   </div>
   选项文字应保持字数一致,避免格式泄题。
   v2 行为:
   - 答错先不揭示答案:标红后允许再选一次,第二次仍错才揭示正确答案与解析(保留检索练习的提取效果);
   - 每次答错自动记入 localStorage(键 zsb-mistakes-v1,课号→题号),由 lessons/mistakes.html 错题本汇总;
   - 曾答错的题重新答对一次即自动标记「已订正」;刷新或下次打开可重做任何题;
   - 全部题目之后自动注入「本课测验小结」面板(含打开错题本、清空本课记录);
   - 支持 lesson.html#qN 深链:打开时自动滚动到对应题并高亮(错题本「重做该题」用)。 */
(function () {
  var STORE = 'zsb-mistakes-v1';

  function lessonNum() {
    var m = location.pathname.match(/(\d{4})[^/\\]*\.html?$/);
    return m ? m[1] : null;
  }
  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function saveAll(all) {
    try { localStorage.setItem(STORE, JSON.stringify(all)); } catch (e) {}
  }
  function qText(quiz) {
    var q = quiz.querySelector('.quiz-q');
    if (!q) return '';
    var clone = q.cloneNode(true);
    var flag = clone.querySelector('.quiz-flag');
    if (flag) flag.parentNode.removeChild(flag);
    return clone.textContent.replace(/^\s*\d+\s*[.、．]?\s*/, '').trim();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var lid = lessonNum();
    var all = loadAll();
    var rec = null;
    if (lid) {
      if (!all[lid] || typeof all[lid] !== 'object') all[lid] = {};
      rec = all[lid];
    }

    var quizzes = document.querySelectorAll('.quiz');
    var wrongThisVisit = 0;

    quizzes.forEach(function (quiz, i) {
      var qn = i + 1;
      if (!quiz.id) quiz.id = 'q' + qn;
      var answer = quiz.getAttribute('data-answer');
      var feedback = quiz.querySelector('.quiz-feedback');
      var qTitle = quiz.querySelector('.quiz-q');
      var opts = quiz.querySelectorAll('.quiz-opts li');
      var tries = 0;

      function setFlag(text) {
        if (!qTitle) return;
        var tag = qTitle.querySelector('.quiz-flag');
        if (!tag) {
          tag = document.createElement('span');
          tag.className = 'quiz-flag';
          qTitle.appendChild(tag);
        }
        tag.textContent = text;
      }

      var past = rec ? rec[qn] : null;
      if (past && past.wrongs > 0) {
        setFlag((past.fixed ? '已订正 · 曾错 ' : '曾错 ') + past.wrongs + ' 次');
      }

      opts.forEach(function (li) {
        li.addEventListener('click', function () {
          if (quiz.classList.contains('done')) return;
          var picked = li.getAttribute('data-opt');

          if (picked === answer) {
            quiz.classList.add('done');
            li.classList.add('correct');
            if (past && past.wrongs > 0) {
              past.fixed = true;
              saveAll(all);
              setFlag('已订正 · 曾错 ' + past.wrongs + ' 次');
              feedback.textContent = tries === 0
                ? '✓ 一次答对——这道错题订正完成'
                : '✓ 第 ' + (tries + 1) + ' 次选对——错题订正完成，再看一眼解析';
            } else if (tries === 0) {
              feedback.textContent = '✓ 一次答对';
            } else {
              feedback.textContent = '✓ 第 ' + (tries + 1) + ' 次选对——看一眼解析，加深印象';
            }
            feedback.className = 'quiz-feedback ok';
            return;
          }

          tries++;
          wrongThisVisit++;
          li.classList.add('wrong');
          if (rec) {
            var r = rec[qn] || (rec[qn] = { wrongs: 0, fixed: false, t: '' });
            r.wrongs++;
            r.fixed = false;
            r.t = qText(quiz);
            saveAll(all);
            setFlag('曾错 ' + r.wrongs + ' 次');
          }
          if (tries >= 2) {
            quiz.classList.add('done');
            var right = quiz.querySelector('[data-opt="' + answer + '"]');
            if (right) right.classList.add('correct');
            feedback.textContent = '✗ 正确答案是 ' + String(answer).toUpperCase() + ' ——已记入错题本，请看解析';
            feedback.className = 'quiz-feedback bad';
          } else {
            var left = opts.length - quiz.querySelectorAll('.quiz-opts li.wrong').length;
            feedback.textContent = '✗ 再选一次（还剩 ' + left + ' 个可选）';
            feedback.className = 'quiz-feedback bad';
          }
        });
      });
    });

    /* 本课测验小结面板 */
    if (lid && rec && quizzes.length) {
      var qids = Object.keys(rec).filter(function (k) {
        return rec[k] && rec[k].wrongs > 0;
      });
      var unfixed = qids.filter(function (k) { return !rec[k].fixed; });
      var panel = document.createElement('div');
      panel.className = 'quiz-log';
      panel.innerHTML =
        '<p class="quiz-log-title">本课测验小结</p>' +
        '<p>本次答错 ' + wrongThisVisit + ' 次 · 本课历史错题 ' + qids.length +
        ' 道（待订正 ' + unfixed.length + ' 道）</p>' +
        '<p><a href="mistakes.html">打开错题本 →</a>　<button type="button" class="quiz-clear">清空本课记录</button></p>';
      var last = quizzes[quizzes.length - 1];
      last.parentNode.insertBefore(panel, last.nextSibling);
      panel.querySelector('.quiz-clear').addEventListener('click', function () {
        delete all[lid];
        saveAll(all);
        location.reload();
      });
    }

    /* #qN 深链：滚动到对应题并短暂高亮 */
    if (/^#q\d+$/.test(location.hash)) {
      var target = document.querySelector(location.hash);
      if (target) {
        target.scrollIntoView({ block: 'center' });
        target.classList.add('quiz-flash');
        setTimeout(function () { target.classList.remove('quiz-flash'); }, 2000);
      }
    }
  });
})();
