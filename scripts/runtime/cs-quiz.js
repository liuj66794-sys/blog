/* Computer-science quiz: retain two-attempt feedback and the existing mistakes store.
   Restoring a round only paints its choices; it never records another wrong attempt. */
(function () {
  var STORE = 'zsb-mistakes-v1';
  var ROUND = 'l1uj-cs-answers-v1:' + location.pathname;
  function read(key) { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { return {}; } }
  function write(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {} }
  document.addEventListener('DOMContentLoaded', function () {
    var match = location.pathname.match(/(\d{4})[^/]*\.html$/);
    var lid = match ? match[1] : null;
    var all = read(STORE);
    var rec = lid ? (all[lid] || (all[lid] = {})) : {};
    var round = read(ROUND);
    var quizzes = Array.prototype.slice.call(document.querySelectorAll('.quiz[data-answer]'));
    var wrongThisRound = 0;
    var panel;
    function summary() {
      if (!panel) return;
      var wrongs = Object.keys(rec).filter(function (key) { return rec[key] && rec[key].wrongs > 0; });
      var unfixed = wrongs.filter(function (key) { return !rec[key].fixed; });
      panel.querySelector('.quiz-log-summary').textContent = '本轮答错 ' + wrongThisRound + ' 次 · 本课历史错题 ' + wrongs.length + ' 道（待订正 ' + unfixed.length + ' 道）';
    }
    quizzes.forEach(function (quiz, index) {
      var qn = index + 1;
      quiz.id = quiz.id || 'q' + qn;
      var answer = quiz.getAttribute('data-answer');
      var title = quiz.querySelector('.quiz-q');
      var feedback = quiz.querySelector('.quiz-feedback');
      var options = Array.prototype.slice.call(quiz.querySelectorAll('.quiz-opts li'));
      var text = title ? title.textContent.trim() : '';
      var signature = JSON.stringify([text, answer, options.map(function (node) { return node.textContent; })]);
      var attempts = [];
      var previous = round[qn];
      // The mistakes tool's explicit #qN link starts a fresh attempt for this question only.
      if (location.hash === '#q' + qn) { delete round[qn]; previous = null; write(ROUND, round); }
      function flag() {
        var past = rec[qn];
        if (!title || !past || !past.wrongs) return;
        var badge = title.querySelector('.quiz-flag');
        if (!badge) { badge = document.createElement('span'); badge.className = 'quiz-flag'; title.appendChild(badge); }
        badge.textContent = (past.fixed ? '已订正 · 曾错 ' : '曾错 ') + past.wrongs + ' 次';
      }
      function choose(picked, restoring) {
        if (quiz.classList.contains('done') || attempts.indexOf(picked) >= 0) return;
        var selected = options.find(function (node) { return node.getAttribute('data-opt') === picked; });
        if (!selected) return;
        attempts.push(picked);
        selected.setAttribute('aria-pressed', 'true');
        selected.setAttribute('aria-disabled', 'true');
        if (picked === answer) {
          quiz.classList.add('done');
          selected.classList.add('correct');
          if (!restoring && rec[qn] && rec[qn].wrongs) { rec[qn].fixed = true; if (lid) write(STORE, all); }
          feedback.textContent = attempts.length === 1 ? '✓ 一次答对' : '✓ 第 ' + attempts.length + ' 次选对，再看一眼解析';
          feedback.className = 'quiz-feedback ok';
        } else {
          wrongThisRound++;
          selected.classList.add('wrong');
          if (!restoring && lid) {
            var item = rec[qn] || (rec[qn] = { wrongs: 0, fixed: false, t: text });
            item.wrongs++; item.fixed = false; write(STORE, all);
          }
          if (attempts.length >= 2) {
            quiz.classList.add('done');
            options.forEach(function (node) { if (node.getAttribute('data-opt') === answer) node.classList.add('correct'); });
            feedback.textContent = '✗ 正确答案是 ' + answer.toUpperCase() + '，请看解析；错题已保留';
          } else feedback.textContent = '✗ 再试一次，已保存这次选择';
          feedback.className = 'quiz-feedback bad';
        }
        if (quiz.classList.contains('done')) options.forEach(function (node) { node.setAttribute('aria-disabled', 'true'); });
        if (!restoring) { round[qn] = { signature: signature, attempts: attempts.slice() }; write(ROUND, round); }
        flag(); summary();
      }
      options.forEach(function (node) {
        node.setAttribute('role', 'button'); node.tabIndex = 0;
        node.setAttribute('aria-pressed', 'false');
        node.addEventListener('click', function () { choose(node.getAttribute('data-opt'), false); });
        node.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(node.getAttribute('data-opt'), false); }
        });
      });
      if (previous && previous.signature === signature && Array.isArray(previous.attempts)) {
        previous.attempts.slice(0, 2).forEach(function (picked) { choose(picked, true); });
      }
      flag();
    });
    if (lid && quizzes.length) {
      panel = document.createElement('div'); panel.className = 'quiz-log';
      panel.innerHTML = '<p class="quiz-log-title">本课测验小结</p><p class="quiz-log-summary"></p><p><a href="mistakes.html">打开错题本 →</a></p>';
      var restart = document.createElement('button'); restart.type = 'button'; restart.className = 'btn quiz-redo';
      restart.textContent = '重新练习本课（保留错题记录）';
      restart.addEventListener('click', function () { write(ROUND, {}); location.reload(); });
      var clear = document.createElement('button'); clear.type = 'button'; clear.className = 'quiz-clear btn'; clear.textContent = '清空本课错题记录';
      clear.addEventListener('click', function () { delete all[lid]; write(STORE, all); write(ROUND, {}); location.reload(); });
      panel.appendChild(restart); panel.appendChild(clear);
      quizzes[quizzes.length - 1].after(panel); summary();
    }
    if (/^#q\d+$/.test(location.hash)) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView({ block: 'center' });
    }
  });
})();
