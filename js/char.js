// Персонаж: векторные слои в аниме-стиле. renderChar(c, opts) → строка SVG.
// Координаты персонажа: ступни на y=580, центр x=150. Правая сторона рисуется зеркалом левой.
'use strict';

const ANCHOR = { x: 150, y: 580 };          // точка «ступни» внутри SVG
const VB = { x: -70, y: -70, w: 440, h: 690 }; // viewBox персонажа

// ---------- цвета ----------
function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgb2hex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
// amt < 0 — темнее, > 0 — светлее
function shade(h, amt) { const [r, g, b] = hex2rgb(h); return amt < 0 ? rgb2hex(r * (1 + amt), g * (1 + amt), b * (1 + amt)) : rgb2hex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt); }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function line(h) { return mix(shade(h, -0.55), '#3a2030', 0.35); } // цвет контура для заливки h

// ---------- суставы (поза покоя) ----------
const J = {
  hip: [150, 405], neck: [150, 300],
  sh: [118, 316], el: [118, 366], wr: [118, 410],
  hp: [136, 400], kn: [136, 480], an: [136, 560],
};
const LEN = { ua: 50, fa: 44, th: 80, sn: 80 };

// поза: углы в градусах; L/R — «наружу» положительно для обеих сторон
const POSE0 = { lean: 0, head: 0, nod: 0, aL: 10, eL: -6, wL: 0, aR: 10, eR: -6, wR: 0, lL: 3, kL: -2, fL: 0, lR: 3, kR: -2, fR: 0, sit: 0, jump: 0, hL: 0, hR: 0, layL: 0, layR: 0 };

const POSES = [
  { id: 'stand', name: 'Стоит', p: {} },
  { id: 'wave', name: 'Машет', p: { aR: 125, eR: 45, wR: 10, hR: 0, head: -4 } },
  { id: 'hips', name: 'Руки в боки', p: { aL: 38, eL: -105, aR: 38, eR: -105, hL: 1, hR: 1, lL: 7, lR: 7 } },
  { id: 'cheer', name: 'Ура!', p: { aL: 135, eL: 20, aR: 135, eR: 20, hL: 1, hR: 1, jump: 30, lL: 12, kL: -20, lR: 12, kR: -20, head: 0 } },
  { id: 'point', name: 'Указывает', p: { aR: 95, eR: 5, hR: 2, lean: -3, head: -6 } },
  { id: 'think', name: 'Думает', p: { aR: -20, eR: -140, wR: -20, hR: 1, layR: 1, aL: 15, eL: -70, head: 8, nod: 4 } },
  { id: 'peace', name: 'Мир!', p: { aR: 115, eR: -50, wR: -10, hR: 3, layR: 1, head: -8, lean: 3 } },
  { id: 'shy', name: 'Стесняется', p: { aL: -8, eL: -60, aR: -8, eR: -60, layL: 1, layR: 1, head: 10, nod: 6, lL: -4, kL: 6, lR: -4, kR: 6 } },
  { id: 'walk', name: 'Идёт', p: { aL: 20, eL: -20, aR: -10, eR: -25, lL: 14, kL: -10, lR: -6, kR: 4 } },
  { id: 'run', name: 'Бежит', p: { lean: 8, aL: 50, eL: -90, aR: -30, eR: -100, lL: 35, kL: -70, lR: -18, kR: 20, jump: 12 } },
  { id: 'jump', name: 'Прыжок', p: { aL: 125, eL: 30, aR: 125, eR: 30, lL: 25, kL: -60, lR: 25, kR: -60, jump: 70 } },
  { id: 'sit', name: 'Сидит', p: { sit: 1, aL: 12, eL: -35, aR: 12, eR: -35, lL: 8, kL: -6, lR: 8, kR: -6 } },
  { id: 'fight', name: 'В бой!', p: { aL: 30, eL: -125, hL: 1, aR: 45, eR: -135, hR: 1, lL: 18, kL: -6, lR: 18, kR: -6, lean: -4 } },
  { id: 'dance', name: 'Танец', p: { aL: 130, eL: -40, aR: 40, eR: 90, lean: -8, head: -12, lL: 6, lR: 30, kR: -50, hL: 0 } },
  { id: 'sad', name: 'Грустит', p: { aL: 4, eL: -2, aR: 4, eR: -2, head: 14, nod: 8, lean: 2 } },
  { id: 'hug', name: 'Обнять', p: { aL: 80, eL: -20, aR: 80, eR: -20, hL: 0, hR: 0 } },
  { id: 'cover', name: 'Закрыл лицо', p: { aL: -25, eL: -150, wL: 10, aR: -25, eR: -150, wR: 10, layL: 1, layR: 1, head: 6, nod: 6 } },
  { id: 'kick', name: 'Пинок', p: { aL: 60, eL: -40, aR: 30, eR: -60, lR: 85, kR: 0, lL: -6, lean: -10, hL: 1, hR: 1 } },
];

const HAND_NAMES = ['Ладонь', 'Кулак', 'Палец', 'Мир (V)', 'Класс'];

// ---------- справочники деталей ----------
const FACES = [
  { n: 'Круглое', d: 'M74 205 C74 128 226 128 226 205 C226 258 192 293 150 296 C108 293 74 258 74 205Z' },
  { n: 'Острое', d: 'M76 200 C76 126 224 126 224 200 C224 244 186 284 150 301 C114 284 76 244 76 200Z' },
  { n: 'Пухлое', d: 'M70 205 C70 126 230 126 230 205 C230 264 196 292 150 294 C104 292 70 264 70 205Z' },
  { n: 'Вытянутое', d: 'M80 200 C80 120 220 120 220 200 C220 252 190 298 150 306 C110 298 80 252 80 200Z' },
  { n: 'Квадратное', d: 'M74 200 C74 126 226 126 226 200 L222 250 C212 278 180 295 150 297 C120 295 88 278 78 250Z' },
];

// глаза: локальные координаты левого (на экране) глаза, центр 0,0; внешний угол — слева
const EYES = [
  { n: 'Большие', scl: 'M-21 -2 C-21 -22 20 -26 21 -6 C22 12 12 25 0 25 C-13 25 -22 14 -21 -2Z', ir: [1, 5, 14, 19], lid: 'M-25 -4 C-19 -25 15 -29 25 -10', lash: 'M-24 -6 C-29 -10 -33 -10 -37 -8 C-32 -6 -29 -2 -27 2Z', low: 'M-15 22 C-7 27 7 27 14 20' },
  { n: 'Кошачьи', scl: 'M-24 -12 C-10 -20 14 -14 22 -2 C20 14 6 20 -6 18 C-18 16 -24 4 -24 -12Z', ir: [-1, 2, 12, 15], lid: 'M-28 -14 C-14 -22 12 -16 24 -2', lash: 'M-27 -13 L-38 -21 L-30 -6Z', low: 'M-18 14 C-8 20 6 20 16 12' },
  { n: 'Нежные', scl: 'M-22 4 C-22 -16 12 -24 21 -8 C22 10 10 22 -2 22 C-14 22 -22 14 -22 4Z', ir: [0, 5, 14, 17], lid: 'M-26 6 C-22 -18 14 -26 24 -10', lash: 'M-25 5 L-34 11 L-23 12Z', low: 'M-14 20 C-6 25 6 24 13 18' },
  { n: 'Узкие', scl: 'M-22 -2 C-14 -12 12 -14 22 -4 C18 8 8 12 0 12 C-10 12 -18 8 -22 -2Z', ir: [0, 1, 11, 11], lid: 'M-26 -2 C-16 -16 14 -18 25 -5', lash: 'M-25 -3 L-35 -7 L-28 3Z', low: 'M-14 10 C-6 14 6 14 14 8' },
  { n: 'Звёздные', scl: 'M-21 -2 C-21 -22 20 -26 21 -6 C22 12 12 25 0 25 C-13 25 -22 14 -21 -2Z', ir: [1, 5, 14, 19], lid: 'M-25 -4 C-19 -25 15 -29 25 -10', lash: 'M-24 -6 C-29 -10 -33 -10 -37 -8 C-32 -6 -29 -2 -27 2Z', low: 'M-15 22 C-7 27 7 27 14 20', star: 1 },
  { n: 'Сёдзё', scl: 'M-22 0 C-22 -27 22 -29 22 -2 C22 18 12 28 0 28 C-12 28 -22 18 -22 0Z', ir: [1, 5, 16, 22], lid: 'M-27 -2 C-22 -31 20 -33 27 -6', lash: 'M-26 -4 L-37 -12 L-30 -10 L-39 -2 L-27 1Z', low: 'M-15 25 C-7 30 7 30 15 23', big: 1 },
  { n: 'Сонные', scl: 'M-21 2 C-10 -4 12 -4 21 2 C22 14 12 23 0 23 C-13 23 -22 14 -21 2Z', ir: [0, 8, 14, 16], lid: 'M-25 2 C-12 -7 12 -7 25 2', lash: 'M-24 2 L-33 0 L-26 7Z', low: 'M-14 21 C-6 25 6 25 14 19' },
  { n: 'Точки', dot: 1 },
  { n: 'Круглые', scl: 'M-20 2 C-20 -22 20 -22 20 2 C20 20 10 26 0 26 C-10 26 -20 20 -20 2Z', ir: [0, 4, 13, 16], lid: 'M-23 0 C-20 -26 20 -26 23 0', lash: '', low: 'M-12 25 C-4 29 4 29 12 25' },
];
const EYE_FX = ['Обычные', 'Улыбка ^^', 'Закрыты', 'Подмигнул', 'Сердечки', 'Звёздочки', 'Спирали', 'Зажмурился', 'Испуг', 'Слёзы', 'Злые', 'Пустые'];

const BROWS = [
  { n: 'Обычные', d: 'M-20 3 Q-2 -6 18 -1', w: 3.6 },
  { n: 'Тонкие', d: 'M-20 2 Q-2 -6 18 -2', w: 2.2 },
  { n: 'Густые', d: 'M-21 4 Q-2 -8 19 -1', w: 6 },
  { n: 'Злые', d: 'M-20 -6 Q0 -2 17 8', w: 4.5 },
  { n: 'Грустные', d: 'M-20 6 Q0 4 17 -8', w: 3.6 },
  { n: 'Удивлён', d: 'M-20 -4 Q-2 -14 18 -8', w: 3.4 },
  { n: 'Короткие', d: 'M-8 0 L8 -2', w: 5 },
  { n: 'Нет', d: '', w: 0 },
];

const MOUTHS = ['Улыбка', 'Смех', 'Кошачий :3', 'Удивлён О', 'Ровный', 'Грусть', 'Оскал', 'Ухмылка', 'Хохот', 'Волнуется', 'Язык', 'Клычок', 'Маленький о', 'Чмок', 'Крик'];
const NOSES = ['Чёрточка', 'Точка', 'Нет', 'Уголок'];
const EARS = ['Обычные', 'Эльф', 'Скрыты'];
const BLUSH = ['Нет', 'Лёгкий', 'Яркий', 'Штрихи'];

const HAIR_F = ['Ровная чёлка', 'Набок', 'Шипы', 'Пробор', 'Растрёпа', 'Короткая', 'Длинные пряди', 'Открытый лоб', 'Каре', 'Закрывает глаз', 'Лысый'];
const HAIR_B = ['Нет', 'Каре', 'Длинные', 'Два хвоста', 'Хвост', 'Волнистые', 'Пучки', 'Коса', 'Пышные', 'Низкие хвосты', 'Ёжик'];
const AHOGE = ['Нет', 'Антенна', 'Две', 'Завиток'];

const TOPS = [
  { n: 'Футболка', sl: 1 }, { n: 'Матроска', sl: 2 }, { n: 'Худи', sl: 2, over: 1 }, { n: 'Майка', sl: 0 },
  { n: 'Рубашка+галстук', sl: 2 }, { n: 'Платье', sl: 3, dress: 1 }, { n: 'Свитер', sl: 2, over: 1 }, { n: 'Топик', sl: 0, crop: 1 },
  { n: 'Кимоно', sl: 4, dress: 2 }, { n: 'Нет', sl: 0, none: 1 },
];
const SLEEVES = ['Авто', 'Без', 'Короткие', 'Длинные', 'Фонарики', 'Широкие'];
const BOTTOMS = ['Нет', 'Юбка в складку', 'Длинная юбка', 'Шорты', 'Брюки', 'Джинсы', 'Мини-юбка', 'Пышная юбка'];
const LEGWEAR = ['Нет', 'Носки', 'Гольфы', 'Чулки', 'Колготки', 'Полосатые'];
const SHOES = ['Кеды', 'Туфли', 'Сапоги', 'Сандалии', 'Босиком', 'Ботинки'];
const OUTERS = ['Нет', 'Куртка', 'Кардиган', 'Плащ', 'Халат', 'Шарф'];
const HATS = ['Нет', 'Кепка', 'Берет', 'Шляпа ведьмы', 'Корона', 'Ушки кошки', 'Ушки зайки', 'Бант', 'Цветок', 'Наушники', 'Нимб', 'Рожки', 'Шапка'];
const GLASSES = ['Нет', 'Круглые', 'Квадратные', 'Тёмные', 'Сердечки', 'Монокль'];
const BACKS = ['Нет', 'Крылья ангела', 'Крылья демона', 'Крылья феи', 'Хвост кошки', 'Хвост лисы', 'Рюкзак'];
const FX = ['Нет', 'Капля пота', 'Злость', 'Искры', 'Сердечки', 'Ззз', '!', '?', 'Мрак', 'Румянец-пар'];

// детали, которые можно двигать/масштабировать/вращать (перетаскиванием и стрелками)
const PARTS = {
  eyes: { n: 'Глаза', c: [150, 228] }, brows: { n: 'Брови', c: [150, 190] }, mouth: { n: 'Рот', c: [150, 272] },
  nose: { n: 'Нос', c: [150, 252] }, ears: { n: 'Уши', c: [150, 226] }, blush: { n: 'Румянец', c: [150, 252] },
  hairF: { n: 'Чёлка', c: [150, 170] }, hairB: { n: 'Волосы сзади', c: [150, 250] }, ahoge: { n: 'Хохолок', c: [150, 100] },
  hat: { n: 'Головной убор', c: [150, 110] }, glasses: { n: 'Очки', c: [150, 228] },
  head: { n: 'Голова', c: [150, 215] }, top: { n: 'Верх', c: [150, 350] }, bottom: { n: 'Низ', c: [150, 410] },
  outer: { n: 'Верхняя одежда', c: [150, 350] }, shoes: { n: 'Обувь', c: [136, 568] }, legwear: { n: 'Гольфы', c: [136, 520] },
  back: { n: 'Спина', c: [150, 340] }, fx: { n: 'Эффект', c: [210, 150] }, face: { n: 'Лицо', c: [150, 215] },
};

function defaultChar() {
  return {
    v: 1, name: 'Без имени',
    skin: '#ffe3d3', hair: '#ff8cc6', hair2: '#ff8cc6', eye: '#7d55ff', eye2: '#7d55ff',
    face: 0, ears: 0, eyes: 0, brows: 0, mouth: 0, nose: 0, blush: 1, freckles: 0, mole: 0, lash: 1,
    hairF: 0, hairB: 2, ahoge: 0,
    top: 1, topC: '#ffffff', top2: '#2f3f8f', sleeves: 0,
    bottom: 1, botC: '#2f3f8f', legwear: 2, legC: '#ffffff', shoes: 1, shoeC: '#5a3424',
    outer: 0, outC: '#e05a7a', hat: 0, hatC: '#ff5fa0', glasses: 0, glC: '#3a3a4a', back: 0, backC: '#ffffff',
    eyeSize: 1, eyeGap: 0, headSize: 1, height: 1, width: 1,
    eyeFx: 0, fx: 0,
    adj: {},
    pose: Object.assign({}, POSE0),
  };
}

// ---------- геометрия-хелперы ----------
function capsule(x, y0, y1, w0, w1) { // вертикальная «колбаска» с круглыми концами
  const a = w0 / 2, b = w1 / 2;
  return `M${x - a} ${y0} L${x - b} ${y1} A${b} ${b} 0 0 0 ${x + b} ${y1} L${x + a} ${y0} A${a} ${a} 0 0 0 ${x - a} ${y0}Z`;
}
const MIR = 'translate(300 0) scale(-1 1)';
function rot(a, p) { return a ? `rotate(${+a.toFixed ? a.toFixed(2) : a} ${p[0]} ${p[1]})` : ''; }
function adjT(c, part) {
  const a = c.adj && c.adj[part]; if (!a) return '';
  const [cx, cy] = PARTS[part].c;
  let t = '';
  if (a.x || a.y) t += `translate(${a.x || 0} ${a.y || 0}) `;
  if (a.r) t += `rotate(${a.r} ${cx} ${cy}) `;
  if (a.s && a.s !== 1) t += `translate(${cx} ${cy}) scale(${a.s}) translate(${-cx} ${-cy}) `;
  if (a.sx && a.sx !== 1) t += `translate(${cx} 0) scale(${a.sx} 1) translate(${-cx} 0) `;
  if (a.sy && a.sy !== 1) t += `translate(0 ${cy}) scale(1 ${a.sy}) translate(0 ${-cy}) `;
  return t.trim();
}
function G(t, inner, attrs = '') { return t || attrs ? `<g${t ? ` transform="${t}"` : ''}${attrs ? ' ' + attrs : ''}>${inner}</g>` : inner; }
function P(d, fill, stroke, w = 2.4, extra = '') { return `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${w}"` : ''} stroke-linejoin="round" stroke-linecap="round"${extra}/>`; }

// ---------- волосы ----------
function bangsPath(tips, lockL, lockR, vy, opt = {}) {
  const Lt = lockL ? [66, lockL] : [74, 214], Rt = lockR ? [234, lockR] : [226, 214];
  let d = `M${Lt[0]} ${Lt[1]} C${Lt[0] - 14} ${Lt[1] - 60} 52 152 72 124 `;
  if (opt.spiky) d += 'L80 96 L104 104 L114 72 L136 92 L152 60 L168 90 L190 72 L198 102 L222 94 L228 124 ';
  else d += 'C94 90 206 90 228 124 ';
  d += `C248 152 ${Rt[0] + 14} ${Rt[1] - 60} ${Rt[0]} ${Rt[1]} `;
  d += `Q${Rt[0] - 6} ${(Rt[1] + 176) / 2} 220 174 `;
  const t = tips.slice().sort((a, b) => b[0] - a[0]);
  let prev = [220, 174];
  t.forEach((p, i) => {
    const next = i < t.length - 1 ? t[i + 1] : [80, 174];
    const vyy = opt.vyFn ? opt.vyFn(i) : (i % 2 ? vy + 20 : vy);
    d += `Q${prev[0] - (prev[0] - p[0]) * 0.35} ${(prev[1] + p[1]) / 2 + 6} ${p[0]} ${p[1]} `;
    const valley = i < t.length - 1 ? [(p[0] + next[0]) / 2, vyy] : [80, 174];
    d += `Q${valley[0] + (p[0] - valley[0]) * 0.25} ${(valley[1] + p[1]) / 2 + 4} ${valley[0]} ${valley[1]} `;
    prev = valley;
  });
  d += `Q${Lt[0] + 6} ${(Lt[1] + 176) / 2} ${Lt[0]} ${Lt[1]}Z`;
  return d;
}

const HAIR_F_SPEC = [
  { tips: [[90, 194], [112, 200], [134, 198], [156, 200], [178, 198], [200, 194], [214, 186]], lL: 300, lR: 300, vy: 156 },
  { tips: [[96, 168], [118, 184], [140, 198], [164, 208], [188, 208], [210, 198]], lL: 250, lR: 262, vy: 150 },
  { tips: [[86, 202], [106, 184], [126, 208], [150, 188], [172, 210], [194, 186], [214, 204]], lL: 238, lR: 238, vy: 150, spiky: 1 },
  { tips: [[92, 214], [110, 192], [132, 170], [168, 170], [190, 192], [208, 214]], lL: 292, lR: 292, vy: 140, vyFn: i => (i === 2 ? 124 : 146) },
  { tips: [[84, 198], [102, 210], [120, 186], [140, 212], [160, 190], [178, 208], [196, 184], [216, 204]], lL: 250, lR: 246, vy: 152 },
  { tips: [[92, 176], [114, 184], [136, 178], [160, 186], [184, 178], [206, 182]], lL: 0, lR: 0, vy: 146 },
  { tips: [[92, 192], [114, 198], [136, 196], [164, 196], [186, 198], [208, 192]], lL: 350, lR: 350, vy: 154 },
  { tips: [[112, 146], [150, 138], [188, 146]], lL: 226, lR: 226, vy: 128 },
  { tips: [[94, 190], [118, 196], [142, 194], [166, 196], [190, 192], [206, 186]], lL: 282, lR: 282, vy: 152 },
  { tips: [[84, 266], [98, 252], [118, 240], [142, 216], [168, 198], [196, 186], [214, 192]], lL: 284, lR: 232, vy: 150 },
];

function hairBackShape(i) {
  // возвращает {d, extra} — фигура за головой и телом
  const base = 'M64 214 C56 104 244 104 236 214 C236 240 64 240 64 214Z';
  switch (i) {
    case 1: return [base, 'M62 200 C54 108 246 108 238 200 C246 242 242 270 230 290 L214 274 L198 294 L102 294 L86 274 L70 290 C58 270 54 242 62 200Z'];
    case 2: return [base, 'M64 190 C40 110 260 110 236 190 C252 280 258 380 250 470 L232 450 L216 478 L198 452 L150 470 L102 452 L84 478 L68 450 L50 470 C42 380 48 280 64 190Z'];
    case 3: return [base, 'M74 136 C30 140 14 220 24 300 C32 370 16 420 36 474 L48 446 L58 480 C70 420 62 360 72 300 C80 240 96 190 92 150Z',
      'M226 136 C270 140 286 220 276 300 C268 370 284 420 264 474 L252 446 L242 480 C230 420 238 360 228 300 C220 240 204 190 208 150Z'];
    case 4: return [base, 'M196 112 C252 104 272 190 262 270 C256 330 268 380 250 430 L240 404 L226 436 C234 370 226 304 222 250 C218 196 212 150 190 124Z'];
    case 5: return [base, 'M62 190 C34 110 266 110 238 190 C270 260 244 330 268 400 C282 450 256 480 262 520 L236 500 L214 526 L190 500 L150 518 L110 500 L86 526 L64 500 L38 520 C44 480 18 450 32 400 C56 330 30 260 62 190Z'];
    case 6: return [base, 'M70 118 A30 30 0 1 1 112 96 Z', 'M230 118 A30 30 0 1 0 188 96 Z'];
    case 7: return [base, 'M62 200 C54 108 246 108 238 200 C244 240 240 262 230 278 L70 278 C60 262 56 240 62 200Z', 'BRAID'];
    case 8: return [base, 'M60 196 C40 110 260 110 240 196 C262 214 258 238 266 256 C276 280 256 300 262 324 C250 344 230 336 220 350 C200 352 196 336 180 340 L120 340 C104 336 100 352 80 350 C70 336 50 344 38 324 C44 300 24 280 34 256 C42 238 38 214 60 196Z'];
    case 9: return [base, 'M76 236 C50 260 46 320 52 380 C56 410 48 436 58 458 L66 438 L76 462 C82 420 80 380 86 340 C90 300 92 270 92 246Z',
      'M224 236 C250 260 254 320 248 380 C244 410 252 436 242 458 L234 438 L224 462 C218 420 220 380 214 340 C210 300 208 270 208 246Z'];
    case 10: return [base, 'M60 200 L50 170 L66 160 L58 128 L84 126 L84 96 L112 104 L122 78 L146 96 L162 72 L176 98 L200 82 L206 108 L234 104 L230 134 L252 140 L238 166 L252 184 L240 204Z'];
    default: return [base];
  }
}

function drawHairBack(c, u) {
  if (c.hairF === 10 && c.hairB === 0) return '';
  const hf = `url(#${u}hg)`, ol = line(c.hair);
  const shapes = hairBackShape(c.hairB);
  let s = '';
  shapes.forEach(d => {
    if (d === 'BRAID') { s += braid(214, 250, 440, hf, ol); return; }
    s += P(d, hf, ol, 2.6);
  });
  // ленточки-резинки
  if (c.hairB === 3) s += `<ellipse cx="80" cy="146" rx="9" ry="12" fill="${c.top2}" stroke="${line(c.top2)}" stroke-width="2"/><ellipse cx="220" cy="146" rx="9" ry="12" fill="${c.top2}" stroke="${line(c.top2)}" stroke-width="2"/>`;
  if (c.hairB === 4) s += `<ellipse cx="198" cy="122" rx="8" ry="11" fill="${c.top2}" stroke="${line(c.top2)}" stroke-width="2"/>`;
  if (c.hairB === 9) s += `<circle cx="84" cy="248" r="7" fill="${c.top2}" stroke="${line(c.top2)}" stroke-width="2"/><circle cx="216" cy="248" r="7" fill="${c.top2}" stroke="${line(c.top2)}" stroke-width="2"/>`;
  // пряди-линии на длинных
  if ([2, 5].includes(c.hairB)) s += P('M86 300 Q80 380 90 440 M214 300 Q220 380 210 440 M120 330 Q116 400 122 450 M180 330 Q184 400 178 450', 'none', shade(c.hair2, -0.25), 2, ' opacity=".6"');
  return G(adjT(c, 'hairB'), s, 'data-part="hairB"');
}
function braid(x, y0, y1, fill, ol) {
  let s = '';
  const n = 6, step = (y1 - y0) / n;
  for (let i = n - 1; i >= 0; i--) {
    const y = y0 + i * step + step / 2, w = 18 - i * 1.2;
    s += `<ellipse cx="${x + i * 1.5}" cy="${y}" rx="${w}" ry="${step * 0.62}" fill="${fill}" stroke="${ol}" stroke-width="2.4"/>`;
  }
  s += P(`M${x + 9} ${y1} l-6 22 l-4 -18 l-4 20 l-2 -22z`, fill, ol, 2);
  return s;
}

function drawHairFront(c, u) {
  if (c.hairF === 10) return '';
  const sp = HAIR_F_SPEC[c.hairF] || HAIR_F_SPEC[0];
  const d = bangsPath(sp.tips, sp.lL, sp.lR, sp.vy, sp);
  const ol = line(c.hair), dk = shade(c.hair, -0.22);
  let s = `<clipPath id="${u}hfc"><path d="${d}"/></clipPath>`;
  s += P(d, `url(#${u}hg)`, ol, 2.6);
  // тени и блики
  s += `<g clip-path="url(#${u}hfc)">`;
  s += P('M70 150 Q150 196 230 150 L230 200 L70 200Z', dk, '', 0, ' opacity=".18"');
  s += P('M98 138 Q150 120 202 138', 'none', '#ffffff', 6, ' opacity=".35"');
  s += P('M108 132 Q112 124 120 122 M178 122 Q188 124 192 132', 'none', '#ffffff', 4, ' opacity=".6"');
  s += P('M136 128 Q128 150 122 178 M166 128 Q172 152 180 180 M112 136 Q102 152 98 172 M190 136 Q200 152 204 172', 'none', dk, 1.6, ' opacity=".4"');
  s += '</g>';
  return G(adjT(c, 'hairF'), s, 'data-part="hairF"');
}

function drawAhoge(c, u) {
  if (!c.ahoge) return '';
  const f = `url(#${u}hg)`, ol = line(c.hair);
  const d = [
    '', 'M146 102 C136 64 170 52 182 74 C166 66 154 78 158 102Z',
    'M140 104 C128 66 154 56 166 70 C150 68 144 82 150 104Z M156 104 C168 70 196 70 200 84 C186 78 170 86 166 104Z',
    'M148 102 C140 70 176 58 178 82 C176 96 158 92 160 80 C162 74 168 76 166 80 C158 84 168 90 172 82 C176 70 152 70 158 102Z',
  ][c.ahoge];
  return G(adjT(c, 'ahoge'), P(d, f, ol, 2.2), 'data-part="ahoge"');
}

// ---------- лицо ----------
function eyeOne(c, st, color, u, idx, fx) {
  const ol = '#2a1622';
  const gid = `${u}ig${idx}`;
  if (fx === 1) return P('M-18 6 Q0 -14 18 6', 'none', ol, 5);
  if (fx === 2) return P('M-18 2 Q0 12 18 2', 'none', ol, 4.5) + P('M-18 2 l-6 -2', 'none', ol, 3);
  if (fx === 3 && idx === 1) return P('M-18 6 Q0 -14 18 6', 'none', ol, 5);
  if (fx === 6) return `<circle r="17" fill="#fff" stroke="${ol}" stroke-width="2.4"/>` + P('M0 0 m-2 0 a2 2 0 1 1 4 0 a5 5 0 1 1 -9 0 a8 8 0 1 1 15 0 a11 11 0 1 1 -21 0', 'none', ol, 2.2);
  if (fx === 7) return P('M-16 -10 L12 2 L-16 12', 'none', ol, 5);
  if (fx === 10) return P('M-22 -2 C-10 -10 12 -4 22 6 C14 16 -10 16 -22 -2Z', '#fff', ol, 3) + `<circle cx="2" cy="5" r="6" fill="${color}"/><circle cx="2" cy="5" r="3" fill="${ol}"/>` + P('M-26 -12 L22 2', 'none', ol, 5);
  if (fx === 4) return P('M0 22 C-30 0 -18 -24 0 -8 C18 -24 30 0 0 22Z', '#ff3b6b', '#9a1035', 2.4) + `<ellipse cx="-8" cy="-6" rx="4" ry="3" fill="#fff" opacity=".8"/>`;
  if (fx === 5) return P('M0 -22 L6 -6 L22 -6 L9 4 L14 20 L0 10 L-14 20 L-9 4 L-22 -6 L-6 -6Z', '#ffd84a', '#b0800a', 2.2);
  if (st.dot) {
    const ry = fx === 8 ? 6 : 10;
    return `<ellipse cx="0" cy="4" rx="7" ry="${ry}" fill="${ol}"/><circle cx="-2" cy="0" r="2.6" fill="#fff"/>`;
  }
  let s = '';
  const [ix, iy, rx0, ry0] = st.ir;
  let rx = rx0, ry = ry0;
  if (fx === 8) { rx *= 0.55; ry *= 0.55; }
  s += `<clipPath id="${u}ec${idx}"><path d="${st.scl}"/></clipPath>`;
  s += P(st.scl, '#fff', ol, 1.6);
  if (fx !== 11) {
    s += `<g clip-path="url(#${u}ec${idx})">`;
    s += `<ellipse cx="${ix}" cy="${iy}" rx="${rx}" ry="${ry}" fill="url(#${gid})" stroke="${shade(color, -0.6)}" stroke-width="1.6"/>`;
    s += `<ellipse cx="${ix}" cy="${iy + ry * 0.12}" rx="${rx * 0.5}" ry="${ry * 0.55}" fill="${shade(color, -0.7)}"/>`;
    s += `<ellipse cx="${ix}" cy="${iy + ry * 0.55}" rx="${rx * 0.6}" ry="${ry * 0.25}" fill="${shade(color, 0.55)}" opacity=".55"/>`;
    s += P(st.scl.replace(/Z$/, ''), 'none', '#000', 0, '');
    s += `<path d="${st.lid}" fill="none" stroke="${shade(color, -0.6)}" stroke-width="10" opacity=".25" transform="translate(0 4)"/>`;
    if (st.star || fx === 9) s += P(`M${ix - 5} ${iy - 9} l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 l5 -1z`, '#fff', '', 0);
    else s += `<ellipse cx="${ix - rx * 0.35}" cy="${iy - ry * 0.4}" rx="${rx * 0.36}" ry="${ry * 0.3}" fill="#fff"/>`;
    s += `<circle cx="${ix + rx * 0.45}" cy="${iy + ry * 0.5}" r="${Math.max(1.6, rx * 0.16)}" fill="#fff"/>`;
    if (st.big) s += `<circle cx="${ix + rx * 0.4}" cy="${iy - ry * 0.35}" r="2.2" fill="#fff"/>`;
    s += '</g>';
  }
  s += P(st.lid, 'none', ol, st.big ? 6 : 5.4);
  if (c.lash && st.lash) s += P(st.lash, ol, ol, 1.2);
  s += P(st.low, 'none', ol, 1.6);
  if (fx === 9) s += P('M10 22 Q14 40 8 70 Q4 40 6 22Z', '#9fdcff', '#3a8fd0', 1.6, ' opacity=".9"');
  return s;
}

function drawEyes(c, u, fx) {
  const st = EYES[c.eyes] || EYES[0];
  const gap = 34 + (c.eyeGap || 0);
  const sz = c.eyeSize || 1;
  const a = (c.adj && c.adj.eyes) || {};
  const r = a.r || 0, s1 = (a.s || 1) * sz;
  const one = (idx, color) => `<g transform="translate(${150 - gap} 228) rotate(${r}) scale(${s1})">${eyeOne(c, st, color, u, idx, fx)}</g>`;
  const inner = one(0, c.eye) + `<g transform="${MIR}">${one(1, c.eye2)}</g>`;
  return G(a.x || a.y ? `translate(${a.x || 0} ${a.y || 0})` : '', inner, 'data-part="eyes"');
}

function drawBrows(c, fx) {
  let bi = c.brows;
  if (fx === 10) bi = 3;
  const b = BROWS[bi] || BROWS[0]; if (!b.d) return '';
  const gap = 34 + (c.eyeGap || 0);
  const a = (c.adj && c.adj.brows) || {};
  const col = shade(c.hair, -0.35);
  const one = `<g transform="translate(${150 - gap} 190) rotate(${a.r || 0}) scale(${a.s || 1})">${P(b.d, 'none', col, b.w)}</g>`;
  return G(a.x || a.y ? `translate(${a.x || 0} ${a.y || 0})` : '', one + `<g transform="${MIR}">${one}</g>`, 'data-part="brows"');
}

function drawMouth(c) {
  const ol = '#5a1f2e', dk = '#8a2a3c', tg = '#ff8a9a';
  const m = [
    () => P('M-9 -2 Q0 6 9 -2', 'none', ol, 2.6),
    () => P('M-12 -3 Q0 -1 12 -3 Q10 13 0 14 Q-10 13 -12 -3Z', dk, ol, 2.2) + P('M-7 9 Q0 4 7 9 Q0 14 -7 9Z', tg, '', 0),
    () => P('M-11 -2 Q-5 5 0 -1 Q5 5 11 -2', 'none', ol, 2.4),
    () => `<ellipse cx="0" cy="2" rx="6" ry="8" fill="${dk}" stroke="${ol}" stroke-width="2.2"/>`,
    () => P('M-8 1 L8 1', 'none', ol, 2.6),
    () => P('M-9 5 Q0 -4 9 5', 'none', ol, 2.6),
    () => P('M-13 -3 L13 -3 Q11 11 0 12 Q-11 11 -13 -3Z', '#fff', ol, 2.2) + P('M-12 3 L12 3', 'none', ol, 1.2),
    () => P('M-9 2 Q2 5 11 -5', 'none', ol, 2.6),
    () => P('M-16 -5 Q0 -2 16 -5 Q14 20 0 21 Q-14 20 -16 -5Z', dk, ol, 2.4) + P('M-9 14 Q0 7 9 14 Q0 21 -9 14Z', tg, '', 0) + P('M-14 -4 L14 -4 L12 0 L-12 0Z', '#fff', '', 0),
    () => P('M-12 1 Q-8 -4 -4 1 T4 1 T12 1', 'none', ol, 2.4),
    () => P('M-9 -2 Q0 5 9 -2', 'none', ol, 2.6) + P('M-4 2 Q0 14 5 2Z', tg, ol, 1.8),
    () => P('M-9 -2 Q0 6 9 -2', 'none', ol, 2.6) + P('M3 0 L6 7 L8 -1Z', '#fff', ol, 1.4),
    () => `<ellipse cx="0" cy="1" rx="3.2" ry="4" fill="${dk}" stroke="${ol}" stroke-width="1.8"/>`,
    () => P('M-3 -6 Q5 -4 0 0 Q6 4 -3 6', 'none', ol, 2.4),
    () => P('M-12 -6 Q0 -10 12 -6 Q12 18 0 20 Q-12 18 -12 -6Z', dk, ol, 2.4) + P('M-7 13 Q0 8 7 13 Q0 18 -7 13Z', tg, '', 0),
  ][c.mouth] || (() => '');
  return G('translate(150 272)', m());
}

function drawFaceFeatures(c, u) {
  const fx = c.eyeFx || 0;
  let s = '';
  // румянец
  const bl = c.blush;
  let blush = '';
  if (bl === 1) blush = `<ellipse cx="102" cy="254" rx="16" ry="8" fill="#ff7a9a" opacity=".32"/><ellipse cx="198" cy="254" rx="16" ry="8" fill="#ff7a9a" opacity=".32"/>`;
  if (bl === 2) blush = `<ellipse cx="102" cy="254" rx="18" ry="10" fill="#ff5a85" opacity=".55"/><ellipse cx="198" cy="254" rx="18" ry="10" fill="#ff5a85" opacity=".55"/>`;
  if (bl === 3) blush = `<ellipse cx="102" cy="254" rx="16" ry="8" fill="#ff7a9a" opacity=".3"/><ellipse cx="198" cy="254" rx="16" ry="8" fill="#ff7a9a" opacity=".3"/>` + P('M92 258 l6 -9 M100 258 l6 -9 M108 258 l6 -9 M188 258 l6 -9 M196 258 l6 -9 M204 258 l6 -9', 'none', '#e0507a', 1.8);
  if (c.freckles) blush += [94, 102, 110, 98, 106, 190, 198, 206, 194, 202].map((x, i) => `<circle cx="${x}" cy="${i % 5 > 2 ? 254 : 248}" r="1.6" fill="#b5704a" opacity=".7"/>`).join('');
  if (c.mole) blush += `<circle cx="184" cy="280" r="2" fill="#4a2a2a"/>`;
  s += G(adjT(c, 'blush'), blush, 'data-part="blush"');
  // нос
  const nose = ['M0 0 l-2 5', '', '', 'M-3 4 L0 0 L3 4'][c.nose];
  if (c.nose === 1) s += G(adjT(c, 'nose'), `<circle cx="150" cy="254" r="1.6" fill="${shade(c.skin, -0.45)}"/>`, 'data-part="nose"');
  else if (nose) s += G(adjT(c, 'nose'), `<g transform="translate(150 250)">${P(nose, 'none', shade(c.skin, -0.45), 2)}</g>`, 'data-part="nose"');
  s += drawEyes(c, u, fx);
  s += drawBrows(c, fx);
  s += G(adjT(c, 'mouth'), drawMouth(c), 'data-part="mouth"');
  return s;
}

function drawEars(c) {
  if (c.ears === 2) return '';
  const sk = c.skin, ol = line(c.skin);
  const one = c.ears === 1 ? P('M80 208 L34 180 L76 246Z', sk, ol, 2.4) + P('M74 214 L48 194 L72 236Z', shade(sk, -0.12), '', 0)
    : `<ellipse cx="74" cy="226" rx="11" ry="16" fill="${sk}" stroke="${ol}" stroke-width="2.4"/><path d="M72 218 Q66 226 72 234" fill="none" stroke="${ol}" stroke-width="1.5"/>`;
  return G(adjT(c, 'ears'), one + `<g transform="${MIR}">${one}</g>`, 'data-part="ears"');
}

// ---------- головные уборы, очки ----------
function drawHat(c) {
  const k = c.hatC, ol = line(k), d2 = shade(k, -0.2), lt = shade(k, 0.35);
  let s = '';
  switch (c.hat) {
    case 1: s = P('M70 150 C66 76 234 76 230 150 Z', k, ol, 2.6) + P('M70 146 C40 150 30 166 60 168 L150 160 Z', d2, ol, 2.4) + `<circle cx="150" cy="86" r="6" fill="${d2}" stroke="${ol}" stroke-width="2"/>` + P('M150 86 L150 148 M110 98 L100 148 M190 98 L200 148', 'none', ol, 1.4, ' opacity=".5"'); break;
    case 2: s = P('M58 140 C40 90 160 52 236 100 C262 120 246 148 200 146 C150 150 100 156 58 140Z', k, ol, 2.6) + `<circle cx="196" cy="70" r="6" fill="${d2}" stroke="${ol}" stroke-width="2"/>`; break;
    case 3: s = P('M30 150 C70 136 230 136 270 150 C230 166 70 166 30 150Z', k, ol, 2.6) + P('M86 146 C110 100 130 40 196 -10 C182 30 196 80 214 146Z', k, ol, 2.6) + P('M90 136 C130 128 170 128 210 136 L212 146 C170 140 130 140 88 146Z', c.top2, line(c.top2), 2); break;
    case 4: s = P('M96 128 L92 82 L118 104 L134 66 L150 98 L166 66 L182 104 L208 82 L204 128 Z', '#ffd447', '#a87a10', 2.4) + `<circle cx="150" cy="114" r="6" fill="#ff3b6b" stroke="#8a1030" stroke-width="2"/><circle cx="118" cy="118" r="4" fill="#4ad0ff"/><circle cx="182" cy="118" r="4" fill="#4ad0ff"/>`; break;
    case 5: { const e = P('M78 128 L82 60 L126 104Z', k, ol, 2.6) + P('M86 112 L88 76 L112 102Z', '#ffb3c8', '', 0); s = e + `<g transform="${MIR}">${e}</g>`; break; }
    case 6: { const e = P('M110 116 C92 60 96 -20 118 -24 C138 -20 136 60 130 112Z', k, ol, 2.6) + P('M114 100 C104 60 108 0 118 -10 C126 0 126 60 124 100Z', '#ffc4d4', '', 0); s = e + `<g transform="${MIR}">${e}</g>`; break; }
    case 7: s = P('M150 104 C120 70 86 80 92 104 C96 124 130 116 150 108 C170 116 204 124 208 104 C214 80 180 70 150 104Z', k, ol, 2.6) + `<ellipse cx="150" cy="106" rx="10" ry="9" fill="${d2}" stroke="${ol}" stroke-width="2.4"/>`; break;
    case 8: s = [0, 72, 144, 216, 288].map(a => `<ellipse cx="208" cy="104" rx="9" ry="16" transform="rotate(${a} 208 120)" fill="${k}" stroke="${ol}" stroke-width="2"/>`).join('') + `<circle cx="208" cy="120" r="7" fill="#ffd84a" stroke="#a07a10" stroke-width="2"/>`; break;
    case 9: s = P('M64 200 C56 100 244 100 236 200', 'none', ol, 13) + P('M64 200 C56 100 244 100 236 200', 'none', k, 8) + `<rect x="50" y="186" width="26" height="46" rx="12" fill="${k}" stroke="${ol}" stroke-width="2.4"/><rect x="224" y="186" width="26" height="46" rx="12" fill="${k}" stroke="${ol}" stroke-width="2.4"/><rect x="56" y="194" width="10" height="30" rx="5" fill="${lt}"/>`; break;
    case 10: s = `<ellipse cx="150" cy="70" rx="56" ry="14" fill="none" stroke="#ffe680" stroke-width="9" opacity=".9"/><ellipse cx="150" cy="70" rx="56" ry="14" fill="none" stroke="#fff6c0" stroke-width="3"/>`; break;
    case 11: { const e = P('M96 120 C80 100 76 74 90 52 C92 76 104 94 116 108Z', k, ol, 2.4); s = e + `<g transform="${MIR}">${e}</g>`; break; }
    case 12: s = P('M66 166 C56 70 244 70 234 166 Z', k, ol, 2.6) + P('M62 150 L238 150 L240 176 L60 176Z', d2, ol, 2.4) + `<circle cx="150" cy="70" r="14" fill="${lt}" stroke="${ol}" stroke-width="2.4"/>` + P('M100 158 L100 170 M120 158 L120 170 M140 158 L140 170 M160 158 L160 170 M180 158 L180 170 M200 158 L200 170', 'none', ol, 1.2); break;
  }
  return s ? G(adjT(c, 'hat'), s, 'data-part="hat"') : '';
}

function drawGlasses(c) {
  if (!c.glasses) return '';
  const k = c.glC, gap = 34 + (c.eyeGap || 0), lx = 150 - gap, rx = 150 + gap;
  let s = '';
  switch (c.glasses) {
    case 1: s = `<circle cx="${lx}" cy="230" r="24" fill="#fff" fill-opacity=".15" stroke="${k}" stroke-width="3.4"/><circle cx="${rx}" cy="230" r="24" fill="#fff" fill-opacity=".15" stroke="${k}" stroke-width="3.4"/>`; break;
    case 2: s = `<rect x="${lx - 26}" y="210" width="52" height="38" rx="6" fill="#fff" fill-opacity=".15" stroke="${k}" stroke-width="3.4"/><rect x="${rx - 26}" y="210" width="52" height="38" rx="6" fill="#fff" fill-opacity=".15" stroke="${k}" stroke-width="3.4"/>`; break;
    case 3: s = `<path d="M${lx - 28} 214 L${lx + 26} 214 Q${lx + 24} 248 ${lx} 248 Q${lx - 26} 248 ${lx - 28} 214Z M${rx - 26} 214 L${rx + 28} 214 Q${rx + 26} 248 ${rx} 248 Q${rx - 24} 248 ${rx - 26} 214Z" fill="#1a1a24" fill-opacity=".9" stroke="${k}" stroke-width="3"/><path d="M${lx - 14} 220 l10 0 M${rx - 14} 220 l10 0" stroke="#fff" stroke-width="3" opacity=".6"/>`; break;
    case 4: { const h = x => `M${x} 250 C${x - 34} 228 ${x - 20} 204 ${x} 220 C${x + 20} 204 ${x + 34} 228 ${x} 250Z`; s = `<path d="${h(lx)} ${h(rx)}" fill="#ff4f8a" fill-opacity=".55" stroke="${k}" stroke-width="3"/>`; break; }
    case 5: s = `<circle cx="${rx}" cy="230" r="22" fill="#fff" fill-opacity=".15" stroke="#c9a030" stroke-width="3.4"/><path d="M${rx + 20} 240 Q${rx + 30} 290 ${rx + 10} 320" fill="none" stroke="#c9a030" stroke-width="1.6"/>`; break;
  }
  if (c.glasses < 5) s += `<path d="M${lx + 24} 226 Q150 218 ${rx - 24} 226" fill="none" stroke="${k}" stroke-width="3"/><path d="M${lx - 24} 224 L74 220 M${rx + 24} 224 L226 220" stroke="${k}" stroke-width="3"/>`;
  return G(adjT(c, 'glasses'), s, 'data-part="glasses"');
}

function drawFx(c) {
  let s = '';
  switch (c.fx) {
    case 1: s = P('M232 150 C222 170 222 184 232 186 C242 184 242 170 232 150Z', '#bfe8ff', '#3b8fd0', 2.2) + `<ellipse cx="229" cy="178" rx="3" ry="4" fill="#fff"/>`; break;
    case 2: s = P('M196 112 Q206 124 196 136 M216 112 Q206 124 216 136 M194 118 Q206 128 218 118 M194 130 Q206 120 218 130', 'none', '#ff2b4a', 4.5); break;
    case 3: s = [[56, 120, 10], [246, 150, 14], [236, 92, 8], [62, 190, 7]].map(([x, y, r]) => P(`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`, '#fff7a0', '#e0b020', 1.6)).join(''); break;
    case 4: s = [[60, 130, 1], [240, 110, 1.3], [250, 170, 0.8]].map(([x, y, k]) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0 12 C-20 0 -12 -16 0 -6 C12 -16 20 0 0 12Z" fill="#ff5a8a" stroke="#b01a4a" stroke-width="2"/>`).join(''); break;
    case 5: s = `<g font-family="Arial Black,Arial" font-weight="900" fill="#7aa8ff" stroke="#fff" stroke-width="2" paint-order="stroke"><text x="226" y="120" font-size="26">Z</text><text x="250" y="94" font-size="20">z</text><text x="266" y="74" font-size="14">z</text></g>`; break;
    case 6: s = `<text x="232" y="128" font-family="Arial Black,Arial" font-weight="900" font-size="60" fill="#ff3b4a" stroke="#fff" stroke-width="4" paint-order="stroke">!</text>`; break;
    case 7: s = `<text x="226" y="124" font-family="Arial Black,Arial" font-weight="900" font-size="54" fill="#5a7aff" stroke="#fff" stroke-width="4" paint-order="stroke">?</text>`; break;
    case 8: s = P('M100 130 L100 186 M116 128 L116 176 M132 126 L132 190 M148 126 L148 178 M164 126 L164 188 M180 128 L180 174 M196 130 L196 184', 'none', '#5a4aa0', 2.6, ' opacity=".55"'); break;
    case 9: s = P('M70 210 q-14 -10 -4 -24 q10 -8 2 -20 M232 210 q14 -10 4 -24 q-10 -8 -2 -20', 'none', '#fff', 4, ' opacity=".9"') + `<ellipse cx="102" cy="254" rx="22" ry="12" fill="#ff3b6b" opacity=".45"/><ellipse cx="198" cy="254" rx="22" ry="12" fill="#ff3b6b" opacity=".45"/>`; break;
  }
  return s ? G(adjT(c, 'fx'), s, 'data-part="fx"') : '';
}

// ---------- тело и одежда ----------
const TORSO = 'M124 304 C114 304 110 312 112 324 L118 362 C120 378 116 392 114 406 L186 406 C184 392 180 378 182 362 L188 324 C190 312 186 304 176 304 Z';
function topShape(hem) { return `M121 302 C110 302 106 312 108 324 L114 362 C116 380 112 394 110 ${hem} L190 ${hem} C188 394 184 380 186 362 L192 324 C194 312 190 302 179 302 Z`; }

function sleeveKind(c) { const t = TOPS[c.top] || TOPS[0]; return c.sleeves ? c.sleeves - 1 : t.sl; } // 0 без,1 кор,2 длин,3 фонар,4 широк

function drawArm(c, side, p, u) {
  // рисует левую руку (для правой — то же самое в зеркале)
  const a = side ? p.aR : p.aL, e = side ? p.eR : p.eL, w = side ? p.wR : p.wL, hand = side ? p.hR : p.hL;
  const sk = c.skin, ol = line(sk);
  const sl = sleeveKind(c), tc = c.topC, tol = line(tc);
  const outer = c.outer === 1 || c.outer === 2 || c.outer === 4;
  const oc = c.outC, ool = line(oc);
  const x = J.sh[0];
  let upper = P(capsule(x, J.sh[1], J.el[1], 17, 14), sk, ol);
  let fore = P(capsule(x, J.el[1], J.wr[1], 14, 12), sk, ol);
  // рукава
  if (!(TOPS[c.top] || {}).none) {
    if (sl === 1) upper += P(capsule(x, J.sh[1] - 4, J.sh[1] + 26, 24, 22), tc, tol);
    if (sl === 2 || sl === 4) { upper += P(capsule(x, J.sh[1] - 4, J.el[1] + 4, 23, 21), tc, tol); fore += P(sl === 4 ? `M${x - 11} ${J.el[1] - 6} L${x - 20} ${J.wr[1] + 2} L${x + 20} ${J.wr[1] + 2} L${x + 11} ${J.el[1] - 6}Z` : capsule(x, J.el[1] - 4, J.wr[1] - 2, 21, 19), tc, tol); }
    if (sl === 2 && c.top === 1) fore += P(`M${x - 10} ${J.wr[1] - 12} L${x + 10} ${J.wr[1] - 12} M${x - 10} ${J.wr[1] - 7} L${x + 10} ${J.wr[1] - 7}`, 'none', c.top2, 2.2);
    if (sl === 3) upper += `<ellipse cx="${x - 2}" cy="${J.sh[1] + 8}" rx="17" ry="15" fill="${tc}" stroke="${tol}" stroke-width="2.4"/>` + P(`M${x - 14} ${J.sh[1] + 12} Q${x} ${J.sh[1] + 22} ${x + 12} ${J.sh[1] + 14}`, 'none', tol, 1.4);
  }
  if (outer) { upper += P(capsule(x, J.sh[1] - 5, J.el[1] + 5, 26, 24), oc, ool); fore += P(capsule(x, J.el[1] - 3, J.wr[1] - 1, 24, 22), oc, ool) + P(`M${x - 11} ${J.wr[1] - 8} L${x + 11} ${J.wr[1] - 8}`, 'none', ool, 1.4); }
  const hx = x, hy = J.wr[1] + 9;
  let hs = '';
  if (hand === 1) hs = `<circle cx="${hx}" cy="${hy}" r="9.5" fill="${sk}" stroke="${ol}" stroke-width="2.4"/>` + P(`M${hx - 6} ${hy + 1} Q${hx} ${hy + 4} ${hx + 6} ${hy + 1}`, 'none', ol, 1.4);
  else if (hand === 2) hs = P(capsule(hx + 2, hy, hy + 20, 6, 5), sk, ol, 2) + `<circle cx="${hx}" cy="${hy}" r="9" fill="${sk}" stroke="${ol}" stroke-width="2.4"/>`;
  else if (hand === 3) hs = P(capsule(hx - 3, hy, hy + 20, 5.5, 5), sk, ol, 2) + P(capsule(hx + 4, hy, hy + 19, 5.5, 5), sk, ol, 2) + `<circle cx="${hx}" cy="${hy}" r="9" fill="${sk}" stroke="${ol}" stroke-width="2.4"/>`;
  else if (hand === 4) hs = P(capsule(hx - 10, hy - 2, hy - 18, 6, 6), sk, ol, 2) + `<circle cx="${hx}" cy="${hy}" r="9.5" fill="${sk}" stroke="${ol}" stroke-width="2.4"/>`;
  else hs = `<ellipse cx="${hx}" cy="${hy + 2}" rx="9" ry="11" fill="${sk}" stroke="${ol}" stroke-width="2.4"/>` + P(`M${hx - 9} ${hy - 2} Q${hx - 15} ${hy + 4} ${hx - 10} ${hy + 8}`, sk, ol, 2.2);
  const handG = G(rot(w, J.wr), hs, `data-joint="${side ? 'wR' : 'wL'}"`);
  const foreG = G(rot(e, J.el), fore + handG, `data-joint="${side ? 'eR' : 'eL'}"`);
  return G(rot(a, J.sh), upper + foreG, `data-joint="${side ? 'aR' : 'aL'}"`);
}

function drawLeg(c, side, p, u) {
  const l = side ? p.lR : p.lL, k = side ? p.kR : p.kL, f = side ? p.fR : p.fL;
  const sk = c.skin, ol = line(sk);
  const x = J.hp[0];
  let thigh = P(capsule(x, J.hp[1] - 6, J.kn[1], 27, 21), sk, ol);
  let shin = P(capsule(x, J.kn[1], J.an[1], 21, 15), sk, ol);
  // гольфы/чулки
  const lw = c.legwear, lc = c.legC, lol = line(lc);
  if (lw === 2) shin += P(capsule(x, J.kn[1] + 8, J.an[1] + 2, 22, 16), lc, lol);
  if (lw === 3) { shin += P(capsule(x, J.kn[1] - 2, J.an[1] + 2, 22, 16), lc, lol); thigh += P(`M${x - 13} ${J.kn[1] - 36} L${x + 13} ${J.kn[1] - 36} L${x + 11} ${J.kn[1] + 4} L${x - 11} ${J.kn[1] + 4}Z`, lc, lol); }
  if (lw === 4) { shin += P(capsule(x, J.kn[1] - 2, J.an[1] + 2, 21, 15), lc, lol, 2, ' fill-opacity=".85"'); thigh += P(capsule(x, J.hp[1] - 6, J.kn[1] + 2, 27, 21), lc, lol, 2, ' fill-opacity=".85"'); }
  if (lw === 5) { shin += P(capsule(x, J.kn[1] + 4, J.an[1] + 2, 22, 16), lc, lol) + [0, 1, 2, 3, 4].map(i => P(`M${x - 10.5 + i * 0.6} ${J.kn[1] + 16 + i * 14} L${x + 10.5 - i * 0.6} ${J.kn[1] + 16 + i * 14}`, 'none', c.top2, 5)).join(''); }
  if (lw === 1) shin += P(capsule(x, J.an[1] - 20, J.an[1] + 2, 17, 15), lc, lol);
  // штаны / шорты
  const b = c.bottom, bc = c.botC, bol = line(bc);
  if (b === 3) thigh += P(capsule(x, J.hp[1] - 10, J.hp[1] + 40, 32, 30), bc, bol);
  if (b === 4 || b === 5) { thigh += P(capsule(x, J.hp[1] - 10, J.kn[1] + 4, 32, 26), bc, bol); shin += P(capsule(x, J.kn[1] - 4, J.an[1] - 4, 26, 23), bc, bol); if (b === 5) shin += P(`M${x - 2} ${J.kn[1] + 6} L${x - 1} ${J.an[1] - 10}`, 'none', shade(bc, 0.3), 1.4); }
  // обувь
  const sc = c.shoeC, sol = line(sc), ay = J.an[1];
  let shoe = '';
  const foot = P(`M${x - 8} ${ay - 2} L${x + 9} ${ay - 2} Q${x + 12} ${ay + 10} ${x + 9} ${ay + 16} L${x - 18} ${ay + 17} Q${x - 22} ${ay + 8} ${x - 8} ${ay - 2}Z`, sk, ol);
  switch (c.shoes) {
    case 0: shoe = P(`M${x - 11} ${ay - 4} L${x + 11} ${ay - 4} Q${x + 15} ${ay + 10} ${x + 12} ${ay + 18} L${x - 22} ${ay + 19} Q${x - 27} ${ay + 6} ${x - 11} ${ay - 4}Z`, sc, sol) + P(`M${x - 24} ${ay + 14} L${x + 13} ${ay + 14}`, 'none', '#fff', 4) + P(`M${x - 6} ${ay + 2} l8 0 M${x - 7} ${ay + 7} l9 0`, 'none', '#fff', 1.6); break;
    case 1: shoe = P(`M${x - 10} ${ay - 1} L${x + 10} ${ay - 1} Q${x + 13} ${ay + 10} ${x + 10} ${ay + 17} L${x - 21} ${ay + 18} Q${x - 26} ${ay + 6} ${x - 10} ${ay - 1}Z`, sc, sol) + `<ellipse cx="${x - 8}" cy="${ay + 6}" rx="5" ry="2.4" fill="${shade(sc, 0.35)}"/>`; break;
    case 2: shoe = P(capsule(x, J.kn[1] + 14, ay + 6, 25, 22), sc, sol) + P(`M${x - 12} ${ay - 2} L${x + 12} ${ay - 2} Q${x + 15} ${ay + 10} ${x + 12} ${ay + 18} L${x - 22} ${ay + 19} Q${x - 27} ${ay + 6} ${x - 12} ${ay - 2}Z`, sc, sol) + P(`M${x - 12} ${J.kn[1] + 22} L${x + 12} ${J.kn[1] + 22}`, 'none', shade(sc, 0.3), 3); break;
    case 3: shoe = foot + P(`M${x - 20} ${ay + 17} L${x + 10} ${ay + 17}`, 'none', sc, 4) + P(`M${x - 6} ${ay - 2} L${x - 12} ${ay + 14} M${x + 6} ${ay - 2} L${x - 2} ${ay + 15}`, 'none', sc, 3); break;
    case 4: shoe = foot; break;
    case 5: shoe = P(capsule(x, ay - 22, ay + 4, 24, 22), sc, sol) + P(`M${x - 12} ${ay - 4} L${x + 12} ${ay - 4} Q${x + 16} ${ay + 10} ${x + 12} ${ay + 19} L${x - 23} ${ay + 20} Q${x - 28} ${ay + 6} ${x - 12} ${ay - 4}Z`, sc, sol) + P(`M${x - 25} ${ay + 16} L${x + 14} ${ay + 16}`, 'none', shade(sc, -0.4), 4); break;
  }
  const shoeG = G(adjT(c, 'shoes'), G(rot(f, J.an), shoe, `data-joint="${side ? 'fR' : 'fL'}"`), 'data-part="shoes"');
  const shinG = G((p.sit ? `translate(0 ${-LEN.th * 0.72}) ` : '') + rot(k, J.kn), shin + shoeG, `data-joint="${side ? 'kR' : 'kL'}"`);
  const thighG = p.sit ? G('translate(0 400) scale(1 0.28) translate(0 -400)', thigh) : thigh;
  return G(rot(l, J.hp), thighG + shinG, `data-joint="${side ? 'lR' : 'lL'}"`);
}

function drawTop(c) {
  const t = TOPS[c.top] || TOPS[0]; if (t.none) return '';
  const k = c.topC, ol = line(k), k2 = c.top2, ol2 = line(k2), sk = c.skin;
  let hem = t.crop ? 360 : (t.over ? 414 : 400);
  let s = '';
  if (t.dress === 1) {
    s += P('M121 302 C110 302 106 312 108 324 L114 362 C116 372 114 378 112 384 L74 478 Q150 492 226 478 L188 384 C186 378 184 372 186 362 L192 324 C194 312 190 302 179 302Z', k, ol, 2.6);
    s += P('M110 384 L190 384', 'none', k2, 7) + P('M96 440 L92 472 M122 420 L118 482 M150 418 L150 486 M178 420 L182 482 M204 440 L208 472', 'none', shade(k, -0.18), 1.6);
    s += P('M74 478 Q150 492 226 478', 'none', k2, 4);
  } else if (t.dress === 2) {
    s += P('M120 302 C108 302 104 312 106 324 L112 362 C114 380 108 420 100 470 Q150 482 200 470 C192 420 186 380 188 362 L194 324 C196 312 192 302 180 302Z', k, ol, 2.6);
    s += P('M134 302 L164 360 M166 302 L136 360', 'none', shade(k, -0.3), 3);
    s += `<rect x="110" y="356" width="80" height="22" rx="3" fill="${k2}" stroke="${ol2}" stroke-width="2.2"/>`;
    s += P('M168 362 L196 396 L180 398Z', k2, ol2, 2);
    s += [[118, 400], [168, 430], [130, 450], [178, 390]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${shade(k, 0.5)}" opacity=".8"/>`).join('');
  } else {
    s += P(topShape(hem), k, ol, 2.6);
    if (t.crop) s += P('M114 360 L186 360', 'none', ol, 2);
  }
  // ворот / детали
  switch (c.top) {
    case 0: s += P('M136 302 Q150 318 164 302Z', sk, ol, 2) + P('M136 302 Q150 318 164 302', 'none', k2, 3); break;
    case 1: s += P('M118 304 L182 304 L196 334 L150 366 L104 334Z', k2, ol2, 2.4) + P('M108 330 L150 360 L192 330', 'none', '#fff', 2.4) + P('M138 304 L150 340 L162 304Z', sk, line(sk), 1.8) + P('M150 352 L130 342 L132 364Z M150 352 L170 342 L168 364Z', '#e8344a', '#8a1424', 2) + P('M146 356 L140 384 L150 376 L158 384 L154 356Z', '#e8344a', '#8a1424', 2); break;
    case 2: s += P('M118 306 C120 286 180 286 182 306 C176 322 124 322 118 306Z', shade(k, -0.15), ol, 2.4) + P('M140 316 L138 346 M160 316 L162 346', 'none', k2, 2.4) + `<circle cx="138" cy="348" r="3" fill="${k2}"/><circle cx="162" cy="348" r="3" fill="${k2}"/>` + P('M126 380 L174 380 L178 404 L122 404Z', shade(k, -0.08), ol, 2) + P('M108 406 L192 406', 'none', shade(k, -0.25), 6); break;
    case 3: s += P('M128 302 Q150 330 172 302Z', sk, ol, 2) + P('M124 302 L128 302 M172 302 L176 302', 'none', ol, 2); break;
    case 4: s += P('M138 302 L150 320 L162 302Z', sk, line(sk), 1.8) + P('M130 300 L150 318 L144 328Z M170 300 L150 318 L156 328Z', '#fff', ol, 2) + P('M147 318 L153 318 L157 370 L150 380 L143 370Z', k2, ol2, 2) + `<circle cx="150" cy="390" r="2" fill="${ol}"/>`; break;
    case 5: s += P('M134 302 Q150 324 166 302Z', sk, line(sk), 2) + P('M134 302 Q150 324 166 302', 'none', k2, 3) + P('M142 326 L132 316 L134 334Z M158 326 L168 316 L166 334Z', k2, ol2, 1.8) + `<circle cx="150" cy="326" r="4" fill="${k2}" stroke="${ol2}" stroke-width="1.6"/>`; break;
    case 6: s += `<rect x="134" y="292" width="32" height="18" rx="6" fill="${shade(k, -0.1)}" stroke="${ol}" stroke-width="2.2"/>` + P('M140 318 L140 404 M150 318 L150 404 M160 318 L160 404 M130 318 L128 404 M170 318 L172 404', 'none', shade(k, -0.12), 1.4) + P('M110 408 L190 408', 'none', shade(k, -0.22), 6); break;
    case 7: s += P('M128 302 Q150 326 172 302Z', sk, ol, 2) + P('M132 334 Q150 344 168 334', 'none', k2, 3); break;
  }
  return G(adjT(c, 'top'), s, 'data-part="top"');
}

function drawBottom(c) {
  const b = c.bottom, k = c.botC, ol = line(k);
  if (!b || (TOPS[c.top] || {}).dress) return '';
  let s = '';
  if (b === 1 || b === 2 || b === 6 || b === 7) {
    const hem = b === 2 ? 520 : b === 6 ? 438 : b === 7 ? 452 : 458, w = b === 2 ? 64 : b === 6 ? 50 : b === 7 ? 76 : 58;
    s += P(`M114 382 L186 382 L${150 + w} ${hem} Q150 ${hem + 10} ${150 - w} ${hem} Z`, k, ol, 2.6);
    if (b !== 7) for (let i = -3; i <= 3; i++) s += P(`M${150 + i * 9} 388 L${150 + i * (w / 3.6)} ${hem + 4}`, 'none', shade(k, -0.25), 1.6);
    else s += P(`M${150 - w} ${hem} Q${150 - w / 2} ${hem + 14} 150 ${hem + 2} Q${150 + w / 2} ${hem + 14} ${150 + w} ${hem}`, 'none', '#fff', 4) + P(`M${150 - w + 4} ${hem - 3} Q150 ${hem + 6} ${150 + w - 4} ${hem - 3}`, 'none', shade(k, 0.35), 3);
    s += P('M113 380 L187 380 L187 392 L113 392Z', shade(k, -0.12), ol, 2.2);
    if (b === 1) s += P(`M${150 - w} ${hem - 6} Q150 ${hem + 4} ${150 + w} ${hem - 6}`, 'none', '#fff', 2.4);
  } else if (b >= 3 && b <= 5) {
    s += P('M112 378 L188 378 L190 420 L150 424 L110 420Z', k, ol, 2.6) + P('M150 392 L150 422', 'none', ol, 1.6) + P('M112 384 L188 384', 'none', shade(k, -0.25), 4);
    if (b === 5) s += P('M120 392 Q130 400 140 392 M160 392 Q170 400 180 392', 'none', shade(k, 0.35), 1.6) + `<circle cx="150" cy="386" r="3" fill="#d8b040"/>`;
  }
  return G(adjT(c, 'bottom'), s, 'data-part="bottom"');
}

function drawOuterBack(c) {
  if (c.outer !== 3) return '';
  const k = c.outC, ol = line(k);
  return G(adjT(c, 'outer'), P('M112 304 L188 304 L236 560 Q150 580 64 560Z', shade(k, -0.25), ol, 2.6), 'data-part="outer"');
}
function drawOuter(c) {
  const k = c.outC, ol = line(k);
  let s = '';
  switch (c.outer) {
    case 1: s = P('M121 300 C108 300 104 312 106 324 L112 362 C114 380 110 396 108 418 L140 420 L144 330 L132 302Z', k, ol, 2.6) + `<g transform="${MIR}">` + P('M121 300 C108 300 104 312 106 324 L112 362 C114 380 110 396 108 418 L140 420 L144 330 L132 302Z', k, ol, 2.6) + '</g>' + P('M132 302 L144 330 L128 324Z M168 302 L156 330 L172 324Z', shade(k, -0.2), ol, 2); break;
    case 2: s = P('M122 300 C110 300 106 312 108 324 L114 362 C116 380 112 400 110 426 L144 428 L146 340 L136 302Z', k, ol, 2.6) + `<g transform="${MIR}">` + P('M122 300 C110 300 106 312 108 324 L114 362 C116 380 112 400 110 426 L144 428 L146 340 L136 302Z', k, ol, 2.6) + '</g>' + [350, 372, 394].map(y => `<circle cx="142" cy="${y}" r="3" fill="${shade(k, 0.5)}" stroke="${ol}" stroke-width="1.4"/>`).join('') + P('M110 422 L144 424 M190 422 L156 424', 'none', shade(k, -0.25), 5); break;
    case 3: s = P('M112 300 C120 290 180 290 188 300 L196 322 C170 334 130 334 104 322Z', k, ol, 2.6) + `<circle cx="150" cy="316" r="6" fill="#ffd447" stroke="#a87a10" stroke-width="2"/>`; break;
    case 4: s = P('M121 300 C108 300 104 312 106 324 L112 362 C114 390 104 450 98 520 L140 522 L144 330 L132 302Z', k, ol, 2.6) + `<g transform="${MIR}">` + P('M121 300 C108 300 104 312 106 324 L112 362 C114 390 104 450 98 520 L140 522 L144 330 L132 302Z', k, ol, 2.6) + '</g>' + P('M132 302 L144 336 L126 328Z M168 302 L156 336 L174 328Z', shade(k, -0.1), ol, 2) + P('M114 420 L132 420 L132 440 L114 440Z', 'none', ol, 1.6); break;
    case 5: s = P('M118 296 C130 316 170 316 182 296 L186 312 C170 330 130 330 114 312Z', k, ol, 2.6) + P('M160 314 L170 372 L156 374 L150 318Z', k, ol, 2.4) + P('M158 344 L170 344 M160 356 L170 356', 'none', shade(k, -0.3), 2); break;
  }
  return s ? G(adjT(c, 'outer'), s, 'data-part="outer"') : '';
}

function drawBack(c) {
  const k = c.backC, ol = line(k);
  let s = '';
  switch (c.back) {
    case 1: { const w = P('M140 330 C100 260 30 250 10 280 C30 290 20 300 30 310 C16 318 22 330 36 334 C26 346 34 356 50 356 C46 370 60 376 80 370 C100 380 130 370 140 350Z', k, ol, 2.4) + P('M40 300 Q80 300 120 330 M50 330 Q90 330 124 346', 'none', shade(k, -0.2), 1.6); s = w + `<g transform="${MIR}">${w}</g>`; break; }
    case 2: { const w = P('M140 330 C110 270 40 230 0 250 L30 280 L4 300 L44 312 L20 340 L70 340 L60 370 L110 352 L140 360Z', k === '#ffffff' ? '#3a2340' : k, ol, 2.4); s = w + `<g transform="${MIR}">${w}</g>`; break; }
    case 3: { const w = `<path d="M146 336 C110 270 40 250 30 300 C26 340 100 350 146 340Z M146 346 C100 350 50 380 70 420 C90 440 130 400 146 352Z" fill="${k === '#ffffff' ? '#bfeaff' : k}" fill-opacity=".7" stroke="${ol}" stroke-width="2.2"/>`; s = w + `<g transform="${MIR}">${w}</g>`; break; }
    case 4: s = P('M178 400 C230 410 250 360 236 320 C230 300 246 290 252 304 C262 340 252 430 180 420Z', k === '#ffffff' ? c.hair : k, line(k === '#ffffff' ? c.hair : k), 2.4); break;
    case 5: { const f = k === '#ffffff' ? '#ff9a3c' : k; s = P('M176 398 C240 420 290 360 272 300 C266 330 250 340 240 344 C258 360 220 400 176 388Z', f, line(f), 2.4) + P('M272 300 C266 330 250 340 240 344 C256 336 268 322 272 300Z', '#fff', line(f), 2); break; }
    case 6: s = `<rect x="104" y="306" width="92" height="96" rx="18" fill="${k === '#ffffff' ? '#6a4ad0' : k}" stroke="${ol}" stroke-width="2.6"/>`; break;
  }
  return s ? G(adjT(c, 'back'), s, 'data-part="back"') : '';
}

// ---------- сборка ----------
let _uid = 0;
function renderChar(c, opts = {}) {
  const u = opts.uid || ('c' + (++_uid) + '_');
  const p = Object.assign({}, POSE0, c.pose || {}, opts.pose || {});
  const cx = Object.assign({}, c, opts.expr || {});
  c = cx;
  const sk = c.skin, olS = line(sk);
  const sitDrop = p.sit ? LEN.th * 0.72 : 0;
  const rootT = `translate(0 ${sitDrop - (p.jump || 0)})` + (c.height && c.height !== 1 ? ` translate(150 ${ANCHOR.y}) scale(${c.width || 1} ${c.height}) translate(-150 ${-ANCHOR.y})` : (c.width && c.width !== 1 ? ` translate(150 0) scale(${c.width} 1) translate(-150 0)` : ''));
  const tT = rot(p.lean, J.hip);
  const hs = c.headSize || 1;
  const hT = (rot(p.head, J.neck) + (p.nod ? ` translate(0 ${p.nod})` : '') + (hs !== 1 ? ` translate(150 300) scale(${hs}) translate(-150 -300)` : '') + ' ' + adjT(c, 'head')).trim();

  const defs = `<defs>
<linearGradient id="${u}hg" gradientUnits="userSpaceOnUse" x1="0" y1="110" x2="0" y2="${c.hairB === 5 ? 520 : 470}"><stop offset="0" stop-color="${shade(c.hair, 0.12)}"/><stop offset=".35" stop-color="${c.hair}"/><stop offset="1" stop-color="${c.hair2 || c.hair}"/></linearGradient>
<linearGradient id="${u}ig0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c.eye, -0.55)}"/><stop offset=".5" stop-color="${c.eye}"/><stop offset="1" stop-color="${shade(c.eye, 0.45)}"/></linearGradient>
<linearGradient id="${u}ig1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c.eye2 || c.eye, -0.55)}"/><stop offset=".5" stop-color="${c.eye2 || c.eye}"/><stop offset="1" stop-color="${shade(c.eye2 || c.eye, 0.45)}"/></linearGradient>
</defs>`;

  const legs = (side) => side ? `<g transform="${MIR}">${drawLeg(c, 1, p, u)}</g>` : drawLeg(c, 0, p, u);
  const arms = (side) => side ? `<g transform="${MIR}">${drawArm(c, 1, p, u)}</g>` : drawArm(c, 0, p, u);
  const top = TOPS[c.top] || TOPS[0];

  // туловище
  let torso = '';
  torso += P(`M140 276 L160 276 L161 312 L139 312Z`, sk, olS, 2.2) + P('M140 300 Q150 308 160 300', 'none', shade(sk, -0.2), 2);
  torso += P(TORSO, sk, olS, 2.4);
  if (top.over) torso += drawBottom(c) + drawTop(c); else torso += drawTop(c) + drawBottom(c);
  torso += drawOuter(c);

  const head = drawEars(c) + `<g data-part="head">${P((FACES[c.face] || FACES[0]).d, sk, olS, 2.6)}</g>` +
    P('M96 180 Q150 196 204 180 L204 196 Q150 210 96 196Z', shade(sk, -0.1), '', 0, ' opacity=".0"') +
    drawFaceFeatures(c, u) + drawHairFront(c, u) + drawAhoge(c, u) + drawGlasses(c) + drawHat(c) + drawFx(c);
  const headAll = G(hT, head, 'data-joint="head"');
  const hairBack = G(hT, drawHairBack(c, u));

  // руки за спиной (armBack) рисуются до туловища
  const armL = arms(0), armR = arms(1);
  const body =
    G(tT, drawBack(c) + drawOuterBack(c) + hairBack + (p.layL < 0 ? armL : '') + (p.layR < 0 ? armR : '')) +
    legs(0) + legs(1) +
    G(tT, torso + (!p.layL ? armL : '') + (!p.layR ? armR : '') + headAll + (p.layL > 0 ? armL : '') + (p.layR > 0 ? armR : ''), 'data-joint="lean"');

  const w = opts.width ? ` width="${opts.width}"` : '', h = opts.height ? ` height="${opts.height}"` : '';
  const vb = opts.viewBox || `${VB.x} ${VB.y} ${VB.w} ${VB.h}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${w}${h} overflow="visible">${defs}<g transform="${rootT}">${body}</g></svg>`;
}

// случайный персонаж
const PALETTE = {
  skin: ['#fff0e6', '#ffe3d3', '#f6d1b8', '#e8b892', '#c98e66', '#9a623e', '#6e4128', '#f3e6ff', '#d8f0ff'],
  hair: ['#2a2230', '#5a3424', '#9a5a34', '#e8c070', '#fff0b0', '#ff8cc6', '#ff5a7a', '#c03040', '#7d55ff', '#4a7aff', '#48c0ff', '#40d0a0', '#f0f0f8', '#a0a0b8', '#ff9a3c', '#1a1a2a'],
  eye: ['#7d55ff', '#4a7aff', '#36b0e0', '#30b080', '#e04060', '#ff8a30', '#8a5a30', '#2a2a40', '#d040c0', '#e0c030'],
  cloth: ['#ffffff', '#2a2a3a', '#2f3f8f', '#e8344a', '#ff8cc6', '#ffd84a', '#40c080', '#48c0ff', '#7d55ff', '#ff9a3c', '#8a5a30', '#c0c0d0', '#1a1a1a', '#f0d0e0', '#6a2a4a', '#a0e0d0'],
};
function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
function rndi(n) { return Math.floor(Math.random() * n); }
function randomChar() {
  const c = defaultChar();
  c.skin = rnd(PALETTE.skin.slice(0, 7)); c.hair = rnd(PALETTE.hair); c.hair2 = Math.random() < 0.25 ? rnd(PALETTE.hair) : c.hair;
  c.eye = rnd(PALETTE.eye); c.eye2 = Math.random() < 0.1 ? rnd(PALETTE.eye) : c.eye;
  c.face = rndi(FACES.length); c.eyes = rndi(EYES.length - 1); if (c.eyes === 7) c.eyes = 0;
  c.brows = rndi(3); c.mouth = rnd([0, 0, 1, 2, 7, 11]); c.nose = rndi(2); c.blush = rndi(3);
  c.hairF = rndi(HAIR_F.length - 1); c.hairB = rndi(HAIR_B.length); c.ahoge = Math.random() < 0.3 ? 1 + rndi(3) : 0;
  c.top = rndi(TOPS.length - 1); c.topC = rnd(PALETTE.cloth); c.top2 = rnd(PALETTE.cloth);
  c.bottom = 1 + rndi(BOTTOMS.length - 1); c.botC = rnd(PALETTE.cloth);
  c.legwear = rndi(LEGWEAR.length); c.legC = rnd(PALETTE.cloth); c.shoes = rndi(SHOES.length - 1); c.shoeC = rnd(PALETTE.cloth);
  c.outer = Math.random() < 0.25 ? 1 + rndi(OUTERS.length - 1) : 0; c.outC = rnd(PALETTE.cloth);
  c.hat = Math.random() < 0.35 ? 1 + rndi(HATS.length - 1) : 0; c.hatC = rnd(PALETTE.cloth);
  c.glasses = Math.random() < 0.15 ? 1 + rndi(GLASSES.length - 1) : 0;
  c.back = Math.random() < 0.15 ? 1 + rndi(BACKS.length - 1) : 0;
  return c;
}

const PRESET_CHARS = [
  Object.assign(defaultChar(), { name: 'Мика', hair: '#ff8cc6', hair2: '#ffb0dc', hairF: 0, hairB: 3, eye: '#7d55ff', eye2: '#7d55ff', top: 1, topC: '#ffffff', top2: '#2f3f8f', bottom: 1, botC: '#2f3f8f', legwear: 2, shoes: 1, hat: 0, ahoge: 1, eyes: 0, mouth: 0 }),
  Object.assign(defaultChar(), { name: 'Рэн', skin: '#f6d1b8', hair: '#2a2230', hair2: '#3a3050', hairF: 2, hairB: 10, eye: '#e04060', eye2: '#e04060', eyes: 1, brows: 2, mouth: 7, top: 2, topC: '#2a2a3a', top2: '#e8344a', bottom: 4, botC: '#3a3a4a', legwear: 0, shoes: 0, shoeC: '#e8344a', lash: 0, blush: 0 }),
  Object.assign(defaultChar(), { name: 'Юки', skin: '#fff0e6', hair: '#d8f0ff', hair2: '#9ad0ff', hairF: 6, hairB: 5, eye: '#36b0e0', eye2: '#36b0e0', eyes: 5, mouth: 2, top: 5, topC: '#bfe4ff', top2: '#4a7aff', legwear: 3, legC: '#ffffff', shoes: 1, shoeC: '#4a7aff', hat: 7, hatC: '#4a7aff' }),
  Object.assign(defaultChar(), { name: 'Тако', skin: '#e8b892', hair: '#ff9a3c', hair2: '#ff6a2a', hairF: 4, hairB: 0, eye: '#30b080', eye2: '#30b080', eyes: 2, mouth: 11, brows: 0, top: 0, topC: '#40c080', top2: '#ffffff', bottom: 3, botC: '#3a5a9a', legwear: 1, shoes: 0, shoeC: '#ffffff', hat: 1, hatC: '#e8344a', lash: 0, blush: 1 }),
];
