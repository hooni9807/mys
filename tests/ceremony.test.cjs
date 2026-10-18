// Run with: node --test tests/ceremony.test.cjs
// Runs the actual inline game scripts in two isolated browser-like contexts.
// The peer transport, monotonic clock and DOM are deterministic. No credentials,
// Firebase writes, browser driver or third-party dependencies are needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const clone = value => JSON.parse(JSON.stringify(value));

function createClient(initialClock = 10000) {
  let now = initialClock;
  let nextTimer = 0;
  const timers = new Map();
  const nodes = new Map();
  const listeners = new Map();
  const events = [];
  const writes = new Map();
  const outgoing = [];
  const canvasContext = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'measureText') return text => ({ width: String(text).length * 7 });
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
      return (...args) => {
        for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `Canvas ${String(key)} received ${arg}`);
      };
    },
  });
  function element(key) {
    if (nodes.has(key)) return nodes.get(key);
    const classes = new Set(key === 'overlay' ? [] : []);
    const attributes = new Map();
    const node = {
      id: key, tagName: 'DIV', style: {}, dataset: {}, hidden: false, disabled: false,
      value: '', textContent: '', innerHTML: '', width: 900, height: 465,
      firstChild: { textContent: '' }, children: [], options: [], selectedOptions: [{ text: 'test' }],
      classList: {
        add(...names) { names.forEach(n => classes.add(n)); },
        remove(...names) { names.forEach(n => classes.delete(n)); },
        contains(name) { return classes.has(name); },
        toggle(name, force) { const next = force === undefined ? !classes.has(name) : force; next ? classes.add(name) : classes.delete(name); return next; },
      },
      setAttribute(k, v) { attributes.set(k, String(v)); },
      getAttribute(k) { return attributes.get(k) ?? null; },
      removeAttribute(k) { attributes.delete(k); },
      toggleAttribute(k, on) { on ? attributes.set(k, '') : attributes.delete(k); },
      getContext() { return canvasContext; },
      getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, width: 900, height: 465 }; },
      addEventListener() {}, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {},
      scrollIntoView() {}, focus() {}, blur() {}, remove() {},
      showModal() { this.open = true; }, close() { this.open = false; },
      append(...items) { this.children.push(...items); }, appendChild(item) { this.children.push(item); },
      querySelector(selector) { return element(`${key} ${selector}`); }, querySelectorAll() { return []; },
      click() { if (!this.disabled) this.onclick?.({ target: this }); },
    };
    nodes.set(key, node);
    return node;
  }
  const storage = {
    getItem(key) { return writes.get(key) ?? null; },
    setItem(key, value) { writes.set(key, String(value)); },
    removeItem(key) { writes.delete(key); },
  };
  const addListener = (type, fn) => { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); };
  const context = vm.createContext({
    console, URL, URLSearchParams, Math, JSON, Date, Promise, Map, Set,
    performance: { now: () => now },
    document: {
      body: element('body'), head: element('head'), hidden: false,
      activeElement: element('active'),
      getElementById: element, querySelector: element, querySelectorAll: () => [],
      createElement: name => element(`created-${name}-${nodes.size}`), addEventListener: addListener,
    },
    localStorage: storage, sessionStorage: storage,
    location: { hostname: 'localhost', href: 'http://localhost/', origin: 'http://localhost', pathname: '/', search: '' },
    history: { replaceState() {} }, navigator: { userAgent: 'Node regression harness', maxTouchPoints: 0 },
    Image: class { complete = false; naturalWidth = 0; },
    Path2D: class { constructor() { return canvasContext; } },
    ResizeObserver: class { observe() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
    requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
    setTimeout(fn, delay = 0) { const id = ++nextTimer; timers.set(id, { fn, due: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); }, setInterval() { return ++nextTimer; }, clearInterval() {},
    addEventListener: addListener,
    dispatchEvent(event) { events.push({ type: event.type, detail: event.detail && clone(event.detail) }); (listeners.get(event.type) || []).forEach(fn => fn(event)); return true; },
    devicePixelRatio: 1, innerWidth: 1200, innerHeight: 900, scrollY: 0, scrollTo() {},
    matchMedia() { return { matches: false, addEventListener() {} }; },
    alert() {}, confirm: () => true,
  });
  context.window = context;
  context.self = context;
  for (const [i, source] of scripts.entries()) vm.runInContext(source, context, { filename: `index.html:inline-${i + 1}` });
  const run = source => vm.runInContext(source, context);
  const connection = { open: true, send(message) { outgoing.push(clone(message)); }, on() {}, close() { this.open = false; } };
  const peer = { destroyed: false, destroy() { this.destroyed = true; } };
  return {
    run, events, outgoing, nodes, connection, peer, context,
    value(source) { const value = run(source); return value === undefined ? value : clone(value); },
    open(role) { context.testPeer = peer; context.testConnection = connection; run(`netOpen('${role}',testPeer,testConnection)`); },
    receive(message) { context.testMessage = clone(message); run('onNet(testMessage)'); },
    advance(ms, frame = true) {
      now += ms;
      for (const [id, timer] of [...timers]) if (timer.due <= now) { timers.delete(id); timer.fn(); }
      if (frame) run('tickVictoryCeremony()');
    },
    get now() { return now; },
    async settle() { for (let i = 0; i < 10; i++) await Promise.resolve(); },
  };
}

test('inline application initializes without Firebase or network access', async () => {
  const client = createClient();
  await client.settle();
  assert.equal(client.value('TEST_HOST'), true);
  assert.equal(client.value('playing'), false);
  assert.equal(client.value('P.nextRating({rating:1000,wins:0,losses:0,streak:0},true).rating'), 1010);
});

function makeMatch() {
  const host = createClient(10000);
  const guest = createClient(50000);
  for (const client of [host, guest]) client.run(`
    globalThis.ratingCalls=[];
    const actualApplyRated=applyRated;
    applyRated=async (...args)=>{ratingCalls.push(args[0]);return actualApplyRated(...args);};
  `);
  host.open('host');
  guest.open('guest');
  function pump() {
    let delivered = 0;
    while (host.outgoing.length || guest.outgoing.length) {
      if (++delivered > 100) throw new Error('Peer messages did not settle');
      while (host.outgoing.length) guest.receive(host.outgoing.shift());
      while (guest.outgoing.length) host.receive(guest.outgoing.shift());
    }
  }
  pump();
  const sync = () => { guest.receive(host.value('snapshot()')); pump(); };
  sync();
  return { host, guest, sync, pump };
}

function scoreMatchPoint(host, winner = 'host') {
  host.run(`you=${winner === 'host' ? 10 : 6};cpu=${winner === 'guest' ? 10 : 6};rally=4;
    ball={x:0,y:1,z:.2,vx:0,vy:1,vz:0,spin:0,side:0,owner:'you',bounces:1,type:'drive'};
    point(${winner === 'host'},'regression match point');`);
}

function ceremonyEvents(client, phase) {
  return client.events.filter(event => event.type === 'victoryceremony' && event.detail.phase === phase);
}

for (const winner of ['host', 'guest']) {
  test(`${winner} win starts one synchronized ceremony and both players remain spectators`, async () => {
    const { host, guest, sync } = makeMatch();
    scoreMatchPoint(host, winner);
    sync();
    await host.settle();
    await guest.settle();
    const h = host.value('victoryCeremony');
    const g = guest.value('victoryCeremony');
    assert.equal(h.winner, winner);
    assert.equal(g.id, h.id);
    assert.equal(g.winner, winner);
    assert.equal(h.winnerLocal, winner === 'host');
    assert.equal(g.winnerLocal, winner === 'guest');
    assert.equal(h.duration, 12);
    assert.equal(host.value('playing'), false);
    assert.equal(guest.value('playing'), false);
    assert.equal(host.value('ball'), null);
    assert.equal(guest.value('ball'), null);
    assert.equal(host.value('ceremonyActive()'), true);
    assert.equal(guest.value('ceremonyActive()'), true);
    assert.equal(host.nodes.get('overlay').classList.contains('hidden'), true);
    assert.equal(guest.nodes.get('overlay').classList.contains('hidden'), true);
    assert.equal(ceremonyEvents(host, 'start').length, 1);
    assert.equal(ceremonyEvents(guest, 'start').length, 1);
    assert.deepEqual(host.value('ratingCalls'), [winner === 'host']);
    assert.deepEqual(guest.value('ratingCalls'), [winner === 'guest']);
    assert.equal(host.value('pvpLocal().wins+pvpLocal().losses'), 1);
    assert.equal(guest.value('pvpLocal().wins+pvpLocal().losses'), 1);
    assert.equal(guest.value('you'), host.value('cpu'));
    assert.equal(guest.value('cpu'), host.value('you'));
    host.advance(3000);
    guest.advance(3000);
    sync();
    assert.ok(Math.abs(host.value('ceremonyElapsed()') - guest.value('ceremonyElapsed()')) < 0.05);
    for (const client of [host, guest]) {
      const before = client.value('[you,cpu,net.round,victoryCeremony.id]');
      client.run('begin()');
      client.nodes.get('restart').click();
      client.run('pause()');
      assert.deepEqual(client.value('[you,cpu,net.round,victoryCeremony.id]'), before);
      assert.equal(client.value('ceremonyActive()'), true);
      assert.equal(client.value('playing'), false);
      assert.equal(client.value('paused'), false);
    }
    // Late hit packets and the ordinary game tick cannot advance a finished rally.
    host.receive({ t: 'H', b: { x: 0, y: 1, z: 1, vx: 0, vy: 1, vz: 0, owner: 'ai' } });
    assert.equal(host.value('ball'), null);
    assert.equal(host.value('you+cpu'), 17);
  });
}

test('duplicate and stale snapshots do not restart music, change scores or apply rating twice', async () => {
  const { host, guest, sync } = makeMatch();
  const playingSnapshot = host.value('snapshot()');
  scoreMatchPoint(host);
  const result = host.value('snapshot()');
  guest.receive(result);
  guest.advance(2800);
  const elapsed = guest.value('ceremonyElapsed()');
  guest.receive(result);
  guest.receive(playingSnapshot);
  sync();
  await guest.settle();
  assert.equal(guest.value('playing'), false);
  assert.equal(guest.value('ceremonyElapsed()') >= elapsed, true);
  assert.equal(ceremonyEvents(guest, 'start').length, 1);
  assert.deepEqual(guest.value('ratingCalls'), [false]);
  assert.equal(guest.value('pvpLocal().losses'), 1);
  assert.deepEqual(guest.value('[you,cpu]'), [6, 11]);
});

test('late first ceremony snapshot seeks to current progress instead of replaying the entrance', () => {
  const { host, guest, sync } = makeMatch();
  scoreMatchPoint(host);
  host.advance(5000);
  guest.advance(5000);
  sync();
  assert.equal(guest.value('ceremonyActive()'), true);
  assert.ok(guest.value('ceremonyElapsed()') >= 4.95);
  assert.ok(Math.abs(host.value('ceremonyElapsed()') - guest.value('ceremonyElapsed()')) < 0.05);
  assert.equal(ceremonyEvents(guest, 'start').length, 1);
});

test('ceremony completes once, unlocks the host rematch and rejects previous-round packets', async () => {
  const { host, guest, sync } = makeMatch();
  scoreMatchPoint(host);
  sync();
  const oldSnapshot = host.value('snapshot()');
  host.advance(11999);
  guest.advance(11999);
  assert.equal(host.value('ceremonyActive()'), true);
  host.advance(2);
  guest.advance(2);
  sync();
  await host.settle();
  await guest.settle();
  for (const client of [host, guest]) {
    assert.equal(client.value('ceremonyActive()'), false);
    assert.equal(client.value('victoryCeremony.phase'), 'finished');
    assert.equal(ceremonyEvents(client, 'finish').length, 1);
    assert.equal(client.nodes.get('overlay').classList.contains('hidden'), false);
  }
  const oldRound = host.value('net.round');
  // The guest cannot start a new match even after the ceremony.
  guest.run('begin()');
  assert.equal(guest.value('playing'), false);
  host.run('begin()');
  sync();
  assert.ok(host.value('net.round') > oldRound);
  assert.equal(host.value('playing'), true);
  assert.equal(guest.value('playing'), true);
  assert.deepEqual(host.value('[you,cpu]'), [0, 0]);
  assert.deepEqual(guest.value('[you,cpu]'), [0, 0]);
  guest.receive({ ...oldSnapshot, packet: 1000000 });
  assert.equal(guest.value('playing'), true);
  assert.deepEqual(guest.value('[you,cpu]'), [0, 0]);
  assert.equal(guest.value('victoryCeremony'), null);
  scoreMatchPoint(host, 'guest');
  sync();
  await guest.settle();
  assert.deepEqual(guest.value('ratingCalls'), [false, true]);
  assert.equal(guest.value('pvpLocal().wins+pvpLocal().losses'), 2);
});

test('disconnect and leaving the match cancel the ceremony and release every local control', () => {
  for (const exit of ['netClosed()', 'goHome()']) {
    const { host, guest, sync } = makeMatch();
    scoreMatchPoint(host);
    sync();
    for (const client of [host, guest]) {
      client.run(exit);
      assert.equal(client.value('net'), null);
      assert.equal(client.value('ceremonyActive()'), false);
      assert.equal(client.value('victoryCeremony'), null);
      assert.equal(client.value('playing'), false);
      assert.equal(client.peer.destroyed, true);
      assert.equal(ceremonyEvents(client, 'cancel').length, 1);
      assert.equal(client.nodes.get('body').style.position, '');
      assert.equal(client.nodes.get('restart').disabled, false);
      assert.equal(client.nodes.get('start').disabled, false);
      assert.equal(client.nodes.get('overlay').classList.contains('hidden'), false);
    }
  }
});

test('deuce requires a two-point margin and a normal offline win keeps its original result flow', async () => {
  const { host, sync } = makeMatch();
  host.run(`you=10;cpu=10;ball={owner:'you'};point(true,'deuce');`);
  sync();
  assert.equal(host.value('playing'), true);
  assert.equal(host.value('victoryCeremony'), null);
  host.run(`ball={owner:'you'};point(true,'two-point margin');`);
  assert.equal(host.value('ceremonyActive()'), true);

  const offline = createClient();
  offline.run('begin()');
  scoreMatchPoint(offline);
  assert.equal(offline.value('playing'), false);
  assert.equal(offline.value('victoryCeremony'), null);
  offline.advance(2500);
  assert.equal(offline.nodes.get('overlay').classList.contains('hidden'), false);
  assert.equal(ceremonyEvents(offline, 'start').length, 0);
  assert.equal(offline.value('pvpLocal().wins+pvpLocal().losses'), 0);
  offline.run(`setMode('practice');begin();you=10;cpu=6;ball={owner:'you'};point(true,'practice');`);
  assert.equal(offline.value('playing'), true);
  assert.equal(offline.value('ceremonyActive()'), false);
});

test('local previews restore the menu, preserve scores and never award a ranked win', async () => {
  const client = createClient();
  client.run(`you=7;cpu=3;document.querySelector('.start-card h2').innerHTML='original title';
    document.querySelector('.start-card p').textContent='original description';
    $('start').firstChild.textContent='original start';$('home').hidden=true;`);
  for (const won of [true, false]) {
    assert.equal(client.value(`previewVictoryCeremony(${won})`), true);
    assert.equal(client.value('victoryCeremony.winnerLocal'), won);
    assert.equal(client.value('previewVictoryCeremony()'), false);
    client.advance(12001, false);
    await client.settle();
    assert.equal(client.value('ceremonyActive()'), false);
    assert.equal(client.nodes.get('.start-card h2').innerHTML, 'original title');
    assert.equal(client.nodes.get('.start-card p').textContent, 'original description');
    assert.equal(client.nodes.get('start').firstChild.textContent, 'original start');
    assert.equal(client.nodes.get('home').hidden, true);
    assert.equal(client.nodes.get('start').disabled, false);
    assert.equal(client.nodes.get('mode-open').disabled, false);
    assert.equal(client.nodes.get('toast').style.display, '');
    assert.deepEqual(client.value('[you,cpu]'), [7, 3]);
    assert.equal(client.value('pvpLocal().wins+pvpLocal().losses'), 0);
  }
  client.run('begin()');
  assert.equal(client.value('previewVictoryCeremony()'), false);
});

test('clock ping compensates different performance origins and a real round-trip delay', () => {
  const host = createClient(10000), guest = createClient(80000);
  host.open('host');
  guest.open('guest');
  const ping = guest.outgoing.find(message => message.t === 'Q');
  assert.ok(ping);
  host.advance(120, false);
  guest.advance(120, false);
  host.receive(ping);
  const pong = host.outgoing.find(message => message.t === 'A');
  host.advance(120, false);
  guest.advance(120, false);
  guest.receive(pong);
  assert.equal(guest.value('net.clockRtt'), 240);
  assert.equal(guest.value('net.clockOffset'), -70000);
  guest.receive(host.value('snapshot()'));
  scoreMatchPoint(host, 'guest');
  host.advance(1000, false);
  guest.advance(1000, false);
  guest.receive(host.value('snapshot()'));
  assert.ok(Math.abs(host.value('ceremonyElapsed()') - guest.value('ceremonyElapsed()')) < 0.001);
  assert.equal(guest.value('victoryCeremony.winnerLocal'), true);
});

test('hidden-tab timer completes without animation frames, and an already-finished snapshot never starts music', async () => {
  const { host, guest } = makeMatch();
  scoreMatchPoint(host);
  host.context.document.hidden = true;
  guest.context.document.hidden = true;
  host.advance(12001, false);
  guest.advance(12001, false);
  assert.equal(host.value('ceremonyActive()'), false);
  guest.receive(host.value('snapshot()'));
  await guest.settle();
  assert.equal(guest.value('ceremonyActive()'), false);
  assert.equal(guest.value('victoryCeremony.phase'), 'finished');
  assert.equal(ceremonyEvents(guest, 'start').length, 0);
  assert.equal(ceremonyEvents(guest, 'finish').length, 1);
  assert.equal(guest.value('pvpLocal().losses'), 1);
  assert.equal(guest.nodes.get('overlay').classList.contains('hidden'), false);
});

test('dance renderer handles every character and stage with finite coordinates and restores the player camera', () => {
  const client = createClient();
  const chars = client.value('Object.keys(LOOKS)');
  for (const character of chars) {
    client.context.testCharacter = character;
    client.run(`cancelVictoryCeremony();charType=testCharacter;previewVictoryCeremony();
      view='fp';Object.assign(YAW,{a:.2,c:Math.cos(.2),s:Math.sin(.2),px:.1,py:.3});`);
    const camera = client.value('[view,YAW]');
    for (const seconds of [0, 0.5, 1.25, 1.4, 3.5, 6.5, 9, 11.5]) {
      client.run(`victoryCeremony.localStartedAt=performance.now()-${seconds * 1000};renderVictoryCeremony();`);
      assert.deepEqual(client.value('[view,YAW]'), camera);
      const pose = client.value(`victoryDancePose(${seconds})`);
      assert.equal(pose.arms.length, 2);
      assert.equal(pose.feet.length, 2);
      if (seconds >= 1.4) assert.equal(pose.z, 0, 'dancer should be on the tabletop');
    }
  }
});

test('temporarily disabled sleepy character cannot be restored, selected, randomized, or rendered for a peer', () => {
  const client = createClient();
  assert.equal(client.value("characterAvailable('sleepy')"), false);
  assert.equal(client.value("AI_CHARS.includes('sleepy')"), false);
  client.run("setCharacter('sleepy')");
  assert.equal(client.value('charType'), 'jersey');
  client.open('guest');
  client.run("takeOpp({ch:'sleepy',nick:'상대',x:0,side:1,rk:'shake',shot:'drive',h:0})");
  assert.equal(client.value('net.opp.ch'), 'jersey');
  client.run("enterVictoryCeremony({id:'temporary',winnerChar:'sleepy',loserChar:'sleepy',winnerLocal:true,duration:12,phase:'playing',localStartedAt:performance.now()})");
  assert.deepEqual(client.value('[victoryCeremony.winnerChar,victoryCeremony.loserChar]'), ['jersey', 'jersey']);
});

test('only infinite drive hides the point score', () => {
  const client = createClient();
  for (const mode of ['practice', 'match', 'doubles', 'boss', 'cutman', 'twoclick']) {
    client.context.testMode = mode;
    client.run('setMode(testMode)');
    assert.equal(client.nodes.get('you').hidden, false, `${mode} should show the player score`);
    assert.equal(client.nodes.get('cpu').hidden, false, `${mode} should show the opponent score`);
    assert.equal(client.nodes.get('.score i').hidden, false, `${mode} should show the score separator`);
  }
  client.run("setMode('infdrive')");
  assert.equal(client.nodes.get('you').hidden, true);
  assert.equal(client.nodes.get('cpu').hidden, true);
  assert.equal(client.nodes.get('.score i').hidden, true);
});

test('two-click timing brings up the second target sooner and leaves a longer swing window', () => {
  const client = createClient();
  assert.equal(client.value('DUAL_GAP'), 0.2);
  assert.equal(client.value('DUAL_CLOSE'), 0.55);
});
