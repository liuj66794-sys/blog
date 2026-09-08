/**
 * Patch the generated politics course home page with the current progress
 * vocabulary. The source course stays untouched; sync-prep can apply this
 * pure, idempotent transform to its staging mirror before it is swapped in.
 */

export const POLITICS_LEARNING_PATCH_MARKER = 'l1uj-politics-learning-patch-v1'

const PATCH_SCRIPT = `
<!-- l1uj-politics-learning-patch-v1 -->
<script>
(function () {
  if (!window.ZQ || !ZQ.progress || !ZQ.srs) return;
  var STATUS = { "not-started": "未开始", "in-progress": "学习中", "exercise-complete": "已完成练习" };

  function hasActivity(p) {
    return !!(p && (Number(p.visits) > 0 || Number(p.quizAnswered) > 0 ||
      Number(p.cardsReviewed) > 0 || p.manualActivity || p.done || p.manualDone ||
      Number(p.quizTotal) > 0 || p.best != null));
  }
  function complete(p) {
    return !!(p && (p.exerciseComplete === true || p.exerciseStatus === "exercise-complete" ||
      p.quizComplete === true || p.best != null));
  }
  function statusOf(p) {
    return complete(p) ? "exercise-complete" : hasActivity(p) ? "in-progress" : "not-started";
  }
  function cardIds() {
    try {
      return JSON.parse(document.getElementById("due-data").textContent).map(function (c) { return c.id; });
    } catch (e) { return []; }
  }
  function render() {
    var all = ZQ.progress.all();
    var counts = { mzt: [0, 9], xg: [0, 18] };
    var bestSum = 0, bestN = 0;
    document.querySelectorAll(".lcard").forEach(function (card) {
      var id = card.getAttribute("data-lesson");
      var p = all[id] || {};
      var state = statusOf(p);
      var text = STATUS[state];
      if (state === "exercise-complete" && p.reviewNeeded) text += " · 待巩固";
      var done = card.querySelector("[data-done]");
      if (done) done.textContent = state === "exercise-complete" ? "✓ 已完成练习" : text;
      card.classList.toggle("finished", state === "exercise-complete");
      var best = card.querySelector("[data-best]");
      if (best) best.textContent = p.best != null ? "测验最高 " + p.best + " 分" : "";
      var cid = /^mzt/.test(id) ? "mzt" : (/^xg/.test(id) ? "xg" : "");
      if (counts[cid] && state === "exercise-complete") counts[cid][0]++;
      if (p.best != null) { bestSum += Number(p.best) || 0; bestN++; }
    });
    var doneAll = counts.mzt[0] + counts.xg[0];
    var doneAllNode = document.getElementById("done-all");
    var doneMzt = document.getElementById("done-mzt");
    var doneXg = document.getElementById("done-xg");
    var bar = document.getElementById("bar-all");
    var score = document.getElementById("score-all");
    if (doneAllNode) doneAllNode.textContent = doneAll;
    if (doneMzt) doneMzt.textContent = counts.mzt[0];
    if (doneXg) doneXg.textContent = counts.xg[0];
    if (bar) bar.style.width = (doneAll / 27 * 100) + "%";
    if (score) score.textContent = bestN ? "已测 " + bestN + " 课 · 平均 " + Math.round(bestSum / bestN) + " 分" : "尚无测验成绩";
  }
  function renderDash() {
    var today = new Date().toISOString().slice(0, 10);
    var exam = ZQ.config.examDate;
    var days = Math.round((new Date(exam) - new Date(today)) / 86400000);
    var daysNode = document.getElementById("cd-days");
    if (daysNode) daysNode.textContent = days > 0 ? days + " 天" : "已到期";
    var all = ZQ.progress.all(), doneCnt = 0;
    var order = lessonOrder();
    order.forEach(function (id) { if (statusOf(all[id] || {}) === "exercise-complete") doneCnt++; });
    var round = days <= 30 ? "第三轮 · 冲刺" : (doneCnt < order.length ? "第一轮 · 过课" : "第二轮 · 刷题");
    var roundNode = document.getElementById("cd-round");
    if (roundNode) roundNode.textContent = "当前阶段：" + round;
    var ids = cardIds();
    var dueIds = ZQ.srs.dueIds(ids);
    var newIds = ZQ.srs.newIds ? ZQ.srs.newIds(ids) : [];
    var limits = ZQ.srs.LIMITS || { due: 20, fresh: 10 };
    var dueBatch = Math.min(dueIds.length, Number(limits.due) || 20);
    var newBatch = Math.min(newIds.length, Number(limits.fresh) || 10);
    var wrongN = ZQ.wrong.count();
    var next = null;
    for (var i = 0; i < order.length; i++) {
      if (statusOf(all[order[i]] || {}) !== "exercise-complete") { next = order[i]; break; }
    }
    var tasks = [];
    if (round === "第一轮 · 过课") {
      if (next) tasks.push("① 学 <a href=\\"lessons/" + next + ".html\\">" + next + "</a> 这一课");
      if (newBatch) tasks.push("② 学 <a href=\\"lessons/srs.html\\">" + newBatch + " 张新卡</a>（未学余量 " + newIds.length + "）");
      if (dueBatch) tasks.push("③ 复习 <a href=\\"lessons/srs.html\\">" + dueBatch + " 张已学到期卡</a>（到期共 " + dueIds.length + "）");
      tasks.push("④ 清 <a href=\\"lessons/wrong.html\\">错题本 " + wrongN + " 题</a>");
    } else if (round === "第二轮 · 刷题") {
      tasks.push("① <a href=\\"lessons/review.html\\">混合随机测试 10 题</a>");
      tasks.push("② <a href=\\"lessons/practice.html\\">刷题场：推进当前章节卷</a>");
      if (dueBatch) tasks.push("③ 复习 <a href=\\"lessons/srs.html\\">" + dueBatch + " 张已学到期卡</a>");
      if (newBatch) tasks.push("④ 学 <a href=\\"lessons/srs.html\\">" + newBatch + " 张新卡</a>");
      tasks.push("⑤ 清 <a href=\\"lessons/wrong.html\\">错题本 " + wrongN + " 题</a>");
    } else {
      tasks.push("① <a href=\\"lessons/sz00.html\\">时政专题课过一遍</a>");
      tasks.push("② <a href=\\"lessons/practice.html\\">一套模拟/押题卷（限时）</a>");
      if (dueBatch) tasks.push("③ 复习 <a href=\\"lessons/srs.html\\">" + dueBatch + " 张已学到期卡</a>");
      if (newBatch) tasks.push("④ 学 <a href=\\"lessons/srs.html\\">" + newBatch + " 张新卡</a>");
      tasks.push("⑤ 清 <a href=\\"lessons/wrong.html\\">错题本 " + wrongN + " 题</a>");
      if (doneCnt < LESSON_ORDER.length && next) tasks.push("⑥ 课还没过完的继续推进：<a href=\\"lessons/" + next + ".html\\">" + next + "</a>");
    }
    var list = document.getElementById("today-list");
    if (list) list.innerHTML = tasks.map(function (task) { return "<li>" + task + "</li>"; }).join("");
  }
  function lessonOrder() {
    try {
      if (typeof LESSON_ORDER !== "undefined" && Array.isArray(LESSON_ORDER)) return LESSON_ORDER;
    } catch (e) {}
    return Array.prototype.map.call(document.querySelectorAll(".lcard"), function (card) {
      return card.getAttribute("data-lesson");
    }).filter(Boolean);
  }
  var label = document.querySelector(".progress-panel .row span");
  if (label) label.innerHTML = label.innerHTML.replace("课已学", "课完成练习");
  document.addEventListener("zzkk:progress", render);
  document.addEventListener("zzkk:progress", renderDash);
  document.addEventListener("zzkk:srs", renderDash);
  render();
  renderDash();
})();
</script>
`

/** Patch the generated politics course home page. Reapplying returns the same string. */
export function patchPoliticsIndex(html) {
  if (typeof html !== 'string' || html.includes(POLITICS_LEARNING_PATCH_MARKER)) return html
  if (!/<script[^>]*id=["']due-data["'][^>]*>/i.test(html)) return html
  const close = html.lastIndexOf('</body>')
  if (close < 0) return html
  return `${html.slice(0, close)}${PATCH_SCRIPT}\n${html.slice(close)}`
}

/**
 * Generic hook for sync-prep. The page option may be index; other politics
 * tool pages already obtain their counts from the patched runtime and are kept
 * byte-for-byte stable.
 */
export function patchPoliticsLearning(html, { page = 'index' } = {}) {
  return page === 'index' ? patchPoliticsIndex(html) : html
}

export const patchPoliticsLearningPage = patchPoliticsLearning
