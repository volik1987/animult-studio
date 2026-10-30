// Студия: сцена с фоном, персонажами, предметами и текстом; фото кадра.
'use strict';

const BGS = [
  ['classroom', 'Класс'], ['hallway', 'Коридор'], ['rooftop', 'Крыша школы'], ['bedroom', 'Комната'], ['living', 'Гостиная'], ['cafe', 'Кафе'],
  ['street', 'Улица'], ['park', 'Парк'], ['beach', 'Пляж'], ['shrine', 'Храм'], ['winter', 'Зимняя деревня'], ['forest', 'Волшебный лес'],
  ['stage', 'Сцена'], ['throne', 'Тронный зал'], ['cyber', 'Неон-город'], ['space', 'Космолёт'],
];
const PROPS = [
  ['chair', 'Стул', 230], ['table', 'Столик', 230], ['sofa', 'Диван', 230], ['plant', 'Цветок', 190], ['sakura', 'Сакура', 300], ['bouquet', 'Букет', 120],
  ['cat', 'Котик', 150], ['dog', 'Пёсик', 140], ['bike', 'Велосипед', 260], ['backpack', 'Рюкзак', 120], ['guitar', 'Гитара', 230], ['wand', 'Палочка', 130],
  ['cake', 'Торт', 140], ['bubbletea', 'Бабл-ти', 90], ['balloons', 'Шарики', 300], ['chest', 'Сундук', 160],
];
const BUBBLES = [['speech', '💬 Реплика'], ['think', '💭 Мысль'], ['shout', '💥 Крик'], ['caption', '🎞 Титр'], ['plain', '🔤 Надпись']];
const TAILS = [['bl', '↙'], ['br', '↘'], ['tl', '↖'], ['tr', '↗'], ['none', '✕']];
const ASPECTS = { '16:9': [1600, 900], '9:16': [900, 1600], '1:1': [1200, 1200] };
const CK = 1.2; // пикселей сцены на единицу персонажа

// ---------- пузырь-текст в SVG ----------
const _mc = document.createElement('canvas').getContext('2d');
function wrapText(text, font, maxW) {
  _mc.font = font;
  const out = [];
  for (const para of String(text || ' ').split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (_mc.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}
function bubbleGeom(o) {
  const fs = o.fs || 34, font = `800 ${fs}px "Nunito","Segoe UI",Arial,sans-serif`;
  const lines = wrapText(o.text, font, o.bst === 'caption' ? 900 : o.bst === 'plain' ? 1000 : 380);
  _mc.font = font;
  const tw = Math.max(40, ...lines.map(l => _mc.measureText(l).width)), th = lines.length * fs * 1.2;
  const padX = o.bst === 'shout' ? fs * 1.6 : o.bst === 'think' ? fs * 1.3 : fs * 0.9, padY = o.bst === 'shout' ? fs * 1.3 : o.bst === 'think' ? fs * 1.0 : fs * 0.6;
  const bw = tw + padX * 2, bh = th + padY * 2, tail = (o.bst === 'speech' || o.bst === 'think') && o.tail !== 'none' ? fs * 1.8 : 0;
  const m = 8;
  const W = bw + m * 2, H = bh + tail + m * 2;
  return { fs, font, lines, tw, th, bw, bh, tail, m, W, H };
}
function bubbleSVG(o) {
  const g = bubbleGeom(o);
  const { fs, lines, bw, bh, tail, m, W, H } = g;
  const up = o.tail === 'tl' || o.tail === 'tr';
  const by = up ? m + tail : m;
  const fill = o.bg || (o.bst === 'shout' ? '#fff27a' : o.bst === 'caption' ? 'rgba(20,10,35,.78)' : '#ffffff');
  const col = o.col || (o.bst === 'caption' ? '#ffffff' : '#2a1640');
  let shape = '';
  const cx = m + bw / 2, cy = by + bh / 2;
  if (o.bst === 'speech') {
    const r = Math.min(bh / 2, 40);
    shape = `<rect x="${m}" y="${by}" width="${bw}" height="${bh}" rx="${r}" fill="${fill}" stroke="#2a1640" stroke-width="5"/>`;
    if (tail) {
      const left = o.tail === 'bl' || o.tail === 'tl', tx = left ? m + bw * 0.22 : m + bw * 0.78, ey = up ? by : by + bh, tipY = up ? m : H - m, tipX = left ? tx - fs * 0.9 : tx + fs * 0.9;
      shape += `<path d="M${tx - fs * 0.5} ${ey + (up ? 3 : -3)} L${tipX} ${tipY} L${tx + fs * 0.5} ${ey + (up ? 3 : -3)}" fill="${fill}" stroke="#2a1640" stroke-width="5" stroke-linejoin="round"/>`;
      shape += `<path d="M${tx - fs * 0.5 + 4} ${ey} L${tx + fs * 0.5 - 4} ${ey}" stroke="${fill}" stroke-width="8"/>`;
    }
  } else if (o.bst === 'think') {
    let d = '';
    const n = Math.max(8, Math.round((bw + bh) / 46));
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, px = cx + Math.cos(a) * (bw / 2 - fs * 0.35), py = cy + Math.sin(a) * (bh / 2 - fs * 0.3);
      d += `<circle cx="${px}" cy="${py}" r="${fs * 0.75}"/>`;
    }
    shape = `<g fill="${fill}" stroke="#2a1640" stroke-width="10">${d}<ellipse cx="${cx}" cy="${cy}" rx="${bw / 2 - fs * 0.3}" ry="${bh / 2 - fs * 0.3}"/></g><g fill="${fill}">${d}<ellipse cx="${cx}" cy="${cy}" rx="${bw / 2 - fs * 0.3}" ry="${bh / 2 - fs * 0.3}"/></g>`;
    if (tail) {
      const left = o.tail === 'bl' || o.tail === 'tl', sx = left ? m + bw * 0.25 : m + bw * 0.75, dir = left ? -1 : 1;
      const y0 = up ? by : by + bh;
      [[0.35, 0.42], [0.7, 0.28]].forEach(([t, r]) => { shape += `<circle cx="${sx + dir * t * fs * 1.2}" cy="${y0 + (up ? -1 : 1) * t * tail}" r="${r * fs}" fill="${fill}" stroke="#2a1640" stroke-width="4"/>`; });
    }
  } else if (o.bst === 'shout') {
    let d = '';
    const n = 18;
    for (let i = 0; i < n * 2; i++) {
      const a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? 0.78 : 1.0;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * bw / 2 * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * bh / 2 * rr).toFixed(1);
    }
    shape = `<path d="${d}Z" fill="${fill}" stroke="#2a1640" stroke-width="5" stroke-linejoin="round"/>`;
  } else if (o.bst === 'caption') {
    shape = `<rect x="${m}" y="${by}" width="${bw}" height="${bh}" rx="10" fill="${fill}"/>`;
  }
  const stroke = o.bst === 'plain' ? ` stroke="${o.bg || '#ffffff'}" stroke-width="${fs * 0.22}" paint-order="stroke" stroke-linejoin="round"` : '';
  const ty = cy - g.th / 2 + fs * 0.95;
  const txt = lines.map((l, i) => `<text x="${cx}" y="${ty + i * fs * 1.2}" text-anchor="middle" font-family="Nunito,Segoe UI,Arial,sans-serif" font-weight="800" font-size="${fs}" fill="${col}"${stroke}>${esc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${shape}${txt}</svg>`;
}

// ---------- студия ----------
const Studio = {
  sc: null, sel: null, hist: [], photos: [], urls: {}, tab: 'add', W: 1600, H: 900, k: 1,
  async init() {
    const saved = await DB.get('kv', 'scene');
    this.sc = saved || this.newScene();
    if (!ASPECTS[this.sc.aspect]) this.sc.aspect = '16:9';
    await this.loadPhotos();
    this.inited = true;
  },
  newScene() {
    const c = Lib.chars[0] ? clone(Lib.chars[0]) : clone(PRESET_CHARS[0]);
    return { aspect: '16:9', bg: { type: 'img', v: 'classroom', zoom: 1, x: 0, y: 0 }, objs: [{ id: uid(), type: 'char', c, x: 560, y: 860, s: 1, r: 0, flip: false }] };
  },
  async enter() {
    if (!this.inited) await this.init();
    this.layout(); await this.renderAll(); this.renderPanel(); this.renderStrip();
    if (this._pend) { const c = this._pend; this._pend = null; await this.addChar(c); }
  },
  async loadPhotos() { this.photos = (await DB.all('photos')).sort((a, b) => a.created - b.created); },
  save() { clearTimeout(this._st); this._st = setTimeout(() => DB.put('kv', clone(this.sc), 'scene'), 300); },
  snap() { this.hist.push(JSON.stringify(this.sc)); if (this.hist.length > 50) this.hist.shift(); },
  undo() { const h = this.hist.pop(); if (!h) return toast('Нечего отменять'); this.sc = JSON.parse(h); if (this.sel && !this.obj()) this.sel = null; this.renderAll(); this.renderPanel(); this.save(); },
  obj(id = this.sel) { return this.sc.objs.find(o => o.id === id); },

  layout() {
    const [W, H] = ASPECTS[this.sc.aspect]; this.W = W; this.H = H;
    const wrap = $('#stWrap'), st = $('#stage');
    const aw = wrap.clientWidth - 8, ah = wrap.clientHeight - 8;
    const k = Math.min(aw / W, ah / H);
    this.k = k;
    st.style.width = W * k + 'px'; st.style.height = H * k + 'px';
    const w = $('#world'); w.style.width = W + 'px'; w.style.height = H + 'px'; w.style.transform = `scale(${k})`;
    $('#stAspect').textContent = this.sc.aspect;
  },
  upURL(id) {
    if (this.urls[id]) return Promise.resolve(this.urls[id]);
    return DB.get('uploads', id).then(u => u ? (this.urls[id] = URL.createObjectURL(u.blob)) : '');
  },
  async bgSrc(bg = this.sc.bg) {
    if (bg.type === 'img') return `img/bg/${bg.v}.jpg`;
    if (bg.type === 'up') return await this.upURL(bg.v);
    return '';
  },
  async renderBg() {
    const bg = this.sc.bg, el = $('#stBg');
    const src = await this.bgSrc();
    el.style.backgroundColor = bg.type === 'color' ? bg.v : '#000';
    el.style.backgroundImage = src ? `url("${src}")` : 'none';
    const z = bg.zoom || 1;
    el.style.transform = `translate(${(bg.x || 0) * this.W / 100}px, ${(bg.y || 0) * this.H / 100}px) scale(${z})`;
  },
  geom(o) {
    if (o.type === 'char') {
      const w = VB.w * CK, h = VB.h * CK;
      return { w, h, ax: (ANCHOR.x - VB.x) * CK, ay: (ANCHOR.y - VB.y) * CK };
    }
    if (o.type === 'text') { const g = bubbleGeom(o); return { w: g.W, h: g.H, ax: g.W / 2, ay: g.H / 2 }; }
    const h = o.bh || 260, w = h * (o.ar || 1);
    return { w, h, ax: w / 2, ay: h };
  },
  async objHTML(o) {
    if (o.type === 'char') return renderChar(o.c, { uid: 'o' + o.id + '_' });
    if (o.type === 'text') return bubbleSVG(o);
    if (o.type === 'prop') return `<img src="img/props/${o.src}.webp" alt="" draggable="false">`;
    if (o.type === 'pic') return `<img src="${await this.upURL(o.up)}" alt="" draggable="false">`;
    return '';
  },
  async renderObj(o, el) {
    el = el || $(`#stObjs .obj[data-id="${o.id}"]`);
    if (!el) return;
    el.innerHTML = await this.objHTML(o);
    this.placeObj(o, el);
  },
  placeObj(o, el) {
    el = el || $(`#stObjs .obj[data-id="${o.id}"]`); if (!el) return;
    const g = this.geom(o), s = o.s || 1;
    el.style.left = (o.x - g.ax * s) + 'px'; el.style.top = (o.y - g.ay * s) + 'px';
    el.style.width = g.w * s + 'px'; el.style.height = g.h * s + 'px';
    el.style.transformOrigin = `${g.ax * s}px ${g.ay * s}px`;
    el.style.transform = `rotate(${o.r || 0}deg) scaleX(${o.flip ? -1 : 1})`;
    if (o.id === this.sel) this.placeSel();
  },
  async renderAll() {
    this.layout();
    await this.renderBg();
    const box = $('#stObjs');
    box.innerHTML = '';
    for (const o of this.sc.objs) {
      const el = document.createElement('div');
      el.className = 'obj'; el.dataset.id = o.id;
      box.appendChild(el);
      await this.renderObj(o, el);
    }
    this.placeSel();
    this.updateOnion();
  },
  // рамка выделения в координатах stage (экран)
  placeSel() {
    const sel = $('#stSel'), o = this.obj();
    if (!o) { sel.classList.remove('on'); this.joints.on = false; this.joints.update(); return; }
    const g = this.geom(o), s = (o.s || 1) * this.k;
    let bx = 0, by = 0, bw = g.w, bh = g.h;
    if (o.type === 'char') { bx = 40 * CK; by = 70 * CK; bw = (VB.w - 80) * CK; bh = (VB.h - 70) * CK; } // плотнее к фигуре
    sel.style.left = ((o.x - g.ax * (o.s || 1)) * this.k + bx * s) + 'px';
    sel.style.top = ((o.y - g.ay * (o.s || 1)) * this.k + by * s) + 'px';
    sel.style.width = bw * s + 'px'; sel.style.height = bh * s + 'px';
    sel.style.transformOrigin = `${(g.ax - bx) * s}px ${(g.ay - by) * s}px`;
    sel.style.transform = `rotate(${o.r || 0}deg)`;
    sel.classList.add('on');
    this.joints.on = o.type === 'char' && this.tab === 'pose' && PoseUI.jointsOn;
    this.joints.update();
  },
  select(id) {
    this.sel = id;
    this.placeSel();
    if (this.tab === 'obj' || this.tab === 'pose' || this.tab === 'face') this.renderPanel();
  },
  async addObj(o, noSel) {
    this.snap();
    o.id = uid();
    this.sc.objs.push(o);
    const el = document.createElement('div'); el.className = 'obj'; el.dataset.id = o.id;
    $('#stObjs').appendChild(el);
    await this.renderObj(o, el);
    if (!noSel) this.select(o.id);
    this.save();
    return o;
  },
  addChar(c) {
    if (!this.inited || curScreen !== 'studio') { this._pend = c; return; }
    // ставим туда, где дальше всего от других героев
    const xs = this.sc.objs.filter(o => o.type === 'char').map(o => o.x);
    let x = this.W / 2, best = -1;
    for (let f = 0.15; f <= 0.851; f += 0.05) { const cx = this.W * f, d = xs.length ? Math.min(...xs.map(v => Math.abs(v - cx))) : this.W - Math.abs(cx - this.W / 2); if (d > best) { best = d; x = cx; } }
    return this.addObj({ type: 'char', c: fixChar(clone(c)), x: Math.round(x), y: Math.round(this.H * 0.955), s: this.sc.aspect === '9:16' ? 1.15 : 1, r: 0, flip: x > this.W / 2 });
  },
  async addProp(p) {
    const im = await loadImage(`img/props/${p[0]}.webp`);
    return this.addObj({ type: 'prop', src: p[0], ar: im.naturalWidth / im.naturalHeight, bh: p[2], x: this.W / 2, y: this.H * 0.9, s: 1, r: 0, flip: false });
  },
  addText(bst) {
    const t = { speech: 'Привет!', think: 'Хм…', shout: 'Ура!!!', caption: 'Тем временем…', plain: 'Глава 1' }[bst];
    return this.addObj({ type: 'text', text: t, bst, tail: 'bl', fs: bst === 'plain' ? 64 : 36, x: this.W / 2, y: this.H * (bst === 'caption' ? 0.88 : 0.25), s: 1, r: 0, flip: false });
  },
  async addPic(file) {
    const blob = await shrinkImage(file, 1600);
    const id = uid(); await DB.put('uploads', { id, kind: 'pic', blob, created: Date.now() });
    const im = await loadImage(await this.upURL(id));
    return this.addObj({ type: 'pic', up: id, ar: im.naturalWidth / im.naturalHeight, bh: 360, x: this.W / 2, y: this.H * 0.8, s: 1, r: 0, flip: false });
  },
  async setBgFile(file) {
    if (!file) return;
    const blob = await shrinkImage(file, 2200);
    const id = uid(); await DB.put('uploads', { id, kind: 'bg', blob, created: Date.now() });
    this.snap(); this.sc.bg = { type: 'up', v: id, zoom: 1, x: 0, y: 0 };
    await this.renderBg(); this.save(); this.renderPanel();
  },
  del() { const o = this.obj(); if (!o) return; this.snap(); this.sc.objs = this.sc.objs.filter(x => x !== o); this.sel = null; this.renderAll(); this.renderPanel(); this.save(); },

  // ---------- фото ----------
  async compose(W = this.W, H = this.H) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const k = W / this.W;
    ctx.scale(k, k);
    const bg = this.sc.bg;
    ctx.fillStyle = bg.type === 'color' ? bg.v : '#000'; ctx.fillRect(0, 0, this.W, this.H);
    const src = await this.bgSrc();
    if (src) {
      const im = await loadImage(src);
      const z = bg.zoom || 1, sc = Math.max(this.W / im.naturalWidth, this.H / im.naturalHeight) * z;
      const dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
      ctx.drawImage(im, (this.W - dw) / 2 + (bg.x || 0) * this.W / 100, (this.H - dh) / 2 + (bg.y || 0) * this.H / 100, dw, dh);
    }
    for (const o of this.sc.objs) {
      let im;
      if (o.type === 'char') im = await svgImage(renderChar(o.c, { uid: 'x_', width: VB.w * 2, height: VB.h * 2 }));
      else if (o.type === 'text') im = await svgImage(bubbleSVG(o));
      else if (o.type === 'prop') im = await loadImage(`img/props/${o.src}.webp`);
      else if (o.type === 'pic') im = await loadImage(await this.upURL(o.up));
      if (!im) continue;
      const g = this.geom(o), s = o.s || 1;
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate((o.r || 0) * Math.PI / 180);
      ctx.scale(o.flip ? -s : s, s);
      ctx.drawImage(im, -g.ax, -g.ay, g.w, g.h);
      ctx.restore();
    }
    return cv;
  },
  async shot() {
    if (this._busy) return; this._busy = true;
    try {
      const f = $('#stFlash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
      const cv = await this.compose();
      const blob = await canvasBlob(cv, 'image/jpeg', 0.9);
      const tc = document.createElement('canvas'); tc.width = 320; tc.height = Math.round(320 * this.H / this.W);
      tc.getContext('2d').drawImage(cv, 0, 0, tc.width, tc.height);
      const thumb = await canvasBlob(tc, 'image/jpeg', 0.75);
      const ph = { id: uid(), blob, thumb, w: this.W, h: this.H, aspect: this.sc.aspect, created: Date.now(), scene: clone(this.sc) };
      await DB.put('photos', ph);
      this.photos.push(ph);
      this.renderStrip(); this.updateOnion();
      toast(`📸 Кадр №${this.photos.length} сохранён`);
    } catch (e) { console.error(e); toast('Не удалось сделать фото'); }
    this._busy = false;
  },
  thumbURL(ph) { return this.urls['t' + ph.id] || (this.urls['t' + ph.id] = URL.createObjectURL(ph.thumb || ph.blob)); },
  photoURL(ph) { return this.urls['p' + ph.id] || (this.urls['p' + ph.id] = URL.createObjectURL(ph.blob)); },
  renderStrip() {
    const s = $('#stStrip');
    const list = this.photos.slice(-40).reverse();
    s.innerHTML = list.length ? list.map(p => `<img src="${this.thumbURL(p)}" data-ph="${p.id}" alt="">`).join('') : '<span class="empty">Здесь появятся твои кадры. Расставь героев и нажми 📸</span>';
  },
  updateOnion() {
    const im = $('#stOnionImg');
    const last = this.photos[this.photos.length - 1];
    const on = this.onion && last && last.aspect === this.sc.aspect;
    im.classList.toggle('on', !!on);
    if (on) im.src = this.photoURL(last);
    $('#stOnion').classList.toggle('on', !!this.onion);
  },
  openPhoto(id) {
    const ph = this.photos.find(p => p.id === id); if (!ph) return;
    const n = this.photos.indexOf(ph) + 1;
    modal(`<h3>Кадр №${n}</h3><img src="${this.photoURL(ph)}" alt="">
      <div class="row"><button class="btn" id="phScene">↩ Продолжить с этой сцены</button><button class="btn alt" id="phDl">⬇ Скачать</button><button class="btn alt" id="phFilm">🎬 В монтаж</button><button class="btn red" id="phDel">🗑</button><button class="btn ghost" data-close>Закрыть</button></div>
      <p class="hint">«Продолжить» вернёт на сцену всё, что было на этом кадре — удобно доснимать мультик.</p>`, box => {
      $('#phDl', box).onclick = () => downloadBlob(ph.blob, `kadr-${n}.jpg`);
      $('#phScene', box).onclick = () => { this.snap(); this.sc = clone(ph.scene); this.sel = null; closeModal(); this.renderAll(); this.renderPanel(); this.save(); };
      $('#phFilm', box).onclick = async () => { await Montage.addPhotoToFilm(ph.id); toast('Добавлено в фильм 🎬'); };
      $('#phDel', box).onclick = async () => {
        if (!(await confirmBox('Удалить кадр?', 'Удалить'))) return;
        await DB.del('photos', ph.id); this.photos = this.photos.filter(p => p !== ph); this.renderStrip(); this.updateOnion();
      };
    });
  },

  // ---------- панель ----------
  renderPanel() {
    $$('#stTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === this.tab));
    const box = $('#stSecs'), o = this.obj();
    let h = '';
    if (this.tab === 'add') {
      h += secHTML('Персонажи', `<div class="props">${Lib.chars.map(c => `<button data-addc="${c.id}" title="${esc(c.name)}">${renderChar(c, { viewBox: '30 80 240 300' })}</button>`).join('')}<button data-a="newchar" title="Создать">＋</button></div>`);
      h += secHTML('Текст и пузыри', `<div class="row">${BUBBLES.map(([k, n]) => `<button class="chip" data-addt="${k}">${n}</button>`).join('')}</div>`);
      h += secHTML('Предметы', `<div class="props">${PROPS.map((p, i) => `<button data-addp="${i}" title="${p[1]}"><img src="img/props/${p[0]}.webp" alt="" loading="lazy"></button>`).join('')}</div>`);
      h += secHTML('Свои картинки', `<div class="big-actions"><button data-a="pic"><b>🖼</b>Картинка из галереи</button><button data-a="camobj"><b>📷</b>Сфотографировать</button></div>`);
      h += `<div class="row"><button class="btn red sm" data-a="clear">Очистить сцену</button></div>`;
    } else if (this.tab === 'bg') {
      const bg = this.sc.bg;
      h += secHTML('Своё фото фоном', `<div class="big-actions"><button data-a="bgcam"><b>📷</b>Снять камерой</button><button data-a="bgfile"><b>🖼</b>Из галереи</button></div>`);
      h += secHTML('Локации', `<div class="bgs">${BGS.map(([k, n]) => `<button data-bg="${k}" class="${bg.type === 'img' && bg.v === k ? 'on' : ''}" style="background-image:url(img/bg/${k}_t.jpg)"><span class="t">${n}</span></button>`).join('')}</div>`);
      h += secHTML('Однотонный', swatches(['#ffffff', '#ffd6e8', '#d8ccff', '#c8f0ff', '#d0ffd8', '#fff3b0', '#ffb0a0', '#2a1640', '#000000', '#00c040'], bg.type === 'color' ? bg.v : '#ffffff', 'bgc'));
      h += secHTML('Положение фона', slider('Масштаб', 'bg.zoom', bg.zoom || 1, 1, 3, 0.01, v => (+v).toFixed(2)) + slider('Сдвиг ↔', 'bg.x', bg.x || 0, -50, 50, 1) + slider('Сдвиг ↕', 'bg.y', bg.y || 0, -50, 50, 1));
    } else if (this.tab === 'obj') {
      if (!o) h = '<p class="hint">Нажми на персонажа, предмет или текст на сцене, чтобы выбрать его.</p>';
      else {
        const name = o.type === 'char' ? o.c.name : o.type === 'text' ? 'Текст' : o.type === 'prop' ? (PROPS.find(p => p[0] === o.src) || [0, 'Предмет'])[1] : 'Картинка';
        h += `<h4 style="margin:0 0 8px">${esc(name)}</h4>`;
        h += secHTML('Положение (стрелки)', `<div class="adj" style="background:none;border:0;justify-content:flex-start;padding:0"><button data-mv="l">←</button><button data-mv="u">↑</button><button data-mv="d">↓</button><button data-mv="r">→</button><span class="sep"></span><button data-mv="s-">−</button><button data-mv="s+">＋</button><button data-mv="r-">⟲</button><button data-mv="r+">⟳</button></div>`);
        h += `<div class="row" style="margin-bottom:12px"><button class="chip" data-a="flip">⇋ Отразить</button><button class="chip" data-a="up">⬆ Вперёд</button><button class="chip" data-a="down">⬇ Назад</button><button class="chip" data-a="dup">⧉ Копия</button><button class="chip" data-a="del">🗑 Удалить</button></div>`;
        h += slider('Размер', 'o.s', o.s || 1, 0.2, 3, 0.01, v => (+v).toFixed(2)) + slider('Поворот', 'o.r', o.r || 0, -180, 180, 1, v => v + '°');
        if (o.type === 'char') h += `<div class="row" style="margin-top:10px"><button class="btn sm" data-a="editchar">✏️ Изменить внешность</button><button class="btn alt sm" data-a="savechar">💾 В мои персонажи</button></div>`;
        if (o.type === 'text') {
          h += secHTML('Текст', `<textarea class="textarea" id="stText">${esc(o.text)}</textarea>`);
          h += secHTML('Вид', `<div class="row">${BUBBLES.map(([k, n]) => `<button class="chip${o.bst === k ? ' on' : ''}" data-bst="${k}">${n}</button>`).join('')}</div>`);
          if (o.bst === 'speech' || o.bst === 'think') h += secHTML('Хвостик', `<div class="row">${TAILS.map(([k, n]) => `<button class="chip${o.tail === k ? ' on' : ''}" data-tail="${k}">${n}</button>`).join('')}</div>`);
          h += slider('Размер шрифта', 'o.fs', o.fs || 36, 16, 120, 1);
          h += secHTML('Цвет текста', swatches(['#2a1640', '#ffffff', '#e8344a', '#2f5fff', '#ff5fa8', '#1a1a1a', '#ffd84a', '#40c080'], o.col || '#2a1640', 'tcol'));
          h += secHTML('Цвет пузыря / обводки', swatches(['#ffffff', '#fff27a', '#ffd6e8', '#c8f0ff', '#2a1640', '#000000', '#ff5fa8'], o.bg || '#ffffff', 'tbg'));
        }
      }
    } else if (this.tab === 'pose') {
      if (!o || o.type !== 'char') h = '<p class="hint">Выбери персонажа на сцене — и тут появятся позы. Суставы можно тянуть прямо на сцене.</p>';
      else h = posePanelHTML(o.c);
    } else if (this.tab === 'face') {
      if (!o || o.type !== 'char') h = '<p class="hint">Выбери персонажа на сцене, чтобы менять его эмоции.</p>';
      else h = exprPanelHTML(o.c);
    }
    const sc = box.scrollTop, same = this._lastTab === this.tab && this._lastSel === this.sel;
    box.innerHTML = h;
    if (same) box.scrollTop = sc;
    this._lastTab = this.tab; this._lastSel = this.sel;
  },
};

// уменьшение загруженных фото
async function shrinkImage(file, max) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const hasAlpha = /png|webp|gif/.test(file.type);
    return await canvasBlob(cv, hasAlpha ? 'image/png' : 'image/jpeg', 0.88);
  } catch (e) { return file; }
}

Screens.studio = Studio;
Studio.joints = JointLayer($('#stJoints'), () => { const o = Studio.obj(); return o && $(`#stObjs .obj[data-id="${o.id}"] svg`); }, () => Studio.obj().c.pose, () => {
  if (Studio._raf) return;
  Studio._raf = requestAnimationFrame(() => { Studio._raf = 0; const o = Studio.obj(); if (o) Studio.renderObj(o).then(() => Studio.joints.update()); });
}, () => { Studio.save(); Studio.renderPanel(); });
$('#stJoints').addEventListener('pointerdown', e => { if (e.target.closest('i')) Studio.snap(); }, true);

// ---------- события панели ----------
$('#stTabs').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; Studio.tab = b.dataset.t; Studio.renderPanel(); Studio.placeSel(); };
const stRefresh = (full) => { const o = Studio.obj(); if (!o) return; Studio.renderObj(o); Studio.save(); if (full) Studio.renderPanel(); };
PoseUI.bind({ set onclick(f) { $('#stSecs').addEventListener('click', ev => { if (Studio.tab === 'pose') f(ev); }); }, set oninput(f) { $('#stSecs').addEventListener('input', ev => { if (Studio.tab === 'pose') f(ev); }); } },
  { get: () => { const o = Studio.obj(); return o && o.type === 'char' ? o.c : null; }, change: full => { stRefresh(full); setTimeout(() => Studio.joints.update(), 30); } });
bindExpr({ set onclick(f) { $('#stSecs').addEventListener('click', ev => { if (Studio.tab === 'face') f(ev); }); } },
  { get: () => { const o = Studio.obj(); return o && o.type === 'char' ? o.c : null; }, change: () => stRefresh(true) });
$('#stSecs').addEventListener('pointerdown', e => { if ((Studio.tab === 'pose' || Studio.tab === 'face') && e.target.closest('button,[data-sl]')) Studio.snap(); });

$('#stSecs').addEventListener('click', async e => {
  const S = Studio, o = S.obj();
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.addc) { const c = Lib.get(b.dataset.addc); if (c) S.addChar(c); return; }
  if (b.dataset.addp) { S.addProp(PROPS[+b.dataset.addp]); return; }
  if (b.dataset.addt) { S.addText(b.dataset.addt); S.tab = 'obj'; S.renderPanel(); return; }
  if (b.dataset.bg) { S.snap(); S.sc.bg = { type: 'img', v: b.dataset.bg, zoom: 1, x: 0, y: 0 }; S.renderBg(); S.save(); S.renderPanel(); return; }
  if (b.dataset.col === 'bgc') { S.snap(); S.sc.bg = { type: 'color', v: b.dataset.v }; S.renderBg(); S.save(); S.renderPanel(); return; }
  if (b.dataset.mv && o) {
    S.snap();
    const st = e.shiftKey ? 20 : 6;
    ({ l: () => o.x -= st, r: () => o.x += st, u: () => o.y -= st, d: () => o.y += st, 's-': () => o.s = Math.max(0.15, (o.s || 1) - 0.04), 's+': () => o.s = (o.s || 1) + 0.04, 'r-': () => o.r = (o.r || 0) - 3, 'r+': () => o.r = (o.r || 0) + 3 })[b.dataset.mv]();
    S.placeObj(o); S.save(); return;
  }
  if (o && o.type === 'text') {
    if (b.dataset.bst) { S.snap(); o.bst = b.dataset.bst; stRefresh(true); return; }
    if (b.dataset.tail) { S.snap(); o.tail = b.dataset.tail; stRefresh(true); return; }
    if (b.dataset.col === 'tcol') { S.snap(); o.col = b.dataset.v; stRefresh(true); return; }
    if (b.dataset.col === 'tbg') { S.snap(); o.bg = b.dataset.v; stRefresh(true); return; }
  }
  const a = b.dataset.a;
  if (!a) return;
  if (a === 'newchar') { const c = randomChar(); c.id = uid(); c.name = 'Новый герой'; go('editor', { c, back: 'studio', onSave: async nc => { await Lib.save(nc); Studio.addChar(nc); } }); }
  if (a === 'pic') { const f = await pickFile('#fileImg'); if (f) S.addPic(f); }
  if (a === 'camobj') { const f = await pickFile('#fileCam'); if (f) S.addPic(f); }
  if (a === 'bgfile') S.setBgFile(await pickFile('#fileImg'));
  if (a === 'bgcam') S.setBgFile(await pickFile('#fileCam'));
  if (a === 'clear') { if (await confirmBox('Убрать всё со сцены?', 'Очистить')) { S.snap(); S.sc.objs = []; S.sel = null; S.renderAll(); S.save(); } }
  if (!o) return;
  if (a === 'flip') { S.snap(); o.flip = !o.flip; S.placeObj(o); S.save(); }
  if (a === 'up' || a === 'down') {
    S.snap(); const arr = S.sc.objs, i = arr.indexOf(o), j = clamp(i + (a === 'up' ? 1 : -1), 0, arr.length - 1);
    arr.splice(i, 1); arr.splice(j, 0, o); S.renderAll(); S.save();
  }
  if (a === 'dup') { const n = clone(o); n.x += 40; n.y += o.type === 'char' ? 0 : 30; S.addObj(n); }
  if (a === 'del') S.del();
  if (a === 'editchar') go('editor', { c: clone(o.c), back: 'studio', onSave: nc => { const ob = S.sc.objs.find(x => x.id === o.id); if (ob) { ob.c = nc; S.save(); } } });
  if (a === 'savechar') { const c = clone(o.c); const ex = Lib.get(c.id); if (!ex) { c.id = c.id || uid(); } await Lib.save(c); toast('Сохранено в «Персонажи»'); }
});
$('#stSecs').addEventListener('input', e => {
  const S = Studio, o = S.obj(), t = e.target;
  if (t.id === 'stText' && o) { o.text = t.value; S.renderObj(o); S.save(); return; }
  if (t.matches('input[data-col="bgc"]')) { S.sc.bg = { type: 'color', v: t.value }; S.renderBg(); S.save(); return; }
  if (t.matches('input[data-col="tcol"]') && o) { o.col = t.value; S.renderObj(o); S.save(); return; }
  if (t.matches('input[data-col="tbg"]') && o) { o.bg = t.value; S.renderObj(o); S.save(); return; }
  const sl = t.closest('[data-sl]'); if (!sl) return;
  const [grp, k] = sl.dataset.sl.split('.');
  if (grp === 'bg') { S.sc.bg[k] = +sl.value; S.renderBg(); S.save(); sl.nextElementSibling.textContent = k === 'zoom' ? (+sl.value).toFixed(2) : sl.value; }
  if (grp === 'o' && o) {
    o[k] = +sl.value; sl.nextElementSibling.textContent = k === 's' ? (+sl.value).toFixed(2) : sl.value + (k === 'r' ? '°' : '');
    if (k === 'fs') S.renderObj(o); else S.placeObj(o); S.save();
  }
});
$('#stSecs').addEventListener('focusin', e => { if (e.target.id === 'stText' || e.target.matches('[data-sl]')) Studio.snap(); });

// ---------- касания на сцене ----------
(() => {
  const st = $('#stage');
  const pts = new Map();
  let drag = null, lastTap = 0;
  st.addEventListener('pointerdown', e => {
    if (e.target.closest('.joints i')) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { st.setPointerCapture(e.pointerId); } catch (_) { }
    const S = Studio;
    if (e.target.closest('.h-rot')) {
      const o = S.obj(); if (!o) return;
      S.snap();
      const r = st.getBoundingClientRect(), ax = r.left + o.x * S.k, ay = r.top + o.y * S.k;
      const g = S.geom(o), cy = ay - (g.ay - g.h / 2) * (o.s || 1) * S.k; // центр объекта
      drag = { mode: 'rot', o, cx: ax, cy, d0: Math.hypot(e.clientX - ax, e.clientY - cy), a0: Math.atan2(e.clientY - cy, e.clientX - ax), s0: o.s || 1, r0: o.r || 0 };
      return;
    }
    if (pts.size === 2 && S.obj()) {
      const [p1, p2] = [...pts.values()], o = S.obj();
      drag = { mode: 'pinch', o, d0: Math.hypot(p2.x - p1.x, p2.y - p1.y), a0: Math.atan2(p2.y - p1.y, p2.x - p1.x), s0: o.s || 1, r0: o.r || 0 };
      return;
    }
    // попадание в объект: сверху вниз, по непрозрачной части svg/img
    const hit = e.target.closest('.obj');
    if (hit) {
      const id = hit.dataset.id;
      const now = Date.now();
      if (id === S.sel && now - lastTap < 320) { const o = S.obj(); if (o && o.type === 'char') { S.tab = 'pose'; S.renderPanel(); S.placeSel(); } }
      lastTap = now;
      if (S.sel !== id) S.select(id);
      const o = S.obj();
      drag = { mode: 'move', o, x0: e.clientX, y0: e.clientY, ox: o.x, oy: o.y, moved: false };
      if (S.tab === 'add' || S.tab === 'bg') { S.tab = 'obj'; S.renderPanel(); }
    } else { S.select(null); drag = null; }
  });
  st.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!drag) return;
    const S = Studio, o = drag.o;
    if (drag.mode === 'move') {
      const dx = (e.clientX - drag.x0) / S.k, dy = (e.clientY - drag.y0) / S.k;
      if (!drag.moved && Math.hypot(dx, dy) * S.k < 3) return;
      if (!drag.moved) { S.snap(); drag.moved = true; }
      o.x = Math.round(drag.ox + dx); o.y = Math.round(drag.oy + dy);
      S.placeObj(o);
    } else if (drag.mode === 'rot') {
      const d = Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy), a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx);
      o.s = clamp(drag.s0 * d / Math.max(10, drag.d0), 0.15, 4);
      o.r = Math.round(drag.r0 + (a - drag.a0) * 180 / Math.PI);
      S.placeObj(o);
    } else if (drag.mode === 'pinch' && pts.size >= 2) {
      const [p1, p2] = [...pts.values()];
      if (!drag.snapped) { S.snap(); drag.snapped = true; }
      o.s = clamp(drag.s0 * Math.hypot(p2.x - p1.x, p2.y - p1.y) / Math.max(10, drag.d0), 0.15, 4);
      o.r = Math.round(drag.r0 + (Math.atan2(p2.y - p1.y, p2.x - p1.x) - drag.a0) * 180 / Math.PI);
      S.placeObj(o);
    }
  });
  const end = e => {
    pts.delete(e.pointerId);
    if (drag && (drag.moved || drag.mode !== 'move')) { Studio.save(); if (Studio.tab === 'obj') Studio.renderPanel(); }
    if (pts.size === 0) drag = null;
    else if (drag && drag.mode === 'pinch') drag = null;
  };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  st.addEventListener('wheel', e => { const o = Studio.obj(); if (!o) return; e.preventDefault(); o.s = clamp((o.s || 1) * (e.deltaY < 0 ? 1.05 : 0.95), 0.15, 4); Studio.placeObj(o); Studio.save(); }, { passive: false });
})();

document.addEventListener('keydown', e => {
  if (curScreen !== 'studio' || e.target.matches('input,textarea,select')) return;
  const S = Studio, o = S.obj();
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); S.undo(); return; }
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); S.shot(); return; }
  if (!o) return;
  const st = e.shiftKey ? 20 : 4;
  const mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
  if (mv) { e.preventDefault(); if (!e.repeat) S.snap(); o.x += mv[0]; o.y += mv[1]; S.placeObj(o); S.save(); }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); S.del(); }
});

$('#stShot').onclick = () => Studio.shot();
$('#stUndo').onclick = () => Studio.undo();
$('#stOnion').onclick = () => { Studio.onion = !Studio.onion; Studio.updateOnion(); if (Studio.onion && !Studio.photos.length) toast('Калька покажет прошлый кадр, когда он будет'); };
$('#stAspect').onclick = () => {
  const S = Studio, keys = Object.keys(ASPECTS), next = keys[(keys.indexOf(S.sc.aspect) + 1) % keys.length];
  const [W0, H0] = ASPECTS[S.sc.aspect], [W1, H1] = ASPECTS[next];
  S.snap();
  S.sc.objs.forEach(o => { o.x = o.x / W0 * W1; o.y = o.y / H0 * H1; });
  S.sc.aspect = next; S.renderAll(); S.save();
};
$('#stStrip').onclick = e => { const im = e.target.closest('[data-ph]'); if (im) Studio.openPhoto(im.dataset.ph); };
window.addEventListener('resize', () => { if (curScreen === 'studio') { Studio.layout(); Studio.placeSel(); } });
