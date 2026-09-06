/* ============================================================
   专升本政治 · 互动课程 — 共享交互组件（原生 JS，无依赖）  v2
   ZQ.progress  — 课程进度存取（v2 键）
   ZQ.srs       — Leitner 三盒间隔重复（闪卡）
   ZQ.wrong     — 错题本
   ZQ.mountQuiz — 选择题测验（单选/多选、即时反馈、错题入库）
   ZQ.mountCards— 考点闪卡（翻转 + 三盒自评）
   ZQ.mountDue  — 跨课到期闪卡复习（每日闪卡页）
   ZQ.mountReview — 混合随机测试
   ZQ.markDone  — “标记已学”按钮
   ============================================================ */
(function () {
  "use strict";
  var NS = "zzkk:v2:";

  /* 考试日期（倒计时用）。考期有变改这里即可。 */
  var EXAM_DATE = "2027-03-27";

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  /* 富文本转义：先转 HTML 再把 **加粗** 渲染为 <strong>（笔记速记答案里的强调标记）；
     不成对的孤立 ** 一并清除，避免字面星号露出 */
  function escRich(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*\*/g, "");
  }
  /* 各页面内联脚本直接使用全局 esc/escRich（历史约定），这里显式导出 */
  window.esc = esc;
  window.escRich = escRich;
  /* 稳定 id：djb2——与生成器 md5 前 10 位等价使用（生成器已内嵌 id 时优先） */
  function hash(s) {
    s = String(s || "");
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return "h" + h.toString(36);
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function daysBetween(isoA, isoB) {
    return Math.round((new Date(isoB) - new Date(isoA)) / 86400000);
  }

  /* ---------------- 课程进度 ---------------- */
  var progress = {
    key: function (lessonId) { return NS + "lesson:" + lessonId; },
    get: function (lessonId) {
      try { return JSON.parse(localStorage.getItem(this.key(lessonId))) || {}; }
      catch (e) { return {}; }
    },
    update: function (lessonId, patch) {
      var cur = this.get(lessonId);
      var next = Object.assign(cur, patch, { at: new Date().toISOString() });
      try { localStorage.setItem(this.key(lessonId), JSON.stringify(next)); } catch (e) {}
      document.dispatchEvent(new CustomEvent("zzkk:progress", { detail: { lessonId: lessonId } }));
      return next;
    },
    all: function () {
      return scanMap(NS + "lesson:");
    }
  };

  function scanMap(prefix) {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0) {
          try { out[k.slice(prefix.length)] = JSON.parse(localStorage.getItem(k)); } catch (e) {}
        }
      }
    } catch (e) {}
    return out;
  }

  /* ---------------- Leitner 三盒：1 盒隔1天，2 盒隔3天，3 盒隔7天 ---------------- */
  var srs = {
    INTERVAL: [1, 3, 7],
    key: function (id) { return NS + "card:" + id; },
    get: function (id) {
      try { return JSON.parse(localStorage.getItem(this.key(id))) || null; }
      catch (e) { return null; }
    },
    grade: function (id, ok) {
      var cur = this.get(id) || { box: 0, streak: 0 };
      cur.box = ok ? Math.min(3, (cur.box || 0) + 1) : 1;
      if (ok) cur.streak = (cur.streak || 0) + 1; else cur.streak = 0;
      cur.at = today();
      try { localStorage.setItem(this.key(id), JSON.stringify(cur)); } catch (e) {}
      document.dispatchEvent(new CustomEvent("zzkk:srs", { detail: { id: id } }));
      return cur;
    },
    boxOf: function (id) { var s = this.get(id); return s ? s.box : 0; },
    isDue: function (id) {
      var s = this.get(id);
      if (!s || !s.box) return true;               // 新卡视为待学
      return daysBetween(s.at, today()) >= this.INTERVAL[s.box - 1];
    },
    dueIds: function (ids) {
      var self = this;
      return (ids || []).filter(function (id) { return self.isDue(id); });
    }
  };

  /* ---------------- 错题本 ---------------- */
  var wrong = {
    key: function (id) { return NS + "wrong:" + id; },
    get: function (id) {
      try { return JSON.parse(localStorage.getItem(this.key(id))) || null; }
      catch (e) { return null; }
    },
    record: function (q, meta) {
      var cur = this.get(q.id) || { count: 0, firstAt: today() };
      cur.count++;
      cur.lastAt = today();
      cur.stem = q.stem;
      cur.options = q.options;
      cur.answer = q.answer || null;
      cur.exp = q.exp || "";
      cur.from = meta && meta.from ? meta.from : "";
      try { localStorage.setItem(this.key(q.id), JSON.stringify(cur)); } catch (e) {}
      document.dispatchEvent(new CustomEvent("zzkk:wrong", { detail: { id: q.id } }));
      return cur;
    },
    remove: function (id) {
      try { localStorage.removeItem(this.key(id)); } catch (e) {}
      document.dispatchEvent(new CustomEvent("zzkk:wrong", { detail: { id: id } }));
    },
    all: function () { return scanMap(NS + "wrong:"); },
    count: function () { return Object.keys(scanMap(NS + "wrong:")).length; }
  };

  function qidOf(q) { return q.id || hash(q.stem); }

  /* ---------------- 选择题测验（单选/多选） ---------------- */
  function mountQuiz(container, questions, opts) {
    opts = opts || {};
    var lessonId = opts.lessonId || null;
    var fromLabel = opts.from || (lessonId || "");
    var recordWrong = opts.recordWrong !== false;
    var state = {};
    var resumeKey = 'l1uj-politics-answers-v1:' + location.pathname + ':' + (container.id || lessonId || 'quiz');
    var persist = !/\/(practice|review|srs|wrong)\.html$/.test(location.pathname);
    var saved = {};
    try { if (persist) saved = JSON.parse(localStorage.getItem(resumeKey) || '{}') || {}; } catch (e) {}
    function save() { try { if (persist) localStorage.setItem(resumeKey, JSON.stringify(saved)); } catch (e) {} }
    function restart() { saved = {}; save(); render(); }

    function render() {
      container.innerHTML = "";
      state = { answered: 0, correct: 0, total: questions.length };
      var box = el("div", "quiz");

      questions.forEach(function (q, qi) {
        var multi = q.answer && q.answer.length > 1;
        var item = el("div", "q-item");
        var stem = el("div", "stem");
        stem.innerHTML = '<span class="qno">' + (qi + 1) + '</span>' + esc(q.stem) +
          (multi ? ' <span class="mtag">多选</span>' : "") +
          (q.doubt ? ' <span class="mtag">存疑?</span>' : "");
        item.appendChild(stem);

        var optsBox = el("div", "opts");
        var judge = el("div", "q-judge");
        var locked = false;
        var picked = {};
        var signature = hash(JSON.stringify([q.stem, q.options, q.answer]));
        var previous = saved[signature];
        function savePick(done) {
          saved[signature] = { picked: Object.keys(picked).filter(function (letter) { return picked[letter]; }), done: done };
          save();
        }

        function finishPick(restoring) {
          if (locked) return;
          var pickedLetters = Object.keys(picked).filter(function (letter) { return picked[letter]; });
          if (!pickedLetters.length) return;
          locked = true;
          state.answered++;
          if (!restoring) savePick(true);
          var buttons = optsBox.querySelectorAll(".opt");
          for (var i = 0; i < buttons.length; i++) buttons[i].disabled = true;

          if (!q.answer) {
            judge.className = "q-judge warn";
            judge.innerHTML = "⚠️ 原卷未提供答案，请对照笔记或课件核对。" + (q.warn ? "<br>" + escRich(q.warn) : "");
            return;
          }
          var ans = q.answer.split("").sort().join("");
          var mine = pickedLetters.sort().join("");
          var right = mine === ans;
          if (right) state.correct++;
          else if (recordWrong && !restoring) wrong.record(q, { from: fromLabel });
          for (var i = 0; i < buttons.length; i++) {
            var L = buttons[i].getAttribute("data-letter");
            if (q.answer.indexOf(L) >= 0) buttons[i].classList.add("correct");
          }
          if (!right) {
            pickedLetters.forEach(function (L) {
              if (q.answer.indexOf(L) < 0) {
                for (var i = 0; i < buttons.length; i++) {
                  if (buttons[i].getAttribute("data-letter") === L) buttons[i].classList.add("wrong");
                }
              }
            });
          }
          judge.className = "q-judge " + (right ? "ok" : "no");
          judge.innerHTML = (right ? "✓ 回答正确" : "✗ 正确答案：<b>" + esc(q.answer) + "</b>") +
            (q.src ? '<span class="qsrc">' + escRich(q.src) + "</span>" : "") +
            (q.doubt ? '<span class="qsrc">⚠️ 存疑题（?）——答案待老师讲评，仅供核对。</span>' : "") +
            (q.exp && !right ? '<details class="qexp"><summary>解析</summary>' + escRich(q.exp) + "</details>" : "");
          if (opts.onJudge && !restoring) opts.onJudge(q, right);
          updateScore(!restoring);
        }

        q.options.forEach(function (op) {
          var b = el("button", "opt");
          b.setAttribute("data-letter", op.letter);
          b.setAttribute("aria-pressed", "false");
          b.innerHTML = '<span class="letter">' + esc(op.letter) + '.</span>' + esc(op.text);
          b.addEventListener("click", function () {
            if (locked) return;
            if (!q.answer) {
              picked[op.letter] = true;
              b.setAttribute('aria-pressed', 'true');
              finishPick(false);
              return;
            }
            if (multi) {
              picked[op.letter] = !picked[op.letter];
              b.classList.toggle("picked", !!picked[op.letter]);
              b.setAttribute('aria-pressed', String(!!picked[op.letter]));
              savePick(false);
            } else {
              picked[op.letter] = true;
              b.setAttribute('aria-pressed', 'true');
              finishPick(false);
            }
          });
          optsBox.appendChild(b);
        });

        item.appendChild(optsBox);
        if (multi && q.answer) {
          var confirmBtn = el("button", "btn small confirm", "确认答案");
          confirmBtn.addEventListener("click", function () { finishPick(false); });
          item.appendChild(confirmBtn);
        }
        item.appendChild(judge);
        box.appendChild(item);
        if (previous && Array.isArray(previous.picked)) {
          previous.picked.forEach(function (letter) {
            if (!q.options.some(function (op) { return op.letter === letter; })) return;
            picked[letter] = true;
            var button = Array.prototype.find.call(optsBox.children, function (b) { return b.getAttribute('data-letter') === letter; });
            if (button) { button.classList.add('picked'); button.setAttribute('aria-pressed', 'true'); }
          });
          if (previous.done) finishPick(true);
        }
      });

      var score = el("div", "quiz-score");
      box.appendChild(score);
      var redo = el("button", "btn", "↺ 重做本组测验");
      redo.addEventListener("click", restart);
      score.appendChild(redo);
      container.appendChild(box);
      updateScore();
    }

    function updateScore(allowPersist) {
      var score = container.querySelector(".quiz-score");
      if (!score) return;
      var judged = Array.prototype.filter.call(
        container.querySelectorAll(".q-judge"),
        function (j) { return j.className.indexOf("ok") >= 0 || j.className.indexOf("no") >= 0; }
      ).length;
      var correct = Array.prototype.filter.call(
        container.querySelectorAll(".q-judge"),
        function (j) { return j.className.indexOf("ok") >= 0; }
      ).length;
      var unanswered = state.total - Array.prototype.filter.call(
        container.querySelectorAll(".q-judge"),
        function (j) { return j.className.indexOf("warn") < 0; }
      ).length;
      var old = lessonId ? progress.get(lessonId).best || 0 : 0;
      var pct = judged ? Math.round((correct / state.total) * 100) : 0;
      var finalPct = judged === state.total ? pct : null;

      score.innerHTML =
        '<span>已答 <b>' + judged + "</b> / " + state.total +
        " · 答对 <b>" + correct + "</b></span>" +
        (finalPct !== null
          ? '<span class="big">' + finalPct + "分</span>" +
            (finalPct === 100 ? "<span>满分，漂亮！</span>"
              : finalPct >= 80 ? "<span>不错，错题已进错题本。</span>"
              : "<span>建议回到正文重读后重做；错题已进错题本。</span>")
          : "<span>做完全部题目后计分" + (unanswered > 0 ? "（含 " + unanswered + " 题原卷未给答案，不计判）" : "") + "</span>");

      var redo = el('button', 'btn quiz-redo', '↺ 重做本组测验（保留历史记录）');
      redo.type = 'button';
      redo.addEventListener('click', restart);
      score.appendChild(redo);
      if (allowPersist && lessonId && finalPct !== null && finalPct > old) {
        progress.update(lessonId, { best: finalPct });
      }
    }

    render();
  }

  /* ---------------- 考点闪卡（可带三盒自评） ---------------- */
  function mountCards(container, cards, opts) {
    opts = opts || {};
    var srsOn = !!opts.srs;
    var ns = opts.srs === true ? "" : (opts.srs || "");
    var order = cards.map(function (_, i) { return i; });
    var pos = 0;

    container.innerHTML = "";
    var shell = el("div", "cards-shell");
    var stage = el("div", "card-stage");
    var card = el("div", "flashcard");
    var front = el("div", "face front");
    var back = el("div", "face back");
    card.appendChild(front); card.appendChild(back);
    stage.appendChild(card);
    shell.appendChild(stage);

    var ctrl = el("div", "cards-ctrl");
    var prev = el("button", "btn", "‹ 上一张");
    var posEl = el("span", "pos", "");
    var next = el("button", "btn", "下一张 ›");
    var flip = el("button", "btn primary", "翻转 空格");
    var shuffle = el("button", "btn", "🔀 洗牌");
    ctrl.appendChild(prev); ctrl.appendChild(posEl); ctrl.appendChild(next);
    ctrl.appendChild(flip); ctrl.appendChild(shuffle);
    shell.appendChild(ctrl);

    var gradeRow = el("div", "grade-row");
    var gYes = el("button", "btn ok", "✓ 记住了（1）");
    var gNo = el("button", "btn no", "✗ 没记住（2）");
    var boxInfo = el("span", "boxinfo", "");
    gradeRow.appendChild(gNo); gradeRow.appendChild(gYes); gradeRow.appendChild(boxInfo);
    if (srsOn) shell.appendChild(gradeRow);

    var hint = el("div", "hint", srsOn
      ? "先自己回忆答案，再翻面核对；然后自评——记住了进下一盒（1→3盒分别隔 1/3/7 天再复习），没记住回 1 盒。"
      : "先自己回忆答案，再点击卡片或按空格键核对。");
    shell.appendChild(hint);
    container.appendChild(shell);

    function cardId(c) { return c.id || (ns ? hash(ns + "#" + c.term) : hash(c.term)); }

    function paint() {
      var c = cards[order[pos]];
      front.innerHTML = '<span class="label">考点 · 回忆</span><div class="q">' + escRich(c.term) + "</div>";
      back.innerHTML =
        '<span class="label">答案</span><div class="a">' + escRich(c.answer) + "</div>" +
        (c.src ? '<span class="src">出处：' + escRich(c.src) + "</span>" : "");
      card.classList.remove("flipped");
      posEl.textContent = (pos + 1) + " / " + cards.length;
      if (srsOn) paintBoxInfo(c);
    }
    function paintBoxInfo(c) {
      var id = cardId(c);
      var box = srs.boxOf(id);
      boxInfo.textContent = box ? "当前第 " + box + " 盒" : "新卡";
    }
    function grade(ok) {
      var c = cards[order[pos]];
      if (!card.classList.contains("flipped")) {
        hint.textContent = "先翻面核对答案，再自评。";
        return;
      }
      srs.grade(cardId(c), ok);
      move(1);
    }
    function move(d) { pos = (pos + d + cards.length) % cards.length; paint(); }

    card.addEventListener("click", function () { card.classList.toggle("flipped"); });
    flip.addEventListener("click", function () { card.classList.toggle("flipped"); });
    prev.addEventListener("click", function () { move(-1); });
    next.addEventListener("click", function () { move(1); });
    gYes.addEventListener("click", function () { grade(true); });
    gNo.addEventListener("click", function () { grade(false); });
    shuffle.addEventListener("click", function () {
      for (var i = order.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = order[i]; order[i] = order[j]; order[j] = t;
      }
      pos = 0; paint();
    });
    document.addEventListener("keydown", function (e) {
      if (!withinViewport(container)) return;
      if (document.activeElement && document.activeElement.tagName === "INPUT") return;
      if (e.code === "Space") { e.preventDefault(); card.classList.toggle("flipped"); }
      if (e.code === "ArrowRight") move(1);
      if (e.code === "ArrowLeft") move(-1);
      if (srsOn && e.key === "1") grade(true);
      if (srsOn && e.key === "2") grade(false);
    });

    function withinViewport(node) {
      var r = node.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    }

    paint();
  }

  /* ---------------- 每日到期闪卡复习（跨课） ---------------- */
  function mountDue(container, allCards) {
    var SESSION = 30;
    var pool = [];

    container.innerHTML = "";
    var head = el("div", "due-head");
    var area = el("div");
    container.appendChild(head);
    container.appendChild(area);

    function start(cards) {
      pool = cards.slice();
      area.innerHTML = "";
      if (!pool.length) {
        area.appendChild(el("p", "hint", "今天没有到期的卡片（都背熟了或还没开始）。可以直接去课程页学新课，或用下面的按钮随机加练。"));
        return;
      }
      var mount = el("div");
      area.appendChild(mount);
      var countdown = el("p", "hint",
        "本组 " + cards.length + " 张到期卡（一轮上限 30 张，做完可刷新页面再练）。");
      area.insertBefore(countdown, mount);
      mountCards(mount, pool, { srs: true });
    }

    function compute() {
      var ids = allCards.map(function (c) { return c.id || hash((c.lessonId || "") + "#" + c.term); });
      var due = srs.dueIds(ids);
      var byId = {};
      allCards.forEach(function (c) { byId[c.id || hash((c.lessonId || "") + "#" + c.term)] = c; });
      return due.slice(0, SESSION).map(function (id) {
        var c = byId[id];
        return c ? Object.assign({ id: id }, c) : null;
      }).filter(Boolean);
    }

    var due = compute();
    head.innerHTML = '<span class="chip">到期卡片 <b>' + due.length + "</b> 张</span>" +
      '<span class="chip">总卡量 <b>' + allCards.length + "</b> 张</span>";
    start(due);

    var extra = el("button", "btn", "🎲 随机加练 10 张（也计入三盒）");
    extra.addEventListener("click", function () {
      var shuffled = allCards.slice();
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
      }
      start(shuffled.slice(0, 10).map(function (c) {
        return Object.assign({ id: c.id || hash((c.lessonId || "") + "#" + c.term) }, c);
      }));
      window.scrollTo({ top: 0 });
    });
    container.appendChild(extra);
  }

  /* ---------------- 标记已学 ---------------- */
  function mountDone(button, lessonId) {
    function paint() {
      var done = progress.get(lessonId).done;
      button.className = "btn" + (done ? " done" : " primary");
      button.textContent = done ? "✓ 已学（点击取消）" : "✓ 标记本章已学";
    }
    button.addEventListener("click", function () {
      var done = progress.get(lessonId).done;
      progress.update(lessonId, { done: !done });
      paint();
    });
    paint();
  }

  /* ---------------- 混合测试（复习页用） ---------------- */
  function mountReview(container, bank) {
    var hasGroups = bank.some(function (q) { return q.grp; });
    var controls = el("div", "cards-ctrl");
    controls.style.margin = "0 0 1.2rem";
    var selCourse = el("select", "btn");
    [{ v: "all", t: "全部科目" }, { v: "毛中特", t: "仅 毛中特" }, { v: "习概", t: "仅 习概" }]
      .forEach(function (o) {
        var op = document.createElement("option");
        op.value = o.v; op.textContent = o.t; selCourse.appendChild(op);
      });
    var selSrc = el("select", "btn");
    if (hasGroups) {
      [{ v: "all", t: "全部来源" }, { v: "章末", t: "仅 章末自测" }, { v: "题库", t: "仅 题库卷" }]
        .forEach(function (o) {
          var op = document.createElement("option");
          op.value = o.v; op.textContent = o.t; selSrc.appendChild(op);
        });
    }
    var selN = el("select", "btn");
    [5, 10, 15, 20].forEach(function (n) {
      var op = document.createElement("option");
      op.value = n; op.textContent = n + " 题"; if (n === 10) op.selected = true;
      selN.appendChild(op);
    });
    var go = el("button", "btn primary", "🎲 开始一轮混合测试");
    controls.appendChild(selCourse);
    if (hasGroups) controls.appendChild(selSrc);
    controls.appendChild(selN); controls.appendChild(go);
    container.appendChild(controls);

    var area = el("div");
    container.appendChild(area);

    go.addEventListener("click", function () {
      var course = selCourse.value;
      var src = selSrc.value || "all";
      var n = parseInt(selN.value, 10);
      var pool = bank.filter(function (q) {
        return (course === "all" || q.course === course) &&
               (src === "all" || q.grp === src || !q.grp);
      });
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      }
      var picked = pool.slice(0, Math.min(n, pool.length)).map(function (q) {
        return { id: q.id, stem: "【" + q.course + " " + q.chapter + "】" + q.stem,
                 options: q.options, answer: q.answer,
                 doubt: q.doubt, warn: q.warn, src: q.src, exp: q.exp };
      });
      area.innerHTML = "";
      var head = el("p", "hint", "本轮 " + picked.length + " 题，来自不同章节混合抽题。做完自动计分，错题自动进错题本。");
      area.appendChild(head);
      var mount = el("div");
      area.appendChild(mount);
      mountQuiz(mount, picked, { lessonId: "review:" + course, from: "混合测试" });
    });
  }

  window.ZQ = {
    config: { examDate: EXAM_DATE },
    progress: progress,
    srs: srs,
    wrong: wrong,
    hash: hash,
    esc: esc,
    escRich: escRich,
    mountQuiz: mountQuiz,
    mountCards: mountCards,
    mountDue: mountDue,
    mountDone: mountDone,
    mountReview: mountReview
  };
})();
