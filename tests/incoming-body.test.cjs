const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const html = fs.readFileSync('index.html', 'utf8');
const ctx = { P: { clamp: (n, min, max) => Math.min(max, Math.max(min, n)) }, contactY: () => -.38 };
vm.runInNewContext(html.slice(html.indexOf('function incomingBodyX('), html.indexOf('function playerWaistAt(')), ctx);

test('player follows the incoming direction and the second touch target', () => {
  const ball = { x: 0, y: 1, vy: -3, vx: 1, side: 0 };
  assert.ok(ctx.incomingBodyX(ball) > 0);
  assert.ok(ctx.incomingBodyX({ ...ball, vx: -1 }) < 0);
  assert.equal(ctx.incomingBodyX({ ...ball, dual: true, dualHit: true, dualX: -.4 }), -.4);
  assert.equal(ctx.incomingBodyX({ ...ball, vx: 100 }), .85);
});
