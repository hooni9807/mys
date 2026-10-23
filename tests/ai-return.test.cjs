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
vm.runInNewContext(html.slice(html.indexOf('function fitReturn(b)'), html.indexOf('function endInfDrive')), context);

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
