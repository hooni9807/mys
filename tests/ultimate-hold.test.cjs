const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const html = fs.readFileSync('index.html', 'utf8');

test('ultimate cut-in never pauses live physics', () => {
  let now = 1000, updates = 0;
  const ctx = { performance: { now: () => now }, P: { clamp: (n, min, max) => Math.min(max, Math.max(min, n)) },
    tickVictoryCeremony() {}, pingNetClock() {}, update() { updates++; }, guestUpdate() { updates++; },
    render() {}, requestAnimationFrame() {}, $: () => ({ style: {}, open: true }),
    net: null, last: 1000, playing: true, paused: false, samples: [], paddle: {vx:0, vy:0}, Math };
  const hold = html.slice(html.indexOf('const ULT_HOLD_MS='), html.indexOf('function fireUlt('));
  const frame = html.slice(html.indexOf('function frame(t)'), html.indexOf('requestAnimationFrame(frame);', html.indexOf('function frame(t)')) + 'requestAnimationFrame(frame);'.length) + '}';
  vm.runInNewContext(hold + frame + '\nholdUltimate(); frame(1100);', ctx);
assert.ok(updates > 0);
  vm.runInNewContext('holdUltimate(9000)', ctx);
  assert.equal(vm.runInNewContext('ultHoldUntil', ctx), 0);
});
