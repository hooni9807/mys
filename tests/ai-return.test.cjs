const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const physics = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].find(m => m[2].includes('root.PingPhysics='));
const context = { module: { exports: {} }, Math };
context.globalThis = context;
vm.runInNewContext(physics[2], context);
context.P = context.module.exports;
vm.runInNewContext(html.slice(html.indexOf('function fitReturn(b,'), html.indexOf('function endInfDrive')), context);

test('fast AI returns clear the net and land inside the table', () => {
  for (const z of [-.2, 0, .2, .4]) for (const speed of [3, 5, 7, 9]) for (const type of ['drive', 'cut', 'smash']) {
    const b = { x: .2, y: 2.85, z, ...context.P.aiReturn(type, .2, 2.85, z, speed, .6, 1.8, true), curveK: 0 };
    context.fitReturn(b);
    let crossed = false, landed = false;
    for (let i = 0; i < 1500; i++) {
      context.P.step(b, 1 / 240);
      if (!crossed && b.y <= 1.37) { crossed = true; assert.ok(b.z >= .1525, `${type} hits the net`); }
      if (b.z <= 0 && b.vz < 0) { landed = crossed && b.y > 0 && b.y < 1.37 && Math.abs(b.x) < .76; break; }
    }
    assert.ok(landed, `${type}, height ${z}, speed ${speed} goes out`);
  }
});

test('moving back preserves the relative hit position and timing', () => {
  const regular = { owner: 'ai', bounces: 1, y: -.27, z: .2, vy: -3, vz: 0 };
  const long = { ...regular, y: regular.y - .2, retreat: .2 };
  assert.equal(context.P.timing(regular), context.P.timing(long));
  assert.ok(Math.abs((context.P.back(long) - context.P.back(regular)) - .2) < 1e-9);
});

test('ultra extreme returns ordinary shots with a 99% chance', () => {
  for (const type of ['serve', 'loop', 'drive', 'back', 'cut', 'chop', 'block', 'smash']) {
    assert.equal(context.P.returnChance({type, power: true}, 'uext', .4), .99);
  }
  for (const ball of [{type:'drive', ult:'special'}, {type:'thunder',ult:'special'}, {type:'drive', lob:true}, {type:'drive', unreturn:true}]) {
    assert.equal(context.P.returnChance(ball, 'uext', .4), .4);
  }
  let previous = .4;
  for (const tier of ['easy', 'hard', 'extreme', 'ultra', 'uhard', 'uext']) {
    const chance = context.P.returnChance({type:'drive'}, tier, .4);
    assert.ok(chance > previous && chance <= .99, tier);
    assert.ok(context.P.returnChance({type:'thunder'}, tier, .4) > .4,'racket special receives the normal return tier bonus');
    previous = chance;
  }
  assert.equal(context.P.returnChance({type:'drive'}, null, .4), .4);
  assert.equal(context.P.returnChance({type:'drive'}, 'easy', 1), 1);
});

vm.runInNewContext(html.slice(html.indexOf('function landGuard(s,b)'), html.indexOf('function hit(tap)')), context);
test('late two-touch returns stay low or miss the net', () => {
  for (const y of [-.3, -.7, -1.1]) for (const z of [-.45, -.2, 0, .2]) for (const type of ['block', 'short', 'drive', 'cut']) {
    const incoming = {x: 0, y, z};
    const shot = context.P.shot(0, -200, z, 0, y, false, {}, type);
    const result = context.lowDualReturn(shot, incoming);
    if (result.miss) { assert.equal(result.miss, 'net'); continue; }
    const g = 6 + result.spin * context.P.EQUIP.spin * .55;
    const peak = z + (result.vz > 0 ? result.vz ** 2 / (2 * g) : 0);
    assert.ok(peak <= .6500001, `${type}, y=${y}, z=${z}, peak=${peak}`);
  }
});

test('two-touch incoming balls land without a high arc', () => {
  let landed = 0;
  for (const z of [0, .2, .4]) for (const speed of [2.5, 3.5, 5, 7]) for (const type of ['drive', 'cut']) {
    const b = { x: .1, y: 2.85, z, ...context.P.aiReturn(type, .1, 2.85, z, speed, .3, 1.5), curveK: 0, dual: true };
    context.fitReturn(b, .75);
    let crossed = false, valid = false, peak = z;
    for (let i = 0; i < 1500; i++) {
      context.P.step(b, 1 / 240); peak = Math.max(peak, b.z);
      if (!crossed && b.y <= 1.37) { crossed = true; if (b.z < .1525) break; }
      if (b.z <= 0 && b.vz < 0) { valid = crossed && b.y > 0 && b.y < 1.37 && Math.abs(b.x) < .76; break; }
    }
    if (valid) { landed++; assert.ok(peak <= .751, `high ${type} arc: ${peak}`); }
  }
  assert.ok(landed >= 20, `only ${landed} low returns landed`);
});

test('AI special shots with strong curve and spin land inside the table', () => {
  for (const side of [-18, -5, 0, 5, 18]) for (const spin of [-3, 0, 3]) for (const z of [0, .3]) {
    const b = { x: .45, y: 2.8, z, vx: 2, vy: -5, vz: 1, spin, side, curveK: 2.4 };
    context.fitReturn(b);
    let crossed = false, landed = false;
    for (let i = 0; i < 1500; i++) {
      context.P.step(b, 1 / 240);
      if (!crossed && b.y <= 1.37) { crossed = true; if (b.z < .1525) break; }
      if (b.z <= 0 && b.vz < 0) { landed = crossed && b.y > 0 && b.y < 1.37 && Math.abs(b.x) < .76; break; }
    }
    assert.ok(landed, `special side=${side} spin=${spin} height=${z}`);
  }
});

test('AI special notice shows the selected move at the bottom', () => {
  const notice = { hidden: true, textContent: '' };
  const popup = { time: 10, $: id => { assert.equal(id, 'ai-special-notice'); return notice; } };
  vm.runInNewContext(html.slice(html.indexOf('let aiSpecialNoticeUntil=0;'), html.indexOf('function reset()')), popup);
  popup.aiSpecialNotice('번개 속공');
  assert.equal(notice.hidden, false);
  assert.equal(notice.textContent, '상대 필살기 · 번개 속공');
  assert.equal(vm.runInNewContext('aiSpecialNoticeUntil', popup), 12.5);
  assert.match(html, /\.ai-special-notice\{position:absolute;bottom:/);
});


test('long incoming balls trigger retreat before the bounce', () => {
  const ball = { owner: 'ai', bounces: 0, y: 1.2, z: .4, vy: -2, vz: 0, spin: 0 };
  const retreat = context.P.incomingRetreat(ball);
  assert.ok(retreat > 0);
  assert.ok(Math.abs(retreat - context.P.retreatAt(1.2 - 2 * Math.sqrt(.8 / 6))) < 1e-9);
  assert.equal(context.P.incomingRetreat({ ...ball, y: 2.2 }), 0);
  assert.equal(context.P.incomingRetreat({ ...ball, serving: true }), 0);
  assert.equal(context.P.incomingRetreat({ ...ball, y: .1 }), 0);
});


vm.runInNewContext('const DUAL_GAP=.08, DUAL_CLOSE=.45;'+html.slice(html.indexOf('function dualCloseFor('),html.indexOf('const dualHold=')), context);
test('deep two-touch balls allow the second touch before leaving the playable range', () => {
  for (const vy of [-3, -4, -5]) {
    const ball = {x: 0, y: -.5, z: .2, vx: 0, vy, vz: 1, spin: 1, side: 0, owner: 'ai', bounces: 1, dual: true, retreat: .2};
    const close = context.dualCloseFor(ball);
    assert.ok(close >= .08 && close <= .45);
    for (let t = 0; t < .08 + close; t += 1/240) context.P.step(ball, 1/240);
    assert.ok(ball.z > -.65 && context.P.timing(ball) !== 'wait', `vy=${vy}, z=${ball.z}, y=${ball.y}`);
    const shot = context.P.shot(0, -200, ball.z, ball.x, ball.y, false, {}, 'block');
    const returned = {...context.landGuard(shot, ball), x:ball.x, y:ball.y, z:ball.z};
    let cleared = false, landed = false;
    for (let i = 0; i < 1200; i++) {
      const y = returned.y; context.P.step(returned, 1/240);
      if (y < 1.37 && returned.y >= 1.37) cleared = returned.z >= .1525;
      if (returned.z <= 0 && returned.vz < 0) { landed = cleared && returned.y > 1.37 && returned.y < 2.74 && Math.abs(returned.x) < .76; break; }
    }
    assert.ok(landed, `vy=${vy} returned ball missed the table`);
  }
  assert.equal(context.dualCloseFor({y:-.3,retreat:0}), .45);
});


test('smash character can return cuts and drives without an automatic net fault', () => {
  for (const incoming of ['cut', 'drive', 'smash', 'spin']) {
    assert.equal(context.P.judge(incoming, 'smash', true, false, true), 'ok');
  }
  assert.equal(context.P.judge('cut', 'smash', true, false), 'net');
  for (const z of [-.3, 0, .2]) {
    const b = {x:0, y:-.35, z};
    const shot = context.landGuard(context.P.power(context.P.shot(0, -1450, z, 0, b.y, false, {}, 'smash'), b.y, z, 1.3), b);
    const q = {...shot, ...b};
    let net = false, landed = false;
    for (let i=0; i<1200; i++) {
      const previous = q.y; context.P.step(q, 1/240);
      if (previous < 1.37 && q.y >= 1.37) net = q.z >= .1525;
      if (q.z <= 0 && q.vz < 0) { landed = net && q.y > 1.37 && q.y < 2.74 && Math.abs(q.x) < .76; break; }
    }
    assert.ok(landed, `smash from height ${z}`);
  }
});

test('racket skills remain returnable and tier-four miss chance survives AI bonuses', () => {
  const normal=context.P.aiChance({type:'lightning',x:0,vy:-3,spin:0},'b5',false,{atk:.3,sp:.45,cap:.999,base:{b5:.95}});
  const equipped=context.P.aiChance({type:'lightning',ult:'x',x:0,vy:-3,spin:0},'b5',false,{atk:.3,sp:.45,cap:.999,base:{b5:.95}});
  assert.ok(normal>equipped,'racket skill must not receive the equipped-special penalty');
  assert.ok(context.P.returnRoll({type:'drive',defMiss:.2},'uext',.99)<=.79,'20% skill miss is applied after the return tier');
});
