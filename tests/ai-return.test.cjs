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
  for (const ball of [{type:'drive', ult:'special'}, {type:'thunder'}, {type:'drive', lob:true}, {type:'drive', unreturn:true}]) {
    assert.equal(context.P.returnChance(ball, 'uext', .4), .4);
  }
  assert.equal(context.P.returnChance({type:'drive'}, 'uhard', .4), .4);
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
