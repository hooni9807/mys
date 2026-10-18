// Official YouTube-player lifecycle tests. No remote requests are made.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '..', 'ceremony-media.js'), 'utf8');

function mediaHarness({ apiReady = true, sound = true } = {}) {
  let active = false, elapsed = 0, now = 0, id = 0;
  const nodes = new Map(), listeners = new Map(), timers = new Map(), frames = new Map(), players = [];
  const node = key => {
    if (!nodes.has(key)) nodes.set(key, {
      hidden: true, textContent: '', children: [], removed: false,
      addEventListener() {}, appendChild(child) { this.children.push(child); },
      replaceChildren() { this.children = []; }, remove() { this.removed = true; },
    });
    return nodes.get(key);
  };
  const on = (type, fn) => { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); };
  const dispatch = (type, detail) => { for (const fn of listeners.get(type) || []) fn({ type, detail }); };
  class FakePlayer {
    constructor(mount, options) {
      this.options = options; this.mount = mount; this.iframe = {}; this.calls = [];
      this.muted = false; this.state = -1; this.current = 0; this.destroyed = false;
      players.push(this);
    }
    ready() { this.options.events.onReady({ target: this }); }
    event(type, data) { this.options.events[type]?.({ target: this, data }); }
    getIframe() { return this.iframe; }
    mute() { this.muted = true; this.calls.push(['mute']); }
    unMute() { this.muted = false; this.calls.push(['unMute']); }
    setVolume(value) { this.calls.push(['volume', value]); }
    seekTo(value) { this.current = value; this.calls.push(['seek', value]); }
    playVideo() { this.calls.push(['play']); }
    pauseVideo() { this.state = 2; this.calls.push(['pause']); }
    getPlayerState() { return this.state; }
    getCurrentTime() { return this.current; }
    destroy() { this.destroyed = true; this.calls.push(['destroy']); }
  }
  const context = vm.createContext({
    document: { hidden: false, getElementById: node, createElement: tag => node(`created-${tag}-${nodes.size}`), head: node('head'), addEventListener: on },
    location: { origin: 'http://localhost' },
    sound, ceremonyActive: () => active, ceremonyElapsed: () => elapsed,
    net: null, playing: false, previewVictoryCeremony() {},
    setSound(value) { context.sound = value; dispatch('spin-sound'); },
    requestAnimationFrame(fn) { const key = ++id; frames.set(key, fn); return key; },
    cancelAnimationFrame(key) { frames.delete(key); },
    setTimeout(fn, delay) { const key = ++id; timers.set(key, { fn, due: now + delay }); return key; },
    clearTimeout(key) { timers.delete(key); },
    addEventListener: on,
  });
  context.window = context;
  if (apiReady) context.YT = { Player: FakePlayer };
  vm.runInContext(source, context, { filename: 'ceremony-media.js' });
  return {
    context, nodes, players, dispatch,
    start(at = 0) { active = true; elapsed = at; dispatch('victoryceremony', { phase: 'start' }); },
    stop(phase = 'cancel') { active = false; dispatch('victoryceremony', { phase }); },
    readyAPI() { context.YT = { Player: FakePlayer }; context.onYouTubeIframeAPIReady(); },
    setSound(value) { context.setSound(value); },
    advance(ms) {
      now += ms; elapsed += ms / 1000;
      for (const [key, timer] of [...timers]) if (timer.due <= now) { timers.delete(key); timer.fn(); }
      const pending = [...frames]; frames.clear(); pending.forEach(([, frame]) => frame());
    },
    get active() { return active; },
    get frameCount() { return frames.size; },
    async settle() { for (let i = 0; i < 10; i++) await Promise.resolve(); },
  };
}

test('original video starts with the dance, sound OFF mutes, and enabling sound preserves its position', async () => {
  const h = mediaHarness({ sound: false });
  h.start();
  await h.settle();
  const player = h.players[0];
  assert.equal(player.options.videoId, 'Q4EyleX7Qh4');
  player.ready();
  assert.equal(player.muted, true);
  assert.equal(player.calls.some(call => call[0] === 'play'), false);
  h.advance(2000);
  assert.equal(player.calls.some(call => call[0] === 'play'), true);
  assert.ok(Math.abs(player.current - 0.6) < 1e-6);
  h.setSound(true);
  assert.equal(player.muted, false);
  assert.ok(Math.abs(player.current - 0.6) < 1e-6);
  h.setSound(false);
  assert.equal(player.muted, true);
});

for (const phase of ['cancel', 'finish']) {
  test(`${phase} destroys the player and ignores late player callbacks`, async () => {
    const h = mediaHarness();
    h.start(3);
    await h.settle();
    const player = h.players[0];
    h.stop(phase);
    const count = player.calls.length;
    player.ready();
    player.event('onStateChange', 1);
    player.event('onAutoplayBlocked');
    player.event('onError');
    h.advance(2000);
    h.setSound(true);
    assert.equal(player.destroyed, true);
    assert.equal(player.calls.length, count);
    assert.equal(h.nodes.get('ceremony-media').hidden, true);
    assert.equal(h.nodes.get('ceremony-player-slot').children.length, 0);
    assert.equal(h.frameCount, 0);
  });
}

test('finishing during API loading cannot create a late player or reopen the media panel', async () => {
  const h = mediaHarness({ apiReady: false });
  h.start(4);
  h.stop('finish');
  h.readyAPI();
  await h.settle();
  assert.equal(h.players.length, 0);
  assert.equal(h.nodes.get('ceremony-media').hidden, true);
  assert.equal(h.frameCount, 0);
});

test('a superseded ceremony cannot play its old player when onReady arrives late', async () => {
  const h = mediaHarness();
  h.start(3);
  await h.settle();
  const old = h.players[0];
  h.start(5);
  await h.settle();
  const current = h.players[1];
  old.ready();
  current.ready();
  assert.equal(old.destroyed, true);
  assert.equal(old.calls.some(call => call[0] === 'play'), false);
  assert.equal(current.calls.some(call => call[0] === 'play'), true);
  assert.ok(Math.abs(current.current - 3.6) < 1e-6);
});

test('autoplay denial provides a retry control; hidden tabs pause and seek forward on return', async () => {
  const h = mediaHarness();
  h.start(2);
  await h.settle();
  const player = h.players[0];
  player.ready();
  player.event('onAutoplayBlocked');
  assert.equal(h.nodes.get('ceremony-music-play').hidden, false);
  h.nodes.get('ceremony-music-play').onclick();
  assert.equal(player.calls.filter(call => call[0] === 'play').length >= 2, true);
  h.context.document.hidden = true;
  h.dispatch('visibilitychange');
  assert.equal(player.calls.at(-1)[0], 'pause');
  h.advance(4000);
  h.context.document.hidden = false;
  h.dispatch('visibilitychange');
  assert.ok(Math.abs(player.current - 4.6) < 1e-6);
  assert.equal(player.calls.at(-1)[0], 'play');
});

test('API timeout and unavailable-video errors leave the ceremony timeline running', async () => {
  const pending = mediaHarness({ apiReady: false });
  pending.start();
  pending.advance(10001);
  await pending.settle();
  assert.equal(pending.active, true);
  assert.match(pending.nodes.get('ceremony-music-status').textContent, /불러오지 못/);
  assert.equal(pending.nodes.get('ceremony-music-play').hidden, false);
  pending.stop('finish');

  const unavailable = mediaHarness();
  unavailable.start(3);
  await unavailable.settle();
  unavailable.players[0].event('onError');
  assert.equal(unavailable.active, true);
  assert.match(unavailable.nodes.get('ceremony-music-status').textContent, /춤은 계속/);
  unavailable.stop('finish');
  assert.equal(unavailable.players[0].destroyed, true);
});
