/* 专升本英语课程 · 互动组件
   Quiz.render(target, questions) —— 即时反馈选择题
     questions: [{ q: 题干HTML, opts: [选项文本...], a: 正确索引, why: 解析 }]
   Progress.init(lessonId) —— 绑定 #mark-done 按钮，写入 localStorage（course.html 总览读取） */
(function () {
  var DONE_KEY = 'zsb-course-done-';

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  window.Quiz = {
    render: function (target, questions) {
      var root = typeof target === 'string' ? document.querySelector(target) : target;
      if (!root) return;
      var key = 'l1uj-english-answers-v1:' + location.pathname + ':' + (root.id || target);
      var saved = {};
      try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) {}
      function save() { try { localStorage.setItem(key, JSON.stringify(saved)); } catch (e) {} }
      root.innerHTML = '';
      var total = questions.length, answered = 0, correct = 0;
      var bar = el('div', 'quiz-score', '已完成 <b>0</b> / ' + total + '，点选项即可作答');
      root.appendChild(bar);

      questions.forEach(function (item, qi) {
        var card = el('div', 'qcard');
        card.appendChild(el('p', 'qtext', '<span class="qno">' + (qi + 1) + '.</span> ' + item.q));
        var list = el('div', 'qopts');
        var locked = false;
        var signature = JSON.stringify([item.q, item.opts, item.a]);
        function choose(oi, restoring) {
          if (locked) return;
          locked = true;
          answered++;
          var ok = oi === item.a;
          if (ok) correct++;
          Array.prototype.forEach.call(list.children, function (btn, bi) {
            btn.disabled = true;
            btn.setAttribute('aria-pressed', String(bi === oi));
            if (bi === item.a) btn.classList.add('is-ok');
            else if (bi === oi) btn.classList.add('is-no');
          });
          var head = ok ? '✓ 答对了。' : '✗ 正确答案：' + item.opts[item.a] + '。';
          card.appendChild(el('div', 'qwhy', head + (item.why ? ' ' + item.why : '')));
          bar.innerHTML = '已完成 <b>' + answered + '</b> / ' + total + ' · 答对 <b>' + correct + '</b> 题';
          if (!restoring) { saved[qi] = { signature: signature, picked: oi }; save(); }
        }

        item.opts.forEach(function (text, oi) {
          var b = el('button', 'opt', text);
          b.type = 'button';
          b.setAttribute('aria-pressed', 'false');
          b.addEventListener('click', function () {
            choose(oi, false);
          });
          list.appendChild(b);
        });

        card.appendChild(list);
        root.appendChild(card);
        var previous = saved[qi];
        if (previous && previous.signature === signature && Number.isInteger(previous.picked)
          && previous.picked >= 0 && previous.picked < item.opts.length) choose(previous.picked, true);
      });
      var redo = el('button', 'btn quiz-redo', '重新练习本课（保留完成标记）');
      redo.type = 'button';
      redo.addEventListener('click', function () {
        saved = {}; save(); window.Quiz.render(root, questions);
      });
      root.appendChild(redo);
    }
  };

  window.Progress = {
    init: function (lessonId) {
      var btn = document.getElementById('mark-done');
      if (!btn) return;
      var key = DONE_KEY + lessonId;
      var refresh = function () {
        var done = false;
        try { done = localStorage.getItem(key) === '1'; } catch (e) {}
        btn.classList.toggle('is-done', done);
        btn.textContent = done ? '✓ 已完成本课' : '标记本课完成';
      };
      btn.addEventListener('click', function () {
        try { localStorage.setItem(key, '1'); } catch (e) {}
        refresh();
      });
      refresh();
    }
  };
})();
