/* Victory ceremony soundtrack, synthesised live with Web Audio (no audio file, no outside media).
 * A cheeky 4-bar loop to wind up the loser: the playground "nyah-nyah" chant (G E A G E) on a kazoo-ish square lead over an
 * oom-pah tuba bass and claps, then a slide-whistle boing and a sad-trombone "wah wah wah waaah". Media is optional:
 * sound off, autoplay blocks or a hidden tab never hold up the ceremony.
 */
(() => {
  'use strict';
  const DANCE_START = 1.4, BPM = 140, BEAT = 60 / BPM, BAR = 4 * BEAT;
  const panel = document.getElementById('ceremony-media');
  const status = document.getElementById('ceremony-music-status');
  const button = document.getElementById('ceremony-music-play');
  let ctx = null, master = null, timer = 0, startTimer = 0, nextBar = 0, bar = 0;
  const active = () => typeof ceremonyActive === 'function' && ceremonyActive();
  const hz = midi => 440 * 2 ** ((midi - 69) / 12);

  function tone(t, f, d, type, vol, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(master); o.start(t); o.stop(t + d + .03);
  }
  function clap(t) {
    const len = ctx.sampleRate * .08 | 0, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 1800; g.gain.value = .45; s.buffer = buf;
    s.connect(f).connect(g).connect(master); s.start(t);
  }
  // beats into the bar, midi note, length in beats
  const CHANT = [[0, 79, .5], [.5, 76, .5], [1, 81, .5], [1.5, 79, .5], [2, 76, 1.5]];
  function scheduleBar(t, b) {
    for (let i = 0; i < 4; i++) tone(t + i * BEAT, hz(i % 2 ? 50 : 43), BEAT * .45, 'sawtooth', .16);   // oom-pah
    clap(t + BEAT); clap(t + 3 * BEAT);
    if (b % 4 < 3) {
      for (const [at, n, len] of CHANT) tone(t + at * BEAT, hz(n), len * BEAT * .9, 'square', .1);
      if (b % 4 === 1) tone(t + 3.5 * BEAT, hz(86), BEAT * .45, 'square', .08, hz(74));                  // "nyah~" flick
    } else {
      tone(t, hz(72), BEAT * .8, 'sine', .2, hz(98));                                                   // boing
      for (const [at, n] of [[1, 62], [1.75, 61], [2.5, 60]]) tone(t + at * BEAT, hz(n), BEAT * .7, 'sawtooth', .14);
      tone(t + 3.2 * BEAT, hz(59), BEAT * 1.4, 'sawtooth', .14, hz(54));                                // waaah
    }
  }
  function pump() { if (!ctx || !master) return; while (nextBar < ctx.currentTime + .6) { scheduleBar(nextBar, bar++); nextBar += BAR; } }
  function startMusic() {
    stopMusic();
    if (!active() || !sound || document.hidden) { showStatus(); return; }
    try { ctx ??= new (window.AudioContext || window.webkitAudioContext)(); } catch { showStatus(); return; }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    master = ctx.createGain(); master.gain.value = .55; master.connect(ctx.destination);
    bar = 0; nextBar = ctx.currentTime + .05; pump(); timer = setInterval(pump, 150);
    setTimeout(showStatus, 400);
  }
  function stopMusic() {
    clearInterval(timer); timer = 0;
    if (master) { const m = master; m.gain.setTargetAtTime(0, ctx.currentTime, .04); setTimeout(() => m.disconnect(), 300); master = null; }
  }
  function showStatus() {
    const blocked = master && ctx && ctx.state !== 'running';
    status.textContent = !sound ? '사운드 OFF · 음악 켜기를 누르면 약 올리는 비트가 나와요 😜'
      : blocked ? '음악 재생을 눌러 주세요' : '메롱~ 약 올리는 승리 비트 ♪ 😜';
    button.textContent = !sound ? '음악 켜기 ♪' : '음악 재생 ♪';
    button.hidden = !!sound && !blocked;
  }
  function start() {
    clearTimeout(startTimer); stopMusic();
    panel.hidden = false; showStatus();
    const wait = Math.max(0, DANCE_START - ceremonyElapsed()) * 1000;
    startTimer = setTimeout(startMusic, wait);
  }
  function stop() { clearTimeout(startTimer); stopMusic(); panel.hidden = true; }

  button.onclick = () => { if (!active()) return; setSound(true); startMusic(); };
  window.addEventListener('victoryceremony', event => { if (event.detail.phase === 'start') start(); else stop(); });
  window.addEventListener('spin-sound', () => { if (!active()) return; if (sound) startMusic(); else { stopMusic(); showStatus(); } });
  document.addEventListener('visibilitychange', () => { if (!active()) return; if (document.hidden) stopMusic(); else startMusic(); });
  window.addEventListener('pagehide', stop);
})();
