// Общее: навигация, тосты, модалки, библиотека персонажей, редактор позы и эмоций.
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clone = o => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// ---------- экраны ----------
const Screens = {};
let curScreen = 'home';
function go(name, arg) {
  const prev = Screens[curScreen];
  if (prev && prev.leave) prev.leave();
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === name));
  curScreen = name;
  const S = Screens[name];
  if (S && S.enter) S.enter(arg);
  if (name !== 'home') history.replaceState({ s: name }, '', '#' + name); else history.replaceState({ s: 'home' }, '', location.pathname);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (b) go(b.dataset.go);
});

function toast(msg, ms = 1800) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms);
}
function modal(html, onOpen) {
  const m = $('#modal'); $('#modalBox').innerHTML = html; m.classList.add('on');
  if (onOpen) onOpen($('#modalBox'));
}
function closeModal() { $('#modal').classList.remove('on'); $('#modalBox').innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
function confirmBox(text, okText = 'Да') {
  return new Promise(res => {
    modal(`<h3>${esc(text)}</h3><div class="row"><button class="btn red" id="cfOk">${esc(okText)}</button><button class="btn ghost" data-close>Отмена</button></div>`, box => {
      $('#cfOk', box).onclick = () => { closeModal(); res(true); };
    });
    const obs = setInterval(() => { if (!$('#modal').classList.contains('on')) { clearInterval(obs); res(false); } }, 300);
  });
}
function pickFile(input) {
  return new Promise(res => {
    const el = $(input);
    el.value = '';
    el.onchange = () => res(el.files && el.files[0] || null);
    el.click();
  });
}

// SVG-строка → картинка (для фото сцены и превью)
function svgImage(svg) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im); im.onerror = rej;
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
function loadImage(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}
function canvasBlob(cv, type = 'image/jpeg', q = 0.9) { return new Promise(res => cv.toBlob(res, type, q)); }
function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---------- библиотека персонажей ----------
const Lib = {
  chars: [],
  async load() {
    this.chars = (await DB.all('chars')).sort((a, b) => (a.created || 0) - (b.created || 0));
    if (!this.chars.length && !(await DB.get('kv', 'seeded'))) {
      for (const p of PRESET_CHARS) { const c = clone(p); c.id = uid(); c.created = Date.now() + this.chars.length; this.chars.push(c); await DB.put('chars', c); }
      await DB.put('kv', 1, 'seeded');
    }
    this.chars.forEach(fixChar);
    return this.chars;
  },
  async save(c) {
    c.updated = Date.now(); if (!c.created) c.created = Date.now();
    await DB.put('chars', clone(c));
    const i = this.chars.findIndex(x => x.id === c.id);
    if (i >= 0) this.chars[i] = clone(c); else this.chars.push(clone(c));
  },
  async del(id) { await DB.del('chars', id); this.chars = this.chars.filter(c => c.id !== id); },
  get(id) { return this.chars.find(c => c.id === id); },
};
// дополнить старые/неполные данные значениями по умолчанию
function fixChar(c) {
  const d = defaultChar();
  for (const k in d) if (c[k] === undefined) c[k] = clone(d[k]);
  c.pose = Object.assign({}, POSE0, c.pose || {});
  c.adj = c.adj || {};
  return c;
}

// ---------- общие UI-блоки ----------
function secHTML(title, inner, extra = '') { return `<div class="sec"><h4>${title}${extra}</h4>${inner}</div>`; }
function optGrid(list, cur, thumb, key) {
  return `<div class="opts">${list.map((n, i) => `<button class="opt${thumb ? '' : ' txt'}${i === cur ? ' on' : ''}" data-k="${key}" data-v="${i}" title="${esc(n)}">${thumb ? thumb(i) + `<span class="t">${esc(n)}</span>` : esc(n)}</button>`).join('')}</div>`;
}
function swatches(pal, cur, key) {
  return `<div class="sw">${pal.map(c => `<button style="background:${c}" class="${c.toLowerCase() === (cur || '').toLowerCase() ? 'on' : ''}" data-col="${key}" data-v="${c}"></button>`).join('')}<input type="color" value="${cur}" data-col="${key}"></div>`;
}
function slider(label, key, v, min, max, step, fmt = x => x) {
  return `<label class="sl"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-sl="${key}"><b>${fmt(v)}</b></label>`;
}

// ---------- поза: ручки-суставы ----------
const JOINT_H = [
  { k: 'lean', pt: [150, 336], pv: J.hip, cls: 'j-body', n: 'Корпус' },
  { k: 'head', pt: [150, 128], pv: J.neck, cls: 'j-body', n: 'Голова' },
  { k: 'aL', pt: J.el, pv: J.sh, n: 'Плечо' }, { k: 'eL', pt: J.wr, pv: J.el, n: 'Локоть' }, { k: 'wL', pt: [118, 436], pv: J.wr, cls: 'j-hand', n: 'Кисть' },
  { k: 'aR', pt: J.el, pv: J.sh, n: 'Плечо' }, { k: 'eR', pt: J.wr, pv: J.el, n: 'Локоть' }, { k: 'wR', pt: [118, 436], pv: J.wr, cls: 'j-hand', n: 'Кисть' },
  { k: 'lL', pt: J.kn, pv: J.hp, n: 'Бедро' }, { k: 'kL', pt: J.an, pv: J.kn, n: 'Колено' }, { k: 'fL', pt: [112, 574], pv: J.an, cls: 'j-foot', n: 'Стопа' },
  { k: 'lR', pt: J.kn, pv: J.hp, n: 'Бедро' }, { k: 'kR', pt: J.an, pv: J.kn, n: 'Колено' }, { k: 'fR', pt: [112, 574], pv: J.an, cls: 'j-foot', n: 'Стопа' },
];
// Рисует ручки над svg внутри layer (absolute). getPose() → объект позы; onDrag() — перерисовать.
function JointLayer(layer, getSvgRoot, getPose, onDrag, onEnd) {
  const self = { on: false };
  function pos(el, pt) {
    const m = el.getScreenCTM(); if (!m) return null;
    const p = new DOMPoint(pt[0], pt[1]).matrixTransform(m);
    const r = layer.getBoundingClientRect();
    return { x: p.x - r.left, y: p.y - r.top, det: m.a * m.d - m.b * m.c, sx: p.x, sy: p.y };
  }
  self.update = () => {
    if (!self.on) { layer.innerHTML = ''; return; }
    const root = getSvgRoot(); if (!root) { layer.innerHTML = ''; return; }
    let html = '';
    for (const h of JOINT_H) {
      const el = root.querySelector(`[data-joint="${h.k}"]`); if (!el) continue;
      const p = pos(el, h.pt); if (!p) continue;
      html += `<i class="${h.cls || ''}${self.active === h.k ? ' on' : ''}" data-j="${h.k}" title="${h.n}" style="left:${p.x}px;top:${p.y}px"></i>`;
    }
    layer.innerHTML = html;
  };
  let drag = null;
  layer.addEventListener('pointerdown', e => {
    const i = e.target.closest('i[data-j]'); if (!i) return;
    e.preventDefault(); e.stopPropagation();
    const k = i.dataset.j, h = JOINT_H.find(x => x.k === k);
    const root = getSvgRoot(); const el = root && root.querySelector(`[data-joint="${k}"]`); if (!el) return;
    const pv = pos(el, h.pv);
    const pose = getPose();
    drag = { k, pv, a0: Math.atan2(e.clientY - pv.sy, e.clientX - pv.sx), v0: pose[k] || 0, sign: pv.det < 0 ? -1 : 1, id: e.pointerId };
    self.active = k;
    try { layer.setPointerCapture(e.pointerId); } catch (_) { }
  });
  layer.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    let d = (Math.atan2(e.clientY - drag.pv.sy, e.clientX - drag.pv.sx) - drag.a0) * 180 / Math.PI;
    while (d > 180) d -= 360; while (d < -180) d += 360;
    const pose = getPose();
    let v = drag.v0 + d * drag.sign;
    while (v > 180) v -= 360; while (v < -180) v += 360;
    pose[drag.k] = Math.round(v);
    onDrag(drag.k);
  });
  const end = e => { if (drag && e.pointerId === drag.id) { drag = null; if (onEnd) onEnd(); self.update(); } };
  layer.addEventListener('pointerup', end); layer.addEventListener('pointercancel', end);
  return self;
}

// ---------- поза: панель ----------
const POSE_SLIDERS = [
  ['lean', 'Корпус'], ['head', 'Голова'], ['nod', 'Кивок', -10, 14],
  ['aL', 'Л. плечо'], ['eL', 'Л. локоть'], ['wL', 'Л. кисть'],
  ['aR', 'П. плечо'], ['eR', 'П. локоть'], ['wR', 'П. кисть'],
  ['lL', 'Л. бедро'], ['kL', 'Л. колено'], ['fL', 'Л. стопа'],
  ['lR', 'П. бедро'], ['kR', 'П. колено'], ['fR', 'П. стопа'],
  ['jump', 'Подпрыгнуть', 0, 160],
];
// ctx: { get(): char, change(full) , joints: JointLayer }
function posePanelHTML(c) {
  const p = c.pose;
  const mini = (pp) => renderChar(c, { pose: Object.assign({}, POSE0, pp), viewBox: '-30 60 360 560' });
  let h = '';
  h += `<p class="hint">Тяни кружки на персонаже: <b style="color:#ff8cc6">розовые</b> — плечи, локти, бёдра, колени; <b style="color:#4fe0c0">зелёные</b> — кисти и стопы; <b style="color:#ffd84a">жёлтые</b> — голова и корпус.</p>`;
  h += `<div class="row" style="margin-bottom:10px"><button class="chip${PoseUI.jointsOn ? ' on' : ''}" data-pa="joints">🦴 Суставы</button><button class="chip" data-pa="mirror">⇋ Зеркально</button><button class="chip" data-pa="reset">↺ Сброс</button><button class="chip" data-pa="copy">📋 Копировать</button><button class="chip" data-pa="paste">📌 Вставить</button></div>`;
  h += secHTML('Готовые позы', `<div class="opts">${POSES.map((ps, i) => `<button class="opt" data-pose="${i}">${mini(ps.p)}<span class="t">${ps.name}</span></button>`).join('')}</div>`);
  const handRow = side => `<div class="row">${HAND_NAMES.map((n, i) => `<button class="chip${(side ? p.hR : p.hL) === i ? ' on' : ''}" data-hand="${side}" data-v="${i}">${n}</button>`).join('')}</div>`;
  h += secHTML('Левая кисть', handRow(0));
  h += secHTML('Правая кисть', handRow(1));
  const layRow = side => { const v = side ? p.layR : p.layL; return `<div class="row">${[[-1, 'За телом'], [0, 'Обычно'], [1, 'Перед лицом']].map(([x, n]) => `<button class="chip${v === x ? ' on' : ''}" data-lay="${side}" data-v="${x}">${n}</button>`).join('')}</div>`; };
  h += secHTML('Левая рука — слой', layRow(0));
  h += secHTML('Правая рука — слой', layRow(1));
  h += secHTML('Ноги', `<div class="row"><button class="chip${p.sit ? ' on' : ''}" data-pa="sit">🪑 Сидит</button></div>`);
  h += secHTML('Точная настройка', POSE_SLIDERS.map(([k, n, mn = -180, mx = 180]) => slider(n, 'pose.' + k, p[k] || 0, mn, mx, 1, v => v + (k === 'jump' || k === 'nod' ? '' : '°'))).join(''));
  return h;
}
let poseClipboard = null;
const PoseUI = {
  jointsOn: true,
  bind(el, ctx) {
    el.onclick = e => {
      const c = ctx.get(); if (!c) return;
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pose !== undefined) { c.pose = Object.assign({}, POSE0, POSES[+b.dataset.pose].p); ctx.change(true); return; }
      if (b.dataset.hand !== undefined) { c.pose[b.dataset.hand === '1' ? 'hR' : 'hL'] = +b.dataset.v; ctx.change(true); return; }
      if (b.dataset.lay !== undefined) { c.pose[b.dataset.lay === '1' ? 'layR' : 'layL'] = +b.dataset.v; ctx.change(true); return; }
      const a = b.dataset.pa;
      if (a === 'joints') { PoseUI.jointsOn = !PoseUI.jointsOn; ctx.change(true); }
      if (a === 'reset') { c.pose = Object.assign({}, POSE0); ctx.change(true); }
      if (a === 'sit') { c.pose.sit = c.pose.sit ? 0 : 1; ctx.change(true); }
      if (a === 'copy') { poseClipboard = clone(c.pose); toast('Поза скопирована'); }
      if (a === 'paste') { if (poseClipboard) { c.pose = clone(poseClipboard); ctx.change(true); } else toast('Сначала скопируй позу'); }
      if (a === 'mirror') {
        const p = c.pose, q = Object.assign({}, p);
        for (const [l, r] of [['aL', 'aR'], ['eL', 'eR'], ['wL', 'wR'], ['lL', 'lR'], ['kL', 'kR'], ['fL', 'fR'], ['hL', 'hR'], ['layL', 'layR']]) { q[l] = p[r]; q[r] = p[l]; }
        q.lean = -p.lean; q.head = -p.head; c.pose = q; ctx.change(true);
      }
    };
    el.oninput = e => {
      const s = e.target.closest('[data-sl]'); if (!s || !s.dataset.sl.startsWith('pose.')) return;
      const c = ctx.get(); const k = s.dataset.sl.slice(5);
      c.pose[k] = +s.value; s.nextElementSibling.textContent = s.value + (k === 'jump' || k === 'nod' ? '' : '°');
      ctx.change(false);
    };
  },
};

// ---------- эмоции ----------
function faceThumb(c, patch) { return renderChar(Object.assign({}, c, patch, { hat: c.hat === 10 ? 0 : c.hat }), { viewBox: '62 120 176 176' }); }
function exprPanelHTML(c) {
  let h = '';
  h += secHTML('Глаза-эмоция', optGrid(EYE_FX, c.eyeFx || 0, i => faceThumb(c, { eyeFx: i }), 'eyeFx'));
  h += secHTML('Рот', optGrid(MOUTHS, c.mouth, i => faceThumb(c, { mouth: i }), 'mouth'));
  h += secHTML('Брови', optGrid(BROWS.map(b => b.n), c.brows, i => faceThumb(c, { brows: i }), 'brows'));
  h += secHTML('Румянец', optGrid(BLUSH, c.blush, i => faceThumb(c, { blush: i }), 'blush'));
  h += secHTML('Эффект', optGrid(FX, c.fx || 0, i => renderChar(Object.assign({}, c, { fx: i }), { viewBox: '30 40 260 260' }), 'fx'));
  return h;
}
function bindExpr(el, ctx) {
  el.onclick = e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const c = ctx.get(); if (!c) return;
    c[b.dataset.k] = +b.dataset.v; ctx.change(true);
  };
}

// ---------- установка PWA ----------
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#installBtn').hidden = false; });
$('#installBtn').onclick = async () => {
  if (installEvt) { installEvt.prompt(); installEvt = null; $('#installBtn').hidden = true; }
};
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
if (isIOS && !navigator.standalone) {
  const b = $('#installBtn'); b.hidden = false;
  b.onclick = () => modal('<h3>Установить на iPhone</h3><p>Нажми кнопку «Поделиться» <b>⎋</b> внизу Safari и выбери <b>«На экран Домой»</b>. Приложение будет работать без интернета.</p><div class="row"><button class="btn" data-close>Понятно</button></div>');
}
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]nosw/.test(location.search)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });

window.addEventListener('popstate', () => { if (curScreen !== 'home') go('home'); });

// старт — после загрузки всех модулей
window.addEventListener('DOMContentLoaded', async () => {
  await Lib.load();
  const h = location.hash.slice(1);
  if (h && Screens[h] && h !== 'editor') go(h);
});
