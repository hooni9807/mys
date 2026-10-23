const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const formula = html.slice(html.indexOf('needXp=l=>'), html.indexOf(',progLevel=()=>'));
const branch = html.slice(html.indexOf("if(k==='level'){let rows="), html.indexOf("if(k==='pvp'){let rows="));

async function rankLevel(xp, remoteRows) {
  function element() { return { textContent: '', children: [], append(...items) { this.children.push(...items); } }; }
  const nodes = { 'rank-src': element(), 'rank-list': element() };
  const context = {
    prog: { xp, unlocked: ['jersey'] }, myName: () => '나', mainChar: () => 'jersey',
    LOOKS: { jersey: { nick: '휴고범' } }, nameTtl: (node, row) => { node.textContent = row.name; },
    document: { createElement: element }, $: id => nodes[id],
    remote: async () => remoteRows ? {} : null,
    rankFs: { collection: () => ({}), orderBy: () => ({}), limit: () => ({}), query: () => ({}),
      getDocs: async () => ({ docs: remoteRows.map(row => ({ data: () => row })) }) }
  };
  vm.runInNewContext('const ' + formula + '; async function render(){const k="level";' + branch + '} globalThis.render=render;', context);
  await context.render();
  return nodes['rank-list'].children.map(li => li.children[3].textContent);
}

test('local and cloud level rankings use the current experience thresholds', async () => {
  for (const [xp, expected] of [[0, 1], [1899, 19], [1900, 20], [2029, 20], [2030, 21], [2190, 22], [4550, 30], [5050, 31]]) {
    assert.equal((await rankLevel(xp, null))[0], `Lv ${expected}`, `local XP ${xp}`);
    assert.equal((await rankLevel(0, [{ name: '상대', xp, chars: 1 }]))[0], `Lv ${expected}`, `cloud XP ${xp}`);
  }
});
