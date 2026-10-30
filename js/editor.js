// Экран «Персонажи» и редактор персонажа.
'use strict';

// ---------- список ----------
Screens.chars = {
  enter() { this.render(); },
  render() {
    const g = $('#charGrid');
    g.innerHTML = Lib.chars.map(c => `<div class="ccard" data-id="${c.id}">
      <div class="pv">${renderChar(c, { viewBox: '-30 60 360 560' })}</div>
      <b>${esc(c.name || 'Без имени')}</b>
      <div class="acts"><button data-a="edit" title="Изменить">✏️</button><button data-a="studio" title="В студию">📸</button><button data-a="copy" title="Копия">⧉</button><button data-a="del" title="Удалить">🗑</button></div>
    </div>`).join('') || '<p class="hint">Пока никого нет — создай первого героя!</p>';
  },
};
$('#charGrid').onclick = async e => {
  const card = e.target.closest('.ccard'); if (!card) return;
  const c = Lib.get(card.dataset.id); if (!c) return;
  const a = (e.target.closest('[data-a]') || {}).dataset?.a || 'edit';
  if (a === 'edit') go('editor', { c: clone(c) });
  if (a === 'studio') { Studio._pend = clone(c); go('studio'); }
  if (a === 'copy') { const n = clone(c); n.id = uid(); n.created = Date.now(); n.name = (c.name || '') + ' (копия)'; await Lib.save(n); Screens.chars.render(); }
  if (a === 'del') { if (await confirmBox(`Удалить «${c.name}»?`, 'Удалить')) { await Lib.del(c.id); Screens.chars.render(); } }
};
$('#charNew').onclick = () => { const c = defaultChar(); c.id = uid(); c.name = 'Новый герой'; go('editor', { c }); };
$('#charRandom').onclick = () => { const c = randomChar(); c.id = uid(); c.name = rnd(['Аки', 'Хана', 'Кира', 'Рин', 'Сора', 'Нао', 'Юми', 'Кай', 'Лео', 'Мио', 'Тэн', 'Ая']); go('editor', { c }); };

// ---------- редактор ----------
const VIEWS = { full: '-40 40 380 590', head: '40 60 220 260', face: '78 160 144 130', legs: '40 370 220 230', body: '30 270 240 300' };
const ZOOMS = { full: `${VB.x} ${VB.y + 40} ${VB.w} ${VB.h - 50}`, head: '28 36 244 290', face: '72 150 156 150' };
const ED = [
  { tab: '🙂 Лицо', sec: [
    { k: 'face', n: 'Форма лица', list: FACES.map(f => f.n), view: 'head', part: 'head' },
    { col: 'skin', n: 'Цвет кожи', pal: PALETTE.skin },
    { k: 'ears', n: 'Уши', list: EARS, view: 'head', part: 'ears' },
    { k: 'nose', n: 'Нос', list: NOSES, view: 'face', part: 'nose' },
    { k: 'blush', n: 'Румянец', list: BLUSH, view: 'face', part: 'blush' },
    { k: 'freckles', n: 'Веснушки', list: ['Нет', 'Есть'], view: 'face', part: 'blush' },
    { k: 'mole', n: 'Родинка', list: ['Нет', 'Есть'], view: 'face' },
    { sl: 'headSize', n: 'Размер головы', min: 0.8, max: 1.3, step: 0.01, part: 'head' },
  ] },
  { tab: '👁 Глаза', sec: [
    { k: 'eyes', n: 'Форма глаз', list: EYES.map(e => e.n), view: 'face', part: 'eyes' },
    { col: 'eye', n: 'Цвет глаз', pal: PALETTE.eye, also: 'eye2' },
    { col: 'eye2', n: 'Второй глаз (разные глаза)', pal: PALETTE.eye },
    { sl: 'eyeSize', n: 'Размер', min: 0.7, max: 1.35, step: 0.01, part: 'eyes' },
    { sl: 'eyeGap', n: 'Расстояние', min: -14, max: 16, step: 1, part: 'eyes' },
    { k: 'lash', n: 'Ресницы', list: ['Без ресниц', 'С ресницами'], view: 'face', part: 'eyes' },
    { k: 'eyeFx', n: 'Эмоция глаз', list: EYE_FX, view: 'face', part: 'eyes' },
  ] },
  { tab: '👄 Рот и брови', sec: [
    { k: 'mouth', n: 'Рот', list: MOUTHS, view: 'face', part: 'mouth' },
    { k: 'brows', n: 'Брови', list: BROWS.map(b => b.n), view: 'face', part: 'brows' },
    { k: 'fx', n: 'Эффект над головой', list: FX, view: 'head', part: 'fx' },
  ] },
  { tab: '💇 Волосы', sec: [
    { k: 'hairF', n: 'Чёлка', list: HAIR_F, view: 'head', part: 'hairF' },
    { k: 'hairB', n: 'Причёска сзади', list: HAIR_B, view: 'full', part: 'hairB' },
    { col: 'hair', n: 'Цвет волос', pal: PALETTE.hair, also: 'hair2' },
    { col: 'hair2', n: 'Цвет кончиков (омбре)', pal: PALETTE.hair },
    { k: 'ahoge', n: 'Хохолок', list: AHOGE, view: 'head', part: 'ahoge' },
  ] },
  { tab: '👕 Одежда', sec: [
    { k: 'top', n: 'Верх', list: TOPS.map(t => t.n), view: 'body', part: 'top' },
    { col: 'topC', n: 'Цвет верха', pal: PALETTE.cloth },
    { col: 'top2', n: 'Цвет деталей (воротник, бант, ленты)', pal: PALETTE.cloth },
    { k: 'sleeves', n: 'Рукава', list: SLEEVES, view: 'body', part: 'top' },
    { k: 'bottom', n: 'Низ', list: BOTTOMS, view: 'legs', part: 'bottom' },
    { col: 'botC', n: 'Цвет низа', pal: PALETTE.cloth },
    { k: 'outer', n: 'Поверх', list: OUTERS, view: 'body', part: 'outer' },
    { col: 'outC', n: 'Цвет верхней одежды', pal: PALETTE.cloth },
  ] },
  { tab: '👟 Ноги', sec: [
    { k: 'legwear', n: 'Носки и чулки', list: LEGWEAR, view: 'legs', part: 'legwear' },
    { col: 'legC', n: 'Цвет', pal: PALETTE.cloth },
    { k: 'shoes', n: 'Обувь', list: SHOES, view: 'legs', part: 'shoes' },
    { col: 'shoeC', n: 'Цвет обуви', pal: PALETTE.cloth },
  ] },
  { tab: '🎀 Аксессуары', sec: [
    { k: 'hat', n: 'На голове', list: HATS, view: 'head', part: 'hat' },
    { col: 'hatC', n: 'Цвет', pal: PALETTE.cloth },
    { k: 'glasses', n: 'Очки', list: GLASSES, view: 'face', part: 'glasses' },
    { col: 'glC', n: 'Цвет оправы', pal: PALETTE.cloth },
    { k: 'back', n: 'За спиной', list: BACKS, view: 'full', part: 'back' },
    { col: 'backC', n: 'Цвет', pal: PALETTE.cloth },
  ] },
  { tab: '🧍 Тело', sec: [
    { sl: 'height', n: 'Рост', min: 0.8, max: 1.2, step: 0.01 },
    { sl: 'width', n: 'Ширина', min: 0.85, max: 1.2, step: 0.01 },
    { sl: 'headSize', n: 'Голова', min: 0.8, max: 1.3, step: 0.01, part: 'head' },
  ] },
  { tab: '🤸 Поза', pose: 1 },
];
const ADJ_PARTS = ['eyes', 'brows', 'mouth', 'nose', 'blush', 'ears', 'head', 'hairF', 'hairB', 'ahoge', 'hat', 'glasses', 'top', 'bottom', 'outer', 'legwear', 'shoes', 'back', 'fx'];

const Editor = {
  c: null, tab: 0, part: 'eyes', zoom: 'full', hist: [], arg: null, dirty: false,
  enter(arg) {
    this.arg = arg || {};
    this.c = fixChar(clone(this.arg.c || defaultChar()));
    if (!this.c.id) this.c.id = uid();
    this.hist = []; this.dirty = false;
    $('#edName').value = this.c.name || '';
    this.renderTabs(); this.renderSecs(); this.draw(); this.renderAdj();
  },
  snap() { this.hist.push(clone(this.c)); if (this.hist.length > 60) this.hist.shift(); this.dirty = true; },
  draw() {
    const vb = ZOOMS[this.zoom];
    $('#edSvg').innerHTML = renderChar(this.c, { uid: 'ed_', viewBox: vb });
    $$('.ed-zoom .chip').forEach(b => b.classList.toggle('on', b.dataset.zoom === this.zoom));
    this.joints.on = !!ED[this.tab].pose && PoseUI.jointsOn;
    this.joints.update();
  },
  renderTabs() { $('#edTabs').innerHTML = ED.map((t, i) => `<button class="${i === this.tab ? 'on' : ''}" data-tab="${i}">${t.tab}</button>`).join(''); },
  renderSecs(keepScroll) {
    const box = $('#edSecs'), sc = box.scrollTop;
    const T = ED[this.tab], c = this.c;
    let h = '';
    if (T.pose) h = posePanelHTML(c);
    else for (const s of T.sec) {
      const mv = s.part ? ` <span class="mv" data-part-pick="${s.part}">✥ двигать</span>` : '';
      if (s.k) h += secHTML(s.n, optGrid(s.list, c[s.k], i => renderChar(Object.assign({}, c, { [s.k]: i }), { viewBox: VIEWS[s.view] }), s.k), mv);
      else if (s.col) h += secHTML(s.n, swatches(s.pal, c[s.col], s.col));
      else if (s.sl) h += secHTML('', slider(s.n, s.sl, c[s.sl], s.min, s.max, s.step, v => (+v).toFixed(s.step < 1 ? 2 : 0)));
    }
    box.innerHTML = h;
    box.scrollTop = keepScroll ? sc : 0;
  },
  renderAdj() {
    const p = this.part, a = this.c.adj[p] || {};
    $('#edAdj').innerHTML = `<select class="chip" id="adjPart">${ADJ_PARTS.map(k => `<option value="${k}"${k === p ? ' selected' : ''}>${PARTS[k].n}</option>`).join('')}</select>
      <button data-adj="l" title="Влево">←</button><button data-adj="u" title="Вверх">↑</button><button data-adj="d" title="Вниз">↓</button><button data-adj="r" title="Вправо">→</button><span class="sep"></span>
      <button data-adj="s-" title="Меньше">−</button><button data-adj="s+" title="Больше">＋</button><button data-adj="r-" title="Повернуть">⟲</button><button data-adj="r+" title="Повернуть">⟳</button>
      <button data-adj="sx" title="Шире/уже: тяни">↔</button><button data-adj="sy" title="Выше/ниже">↕</button><span class="sep"></span><button data-adj="0" title="Сбросить">↺</button>`;
    $('#adjPart').onchange = e => { this.part = e.target.value; this.renderAdj(); };
  },
  adjust(op, mult = 1) {
    const p = this.part; const a = this.c.adj[p] = this.c.adj[p] || { x: 0, y: 0, s: 1, r: 0 };
    const st = 2 * mult;
    this.snap();
    switch (op) {
      case 'l': a.x = (a.x || 0) - st; break; case 'r': a.x = (a.x || 0) + st; break;
      case 'u': a.y = (a.y || 0) - st; break; case 'd': a.y = (a.y || 0) + st; break;
      case 's-': a.s = +((a.s || 1) - 0.04 * mult).toFixed(3); break; case 's+': a.s = +((a.s || 1) + 0.04 * mult).toFixed(3); break;
      case 'r-': a.r = (a.r || 0) - 3 * mult; break; case 'r+': a.r = (a.r || 0) + 3 * mult; break;
      case 'sx': a.sx = +(((a.sx || 1) >= 1.3 ? 0.75 : (a.sx || 1) + 0.05)).toFixed(2); break;
      case 'sy': a.sy = +(((a.sy || 1) >= 1.3 ? 0.75 : (a.sy || 1) + 0.05)).toFixed(2); break;
      case '0': delete this.c.adj[p]; break;
    }
    this.draw();
  },
  async save(back) {
    this.c.name = $('#edName').value.trim() || 'Без имени';
    if (this.arg.onSave) { this.arg.onSave(clone(this.c)); }
    else await Lib.save(this.c);
    this.dirty = false;
    toast('Сохранено ✓');
    if (back) go(this.arg.back || 'chars');
  },
};
Screens.editor = Editor;

Editor.joints = JointLayer($('#edJoints'), () => $('#edSvg svg'), () => Editor.c.pose, () => {
  if (Editor._raf) return;
  Editor._raf = requestAnimationFrame(() => { Editor._raf = 0; Editor.draw(); });
}, () => { Editor.dirty = true; Editor.renderSecs(true); });
// снимок для отмены перед перетаскиванием сустава
$('#edJoints').addEventListener('pointerdown', () => Editor.snap(), true);

$('#edTabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; Editor.tab = +b.dataset.tab; Editor.renderTabs(); Editor.renderSecs(); Editor.draw(); };
$('#edSecs').addEventListener('click', e => {
  const c = Editor.c;
  const pp = e.target.closest('[data-part-pick]');
  if (pp) { Editor.part = pp.dataset.partPick; Editor.renderAdj(); toast('Тяни деталь на персонаже или жми стрелки'); return; }
  const o = e.target.closest('[data-k]');
  if (o) {
    Editor.snap();
    c[o.dataset.k] = +o.dataset.v;
    const s = (ED[Editor.tab].sec || []).find(x => x.k === o.dataset.k);
    if (s && s.part) { Editor.part = s.part; Editor.renderAdj(); }
    if (o.dataset.k === 'top' && TOPS[c.top].dress && !c.bottom) c.bottom = 0;
    Editor.renderSecs(true); Editor.draw(); return;
  }
  const w = e.target.closest('button[data-col]');
  if (w) {
    Editor.snap();
    const k = w.dataset.col, s = ED[Editor.tab].sec.find(x => x.col === k);
    if (s && s.also && c[s.also] === c[k]) c[s.also] = w.dataset.v;
    c[k] = w.dataset.v; Editor.renderSecs(true); Editor.draw();
  }
});
$('#edSecs').addEventListener('input', e => {
  const c = Editor.c;
  const ci = e.target.closest('input[data-col]');
  if (ci) {
    const k = ci.dataset.col, s = ED[Editor.tab].sec.find(x => x.col === k);
    if (s && s.also && c[s.also] === c[k]) c[s.also] = ci.value;
    c[k] = ci.value; Editor.dirty = true; Editor.draw(); return;
  }
  const sl = e.target.closest('[data-sl]');
  if (sl && !sl.dataset.sl.startsWith('pose.')) {
    c[sl.dataset.sl] = +sl.value; sl.nextElementSibling.textContent = (+sl.value).toFixed(sl.step < 1 ? 2 : 0);
    Editor.dirty = true; Editor.draw();
  }
});
$('#edSecs').addEventListener('change', e => { if (e.target.matches('input[data-col]')) Editor.renderSecs(true); });
PoseUI.bind({ set onclick(f) { $('#edSecs').addEventListener('click', ev => { if (ED[Editor.tab].pose) f(ev); }); }, set oninput(f) { $('#edSecs').addEventListener('input', ev => { if (ED[Editor.tab].pose) f(ev); }); } },
  { get: () => Editor.c, change: full => { Editor.dirty = true; Editor.draw(); if (full) Editor.renderSecs(true); } });
$('#edSecs').addEventListener('pointerdown', e => { if (ED[Editor.tab].pose && e.target.closest('button,[data-sl]')) Editor.snap(); });

// стрелки и масштаб: удержание повторяет
(() => {
  let t = null;
  const stop = () => { clearInterval(t); clearTimeout(t); t = null; };
  $('#edAdj').addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-adj]'); if (!b) return;
    e.preventDefault();
    const op = b.dataset.adj;
    Editor.adjust(op);
    if ('lrud'.includes(op) || op.length === 2 && op[1] !== 'x' && op[1] !== 'y') t = setTimeout(() => { t = setInterval(() => Editor.adjust(op), 60); }, 350);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => $('#edAdj').addEventListener(ev, stop));
})();

// перетаскивание деталей прямо на персонаже
(() => {
  const st = $('#edStage');
  let drag = null;
  st.addEventListener('pointerdown', e => {
    if (e.target.closest('.joints i') || e.target.closest('.ed-zoom')) return;
    const el = e.target.closest('[data-part]');
    if (!el) return;
    const part = el.dataset.part;
    if (!PARTS[part]) return;
    e.preventDefault();
    Editor.part = part; Editor.renderAdj();
    const svg = $('#edSvg svg'); const m = svg.getScreenCTM();
    const a = Editor.c.adj[part] || {};
    drag = { part, x0: e.clientX, y0: e.clientY, ax: a.x || 0, ay: a.y || 0, k: 1 / m.a, moved: false, id: e.pointerId };
    $('#edSvg').classList.add('drag');
    try { st.setPointerCapture(e.pointerId); } catch (_) { }
  });
  st.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = (e.clientX - drag.x0) * drag.k, dy = (e.clientY - drag.y0) * drag.k;
    if (!drag.moved && Math.hypot(dx, dy) < 2) return;
    if (!drag.moved) { Editor.snap(); drag.moved = true; }
    const a = Editor.c.adj[drag.part] = Editor.c.adj[drag.part] || { x: 0, y: 0, s: 1, r: 0 };
    // для зеркальных деталей (уши, обувь) движение по x — симметрично
    a.x = Math.round(drag.ax + dx); a.y = Math.round(drag.ay + dy);
    if (!Editor._raf) Editor._raf = requestAnimationFrame(() => { Editor._raf = 0; Editor.draw(); });
  });
  const end = e => { if (drag && e.pointerId === drag.id) { if (!drag.moved) toast(`${PARTS[drag.part].n}: тяни или жми стрелки`); drag = null; $('#edSvg').classList.remove('drag'); } };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  // колесо мыши — масштаб выбранной детали
  st.addEventListener('wheel', e => { if (!e.target.closest('[data-part]')) return; e.preventDefault(); Editor.adjust(e.deltaY < 0 ? 's+' : 's-', 0.5); }, { passive: false });
})();

document.addEventListener('keydown', e => {
  if (curScreen !== 'editor' || e.target.matches('input,textarea,select')) return;
  const k = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', '+': 's+', '=': 's+', '-': 's-', '[': 'r-', ']': 'r+' }[e.key];
  if (k) { e.preventDefault(); Editor.adjust(k, e.shiftKey ? 4 : 1); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); $('#edUndo').click(); }
});
$$('.ed-zoom .chip').forEach(b => b.onclick = () => { Editor.zoom = b.dataset.zoom; Editor.draw(); });
$('#edUndo').onclick = () => { const h = Editor.hist.pop(); if (h) { Editor.c = h; Editor.renderSecs(true); Editor.draw(); Editor.renderAdj(); } };
$('#edRandom').onclick = () => { Editor.snap(); const r = randomChar(); r.id = Editor.c.id; r.name = Editor.c.name; r.pose = Editor.c.pose; Editor.c = r; Editor.renderSecs(true); Editor.draw(); };
$('#edSave').onclick = () => Editor.save(true);
$('#edBack').onclick = async () => {
  if (Editor.dirty) await Editor.save(false);
  go(Editor.arg.back || 'chars');
};
window.addEventListener('resize', () => { if (curScreen === 'editor') Editor.joints.update(); });
