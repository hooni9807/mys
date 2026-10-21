(() => {
  'use strict';
  const dialog = document.getElementById('auth-gate');
  const opener = document.getElementById('prologue-open');
  const motion = document.getElementById('prologue-motion');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = [...dialog.querySelectorAll('[data-chapter]')];
  const scenes = [
    ['serve', '두 사람. 하나의 공. 첫 번째 서브.', '공을 띄우고, 호흡을 맞추고. 우리의 랠리가 시작됩니다.'],
    ['spin', '주고받는 순간, 나만의 리듬으로.', '한 걸음 옮기고, 몸을 돌려 스윙. 회전으로 이어지는 두 사람의 랠리.'],
    ['ready', '다음 랠리의 주인공은 당신.', '캐릭터를 고르고, 나만의 코디로 코트에 서 보세요.']
  ];
  const starts = [0, 2500, 5300];
  let elapsed = 0, last = 0, frame = 0, paused = false, scene = -1;
  const players = [...dialog.querySelectorAll('.pl-player')].map(player => ({
    body: player.querySelector('[data-body]'),
    arm: player.querySelector('[data-arm="front"]'),
    freeArm: player.querySelector('[data-arm="back"]'),
    paddle: player.querySelector('[data-paddle]'),
    hand: player.querySelector('[data-hand]'),
    backLeg: player.querySelector('[data-leg="back"]'),
    frontLeg: player.querySelector('[data-leg="front"]'),
    backShoe: player.querySelector('[data-shoe="back"]'),
    frontShoe: player.querySelector('[data-shoe="front"]')
  }));
  const ball = document.getElementById('pl-rally-ball');
  const trail = document.getElementById('pl-ball-trail');
  const shadow = document.getElementById('pl-ball-shadow');
  const impact = document.getElementById('pl-impact');
  // Contact, follow-through, recovery, backswing; phase zero meets the ball exactly.
  const stroke = [[0,105,-78,0],[.1,123,-126,-30],[.25,74,-91,8],[.6,62,-76,5],[.83,36,-52,28],[.92,24,-70,40],[1,105,-78,0]];
  const mix = (a,b,t) => a + (b-a)*t;

  function ballAt(time) {
    if (time < 1500) return {x:248,y:311-126*Math.sin(Math.PI*Math.max(0,time)/1500)};
    const serve = time < 2500;
    const flight = (time-1500)/1000;
    const p = flight-Math.floor(flight), rightward = Math.floor(flight)%2 === 0;
    const points = serve ? [[0,248,311],[.22,330,363],[.76,574,363],[1,652,311]]
      : rightward ? [[0,248,311],[.72,574,363],[1,652,311]]
      : [[0,652,311],[.72,326,363],[1,248,311]];
    const segment = points.findIndex((point,i) => i < points.length-1 && p < points[i+1][0]);
    const a = points[segment], b = points[segment+1], u = (p-a[0])/(b[0]-a[0]);
    const lift = serve ? [10,82,12][segment] : segment === 0 ? 65 : 12;
    return {x:mix(a[1],b[1],u),y:mix(a[2],b[2],u)-lift*4*u*(1-u)};
  }

  function drawRally(time) {
    players.forEach((player,i) => {
      const phase = ((time-1500-i*1000)%2000+2000)%2000/2000;
      const k = stroke.findIndex((pose,j) => j < stroke.length-1 && phase < stroke[j+1][0]);
      const a = stroke[k], b = stroke[k+1];
      const u = (phase-a[0])/(b[0]-a[0]), ease = u*u*(3-2*u);
      const x = mix(a[1],b[1],ease), y = mix(a[2],b[2],ease), angle = mix(a[3],b[3],ease);
      const lean = 5*Math.cos(phase*2*Math.PI), crouch = 5+5*Math.sin(phase*2*Math.PI);
      const step = 8*Math.sin(phase*2*Math.PI);
      const rad = angle*Math.PI/180;
      const hx = x-25*Math.cos(rad)-35*Math.sin(rad), hy = y-25*Math.sin(rad)+35*Math.cos(rad);
      player.body.setAttribute('transform',`translate(${lean} ${crouch})`);
      player.paddle.setAttribute('transform',`translate(${x} ${y}) rotate(${angle})`);
      player.arm.setAttribute('d',`M${24+lean} ${-99+crouch} Q${hx-30} ${hy+27} ${hx} ${hy}`);
      player.hand.setAttribute('cx',hx); player.hand.setAttribute('cy',hy);
      player.freeArm.setAttribute('d',time < 1000 && i === 0 ? 'M-4-99 40-64 96-78' : `M-4-99-30-64 ${8-lean*2}-45`);
      player.backLeg.setAttribute('d',`M${-7+lean} ${20+crouch} ${-35+step} 75 ${-54+step} 124`);
      player.frontLeg.setAttribute('d',`M${25+lean} ${20+crouch} ${51-step} 70 ${55-step} 124`);
      player.backShoe.setAttribute('d',`M${-59+step} 127h25`);
      player.frontShoe.setAttribute('d',`M${50-step} 127h27`);
    });
    const p = ballAt(time), previous = ballAt(Math.max(time < 1500 ? 0 : 1500+Math.floor((time-1500)/1000)*1000,time-75));
    ball.setAttribute('transform',`translate(${p.x} ${p.y})`);
    trail.setAttribute('d',`M${previous.x} ${previous.y}L${p.x} ${p.y}`);
    shadow.setAttribute('cx',p.x);
    shadow.setAttribute('rx',Math.max(3,11-(363-p.y)/20));
    shadow.setAttribute('opacity',p.x > 270 && p.x < 650 ? .3 : 0);
    const flight = (time-1500)/1000, hit = Math.floor(flight), age = flight-hit;
    impact.setAttribute('transform',`translate(${hit%2 === 0 ? 248 : 652} 311) scale(${.6+age*3})`);
    impact.setAttribute('opacity',time >= 1500 && age < .18 ? (1-age/.18)*.65 : 0);
  }

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
    if (last) elapsed += now - last;
    last = now;
    showScene(elapsed < starts[1] ? 0 : elapsed < starts[2] ? 1 : 2);
    dialog.style.setProperty('--prologue-progress', Math.min(1,elapsed / 8000));
    drawRally(elapsed);
    frame = requestAnimationFrame(tick);
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
    if (dialog.open && !stopped) frame = requestAnimationFrame(tick);
  }

  function replay() {
    elapsed = reduced.matches ? 8000 : 0;
    paused = false;
    dialog.classList.remove('pl-running');
    showScene(reduced.matches ? 2 : 0);
    dialog.style.setProperty('--prologue-progress', elapsed / 8000);
    drawRally(elapsed);
    // Reset the CSS sequence together with the scene timeline.
    void dialog.offsetWidth;
    dialog.classList.add('pl-running');
    syncMotion();
  }

  function openPrologue() {
    if (dialog.open || !dialog.dispatchEvent(new Event('prologue-before-open', { cancelable: true }))) return;
    try {
      dialog.showModal();
      document.body.classList.add('prologue-open');
      replay();
    } catch {
      window.mysPrologueBoot?.fail();
    }
  }
  opener?.addEventListener('click', openPrologue);
  dialog.querySelectorAll('[data-prologue-close]').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });
  dialog.addEventListener('close', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    dialog.classList.remove('pl-running');
    document.body.classList.remove('prologue-open');
    try { localStorage.setItem('spin-prologue-seen', '1'); } catch {}
    opener?.focus({ preventScroll: true });
  });
  document.getElementById('prologue-replay').addEventListener('click', replay);
  motion.addEventListener('click', () => { paused = !paused; syncMotion(); });
  chapters.forEach((button, index) => button.addEventListener('click', () => {
    elapsed = starts[index];
    showScene(index);
    dialog.style.setProperty('--prologue-progress', elapsed / 8000);
    drawRally(elapsed);
    syncMotion();
  }));
  document.addEventListener('visibilitychange', syncMotion);
  reduced.addEventListener('change', () => {
    if (reduced.matches) { elapsed = 8000; showScene(2); dialog.style.setProperty('--prologue-progress', 1); drawRally(elapsed); }
    syncMotion();
  });
  const boot = window.mysPrologueBoot;
  // A timed-out download must not open the intro over an already usable main page.
  if (boot?.autoOpen) openPrologue();
  boot?.finish();
})();
