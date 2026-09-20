// Run in DevTools on the LOCAL politics srs.html preview at 320px and 390px,
// then repeat with prefers-reduced-motion: reduce. No durable SRS writes.
(async function politicsLayoutProbe() {
  if (!['localhost', '127.0.0.1'].includes(location.hostname) || !window.ZQ) throw Error('Use a local politics preview');
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const key = 'diagnostic:politics-layout';
  const previous = sessionStorage.getItem(key);
  const active = document.querySelector('#daily-card-session')?.cardController;
  const mount = document.createElement('div');
  mount.style.cssText = 'max-width:100%;margin:16px';
  document.body.appendChild(mount);
  sessionStorage.removeItem(key);
  try {
    const q = '在给定的时间、人物与会议条件下，请分别说明理论的提出者、主要内容及其对应依据。'.repeat(5);
    const a = '这是用于验证长答案换行与卡片高度的布局测试内容，包含多个需要完整显示的回答维度。'.repeat(12);
    ZQ.mountCards(mount, [{ schemaVersion: 1, id: 'diagnostic:layout', lessonId: 'diagnostic', question: q, answer: a,
      chapter: '布局测试', knowledgePoint: '', source: { label: '浏览器测试夹具' }, contentVersion: 1 }], { sessionKey: key, debug: true });
    const card = mount.querySelector('.flashcard');
    const measure = () => [...card.children].map(face => ({ clientHeight: face.clientHeight, scrollHeight: face.scrollHeight, clientWidth: face.clientWidth, scrollWidth: face.scrollWidth }));
    for (const face of measure()) {
      assert(face.scrollHeight <= face.clientHeight + 1, 'Text must expand the card vertically');
      assert(face.scrollWidth <= face.clientWidth + 1, 'Text must wrap horizontally');
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = parseFloat(getComputedStyle(card).transitionDuration);
    assert(reduced ? duration === 0 : duration > 0, 'Respect reduced motion; retain ordinary animation');
    const ended = reduced ? Promise.resolve() : new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Flip transition never ended')), 2000);
      // Observe after the runtime's stage listener has recorded flipEnd.
      mount.addEventListener('transitionend', e => { if (e.target === card && e.propertyName === 'transform') { clearTimeout(timer); resolve(); } });
    });
    card.getBoundingClientRect(); // establish the initial transform before flipping
    mount.querySelector('.cards-ctrl button[aria-pressed]').click();
    await ended;
    const debug = mount.flashcardDebug;
    assert(debug.phase === 'back' && debug.questionLength === q.length && debug.answerLength === a.length, 'Correct current card data');
    assert(debug.flipStart && debug.flipEnd >= debug.flipStart, 'Flip timing must finish');
    assert(card.querySelector('.back').getAttribute('aria-hidden') === 'false', 'Back must be accessible');
    return { width: innerWidth, reduced, duration, height: card.offsetHeight, faces: measure(), debug };
  } finally {
    mount.disposeCards?.(); mount.remove(); active?.activate();
    if (previous === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, previous);
  }
})();
