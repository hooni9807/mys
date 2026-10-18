/* Original soundtrack through the visible official YouTube player; no copied audio asset.
 * Media is optional: autoplay, an unavailable video, or slow networking never blocks a match.
 */
(() => {
  'use strict';
  const VIDEO = 'Q4EyleX7Qh4', DANCE_START = 1.4;
  const panel = document.getElementById('ceremony-media');
  const slot = document.getElementById('ceremony-player-slot');
  const status = document.getElementById('ceremony-music-status');
  const button = document.getElementById('ceremony-music-play');
  let apiPromise = null, player = null, ready = false, session = 0;
  let raf = 0, retryTimer = 0, requested = false, blocked = false, failed = false, lastSync = -1;
  const active = () => typeof ceremonyActive === 'function' && ceremonyActive();
  const position = () => Math.max(0, ceremonyElapsed() - DANCE_START);

  function loadAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const prior = window.onYouTubeIframeAPIReady;
      const timeout = setTimeout(() => { script.remove(); apiPromise = null; reject(new Error('timeout')); }, 10000);
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timeout);
        if (typeof prior === 'function') prior();
        resolve();
      };
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => { clearTimeout(timeout); script.remove(); apiPromise = null; reject(new Error('network')); };
      document.head.appendChild(script);
    });
    return apiPromise;
  }
  function showStatus() {
    if (failed) status.textContent = '원본 음악을 불러오지 못했어요. 춤은 계속됩니다.';
    else if (!sound) status.textContent = '사운드 OFF · 음악 켜기를 누르면 원본 음악이 나와요.';
    else if (blocked) status.textContent = '음악 재생을 눌러 원본 음악을 함께 들어보세요.';
    else if (!ready) status.textContent = '원본 음악 준비 중…';
    else status.textContent = '원본 영상의 음악과 함께 세리머니 중';
    button.textContent = !sound ? '음악 켜기 ♪' : '음악 재생 ♪';
    button.hidden = !failed && sound && ready && !blocked;
  }
  function play() {
    if (!active() || !ready || !player || document.hidden || failed) return;
    if (ceremonyElapsed() < DANCE_START) return;
    if (sound) { player.unMute(); player.setVolume(65); } else player.mute();
    player.seekTo(position(), true);
    player.playVideo();
    requested = true;
    clearTimeout(retryTimer);
    const token = session;
    retryTimer = setTimeout(() => {
      if (token !== session || !active() || !player) return;
      if (player.getPlayerState() !== 1) { blocked = true; showStatus(); }
    }, 1800);
  }
  function tick() {
    if (!active()) return;
    const elapsed = ceremonyElapsed();
    if (ready && !failed && !document.hidden) {
      if (!requested && elapsed >= DANCE_START) play();
      // Correct a delayed start/background return without continuously scrubbing the video.
      if (requested && player.getPlayerState() === 1 && elapsed - lastSync > 2) {
        lastSync = elapsed;
        if (Math.abs(player.getCurrentTime() - position()) > 1.1) player.seekTo(position(), true);
      }
    }
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    session++;
    cancelAnimationFrame(raf);
    clearTimeout(retryTimer);
    if (player) { try { player.destroy(); } catch {} }
    player = null; ready = requested = blocked = failed = false; lastSync = -1;
    slot.replaceChildren();
    panel.hidden = true;
  }
  async function start() {
    stop();
    const token = session;
    panel.hidden = false;
    showStatus();
    raf = requestAnimationFrame(tick);
    try {
      await loadAPI();
      if (token !== session || !active()) return;
      const mount = document.createElement('div'); slot.appendChild(mount);
      player = new YT.Player(mount, {
        width: 240, height: 200, videoId: VIDEO,
        playerVars: { playsinline: 1, controls: 1, rel: 0, origin: location.origin },
        events: {
          onReady: event => {
            if (token !== session || !active()) return;
            ready = true;
            event.target.getIframe().title = '승리 세리머니 원본 영상과 음악';
            if (!sound) event.target.mute();
            showStatus(); play();
          },
          onAutoplayBlocked: () => {
            if (token !== session || !active()) return;
            blocked = true; showStatus();
          },
          onStateChange: event => {
            if (token !== session || !active()) return;
            if (event.data === 1) { blocked = false; showStatus(); }
            else if (event.data === 2 && requested && !document.hidden) { blocked = true; showStatus(); }
          },
          onError: () => {
            if (token !== session || !active()) return;
            failed = true; showStatus();
          }
        }
      });
    } catch {
      if (token === session && active()) { failed = true; showStatus(); }
    }
  }
  button.onclick = () => {
    if (!active()) return;
    setSound(true);
    if (failed) { start(); return; }
    blocked = false; showStatus(); play();
  };
  window.addEventListener('victoryceremony', event => {
    if (event.detail.phase === 'start') start(); else stop();
  });
  window.addEventListener('spin-sound', () => {
    if (!active()) return;
    if (ready && player) { if (sound) play(); else player.mute(); }
    showStatus();
  });
  document.addEventListener('visibilitychange', () => {
    if (!active() || !ready || !player) return;
    if (document.hidden) player.pauseVideo();
    else { requested = false; play(); }
  });
  window.addEventListener('pagehide', stop);
  for (const id of ['net-host', 'net-join', 'net-quick', 'lb-start']) {
    document.getElementById(id).addEventListener('click', () => { loadAPI().catch(() => {}); });
  }
  for (const [id, won] of [['ceremony-preview-win', true], ['ceremony-preview-lose', false]]) {
    document.getElementById(id).onclick = () => {
      if (net || playing || active()) return;
      // These controls explicitly say they preview dance + music.
      setSound(true);
      loadAPI().catch(() => {});
      previewVictoryCeremony(won);
    };
  }
})();
