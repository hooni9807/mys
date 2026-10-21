(() => {
  'use strict';
  const dialog = document.getElementById('auth-gate');
  const opener = document.getElementById('prologue-open');
  const motion = document.getElementById('prologue-motion');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = [...dialog.querySelectorAll('[data-chapter]')];
  const scenes = [
    ['serve', '모든 경기는, 한 번의 서브에서.', '조용한 코트 위, 작은 공 하나가 이야기를 시작합니다.'],
    ['spin', '회전을 읽고. 흐름을 바꾸고.', '손끝의 타이밍이 만드는 나만의 드라이브와 랠리.'],
    ['ready', '다음 랠리의 주인공은 당신.', '캐릭터를 고르고, 나만의 코디로 코트에 서 보세요.']
  ];
  const starts = [0, 2500, 5300];
  let elapsed = 0, last = 0, frame = 0, paused = false, scene = -1;

  function showScene(index) {
    if (scene === index) return;
    scene = index;
    dialog.dataset.scene = scenes[index][0];
    document.getElementById('prologue-story-title').textContent = scenes[index][1];
    document.getElementById('prologue-story-copy').textContent = scenes[index][2];
    document.getElementById('prologue-scene-number').textContent = `0${index + 1} / 03`;
    chapters.forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function tick(now) {
    if (last) elapsed = Math.min(8000, elapsed + now - last);
    last = now;
    showScene(elapsed < starts[1] ? 0 : elapsed < starts[2] ? 1 : 2);
    dialog.style.setProperty('--prologue-progress', elapsed / 8000);
    frame = elapsed < 8000 ? requestAnimationFrame(tick) : 0;
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    const stopped = paused || reduced.matches || document.hidden;
    dialog.classList.toggle('pl-paused', stopped);
    motion.disabled = reduced.matches;
    motion.textContent = reduced.matches ? '동작 줄임 켜짐' : paused ? '▷ 움직임 재생' : 'Ⅱ 움직임 멈추기';
    motion.setAttribute('aria-pressed', String(paused || reduced.matches));
    if (dialog.open && !stopped && elapsed < 8000) frame = requestAnimationFrame(tick);
  }

  function replay() {
    elapsed = reduced.matches ? 8000 : 0;
    paused = false;
    dialog.classList.remove('pl-running');
    showScene(reduced.matches ? 2 : 0);
    dialog.style.setProperty('--prologue-progress', elapsed / 8000);
    // Reset the CSS sequence together with the scene timeline.
    void dialog.offsetWidth;
    dialog.classList.add('pl-running');
    syncMotion();
  }

  function openPrologue() {
    if (dialog.open || !dialog.dispatchEvent(new Event('prologue-before-open', { cancelable: true }))) return;
    dialog.showModal();
    document.body.classList.add('prologue-open');
    replay();
  }
  opener.addEventListener('click', openPrologue);
  dialog.querySelectorAll('[data-prologue-close]').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });
  dialog.addEventListener('close', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    dialog.classList.remove('pl-running');
    document.body.classList.remove('prologue-open');
    try { localStorage.setItem('spin-prologue-seen', '1'); } catch {}
    opener.focus({ preventScroll: true });
  });
  document.getElementById('prologue-replay').addEventListener('click', replay);
  motion.addEventListener('click', () => { paused = !paused; syncMotion(); });
  chapters.forEach((button, index) => button.addEventListener('click', () => {
    elapsed = starts[index];
    showScene(index);
    dialog.style.setProperty('--prologue-progress', elapsed / 8000);
    syncMotion();
  }));
  document.addEventListener('visibilitychange', syncMotion);
  reduced.addEventListener('change', () => {
    if (reduced.matches) { elapsed = 8000; showScene(2); dialog.style.setProperty('--prologue-progress', 1); }
    syncMotion();
  });
  let seen = false;
  try { seen = localStorage.getItem('spin-prologue-seen') === '1'; } catch {}
  if (!seen) openPrologue();
})();
