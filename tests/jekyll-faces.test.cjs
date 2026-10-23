const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const html = fs.readFileSync('index.html', 'utf8');
test('Jekyll and Haibeom switch faces every two points', () => {
  const jekyll = {complete:true, naturalWidth:1}, hyde = {complete:true, naturalWidth:1};
  const context = {you:0, cpu:0, FACES:{sleepy:jekyll, hyde}, look:{face:'sleepy',jekyll:true}};
  const jk = html.slice(html.indexOf('function jk()'), html.indexOf('function napTick()'));
  const face = html.slice(html.indexOf('const faceImg='), html.indexOf('\n', html.indexOf('const faceImg=')));
  vm.runInNewContext(jk + face, context);
  assert.equal(vm.runInNewContext('faceImg(look)', context), jekyll);
  context.you=2;
  assert.equal(vm.runInNewContext('faceImg(look)', context), hyde);
  context.cpu=2;
  assert.equal(vm.runInNewContext('faceImg(look)', context), jekyll);
  assert.match(html, /look\.jekyll&&FACES\.jh/);
});
