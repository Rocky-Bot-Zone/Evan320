/**
 * pair5.js — Premium Love Pair Command (GoatBot)
 * 39 unique designs: cute anime couples, cartoon, flowers, neon, galaxy, royal & more.
 * Every run picks a different design at random.  Use "pair5 list" to see them all.
 *
 * Author : Rocky Chowdhury
 * ⚠ Author name is protected. If it is changed, this command stops working.
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const { createCanvas, loadImage } = require("canvas");

/* ═══════════════════════ AUTHOR PROTECTION ═══════════════════════ */

const _k = [82, 111, 99, 107, 121, 32, 67, 104, 111, 119, 100, 104, 117, 114, 121];
const OWNER = String.fromCharCode(..._k);
const OWNER_SHA = "2b243755bf74df8f781fa886e3ee67ceae114afc7f29e26ff955e63cee62b9c0";

function isAuthorized(cfg) {
  try {
    const a = String(cfg && cfg.author);
    if (a !== OWNER) return false;
    if (a.length !== _k.length) return false;
    return crypto.createHash("sha256").update(a).digest("hex") === OWNER_SHA;
  } catch (e) {
    return false;
  }
}

/* ═══════════════════════ BASIC HELPERS ═══════════════════════ */

const FB_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
const CACHE_DIR = path.join(__dirname, "cache");
const TAU = Math.PI * 2;
const lastDesign = new Map(); // threadID -> last design index

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max) => Math.random() * (max - min) + min;

const avatarUrl = (id, size = 720) =>
  `https://graph.facebook.com/${id}/picture?width=${size}&height=${size}&access_token=${FB_TOKEN}`;

async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
  return Buffer.from(res.data);
}

async function loadFromUrl(url) {
  return loadImage(await fetchBuffer(url));
}

function cachePath(prefix, senderID) {
  fs.ensureDirSync(CACHE_DIR);
  return path.join(CACHE_DIR, `${prefix}_${senderID}_${Date.now()}.png`);
}

function pickPartner(users, senderID, botID) {
  const me = users.find((u) => String(u.id) === String(senderID));
  const myGender = me && me.gender ? String(me.gender).toUpperCase() : null;
  const others = users.filter((u) => String(u.id) !== String(senderID) && String(u.id) !== String(botID));

  let candidates;
  if (myGender === "MALE") candidates = others.filter((u) => String(u.gender).toUpperCase() === "FEMALE");
  else if (myGender === "FEMALE") candidates = others.filter((u) => String(u.gender).toUpperCase() === "MALE");
  else candidates = others;

  return candidates.length ? rand(candidates) : null;
}

async function getName(usersData, id, fallback) {
  try {
    const n = await usersData.getName(id);
    if (n) return n;
  } catch (e) {}
  return fallback || "Unknown";
}

const cleanName = (n, max = 22) => {
  const s = String(n || "Unknown").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
};

/* ═══════════════════════ CANVAS TOOLKIT ═══════════════════════ */

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function rad(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function fillBg(ctx, w, h, stops, horizontal = false) {
  ctx.fillStyle = lin(ctx, 0, 0, horizontal ? w : 0, horizontal ? 0 : h, stops);
  ctx.fillRect(0, 0, w, h);
}

function txt(ctx, t, x, y, o = {}) {
  ctx.save();
  let size = o.size || 32;
  const fam = o.family || "sans-serif";
  const wt = o.weight || "bold";
  ctx.font = `${wt} ${size}px ${fam}`;
  ctx.textAlign = o.align || "center";
  ctx.textBaseline = o.base || "middle";
  if (o.maxW) {
    while (ctx.measureText(t).width > o.maxW && size > 10) {
      size -= 2;
      ctx.font = `${wt} ${size}px ${fam}`;
    }
  }
  if (o.shadow) {
    ctx.shadowColor = o.shadow;
    ctx.shadowBlur = o.blur || 10;
  }
  if (o.stroke) {
    ctx.lineWidth = o.strokeW || 4;
    ctx.strokeStyle = o.stroke;
    ctx.lineJoin = "round";
    ctx.strokeText(t, x, y);
  }
  ctx.fillStyle = o.color || "#fff";
  ctx.fillText(t, x, y);
  ctx.restore();
}

function heartPath(ctx, x, y, s) {
  const t = s / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + t * 0.9);
  ctx.bezierCurveTo(x - t * 1.6, y - t * 0.2, x - t * 0.9, y - t * 1.2, x, y - t * 0.4);
  ctx.bezierCurveTo(x + t * 0.9, y - t * 1.2, x + t * 1.6, y - t * 0.2, x, y + t * 0.9);
  ctx.closePath();
}

function drawHeart(ctx, x, y, s, fill, o = {}) {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o.rot) {
    ctx.translate(x, y);
    ctx.rotate(o.rot);
    ctx.translate(-x, -y);
  }
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = o.glowBlur || 20;
  }
  heartPath(ctx, x, y, s);
  ctx.fillStyle = fill;
  ctx.fill();
  if (o.stroke) {
    ctx.shadowBlur = 0;
    ctx.lineWidth = o.lw || 3;
    ctx.strokeStyle = o.stroke;
    ctx.stroke();
  }
  ctx.restore();
}

function starPath(ctx, x, y, r, n = 5, inner = 0.45, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rd = i % 2 === 0 ? r : r * inner;
    const a = rot + (i * Math.PI) / n;
    const px = x + Math.cos(a) * rd;
    const py = y + Math.sin(a) * rd;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function sparkle(ctx, x, y, r, color = "#fff", alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  starPath(ctx, x, y, r, 4, 0.22);
  ctx.fill();
  ctx.restore();
}

function petal(ctx, x, y, s, rot, color, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.bezierCurveTo(s * 0.9, -s * 0.7, s * 0.7, s * 0.6, 0, s);
  ctx.bezierCurveTo(-s * 0.7, s * 0.6, -s * 0.9, -s * 0.7, 0, -s);
  ctx.fill();
  ctx.restore();
}

function flower(ctx, x, y, r, color = "#ff8fb8", center = "#ffd54f", n = 5) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.rotate((i * TAU) / n);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.6, r * 0.38, r * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function cloud(ctx, x, y, s, color = "#fff", alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  [[-0.55, 0, 0.5], [0, -0.25, 0.65], [0.55, 0, 0.5]].forEach(([dx, dy, r]) => {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
    ctx.fill();
  });
  rr(ctx, x - 1.05 * s, y, 2.1 * s, 0.5 * s, 0.25 * s);
  ctx.fill();
  ctx.restore();
}

function butterfly(ctx, x, y, s, c1, c2, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.ellipse(-s * 0.5, -s * 0.3, s * 0.55, s * 0.4, -0.5, 0, TAU);
  ctx.ellipse(s * 0.5, -s * 0.3, s * 0.55, s * 0.4, 0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.ellipse(-s * 0.4, s * 0.3, s * 0.38, s * 0.3, 0.5, 0, TAU);
  ctx.ellipse(s * 0.4, s * 0.3, s * 0.38, s * 0.3, -0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#4a2c2a";
  rr(ctx, -s * 0.06, -s * 0.5, s * 0.12, s * 1.0, s * 0.06);
  ctx.fill();
  ctx.restore();
}

function drawCircleImage(ctx, img, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

function ringAvatar(ctx, img, cx, cy, r, o = {}) {
  ctx.save();
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = o.glowBlur || 30;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r + (o.ringW || 8), 0, TAU);
  ctx.fillStyle = o.ring || "#fff";
  ctx.fill();
  ctx.restore();
  if (o.ring2) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, TAU);
    ctx.fillStyle = o.ring2;
    ctx.fill();
  }
  drawCircleImage(ctx, img, cx, cy, r);
}

function heartAvatar(ctx, img, x, y, s, o = {}) {
  ctx.save();
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = o.glowBlur || 25;
  }
  heartPath(ctx, x, y, s * 1.06);
  ctx.fillStyle = o.ring || "#fff";
  ctx.fill();
  ctx.restore();
  ctx.save();
  heartPath(ctx, x, y, s);
  ctx.clip();
  const d = s * 1.3;
  ctx.drawImage(img, x - d / 2, y - d / 2 + s * 0.02, d, d);
  ctx.restore();
}

function pctHeart(ctx, x, y, s, pct, fill = "#ff4d79", glow = "#ff4d79") {
  drawHeart(ctx, x, y, s, fill, { glow, glowBlur: 25, stroke: "#fff", lw: 4 });
  txt(ctx, `${pct}%`, x, y + s * 0.03, { size: Math.round(s * 0.27), color: "#fff", stroke: "rgba(0,0,0,.25)", strokeW: 3 });
}

function pill(ctx, x, y, w, h, fill, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  rr(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function credit(ctx, w, h) {
  txt(ctx, `Pair5 • ${OWNER}`, w - 14, h - 12, {
    size: 13, align: "right", color: "rgba(255,255,255,.85)", shadow: "rgba(0,0,0,.7)", blur: 4
  });
}

/* ───────── Cartoon / anime chibi character ─────────
   x,y = feet centre, s = total height in px                        */
function chibi(ctx, x, y, s, o) {
  const u = s / 100;
  const girl = o.type === "girl";
  const skin = "#ffe0c8";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // back hair
  ctx.fillStyle = o.hair;
  if (girl) {
    ctx.beginPath();
    ctx.ellipse(0, -60, 34, 36, 0, 0, TAU);
    ctx.fill();
    rr(ctx, -33, -62, 66, 46, 20);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-27, -90, 11, 0, TAU);
    ctx.arc(27, -90, 11, 0, TAU);
    ctx.fill();
  }

  // legs + shoes
  if (girl) {
    ctx.fillStyle = skin;
    rr(ctx, -10, -16, 7, 15, 3); ctx.fill();
    rr(ctx, 3, -16, 7, 15, 3); ctx.fill();
  } else {
    ctx.fillStyle = o.pants || "#3b4a7a";
    rr(ctx, -14, -18, 12, 18, 4); ctx.fill();
    rr(ctx, 2, -18, 12, 18, 4); ctx.fill();
  }
  ctx.fillStyle = "#6b3f2e";
  ctx.beginPath();
  ctx.ellipse(-8, -1, 8, 4, 0, 0, TAU);
  ctx.ellipse(8, -1, 8, 4, 0, 0, TAU);
  ctx.fill();

  // body
  ctx.fillStyle = o.outfit;
  if (girl) {
    ctx.beginPath();
    ctx.moveTo(-14, -38); ctx.lineTo(14, -38); ctx.lineTo(25, -12); ctx.lineTo(-25, -12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.moveTo(-23, -15); ctx.lineTo(23, -15); ctx.lineTo(25, -12); ctx.lineTo(-25, -12);
    ctx.closePath();
    ctx.fill();
  } else {
    rr(ctx, -16, -42, 32, 30, 9); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.beginPath();
    ctx.moveTo(-6, -42); ctx.lineTo(0, -34); ctx.lineTo(6, -42);
    ctx.closePath();
    ctx.fill();
  }

  // arms
  const heartSide = o.heartSide || 1; // +1 : right arm reaches out, -1 : left arm
  const shoulderY = -36;
  ctx.lineWidth = 7;
  ctx.strokeStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-heartSide * 14, shoulderY);
  ctx.lineTo(-heartSide * 22, -20);
  ctx.stroke();
  if (o.arm) {
    const tx = (o.arm.x - x) / u;
    const ty = (o.arm.y - y) / u;
    ctx.strokeStyle = o.outfit;
    ctx.beginPath();
    ctx.moveTo(heartSide * 14, shoulderY);
    ctx.lineTo(heartSide * 14 + (tx - heartSide * 14) * 0.35, shoulderY + (ty - shoulderY) * 0.35);
    ctx.stroke();
    ctx.strokeStyle = skin;
    ctx.beginPath();
    ctx.moveTo(heartSide * 14 + (tx - heartSide * 14) * 0.3, shoulderY + (ty - shoulderY) * 0.3);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(tx, ty, 4.5, 0, TAU);
    ctx.fill();
  }

  // head
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -62, 30, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#f0b99a";
  ctx.stroke();

  // front hair
  ctx.fillStyle = o.hair;
  ctx.beginPath();
  ctx.moveTo(-32, -62);
  ctx.arc(0, -62, 32, Math.PI, TAU);
  if (girl) {
    ctx.lineTo(32, -60);
    ctx.quadraticCurveTo(22, -46, 12, -62);
    ctx.quadraticCurveTo(2, -44, -8, -62);
    ctx.quadraticCurveTo(-18, -46, -32, -60);
  } else {
    ctx.lineTo(32, -60);
    ctx.lineTo(20, -48); ctx.lineTo(12, -60);
    ctx.lineTo(2, -46); ctx.lineTo(-8, -60);
    ctx.lineTo(-18, -48); ctx.lineTo(-32, -60);
  }
  ctx.closePath();
  ctx.fill();
  if (!girl) {
    ctx.beginPath();
    ctx.moveTo(-18, -90); ctx.lineTo(-8, -106); ctx.lineTo(2, -91);
    ctx.lineTo(10, -108); ctx.lineTo(20, -88);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = o.ribbon || "#ff4d79";
    ctx.beginPath();
    ctx.arc(-27, -90, 4.5, 0, TAU);
    ctx.arc(27, -90, 4.5, 0, TAU);
    ctx.fill();
  }

  // eyes
  [-12, 12].forEach((ex) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(ex, -60, 8, 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = o.eye;
    ctx.beginPath(); ctx.ellipse(ex, -58, 6, 8.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#1d1d2b";
    ctx.beginPath(); ctx.ellipse(ex, -58, 3.2, 5.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(ex - 2.5, -62, 2.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 2, -55, 1.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#3a2a2a";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ex, -60, 8.5, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  });

  // blush + mouth
  ctx.fillStyle = "rgba(255,110,150,.45)";
  ctx.beginPath();
  ctx.ellipse(-21, -49, 6, 3.5, 0, 0, TAU);
  ctx.ellipse(21, -49, 6, 3.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#c0504d";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -49, 4.5, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  ctx.restore();
}

/* ───────── Love meter + captions ───────── */

function meter(p) {
  const n = Math.max(0, Math.min(10, Math.round(p / 10)));
  return "💗".repeat(n) + "🤍".repeat(10 - n);
}

const QUOTES = [
  "Two hearts, one beautiful story.",
  "Destiny brought you together today.",
  "Some matches are written in the stars.",
  "Together you make the world brighter.",
  "Love found its way, and it chose you two.",
  "A perfect pair, just like fate planned.",
  "Where you go, my heart follows.",
  "You are my favorite hello.",
  "Every love story is beautiful, yours is special.",
  "Cuteness overload detected!"
];

const BODY_STYLES = [
  ({ t, a, b, p, q }) => `✨ ${t} ✨\n━━━━━━━━━━━━━━━\n👤 ${a}\n❤️ ${b}\n━━━━━━━━━━━━━━━\n💯 Love Score: ${p}%\n${meter(p)}\n💌 ${q}`,
  ({ t, a, b, p, q }) => `💞 ${t} 💞\n\n🌸 ${a}\n      &\n🌸 ${b}\n\n💖 Compatibility: ${p}%\n${meter(p)}\n\n❝ ${q} ❞`,
  ({ t, a, b, p, q }) => `╭─── ❀ ${t} ❀ ───╮\n• ${a}\n• ${b}\n╰──────────────╯\n🔗 Love Connection: ${p}%\n${meter(p)}\n💌 ${q}`,
  ({ t, a, b, p, q }) => `🌹 ${t} 🌹\n━━━━━━━━━━━━━━━\n${a} 💘 ${b}\n\n🎯 Match Rate: ${p}%\n${meter(p)}\n━━━━━━━━━━━━━━━\n${q} 💫`
];

const makeBody = (t, a, b, p) => rand(BODY_STYLES)({ t, a, b, p, q: rand(QUOTES) });

function finish(canvas, ctx, d, tag, title) {
  credit(ctx, canvas.width, canvas.height);
  const file = cachePath(`pair5_${tag}`, d.senderID);
  fs.writeFileSync(file, canvas.toBuffer("image/png"));
  return {
    body: makeBody(title, d.name1, d.name2, d.pct),
    attachment: fs.createReadStream(file),
    cleanup: [file]
  };
}

async function loadAvatars(d, size = 512) {
  return Promise.all([loadFromUrl(avatarUrl(d.id1, size)), loadFromUrl(avatarUrl(d.id2, size))]);
}

const W = 900;
const H = 500;

/* ═══════════════════════ ANIME TOOLKIT ═══════════════════════ */

function shade(hex, amt) {
  let h = String(hex).replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  );
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

const GIRL_HAIR = ["#ff8ac2", "#ffb3d9", "#7a4bff", "#4fa8ff", "#ff7a7a", "#ffd36b", "#3a2a4a", "#8a5a3a", "#c9a8ff", "#3cc9b0", "#f4a6ff"];
const BOY_HAIR = ["#3a3f8f", "#2b2b3a", "#8a5a3a", "#ff9a4d", "#4fa8ff", "#7a4bff", "#d8d8ee", "#3f9f6a", "#c0392b"];
const EYE_COLORS = ["#7a4bff", "#2fa4ff", "#ff6fa8", "#3fc28a", "#ffb300", "#e0455b", "#00b8d4"];

const lookGirl = (o = {}) =>
  Object.assign({
    gender: "girl",
    hair: rand(GIRL_HAIR),
    hairStyle: rand(["twin", "long", "bun", "ponytail", "bob"]),
    eye: rand(EYE_COLORS),
    mouth: rand(["smile", "open"])
  }, o);

const lookBoy = (o = {}) =>
  Object.assign({
    gender: "boy",
    hair: rand(BOY_HAIR),
    hairStyle: rand(["spiky", "short", "side"]),
    eye: rand(EYE_COLORS),
    mouth: rand(["smile", "open"])
  }, o);

/**
 * Cute chibi anime character.
 * x,y = feet centre   s = full height in px
 * o: gender, hair, hairStyle, eye, mouth, outfit(uniform|dress|kimono|wedding|casual|suit),
 *    main, accent, pants, acc(ribbon|catears|glasses|headphones|flowercrown|crown|none), scarf,
 *    heartSide(+1 right arm reaches out / -1 left arm), arm{x,y} (hand target in canvas px)
 */
function anime(ctx, x, y, s, o) {
  const u = s / 100;
  const girl = o.gender === "girl";
  const skin = o.skin || "#ffe3cf";
  const outfit = o.outfit || "uniform";
  const main = o.main || (girl ? "#2f4a8f" : "#2b3558");
  const accent = o.accent || "#ff4d79";
  const hair = o.hair || "#444455";
  const style = o.hairStyle || (girl ? "long" : "short");
  const sleeve = o.sleeve || (outfit === "wedding" && girl ? "#ffffff" : outfit === "dress" && girl ? skin : main);
  const ell = (cx, cy, rx, ry, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rot, 0, TAU);
    ctx.fill();
  };
  const poly = (pts) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
  };

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  /* ── back hair ── */
  ctx.fillStyle = hair;
  if (girl) {
    ell(0, -60, 35, 37);
    if (style === "long") { rr(ctx, -34, -62, 68, 50, 22); ctx.fill(); }
    else if (style === "bob") { rr(ctx, -35, -62, 70, 36, 16); ctx.fill(); }
    else if (style === "twin") {
      ell(-41, -42, 10, 29, 0.12); ell(41, -42, 10, 29, -0.12);
      ctx.fillStyle = accent; ell(-37, -68, 5, 5); ell(37, -68, 5, 5);
    } else if (style === "ponytail") {
      ell(41, -46, 10, 30, -0.25);
      ctx.fillStyle = accent; ell(35, -72, 5, 5);
    } else if (style === "bun") {
      ell(-27, -90, 11, 11); ell(27, -90, 11, 11);
    }
  } else {
    ell(0, -63, 33, 33);
  }

  /* ── legs + shoes ── */
  if (girl) {
    ctx.fillStyle = skin;
    rr(ctx, -10, -16, 7, 15, 3); ctx.fill();
    rr(ctx, 3, -16, 7, 15, 3); ctx.fill();
    if (outfit === "uniform") {
      ctx.fillStyle = "#fff";
      rr(ctx, -10, -9, 7, 8, 2); ctx.fill();
      rr(ctx, 3, -9, 7, 8, 2); ctx.fill();
    }
  } else {
    ctx.fillStyle = o.pants || (outfit === "casual" ? "#3b4a7a" : "#222a44");
    rr(ctx, -14, -18, 12, 18, 4); ctx.fill();
    rr(ctx, 2, -18, 12, 18, 4); ctx.fill();
  }
  ctx.fillStyle = o.shoe || (girl ? "#7a3f3f" : "#3a2a2a");
  ell(-8, -1, 8, 4); ell(8, -1, 8, 4);

  /* ── body ── */
  if (girl) {
    if (outfit === "uniform") {
      ctx.fillStyle = "#fff"; rr(ctx, -15, -41, 30, 24, 8); ctx.fill();
      ctx.fillStyle = main; poly([[-15, -40], [15, -40], [7, -28], [0, -22], [-7, -28]]);
      poly([[-15, -20], [15, -20], [27, -6], [-27, -6]]);
      ctx.strokeStyle = "rgba(0,0,0,.14)"; ctx.lineWidth = 1.2;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 5, -20); ctx.lineTo(i * 9, -6); ctx.stroke(); }
      ctx.fillStyle = accent; poly([[0, -29], [-8, -34], [-8, -24]]); poly([[0, -29], [8, -34], [8, -24]]); ell(0, -29, 2.6, 2.6);
    } else if (outfit === "dress") {
      ctx.fillStyle = main; poly([[-14, -40], [14, -40], [26, -8], [-26, -8]]);
      ctx.fillStyle = "rgba(255,255,255,.75)"; poly([[-25, -12], [25, -12], [26, -8], [-26, -8]]);
      ctx.fillStyle = accent; rr(ctx, -14, -31, 28, 5, 2); ctx.fill(); ell(0, -28.5, 3.4, 3.4);
    } else if (outfit === "kimono") {
      ctx.fillStyle = main; rr(ctx, -17, -41, 34, 38, 6); ctx.fill();
      rr(ctx, -30, -38, 15, 26, 6); ctx.fill(); rr(ctx, 15, -38, 15, 26, 6); ctx.fill();
      [[-10, -14], [8, -9], [-4, -6], [11, -17], [-24, -20], [24, -20]].forEach(([fx, fy]) => flower(ctx, fx, fy, 4.5, "rgba(255,255,255,.7)", "#ffd54f", 5));
      ctx.fillStyle = "#fff"; poly([[-6, -41], [6, -41], [0, -27]]);
      ctx.fillStyle = accent; rr(ctx, -18, -29, 36, 11, 3); ctx.fill();
      ctx.fillStyle = shade(accent, -0.2); rr(ctx, -6, -31, 12, 15, 3); ctx.fill();
    } else if (outfit === "wedding") {
      ctx.fillStyle = "#fff"; poly([[-13, -40], [13, -40], [32, -2], [-32, -2]]);
      ctx.strokeStyle = "rgba(190,200,235,.85)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-13, -40); ctx.lineTo(-32, -2); ctx.lineTo(32, -2); ctx.lineTo(13, -40); ctx.stroke();
      ctx.fillStyle = accent; rr(ctx, -13, -33, 26, 5, 2); ctx.fill();
      ctx.fillStyle = "rgba(190,200,235,.8)";
      [[-12, -14], [0, -10], [12, -14], [-20, -6], [20, -6], [0, -20]].forEach(([px, py]) => ell(px, py, 1.8, 1.8));
    } else { // casual
      ctx.fillStyle = main; rr(ctx, -15, -41, 30, 24, 9); ctx.fill();
      drawHeart(ctx, 0, -30, 11, "#fff", { alpha: 0.9 });
      ctx.fillStyle = accent; poly([[-15, -19], [15, -19], [25, -8], [-25, -8]]);
    }
  } else if (outfit === "kimono") {
    ctx.fillStyle = main; rr(ctx, -17, -42, 34, 40, 6); ctx.fill();
    rr(ctx, -30, -39, 15, 27, 6); ctx.fill(); rr(ctx, 15, -39, 15, 27, 6); ctx.fill();
    ctx.fillStyle = "#fff"; poly([[-6, -42], [6, -42], [0, -28]]);
    ctx.fillStyle = accent; rr(ctx, -18, -24, 36, 9, 3); ctx.fill();
  } else if (outfit === "casual") {
    ctx.fillStyle = main; rr(ctx, -16, -42, 32, 29, 9); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.85)"; starPath(ctx, 0, -28, 6, 5, 0.5); ctx.fill();
  } else { // uniform / suit / wedding
    ctx.fillStyle = main; rr(ctx, -17, -42, 34, 30, 9); ctx.fill();
    ctx.fillStyle = "#fff"; poly([[-6, -42], [6, -42], [0, -26]]);
    if (outfit === "suit") {
      ctx.strokeStyle = "#ffd36b"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-6, -42); ctx.lineTo(0, -26); ctx.lineTo(6, -42); ctx.stroke();
      ctx.fillStyle = "#ffd36b"; ell(-9, -30, 1.8, 1.8); ell(9, -30, 1.8, 1.8);
    } else if (outfit === "wedding") {
      ctx.fillStyle = accent; poly([[0, -36], [-8, -41], [-8, -31]]); poly([[0, -36], [8, -41], [8, -31]]); ell(0, -36, 2.2, 2.2);
    } else {
      ctx.fillStyle = accent; poly([[0, -38], [-2.6, -34], [0, -25], [2.6, -34]]);
    }
  }

  /* ── arms ── */
  const hsd = o.heartSide || 1;
  const sy0 = -36;
  const arm = (sx, ex, ey) => {
    const mx = sx + (ex - sx) * 0.55;
    const my = sy0 + (ey - sy0) * 0.55;
    ctx.lineWidth = 7.5; ctx.strokeStyle = sleeve;
    ctx.beginPath(); ctx.moveTo(sx, sy0); ctx.lineTo(mx, my); ctx.stroke();
    ctx.strokeStyle = skin; ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(ex, ey, 4.6, 0, TAU); ctx.fill();
  };
  arm(-hsd * 14, -hsd * 23, -18);
  if (o.arm) arm(hsd * 14, (o.arm.x - x) / u, (o.arm.y - y) / u);
  else arm(hsd * 14, hsd * 23, -18);

  /* ── scarf (optional) ── */
  if (o.scarf) {
    ctx.fillStyle = o.scarf;
    rr(ctx, -15, -43, 30, 9, 4); ctx.fill();
    rr(ctx, 5, -40, 9, 24, 3); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(5, -30); ctx.lineTo(14, -30); ctx.moveTo(5, -23); ctx.lineTo(14, -23); ctx.stroke();
  }

  /* ── head ── */
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -62, 30, 0, TAU); ctx.fill();
  ctx.lineWidth = 1.4; ctx.strokeStyle = "#f2b9a0"; ctx.stroke();

  /* ── cat ears (behind front hair) ── */
  if (o.acc === "catears") {
    ctx.fillStyle = hair;
    poly([[-31, -80], [-21, -107], [-6, -91]]); poly([[31, -80], [21, -107], [6, -91]]);
    ctx.fillStyle = "#ffb3c7";
    poly([[-26, -85], [-21, -100], [-12, -91]]); poly([[26, -85], [21, -100], [12, -91]]);
  }

  /* ── front hair ── */
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(-32, -62);
  ctx.arc(0, -62, 32, Math.PI, TAU);
  if (girl) {
    ctx.lineTo(32, -60);
    ctx.quadraticCurveTo(22, -46, 12, -62);
    ctx.quadraticCurveTo(2, -44, -8, -62);
    ctx.quadraticCurveTo(-18, -46, -32, -60);
  } else if (style === "spiky") {
    ctx.lineTo(32, -60); ctx.lineTo(20, -48); ctx.lineTo(12, -60);
    ctx.lineTo(2, -46); ctx.lineTo(-8, -60); ctx.lineTo(-18, -48); ctx.lineTo(-32, -60);
  } else if (style === "side") {
    ctx.lineTo(32, -60);
    ctx.quadraticCurveTo(14, -47, -2, -65);
    ctx.quadraticCurveTo(-16, -52, -32, -60);
  } else {
    ctx.lineTo(32, -60);
    ctx.quadraticCurveTo(24, -50, 14, -60);
    ctx.quadraticCurveTo(4, -48, -6, -60);
    ctx.quadraticCurveTo(-18, -50, -32, -60);
  }
  ctx.closePath();
  ctx.fill();
  if (!girl && style === "spiky") {
    poly([[-18, -90], [-8, -106], [2, -91]]); poly([[0, -92], [10, -108], [20, -88]]);
  } else if (!girl && style === "short") {
    ctx.beginPath(); ctx.moveTo(-6, -92); ctx.quadraticCurveTo(4, -110, 14, -90); ctx.closePath(); ctx.fill();
  }
  if (girl && (style === "long" || style === "twin" || style === "bob")) {
    ell(-30, -52, 5, 15, 0.08); ell(30, -52, 5, 15, -0.08);
  }
  // hair shine
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = shade(hair, 0.5);
  ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.arc(0, -62, 25, Math.PI * 1.16, Math.PI * 1.42); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -62, 25, Math.PI * 1.62, Math.PI * 1.78); ctx.stroke();
  ctx.restore();

  /* ── eyes ── */
  [-12, 12].forEach((ex) => {
    const outer = ex < 0 ? -1 : 1;
    ctx.fillStyle = "#fff"; ell(ex, -60, 8, 10);
    ctx.fillStyle = lin(ctx, 0, -69, 0, -48, [[0, shade(o.eye || "#7a4bff", -0.4)], [0.6, o.eye || "#7a4bff"], [1, shade(o.eye || "#7a4bff", 0.5)]]);
    ell(ex, -58, 6.2, 8.8);
    ctx.fillStyle = "#1d1d2b"; ell(ex, -58.5, 3, 5);
    ctx.fillStyle = "#fff"; ell(ex - 2.6, -62, 2.8, 2.8); ell(ex + 2.2, -54.5, 1.4, 1.4);
    ctx.strokeStyle = "#2a1f2a"; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(ex, -60, 8.6, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ex + outer * 8.4, -61); ctx.lineTo(ex + outer * 11, -64); ctx.stroke();
    ctx.strokeStyle = shade(hair, -0.2); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(ex - 6, -72.5); ctx.quadraticCurveTo(ex, -75.5, ex + 6, -72.5); ctx.stroke();
  });

  /* ── blush, nose, mouth ── */
  ctx.fillStyle = "rgba(255,110,150,.45)";
  ell(-21, -49, 6, 3.6); ell(21, -49, 6, 3.6);
  ctx.strokeStyle = "#e8a58f"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(0.9, -52.4); ctx.stroke();
  if (o.mouth === "open") {
    ctx.fillStyle = "#c0394f";
    ctx.beginPath(); ctx.moveTo(-4.6, -50); ctx.quadraticCurveTo(0, -40.5, 4.6, -50); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ff8fa3"; ell(0, -45.8, 2.6, 1.6);
  } else {
    ctx.strokeStyle = "#c0504d"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, -49, 4.5, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  }

  /* ── accessories (on top) ── */
  if (girl && (o.acc === "ribbon" || (!o.acc && style !== "bun"))) {
    const rx = style === "bun" ? -27 : 22, ry = style === "bun" ? -90 : -88;
    ctx.fillStyle = accent;
    poly([[rx, ry], [rx - 12, ry - 8], [rx - 12, ry + 8]]); poly([[rx, ry], [rx + 12, ry - 8], [rx + 12, ry + 8]]);
    ctx.fillStyle = shade(accent, -0.25); ell(rx, ry, 3.8, 3.8);
  }
  if (o.acc === "glasses") {
    ctx.strokeStyle = "#3a3a4a"; ctx.lineWidth = 2;
    [-12, 12].forEach((ex) => {
      ctx.beginPath(); ctx.arc(ex, -59, 11, 0, TAU);
      ctx.fillStyle = "rgba(180,220,255,.2)"; ctx.fill(); ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(-1, -60); ctx.lineTo(1, -60); ctx.stroke();
  }
  if (o.acc === "headphones") {
    ctx.strokeStyle = accent; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, -62, 35, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
    ctx.fillStyle = shade(accent, -0.15);
    rr(ctx, -41, -72, 10, 22, 5); ctx.fill(); rr(ctx, 31, -72, 10, 22, 5); ctx.fill();
  }
  if (o.acc === "flowercrown") {
    const cols = ["#ff8fb8", "#fff", "#ffd54f", "#c9a8ff", "#ffa6c9", "#fff", "#ff8fb8"];
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.1 + i * 0.13);
      flower(ctx, Math.cos(a) * 33, -62 + Math.sin(a) * 33, 6.8, cols[i], "#ffb300", 5);
    }
  }
  if (o.acc === "crown") {
    ctx.fillStyle = "#ffd36b";
    poly([[-13, -90], [-13, -104], [-6.5, -97], [0, -108], [6.5, -97], [13, -104], [13, -90]]);
    ctx.fillStyle = "#ff4d79"; ell(0, -94, 2.4, 2.4);
    ctx.fillStyle = "#4fd8ff"; ell(-8, -95, 1.8, 1.8); ell(8, -95, 1.8, 1.8);
  }

  ctx.restore();
}

/* ───────── scene helpers ───────── */

function sortCouple(d, a1, a2) {
  const senderIsGirl = String(d.gender1 || "").toUpperCase() !== "MALE";
  return {
    imgGirl: senderIsGirl ? a1 : a2,
    imgBoy: senderIsGirl ? a2 : a1,
    nameGirl: senderIsGirl ? d.name1 : d.name2,
    nameBoy: senderIsGirl ? d.name2 : d.name1
  };
}

/**
 * Draws an anime couple holding a love-percent heart, with avatars + name tags.
 * o: girl{}, boy{} looks, scale, feetY, gx, bx, avatars("bubble"|"corner"|"none"), corners[[x,y],[x,y]],
 *    heartFill, heartGlow, names(true/false)
 */
function drawCouple(ctx, d, a1, a2, o = {}) {
  const c = sortCouple(d, a1, a2);
  const s = o.scale || 200;
  const fy = o.feetY || 455;
  const gx = o.gx || 345;
  const bx = o.bx || 555;
  const hx = (gx + bx) / 2;
  const hy = fy - s * 0.62;
  const hs = o.heartSize || s * 0.42;

  anime(ctx, gx, fy, s, { ...lookGirl(o.girl), heartSide: 1, arm: { x: hx - hs * 0.5, y: hy + hs * 0.12 } });
  anime(ctx, bx, fy, s, { ...lookBoy(o.boy), heartSide: -1, arm: { x: hx + hs * 0.5, y: hy + hs * 0.12 } });
  pctHeart(ctx, hx, hy, hs, d.pct, o.heartFill || lin(ctx, 0, hy - hs / 2, 0, hy + hs / 2, [[0, "#ff8fb8"], [1, "#ff3d78"]]), o.heartGlow || "#ff4d79");
  sparkle(ctx, hx - 32, hy - 62, 9, "#fff"); sparkle(ctx, hx + 36, hy - 70, 7, "#ffe36e"); sparkle(ctx, hx, hy + 60, 6, "#fff");

  const mode = o.avatars || "bubble";
  if (mode === "bubble") {
    const br = o.bubbleR || 66;
    const by = o.bubbleY || fy - s * 1.52;
    [[gx, c.imgGirl, "#ff8fb8"], [bx, c.imgBoy, "#5b8cff"]].forEach(([cx, img, ring]) => {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.moveTo(cx - 18, by + br); ctx.lineTo(cx, by + br + 34); ctx.lineTo(cx + 18, by + br); ctx.closePath(); ctx.fill();
      ringAvatar(ctx, img, cx, by, br, { ring: "#fff", ringW: 8, ring2: ring, glow: ring, glowBlur: 18 });
    });
  } else if (mode === "corner") {
    const pos = o.corners || [[95, 95], [805, 95]];
    ringAvatar(ctx, c.imgGirl, pos[0][0], pos[0][1], 62, { ring: "#fff", ringW: 8, ring2: "#ff8fb8", glow: "#ff8fb8", glowBlur: 18 });
    ringAvatar(ctx, c.imgBoy, pos[1][0], pos[1][1], 62, { ring: "#fff", ringW: 8, ring2: "#5b8cff", glow: "#5b8cff", glowBlur: 18 });
  }

  if (o.names !== false) {
    const ny = fy + 27;
    pill(ctx, gx, ny, 210, 26, "#fff", 0.92);
    pill(ctx, bx, ny, 210, 26, "#fff", 0.92);
    txt(ctx, cleanName(c.nameGirl), gx, ny, { size: 16, color: "#d63a74", maxW: 190 });
    txt(ctx, cleanName(c.nameBoy), bx, ny, { size: 16, color: "#3a5bd6", maxW: 190 });
  }
  return { gx, bx, hx, hy, fy, s, c };
}

function lantern(ctx, x, y, s, color) {
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = 22;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.7, s, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(x - s * 0.35, y - s - 4, s * 0.7, 5);
  ctx.fillRect(x - s * 0.35, y + s - 1, s * 0.7, 5);
  ctx.strokeStyle = "rgba(120,40,0,.45)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.3, s, 0, 0, TAU); ctx.stroke();
}

function firework(ctx, x, y, r, color) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  ctx.shadowColor = color; ctx.shadowBlur = 14;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    const k = i % 2 ? 0.8 : 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35);
    ctx.lineTo(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1, 2.4, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function dove(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "rgba(0,0,0,.18)"; ctx.shadowBlur = 6;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.45, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-s * 0.2, -s * 0.55, s * 0.55, s * 0.28, -0.7, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.95, -s * 0.2, s * 0.3, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffb36b";
  ctx.beginPath(); ctx.moveTo(s * 1.2, -s * 0.22); ctx.lineTo(s * 1.5, -s * 0.15); ctx.lineTo(s * 1.2, -s * 0.08); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function gull(ctx, x, y, s, color = "#fff") {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, s * 0.18); ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.7, x, y);
  ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.7, x + s, y);
  ctx.stroke();
  ctx.restore();
}

function leaf(ctx, x, y, s, rot, color, alpha = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  starPath(ctx, 0, 0, s, 5, 0.55); ctx.fill();
  ctx.strokeStyle = "rgba(90,30,0,.5)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, s * 0.9); ctx.lineTo(0, -s * 0.5); ctx.stroke();
  ctx.restore();
}

function paw(ctx, x, y, s, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.25, s * 0.5, s * 0.4, 0, 0, TAU); ctx.fill();
  [[-0.55, -0.15], [0.55, -0.15], [-0.22, -0.55], [0.22, -0.55]].forEach(([dx, dy]) => {
    ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s, s * 0.18, s * 0.24, 0, 0, TAU); ctx.fill();
  });
  ctx.restore();
}

function iceCream(ctx, x, y, s, c1, c2) {
  ctx.fillStyle = "#e8b36a";
  ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x + s * 0.5, y); ctx.lineTo(x, y + s * 1.7); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(150,90,30,.45)"; ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * s * 0.2, y); ctx.lineTo(x + i * s * 0.05, y + s * 1.6); ctx.stroke(); }
  for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(x - s * 0.5 + j * s * 0.12, y + j * s * 0.38); ctx.lineTo(x + s * 0.5 - j * s * 0.12, y + j * s * 0.38); ctx.stroke(); }
  ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y - s * 0.05, s * 0.58, 0, TAU); ctx.fill();
  ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(x, y - s * 0.62, s * 0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = "#ff3d5a"; ctx.beginPath(); ctx.arc(x, y - s * 1.2, s * 0.16, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#3a8a3a"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x, y - s * 1.32); ctx.quadraticCurveTo(x + s * 0.1, y - s * 1.6, x + s * 0.3, y - s * 1.6); ctx.stroke();
}

function chatBubble(ctx, text, x, y, side, fill, color, size = 24) {
  ctx.save();
  ctx.font = `bold ${size}px sans-serif`;
  const w = Math.min(560, ctx.measureText(text).width + 46);
  const h = size + 30;
  const bx = side === "left" ? x : x - w;
  ctx.shadowColor = "rgba(0,0,0,.14)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  rr(ctx, bx, y, w, h, h / 2); ctx.fillStyle = fill; ctx.fill();
  ctx.restore();
  txt(ctx, text, bx + w / 2, y + h / 2, { size, color, maxW: w - 30 });
}

/* ═══════════════════════ DESIGNS ═══════════════════════
   Each design gets: { id1,id2,name1,name2,senderID,pct,gender1,gender2,usersData }
   and returns { body, mentions?, attachment, cleanup }                           */

const designs = [
  /* ──────────────── 1. Cupid Circle (original: pair) ──────────────── */
  async function cupidCircle(d) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext("2d");
    const bg = await loadFromUrl("https://i.postimg.cc/pdv5dFVX/611905695-855684437229208-8377464727643815456-n.png");
    ctx.drawImage(bg, 0, 0, 800, 400);
    const [a1, a2] = await loadAvatars(d);
    drawCircleImage(ctx, a1, 471, 124, 88);
    drawCircleImage(ctx, a2, 673, 276, 88);

    const file = cachePath("pair5_d1", d.senderID);
    fs.writeFileSync(file, canvas.toBuffer("image/png"));
    const p = randInt(70, 99);
    const messages = [
      `💕 Perfect Match Found! 💕\n━━━━━━━━━━━━━━━━━\n👤 ${d.name1}\n💖 ${p}% Compatible 💖\n👤 ${d.name2}\n━━━━━━━━━━━━━━━━━\n✨ Love is in the air! ✨`,
      `💘 Cupid's Arrow Has Struck! 💘\n━━━━━━━━━━━━━━━━━\n${d.name1} 💞 ${d.name2}\n\n💯 Match Score: ${p}%\n━━━━━━━━━━━━━━━━━\n🌹 A beautiful connection! 🌹`,
      `💓 Soulmate Alert! 💓\n━━━━━━━━━━━━━━━━━\n${d.name1}\n❤️ & ❤️\n${d.name2}\n\n✨ Compatibility: ${p}% ✨\n━━━━━━━━━━━━━━━━━\nDestiny has spoken! 💫`,
      `🌸 Love Blossoms! 🌸\n━━━━━━━━━━━━━━━━━\n💝 ${d.name1}\n💕 perfectly matched with\n💝 ${d.name2}\n\n🎯 ${p}% Love Score!\n━━━━━━━━━━━━━━━━━`
    ];
    return { body: rand(messages), attachment: fs.createReadStream(file), cleanup: [file] };
  },

  /* ──────────────── 2. Love Pair Alert banner (original: pr) ──────────────── */
  async function loveAlert(d) {
    const bgImage = await loadFromUrl("https://i.ibb.co/RBRLmRt/Pics-Art-05-14-10-47-00.jpg");
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bgImage, 0, 0, bgImage.width, bgImage.height);
    ctx.drawImage(await loadFromUrl(avatarUrl(d.id1, 720)), 111, 175, 330, 330);
    ctx.drawImage(await loadFromUrl(avatarUrl(d.id2, 720)), 1018, 173, 330, 330);

    const file = cachePath("pair5_d2", d.senderID);
    fs.writeFileSync(file, canvas.toBuffer("image/png"));

    const rand1 = randInt(1, 100);
    const crazy = ["0", "-1", "99,99", "-99", "-100", "101", "0,01"];
    const percentage = rand([rand1, rand1, rand1, rand(crazy), rand1, rand1, rand1, rand1, rand1]);
    const notes = [
      "𝐘𝐨𝐮𝐫 𝐥𝐨𝐯𝐞 𝐬𝐭𝐨𝐫𝐲 𝐣𝐮𝐬𝐭 𝐛𝐞𝐠𝐚𝐧, 𝐚𝐧𝐝 𝐢𝐭'𝐬 𝐛𝐞𝐚𝐮𝐭𝐢𝐟𝐮𝐥. 🌹",
      "𝐃𝐞𝐬𝐭𝐢𝐧𝐲 𝐜𝐡𝐨𝐬𝐞 𝐲𝐨𝐮 𝐭𝐰𝐨 𝐭𝐨 𝐛𝐞 𝐭𝐨𝐠𝐞𝐭𝐡𝐞𝐫. 💞",
      "𝐘𝐨𝐮𝐫 𝐡𝐞𝐚𝐫𝐭𝐬 𝐟𝐨𝐮𝐧𝐝 𝐭𝐡𝐞𝐢𝐫 𝐦𝐢𝐫𝐫𝐨𝐫 𝐢𝐧 𝐞𝐚𝐜𝐡 𝐨𝐭𝐡𝐞𝐫. 💖",
      "𝐓𝐰𝐨 𝐬𝐨𝐮𝐥𝐬, 𝐨𝐧𝐞 𝐩𝐚𝐭𝐡. ✨",
      "𝐋𝐨𝐯𝐞 𝐟𝐢𝐧𝐝𝐬 𝐢𝐭𝐬 𝐰𝐚𝐲—𝐚𝐧𝐝 𝐢𝐭 𝐣𝐮𝐬𝐭 𝐝𝐢𝐝. 🔗",
      "𝐘𝐨𝐮𝐫 𝐥𝐨𝐯𝐞 𝐬𝐩𝐚𝐫𝐤𝐬 𝐥𝐢𝐤𝐞 𝐬𝐭𝐚𝐫𝐬 𝐢𝐧 𝐭𝐡𝐞 𝐧𝐢𝐠𝐡𝐭. 🌟",
      "𝐓𝐡𝐞 𝐮𝐧𝐢𝐯𝐞𝐫𝐬𝐞 𝐜𝐨𝐧𝐬𝐩𝐢𝐫𝐞𝐝 𝐭𝐨 𝐛𝐫𝐢𝐧𝐠 𝐲𝐨𝐮 𝐭𝐨𝐠𝐞𝐭𝐡𝐞𝐫. 🌌",
      "𝐓𝐰𝐨 𝐡𝐞𝐚𝐫𝐭𝐛𝐞𝐚𝐭𝐬, 𝐨𝐧𝐞 𝐫𝐡𝐲𝐭𝐡𝐦. 🫀",
      "𝐓𝐨𝐠𝐞𝐭𝐡𝐞𝐫, 𝐲𝐨𝐮 𝐦𝐚𝐤𝐞 𝐚 𝐦𝐚𝐠𝐢𝐜𝐚𝐥 𝐰𝐡𝐨𝐥𝐞. ✨"
    ];
    const body =
      `💞 𝐋𝐨𝐯𝐞 𝐏𝐚𝐢𝐫 𝐀𝐥𝐞𝐫𝐭 💞\n\n` +
      `💑 Congratulations @${d.name1} & @${d.name2}\n` +
      `💌 ${rand(notes)}\n` +
      `🔗 Love Connection: ${percentage}% 💖`;
    return {
      body,
      mentions: [{ tag: `@${d.name1}`, id: d.id1 }, { tag: `@${d.name2}`, id: d.id2 }],
      attachment: fs.createReadStream(file),
      cleanup: [file]
    };
  },

  /* ──────────────── 3. Kawaii (original: pair3) ──────────────── */
  async function kawaii(d) {
    const base = await loadFromUrl("https://i.postimg.cc/nrgPFtDG/Picsart-25-08-12-20-22-41-970.png");
    const canvas = createCanvas(base.width, base.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(await loadFromUrl(avatarUrl(d.id1, 720)), 120, 170, 300, 300);
    ctx.drawImage(await loadFromUrl(avatarUrl(d.id2, 720)), canvas.width - 420, 170, 300, 300);

    const file = cachePath("pair5_d3", d.senderID);
    fs.writeFileSync(file, canvas.toBuffer("image/png"));

    const rd1 = randInt(1, 100);
    const cc = ["-𝟭", "𝟵𝟵.𝟵𝟵", "𝟭𝟵", "∞", "𝟭𝟬𝟭", "𝟬.𝟬𝟭"];
    const matchRate = rand(Array(5).fill(`${rd1}`).concat([rand(cc)], Array(4).fill(`${rd1}`)));
    const notes = [
      "𝗘𝘃𝗲𝗿𝘆 𝘁𝗶𝗺𝗲 𝗜 𝘀𝗲𝗲 𝘆𝗼𝘂, 𝗺𝘆 𝗵𝗲𝗮𝗿𝘁 𝘀𝗸𝗶𝗽𝘀 𝗮 𝗯𝗲𝗮𝘁.",
      "𝗬𝗼𝘂’𝗿𝗲 𝗺𝘆 𝘁𝗼𝗱𝗮𝘆 𝗮𝗻𝗱 𝗮𝗹𝗹 𝗼𝗳 𝗺𝘆 𝘁𝗼𝗺𝗼𝗿𝗿𝗼𝘄𝘀.",
      "𝗜𝗻 𝘆𝗼𝘂𝗿 𝘀𝗺𝗶𝗹𝗲, 𝗜 𝘀𝗲𝗲 𝘀𝗼𝗺𝗲𝘁𝗵𝗶𝗻𝗴 𝗺𝗼𝗿𝗲 𝗯𝗲𝗮𝘂𝘁𝗶𝗳𝘂𝗹 𝘁𝗵𝗮𝗻 𝘁𝗵𝗲 𝘀𝘁𝗮𝗿𝘀.",
      "𝗬𝗼𝘂 𝗺𝗮𝗸𝗲 𝗺𝘆 𝗵𝗲𝗮𝗿𝘁 𝗿𝗮𝗰𝗲 𝘄𝗶𝘁𝗵𝗼𝘂𝘁 𝗲𝘃𝗲𝗻 𝘁𝗿𝘆𝗶𝗻𝗴.",
      "𝗬𝗼𝘂𝗿 𝗲𝘆𝗲𝘀 𝗵𝗼𝗹𝗱 𝘁𝗵𝗲 𝗸𝗲𝘆 𝘁𝗼 𝗺𝘆 𝘀𝗼𝘂𝗹.",
      "𝗜 𝗱𝗶𝗱𝗻’𝘁 𝗰𝗵𝗼𝗼𝘀𝗲 𝘆𝗼𝘂, 𝗺𝘆 𝗵𝗲𝗮𝗿𝘁 𝗱𝗶𝗱.",
      "𝗪𝗶𝘁𝗵 𝘆𝗼𝘂, 𝗲𝘃𝗲𝗿𝘆 𝗺𝗼𝗺𝗲𝗻𝘁 𝗯𝗲𝗰𝗼𝗺𝗲𝘀 𝗮 𝗺𝗲𝗺𝗼𝗿𝘆.",
      "𝗬𝗼𝘂’𝗿𝗲 𝘁𝗵𝗲 𝗿𝗲𝗮𝘀𝗼𝗻 𝗜 𝗯𝗲𝗹𝗶𝗲𝘃𝗲 𝗶𝗻 𝗹𝗼𝘃𝗲."
    ];
    const body = `
🌸💞 *Cᴏɴɢʀᴀᴛs* 💞🌸
@${d.name1}  ＆ @${d.name2} ✨

💖 *Mᴀᴛᴄʜ Rᴀᴛᴇ:* ${matchRate}% 💖

🌷 𝓛𝓸𝓿𝓮𝓵𝔂 𝓝𝓸𝓽𝓮 🌷
❝ ${rand(notes)}❞

💫 𝒀𝒐𝒖 𝒂𝒓𝒆 𝒎𝒚 𝒔𝒖𝒏𝒔𝒉𝒊𝒏𝒆! 💫
`;
    return {
      body,
      mentions: [{ tag: `@${d.name1}`, id: d.id1 }, { tag: `@${d.name2}`, id: d.id2 }],
      attachment: fs.createReadStream(file),
      cleanup: [file]
    };
  },

  /* ──────────────── 4. Wish card (original: pair2) ──────────────── */
  async function wishCard(d) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext("2d");
    const bg = await loadFromUrl("https://i.postimg.cc/4xSzJ7SZ/Picsart-25-08-15-19-44-03-606.jpg");
    let a1, a2;
    try {
      a1 = await loadImage(await d.usersData.getAvatarUrl(d.id1));
      a2 = await loadImage(await d.usersData.getAvatarUrl(d.id2));
    } catch (e) {
      [a1, a2] = await loadAvatars(d);
    }
    ctx.drawImage(bg, 0, 0, 800, 400);
    ctx.drawImage(a1, 385, 40, 170, 170);
    ctx.drawImage(a2, 800 - 213, 190, 180, 170);

    const file = cachePath("pair5_d4", d.senderID);
    fs.writeFileSync(file, canvas.toBuffer("image/png"));
    const body =
      `🥰𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥 𝐩𝐚𝐢𝐫𝐢𝐧𝐠\n• ${d.name1} 🎀\n• ${d.name2} 🎀\n` +
      `💌 𝐖𝐢𝐬𝐡 𝐲𝐨𝐮 𝐭𝐰𝐨 𝐡𝐮𝐧𝐝𝐫𝐞𝐝 𝐲𝐞𝐚𝐫𝐬 𝐨𝐟 𝐡𝐚𝐩𝐩𝐢𝐧𝐞𝐬𝐬 💕\n\n` +
      `𝐋𝐨𝐯𝐞 𝐩𝐞𝐫𝐜𝐞𝐧𝐭𝐚𝐠𝐞: ${d.pct}% 💙`;
    return { body, attachment: fs.createReadStream(file), cleanup: [file] };
  },

  /* ──────────────── 5. API card style 1 (original: pair4) ──────────────── */
  async function apiCardOne(d) {
    const base = (await axios.get("https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json", { timeout: 20000 })).data.mahmud;
    const data = await fetchBuffer(`${base}/api/pair/mahmud?user1=${d.id1}&user2=${d.id2}&style=1`);
    const file = cachePath("pair5_d5", d.senderID);
    fs.writeFileSync(file, data);
    return {
      body: `💞 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥 𝐏𝐚𝐢𝐫𝐢𝐧𝐠\n• ${d.name1}\n• ${d.name2}\n\n𝐋𝐨𝐯𝐞 𝐏𝐞𝐫𝐜𝐞𝐧𝐭𝐚𝐠𝐞: ${d.pct}%`,
      attachment: fs.createReadStream(file),
      cleanup: [file]
    };
  },

  /* ──────────────── 6. API card style 5 (original: pair6) ──────────────── */
  async function apiCardFive(d) {
    const base = (await axios.get("https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json", { timeout: 20000 })).data.mahmud;
    const data = await fetchBuffer(`${base}/api/pair/mahmud?user1=${d.id1}&user2=${d.id2}&style=5`);
    const file = cachePath("pair5_d6", d.senderID);
    fs.writeFileSync(file, data);
    return {
      body: `💞 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥 𝐏𝐚𝐢𝐫𝐢𝐧𝐠\n• ${d.name1}\n• ${d.name2}\n\n𝐋𝐨𝐯𝐞 𝐏𝐞𝐫𝐜𝐞𝐧𝐭𝐚𝐠𝐞: ${d.pct}%`,
      attachment: fs.createReadStream(file),
      cleanup: [file]
    };
  },

  /* ──────────────── 7. Twin profile pictures (original: pair7) ──────────────── */
  async function twinPfp(d) {
    const base = (await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json", { timeout: 20000 })).data.mahmud;
    const { getStreamFromURL } = global.utils;
    const s1 = await getStreamFromURL(`${base}/api/pfp?mahmud=${d.id1}`);
    const s2 = await getStreamFromURL(`${base}/api/pfp?mahmud=${d.id2}`);
    return {
      body: `💞 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥 𝐏𝐚𝐢𝐫𝐢𝐧𝐠\n• ${d.name1}\n• ${d.name2}\n\n𝐋𝐨𝐯𝐞 𝐏𝐞𝐫𝐜𝐞𝐧𝐭𝐚𝐠𝐞: ${d.pct}%`,
      attachment: [s1, s2],
      cleanup: []
    };
  },

  /* ──────────────── 8. Sakura Anime ──────────────── */
  async function sakuraAnime(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#ff8fb8"], [0.5, "#ffc9de"], [1, "#fff2f8"]]);

    // big soft moon
    ctx.save();
    ctx.fillStyle = rad(ctx, 450, 250, 20, 210, [[0, "rgba(255,255,255,.9)"], [0.6, "rgba(255,255,255,.35)"], [1, "rgba(255,255,255,0)"]]);
    ctx.beginPath(); ctx.arc(450, 250, 210, 0, TAU); ctx.fill();
    ctx.restore();

    // blossom branches
    const branch = (sx, sy, ex, ey, cx, cy, dir) => {
      ctx.save();
      ctx.strokeStyle = "#7a4a3a";
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(sx + dir * 90, sy + 40); ctx.quadraticCurveTo(sx + dir * 120, sy + 80, sx + dir * 190, sy + 90); ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 26; i++) {
        const t = Math.random();
        const bx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex + randF(-30, 30);
        const by = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey + randF(-30, 40);
        flower(ctx, bx, by, randF(10, 20), rand(["#ffb7d1", "#ff9ec4", "#ffd0e2", "#fff"]), "#ffd54f", 5);
      }
    };
    branch(-10, 40, 260, 60, 120, 20, 1);
    branch(W + 10, 40, W - 260, 60, W - 120, 20, -1);

    // falling petals
    for (let i = 0; i < 70; i++) {
      petal(ctx, randF(0, W), randF(0, H), randF(5, 11), randF(0, TAU), rand(["#ff9ec4", "#ffb7d1", "#fff", "#ffc9de"]), randF(0.5, 0.95));
    }

    // avatars
    ringAvatar(ctx, a1, 250, 262, 118, { ring: "#fff", ringW: 10, ring2: "#ff7aa8", glow: "#ff7aa8", glowBlur: 30 });
    ringAvatar(ctx, a2, 650, 262, 118, { ring: "#fff", ringW: 10, ring2: "#ff7aa8", glow: "#ff7aa8", glowBlur: 30 });
    pctHeart(ctx, 450, 262, 105, d.pct, lin(ctx, 0, 200, 0, 330, [[0, "#ff8fb8"], [1, "#ff3d78"]]));
    [[392, 190, 16], [508, 196, 14], [400, 340, 12], [500, 338, 16]].forEach(([x, y, s]) => drawHeart(ctx, x, y, s, "#ff6f9f", { alpha: 0.9 }));

    // title + names
    txt(ctx, "SAKURA LOVE", 450, 52, { size: 40, color: "#fff", stroke: "#e0457b", strokeW: 8, family: "serif" });
    pill(ctx, 250, 432, 300, 40, "#fff", 0.92);
    pill(ctx, 650, 432, 300, 40, "#fff", 0.92);
    txt(ctx, cleanName(d.name1), 250, 432, { size: 22, color: "#d63a74", maxW: 270 });
    txt(ctx, cleanName(d.name2), 650, 432, { size: 22, color: "#d63a74", maxW: 270 });
    return finish(canvas, ctx, d, "d8", "Sakura Love");
  },

  /* ──────────────── 9. Neon Night ──────────────── */
  async function neonNight(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#06061a"], [0.6, "#1b0a3d"], [1, "#2d0b4e"]]);

    // synthwave sun
    ctx.save();
    ctx.fillStyle = lin(ctx, 0, 70, 0, 330, [[0, "#ffe66d"], [0.5, "#ff5ea8"], [1, "#a63cff"]]);
    ctx.beginPath(); ctx.arc(450, 200, 135, 0, TAU); ctx.fill();
    ctx.fillStyle = "#1b0a3d";
    for (let i = 0; i < 7; i++) ctx.fillRect(300, 215 + i * 18, 300, 3 + i * 1.6);
    ctx.restore();

    // perspective grid
    ctx.save();
    ctx.strokeStyle = "rgba(255,70,200,.55)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#ff2bd6"; ctx.shadowBlur = 8;
    for (let i = -14; i <= 14; i++) {
      ctx.beginPath(); ctx.moveTo(450 + i * 12, 330); ctx.lineTo(450 + i * 120, H); ctx.stroke();
    }
    for (let j = 0; j < 8; j++) {
      const y = 330 + Math.pow(j / 7, 2) * 170;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    // stars
    for (let i = 0; i < 40; i++) sparkle(ctx, randF(0, W), randF(0, 200), randF(2, 5), "#fff", randF(0.4, 1));

    // neon avatars
    ringAvatar(ctx, a1, 215, 230, 100, { ring: "#00f0ff", ringW: 8, glow: "#00f0ff", glowBlur: 40 });
    ringAvatar(ctx, a2, 685, 230, 100, { ring: "#ff2bd6", ringW: 8, glow: "#ff2bd6", glowBlur: 40 });
    pctHeart(ctx, 450, 215, 100, d.pct, "#ff2bd6", "#ff2bd6");

    txt(ctx, "NEON LOVE", 450, 48, { size: 42, color: "#fff", shadow: "#00f0ff", blur: 25, stroke: "#00f0ff", strokeW: 2 });
    txt(ctx, cleanName(d.name1), 215, 372, { size: 24, color: "#00f0ff", shadow: "#00f0ff", blur: 16, maxW: 260 });
    txt(ctx, cleanName(d.name2), 685, 372, { size: 24, color: "#ff7ae8", shadow: "#ff2bd6", blur: 16, maxW: 260 });
    return finish(canvas, ctx, d, "d9", "Neon Love");
  },

  /* ──────────────── 10. Heart Frames ──────────────── */
  async function heartFrames(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    ctx.fillStyle = rad(ctx, 450, 250, 40, 620, [[0, "#ff7aa8"], [0.6, "#e0305f"], [1, "#8c1238"]]);
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 38; i++) {
      drawHeart(ctx, randF(0, W), randF(0, H), randF(14, 44), rand(["#ff9ebd", "#ffd1de", "#ff5f8d", "#fff"]), { alpha: randF(0.12, 0.4), rot: randF(-0.5, 0.5) });
    }
    for (let i = 0; i < 25; i++) sparkle(ctx, randF(0, W), randF(0, H), randF(4, 9), "#fff", randF(0.5, 0.9));

    heartAvatar(ctx, a1, 262, 245, 250, { ring: "#fff", glow: "#fff", glowBlur: 25 });
    heartAvatar(ctx, a2, 638, 245, 250, { ring: "#fff", glow: "#fff", glowBlur: 25 });

    ctx.save();
    ctx.setLineDash([2, 12]);
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(380, 250); ctx.lineTo(520, 250); ctx.stroke();
    ctx.restore();
    drawHeart(ctx, 450, 250, 80, "#fff", { glow: "#fff", glowBlur: 20 });
    txt(ctx, `${d.pct}%`, 450, 252, { size: 22, color: "#e0305f" });

    pill(ctx, 450, 56, 360, 50, "#fff", 0.95);
    txt(ctx, "PERFECT MATCH", 450, 56, { size: 28, color: "#e0305f" });
    pill(ctx, 262, 428, 290, 38, "#fff", 0.95);
    pill(ctx, 638, 428, 290, 38, "#fff", 0.95);
    txt(ctx, cleanName(d.name1), 262, 428, { size: 21, color: "#c4234f", maxW: 260 });
    txt(ctx, cleanName(d.name2), 638, 428, { size: 21, color: "#c4234f", maxW: 260 });
    return finish(canvas, ctx, d, "d10", "Perfect Match");
  },

  /* ──────────────── 11. Galaxy Soulmates ──────────────── */
  async function galaxy(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    ctx.fillStyle = rad(ctx, 450, 250, 20, 650, [[0, "#1d1458"], [0.55, "#0b0830"], [1, "#03010c"]]);
    ctx.fillRect(0, 0, W, H);

    [[200, 120, 260, "rgba(160,80,255,.35)"], [720, 380, 280, "rgba(60,140,255,.3)"], [470, 250, 230, "rgba(255,80,170,.22)"]].forEach(([x, y, r, c]) => {
      ctx.fillStyle = rad(ctx, x, y, 0, r, [[0, c], [1, "rgba(0,0,0,0)"]]);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    });

    for (let i = 0; i < 230; i++) {
      ctx.fillStyle = `rgba(255,255,255,${randF(0.3, 1)})`;
      ctx.beginPath(); ctx.arc(randF(0, W), randF(0, H), randF(0.5, 2), 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 14; i++) sparkle(ctx, randF(0, W), randF(0, H), randF(5, 11), rand(["#fff", "#ffe9a8", "#bfe3ff"]), randF(0.6, 1));

    for (let i = 0; i < 3; i++) {
      const x = randF(100, 800), y = randF(20, 160);
      ctx.strokeStyle = lin(ctx, x, y, x - 110, y - 40, [[0, "rgba(255,255,255,.95)"], [1, "rgba(255,255,255,0)"]]);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 110, y - 40); ctx.stroke();
    }

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.2)";
    ctx.lineWidth = 2;
    [[240, 250, 150, 54, -0.35], [660, 250, 150, 54, 0.35]].forEach(([x, y, rx, ry, rot]) => {
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.stroke();
    });
    ctx.restore();

    const pts = [[345, 250], [385, 215], [425, 262], [475, 222], [515, 268], [555, 250]];
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.restore();
    pts.forEach(([x, y]) => sparkle(ctx, x, y, 7, "#fff"));

    ringAvatar(ctx, a1, 240, 250, 102, { ring: lin(ctx, 140, 150, 340, 350, [[0, "#9b7bff"], [1, "#4fd8ff"]]), ringW: 7, glow: "#8a6bff", glowBlur: 40 });
    ringAvatar(ctx, a2, 660, 250, 102, { ring: lin(ctx, 560, 150, 760, 350, [[0, "#ff7ad9"], [1, "#ffd36b"]]), ringW: 7, glow: "#ff7ad9", glowBlur: 40 });
    pctHeart(ctx, 450, 330, 86, d.pct, lin(ctx, 0, 290, 0, 370, [[0, "#ff7ad9"], [1, "#8a4bff"]]), "#c46bff");

    txt(ctx, "COSMIC SOULMATES", 450, 48, { size: 38, color: "#fff", shadow: "#a06bff", blur: 20 });
    txt(ctx, cleanName(d.name1), 240, 398, { size: 23, color: "#d9ccff", shadow: "#8a6bff", blur: 10, maxW: 270 });
    txt(ctx, cleanName(d.name2), 660, 398, { size: 23, color: "#ffd1f3", shadow: "#ff7ad9", blur: 10, maxW: 270 });
    return finish(canvas, ctx, d, "d11", "Cosmic Soulmates");
  },

  /* ──────────────── 12. Polaroid Memories ──────────────── */
  async function polaroid(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#fbeedd"], [1, "#f4d9c2"]]);
    ctx.fillStyle = "rgba(190,130,100,.18)";
    for (let x = 12; x < W; x += 30) for (let y = 12; y < H; y += 30) { ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); }

    for (let i = 0; i < 9; i++) drawHeart(ctx, randF(0, W), randF(0, H), randF(14, 30), rand(["#ff9ebd", "#ffb3c7", "#f48aa5"]), { alpha: 0.35, rot: randF(-0.5, 0.5) });
    flower(ctx, 50, 50, 26, "#ffb3c7", "#ffd54f"); flower(ctx, W - 50, 450, 26, "#c9a8ff", "#ffd54f");
    flower(ctx, W - 60, 60, 20, "#ffd38a", "#fff"); flower(ctx, 60, 440, 20, "#9fd8ff", "#fff");

    const card = (img, cx, cy, rot, name, tape) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.shadowColor = "rgba(80,40,20,.35)";
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = "#fff";
      ctx.fillRect(-140, -170, 280, 340);
      ctx.shadowColor = "transparent";
      ctx.drawImage(img, -120, -150, 240, 240);
      ctx.strokeStyle = "rgba(0,0,0,.08)";
      ctx.strokeRect(-120, -150, 240, 240);
      txt(ctx, cleanName(name, 20), 0, 128, { size: 26, color: "#5a3b34", family: "cursive", maxW: 240 });
      ctx.fillStyle = tape;
      ctx.globalAlpha = 0.8;
      ctx.save(); ctx.rotate(-0.12); ctx.fillRect(-45, -188, 90, 30); ctx.restore();
      ctx.restore();
    };
    card(a1, 255, 255, -0.1, d.name1, "#ffe08a");
    card(a2, 645, 245, 0.09, d.name2, "#ffb3d1");

    pctHeart(ctx, 450, 250, 120, d.pct, lin(ctx, 0, 190, 0, 310, [[0, "#ff7aa8"], [1, "#e0305f"]]), "#e0305f");
    txt(ctx, "OUR LITTLE MEMORY", 450, 36, { size: 26, color: "#8a5a50", family: "cursive" });
    return finish(canvas, ctx, d, "d12", "Polaroid Memories");
  },

  /* ──────────────── 13. Chibi Love (cartoon / anime couple) ──────────────── */
  async function chibiLove(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#8fd3ff"], [0.65, "#d9f1ff"], [1, "#ffe9f3"]]);
    ctx.fillStyle = rad(ctx, 790, 90, 10, 90, [[0, "#fff6b0"], [0.4, "#ffe36e"], [1, "rgba(255,227,110,0)"]]);
    ctx.beginPath(); ctx.arc(790, 90, 90, 0, TAU); ctx.fill();
    cloud(ctx, 110, 120, 42, "#fff", 0.95); cloud(ctx, 700, 190, 34, "#fff", 0.9); cloud(ctx, 460, 70, 28, "#fff", 0.8);

    ctx.fillStyle = "#8fe08a"; ctx.beginPath(); ctx.ellipse(160, 520, 340, 120, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#6fd079"; ctx.beginPath(); ctx.ellipse(720, 535, 420, 130, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#7ddc86"; ctx.beginPath(); ctx.ellipse(450, 560, 520, 120, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 26; i++) flower(ctx, randF(10, W - 10), randF(440, 495), randF(7, 12), rand(["#fff", "#ffd54f", "#ff8fb8", "#c9a8ff"]), "#ffb300");

    // left = girl, right = boy; each avatar follows its owner's gender
    const senderIsGirl = String(d.gender1 || "").toUpperCase() !== "MALE";
    const imgGirl = senderIsGirl ? a1 : a2;
    const imgBoy = senderIsGirl ? a2 : a1;
    const nameGirl = senderIsGirl ? d.name1 : d.name2;
    const nameBoy = senderIsGirl ? d.name2 : d.name1;

    chibi(ctx, 340, 455, 200, { type: "girl", hair: "#ff8ac2", eye: "#7a4bff", outfit: "#ff6fa8", ribbon: "#ffe36e", heartSide: 1, arm: { x: 418, y: 352 } });
    chibi(ctx, 560, 455, 200, { type: "boy", hair: "#3a3f8f", eye: "#2fa4ff", outfit: "#4d7cff", pants: "#2c3470", heartSide: -1, arm: { x: 482, y: 352 } });
    pctHeart(ctx, 450, 330, 84, d.pct, lin(ctx, 0, 285, 0, 375, [[0, "#ff8fb8"], [1, "#ff3d78"]]));
    sparkle(ctx, 420, 270, 9, "#fff"); sparkle(ctx, 485, 262, 7, "#ffe36e"); sparkle(ctx, 450, 392, 6, "#fff");

    const bubble = (img, cx, cy, ring) => {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.moveTo(cx - 18, cy + 66); ctx.lineTo(cx, cy + 100); ctx.lineTo(cx + 18, cy + 66); ctx.closePath(); ctx.fill();
      ringAvatar(ctx, img, cx, cy, 66, { ring: "#fff", ringW: 8, ring2: ring, glow: ring, glowBlur: 18 });
    };
    bubble(imgGirl, 340, 150, "#ff8fb8");
    bubble(imgBoy, 560, 150, "#5b8cff");

    txt(ctx, "CUTE COUPLE", 450, 40, { size: 36, color: "#fff", stroke: "#ff5f98", strokeW: 8, family: "serif" });
    pill(ctx, 340, 482, 210, 26, "#fff", 0.9);
    pill(ctx, 560, 482, 210, 26, "#fff", 0.9);
    txt(ctx, cleanName(nameGirl), 340, 482, { size: 16, color: "#d63a74", maxW: 190 });
    txt(ctx, cleanName(nameBoy), 560, 482, { size: 16, color: "#3a5bd6", maxW: 190 });
    return finish(canvas, ctx, d, "d13", "Cute Couple");
  },

  /* ──────────────── 14. Flower Garden ──────────────── */
  async function flowerGarden(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#bdeccb"], [0.55, "#f4fbc9"], [1, "#ffe8f0"]]);
    ctx.fillStyle = rad(ctx, 450, 60, 10, 380, [[0, "rgba(255,244,160,.85)"], [1, "rgba(255,244,160,0)"]]);
    ctx.fillRect(0, 0, W, H);

    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 20; i++) {
        const x = i * 48 + (row % 2) * 24 + randF(-6, 6);
        const y = 468 + row * 14 + randF(-4, 4);
        ctx.strokeStyle = "#4caf63"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + randF(-4, 4), H); ctx.stroke();
        flower(ctx, x, y, randF(14, 22), rand(["#ff8fb8", "#ffd54f", "#fff", "#c9a8ff", "#ff9a7a", "#8fd0ff"]), rand(["#ffb300", "#ff7043"]), rand([5, 6, 8]));
      }
    }

    const wreath = (cx, cy, r) => {
      for (let i = 0; i < 20; i++) {
        const a = ((i + 0.5) / 20) * TAU;
        ctx.fillStyle = "#59c26b";
        ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10), 9, 4, a, 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * TAU;
        flower(ctx, cx + Math.cos(a) * (r + 12), cy + Math.sin(a) * (r + 12), randF(11, 17), rand(["#ff8fb8", "#ffd54f", "#fff", "#c9a8ff", "#ffa6c9"]), "#ffb300", 5);
      }
    };
    wreath(255, 235, 100);
    wreath(645, 235, 100);
    drawCircleImage(ctx, a1, 255, 235, 100);
    drawCircleImage(ctx, a2, 645, 235, 100);

    flower(ctx, 450, 235, 78, "#ff8fb8", "#ff4d79", 8);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(450, 235, 34, 0, TAU); ctx.fill();
    txt(ctx, `${d.pct}%`, 450, 236, { size: 25, color: "#e0305f" });

    butterfly(ctx, 120, 90, 24, "#ff9ec4", "#ffd0e2", -0.3);
    butterfly(ctx, 790, 120, 26, "#8fd0ff", "#c9a8ff", 0.35);
    butterfly(ctx, 450, 95, 18, "#ffd54f", "#ffe9a8", 0.1);

    txt(ctx, "LOVE BLOOMS", 450, 44, { size: 40, color: "#fff", stroke: "#e0457b", strokeW: 8, family: "serif" });
    pill(ctx, 255, 392, 280, 36, "#fff", 0.92); pill(ctx, 645, 392, 280, 36, "#fff", 0.92);
    txt(ctx, cleanName(d.name1), 255, 392, { size: 20, color: "#c4234f", maxW: 250 });
    txt(ctx, cleanName(d.name2), 645, 392, { size: 20, color: "#c4234f", maxW: 250 });
    return finish(canvas, ctx, d, "d14", "Love Blooms");
  },

  /* ──────────────── 15. Royal Gold ──────────────── */
  async function royalGold(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#0a0a14"], [1, "#221a3a"]]);
    ctx.fillStyle = rad(ctx, 450, 250, 10, 460, [[0, "rgba(255,210,110,.18)"], [1, "rgba(255,210,110,0)"]]);
    ctx.fillRect(0, 0, W, H);
    const gold = lin(ctx, 0, 0, W, H, [[0, "#fff1b8"], [0.35, "#d9a93a"], [0.65, "#fff0b0"], [1, "#b8821f"]]);

    ctx.strokeStyle = gold; ctx.lineWidth = 6; rr(ctx, 16, 16, W - 32, H - 32, 14); ctx.stroke();
    ctx.lineWidth = 2; rr(ctx, 30, 30, W - 60, H - 60, 10); ctx.stroke();
    [[30, 30, 1, 1], [W - 30, 30, -1, 1], [30, H - 30, 1, -1], [W - 30, H - 30, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.fillStyle = gold;
      ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(46, 0); ctx.quadraticCurveTo(14, 14, 0, 46); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(54, 10, 5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(10, 54, 5, 0, TAU); ctx.fill();
      ctx.restore();
    });

    // crown
    ctx.save();
    ctx.shadowColor = "#ffd36b"; ctx.shadowBlur = 25;
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(390, 130); ctx.lineTo(380, 70); ctx.lineTo(420, 100); ctx.lineTo(450, 58);
    ctx.lineTo(480, 100); ctx.lineTo(520, 70); ctx.lineTo(510, 130); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = gold; rr(ctx, 388, 128, 124, 16, 5); ctx.fill();
    [[380, 70, "#ff4d79"], [450, 58, "#4fd8ff"], [520, 70, "#ff4d79"]].forEach(([x, y, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y - 2, 6, 0, TAU); ctx.fill(); });

    ringAvatar(ctx, a1, 245, 270, 105, { ring: gold, ringW: 10, glow: "#ffd36b", glowBlur: 30 });
    ringAvatar(ctx, a2, 655, 270, 105, { ring: gold, ringW: 10, glow: "#ffd36b", glowBlur: 30 });

    ctx.save();
    ctx.shadowColor = "#ffd36b"; ctx.shadowBlur = 25;
    starPath(ctx, 450, 270, 62, 12, 0.82); ctx.fillStyle = gold; ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#1a1228"; ctx.beginPath(); ctx.arc(450, 270, 46, 0, TAU); ctx.fill();
    txt(ctx, `${d.pct}%`, 450, 272, { size: 30, color: "#ffd98a" });

    txt(ctx, "ROYAL COUPLE", 450, 172, { size: 26, color: "#ffd98a", family: "serif", shadow: "#ffb300", blur: 10 });
    txt(ctx, cleanName(d.name1), 245, 410, { size: 24, color: "#ffe29a", family: "serif", maxW: 280 });
    txt(ctx, cleanName(d.name2), 655, 410, { size: 24, color: "#ffe29a", family: "serif", maxW: 280 });
    return finish(canvas, ctx, d, "d15", "Royal Couple");
  },

  /* ──────────────── 16. Sunset Beach ──────────────── */
  async function sunsetBeach(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, 310, [[0, "#5b2a86"], [0.45, "#ff5e7e"], [1, "#ffb067"]]);
    ctx.fillStyle = lin(ctx, 0, 300, 0, H, [[0, "#ff9a5a"], [0.3, "#c0457b"], [1, "#2b1055"]]);
    ctx.fillRect(0, 300, W, H - 300);

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, 300); ctx.clip();
    ctx.fillStyle = rad(ctx, 450, 300, 20, 220, [[0, "rgba(255,240,170,.9)"], [1, "rgba(255,200,120,0)"]]);
    ctx.beginPath(); ctx.arc(450, 300, 220, 0, TAU); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, 215, 0, 300, [[0, "#fff3a8"], [1, "#ff9a5a"]]);
    ctx.beginPath(); ctx.arc(450, 300, 88, 0, TAU); ctx.fill();
    ctx.restore();
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = `rgba(255,230,150,${0.7 - i * 0.07})`;
      const w = 150 - i * 12;
      rr(ctx, 450 - w / 2, 312 + i * 17, w, 5, 3); ctx.fill();
    }
    ctx.strokeStyle = "#3a1840"; ctx.lineWidth = 2.5;
    [[120, 70], [160, 100], [730, 60], [770, 95], [690, 100]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.quadraticCurveTo(x - 6, y - 9, x, y); ctx.quadraticCurveTo(x + 6, y - 9, x + 12, y); ctx.stroke();
    });
    const palm = (x, y, dir) => {
      ctx.strokeStyle = "#1c0b26"; ctx.lineWidth = 11; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, H); ctx.quadraticCurveTo(x + dir * 40, y + 120, x + dir * 20, y); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i - 2.5) * 0.6;
        ctx.save(); ctx.translate(x + dir * 20, y); ctx.rotate(a);
        ctx.fillStyle = "#1c0b26";
        ctx.beginPath(); ctx.ellipse(0, -48, 13, 58, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    };
    palm(55, 215, 1); palm(W - 55, 225, -1);

    ringAvatar(ctx, a1, 255, 170, 92, { ring: "#fff", ringW: 8, glow: "#ffd2a0", glowBlur: 28 });
    ringAvatar(ctx, a2, 645, 170, 92, { ring: "#fff", ringW: 8, glow: "#ffd2a0", glowBlur: 28 });
    pctHeart(ctx, 450, 160, 96, d.pct, lin(ctx, 0, 110, 0, 210, [[0, "#ff9ab8"], [1, "#e0305f"]]));

    txt(ctx, "SUNSET LOVE", 450, 38, { size: 36, color: "#fff", shadow: "#ff5e7e", blur: 18 });
    pill(ctx, 255, 392, 290, 36, "rgba(20,5,40,.55)"); pill(ctx, 645, 392, 290, 36, "rgba(20,5,40,.55)");
    txt(ctx, cleanName(d.name1), 255, 392, { size: 21, color: "#fff", maxW: 260 });
    txt(ctx, cleanName(d.name2), 645, 392, { size: 21, color: "#fff", maxW: 260 });
    return finish(canvas, ctx, d, "d16", "Sunset Love");
  },

  /* ──────────────── 17. Love Ticket ──────────────── */
  async function loveTicket(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#12b3a8"], [1, "#0b6e8a"]]);
    for (let i = 0; i < 40; i++) drawHeart(ctx, randF(0, W), randF(0, H), randF(14, 36), "#fff", { alpha: 0.08, rot: randF(-0.5, 0.5) });

    const tx = 40, ty = 70, tw = 820, th = 360, perf = 620;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 25; ctx.shadowOffsetY = 10;
    rr(ctx, tx, ty, tw, th, 26); ctx.fillStyle = lin(ctx, 0, ty, 0, ty + th, [[0, "#fff8e6"], [1, "#ffe9c2"]]); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#0e9aa0";
    [[perf, ty], [perf, ty + th], [tx, ty + th / 2], [tx + tw, ty + th / 2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 18, 0, TAU); ctx.fill(); });
    ctx.strokeStyle = "#d9a96a"; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(perf, ty + 22); ctx.lineTo(perf, ty + th - 22); ctx.stroke();
    ctx.setLineDash([]);

    pill(ctx, 330, ty + 40, 330, 40, "#e0305f");
    txt(ctx, "LOVE TICKET", 330, ty + 40, { size: 24, color: "#fff" });
    const sq = (img, x, y, s, c) => {
      ctx.save(); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 12;
      rr(ctx, x - 4, y - 4, s + 8, s + 8, 22); ctx.fillStyle = c; ctx.fill(); ctx.restore();
      ctx.save(); rr(ctx, x, y, s, s, 18); ctx.clip(); ctx.drawImage(img, x, y, s, s); ctx.restore();
    };
    sq(a1, 85, ty + 85, 165, "#ff8fb8");
    sq(a2, 410, ty + 85, 165, "#5b8cff");
    drawHeart(ctx, 330, ty + 170, 62, "#ff4d79", { glow: "#ff4d79", glowBlur: 15 });
    txt(ctx, cleanName(d.name1), 168, ty + 285, { size: 21, color: "#6b3a3a", maxW: 190 });
    txt(ctx, cleanName(d.name2), 492, ty + 285, { size: 21, color: "#6b3a3a", maxW: 190 });
    txt(ctx, "ADMIT TWO  •  FOREVER SEAT", 330, ty + 330, { size: 15, color: "#b07a4a" });

    txt(ctx, "MATCH", 740, ty + 62, { size: 22, color: "#b07a4a" });
    txt(ctx, `${d.pct}%`, 740, ty + 140, { size: 66, color: "#e0305f" });
    drawHeart(ctx, 740, ty + 205, 46, "#ff8fb8");
    ctx.fillStyle = "#4a2c2a";
    let bx = 665;
    while (bx < 815) { const bw = randInt(2, 6); ctx.fillRect(bx, ty + 255, bw, 62); bx += bw + randInt(2, 5); }
    return finish(canvas, ctx, d, "d17", "Love Ticket");
  },

  /* ──────────────── 18. Rainbow Dream ──────────────── */
  async function rainbowDream(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#9ad8ff"], [0.6, "#d6f0ff"], [1, "#fff0f7"]]);
    ["#ff5a5a", "#ff9a4d", "#ffe14d", "#6fdc6f", "#4db8ff", "#6c7bff", "#b36cff"].forEach((c, i) => {
      ctx.strokeStyle = c; ctx.lineWidth = 24; ctx.globalAlpha = 0.92;
      ctx.beginPath(); ctx.arc(450, 440, 400 - i * 24, Math.PI, TAU); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    cloud(ctx, 70, 440, 60, "#fff"); cloud(ctx, 830, 440, 60, "#fff");
    cloud(ctx, 300, 478, 50, "#fff"); cloud(ctx, 600, 478, 50, "#fff"); cloud(ctx, 450, 488, 55, "#fff");
    cloud(ctx, 120, 90, 32, "#fff", 0.9); cloud(ctx, 790, 70, 28, "#fff", 0.9);

    for (let i = 0; i < 22; i++) sparkle(ctx, randF(30, W - 30), randF(20, 400), randF(3, 8), rand(["#fff", "#ffe9a8", "#ffd1f3"]), randF(0.6, 1));

    ringAvatar(ctx, a1, 330, 295, 84, { ring: "#fff", ringW: 8, glow: "#9a7bff", glowBlur: 22 });
    ringAvatar(ctx, a2, 570, 295, 84, { ring: "#fff", ringW: 8, glow: "#ff7ab8", glowBlur: 22 });
    pctHeart(ctx, 450, 292, 80, d.pct, lin(ctx, 0, 250, 0, 335, [[0, "#ff8fb8"], [1, "#ff3d78"]]));

    txt(ctx, "RAINBOW DREAM", 450, 42, { size: 36, color: "#fff", stroke: "#6c7bff", strokeW: 8, family: "serif" });
    txt(ctx, cleanName(d.name1), 330, 413, { size: 20, color: "#5a46c4", maxW: 200 });
    txt(ctx, cleanName(d.name2), 570, 413, { size: 20, color: "#c4467d", maxW: 200 });
    return finish(canvas, ctx, d, "d18", "Rainbow Dream");
  },

  /* ──────────────── 19. Winter Snow ──────────────── */
  async function winterSnow(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#14275e"], [0.6, "#2f5ab0"], [1, "#a8c8ff"]]);
    for (let i = 0; i < 60; i++) sparkle(ctx, randF(0, W), randF(0, 260), randF(2, 5), "#fff", randF(0.4, 0.9));

    ctx.fillStyle = "#eef5ff"; ctx.beginPath(); ctx.ellipse(180, 520, 400, 110, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(700, 530, 460, 120, 0, 0, TAU); ctx.fill();

    ctx.strokeStyle = "#1a1a2a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.quadraticCurveTo(W / 2, 90, W, 20); ctx.stroke();
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const x = t * W;
      const y = (1 - t) * (1 - t) * 20 + 2 * (1 - t) * t * 90 + t * t * 20 + 10;
      const c = rand(["#ff5a5a", "#ffe14d", "#6fdc6f", "#4db8ff", "#ff7ad9"]);
      ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 16; ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(x, y, 6, 9, 0, 0, TAU); ctx.fill(); ctx.restore();
    }

    const ornament = (img, cx, cy, r, c) => {
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, 55); ctx.lineTo(cx, cy - r - 22); ctx.stroke();
      ctx.fillStyle = "#ffd36b"; rr(ctx, cx - 14, cy - r - 24, 28, 18, 4); ctx.fill();
      ringAvatar(ctx, img, cx, cy, r, { ring: c, ringW: 9, ring2: "#fff", glow: c, glowBlur: 26 });
    };
    ornament(a1, 255, 245, 100, "#ff5a6e");
    ornament(a2, 645, 245, 100, "#3ec9a0");

    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${randF(0.5, 0.95)})`;
      ctx.beginPath(); ctx.arc(randF(0, W), randF(0, H), randF(1.5, 4.5), 0, TAU); ctx.fill();
    }
    [[110, 160], [790, 170], [450, 120], [80, 330], [830, 340]].forEach(([x, y]) => {
      ctx.save(); ctx.translate(x, y); ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.moveTo(0, -12); ctx.lineTo(6, -18); ctx.moveTo(0, -12); ctx.lineTo(-6, -18); ctx.stroke(); }
      ctx.restore();
    });

    pctHeart(ctx, 450, 262, 100, d.pct, lin(ctx, 0, 210, 0, 315, [[0, "#ff8fb8"], [1, "#e0305f"]]));
    txt(ctx, "WINTER LOVE", 450, 458, { size: 34, color: "#fff", stroke: "#2f5ab0", strokeW: 7, family: "serif" });
    txt(ctx, cleanName(d.name1), 255, 392, { size: 22, color: "#fff", stroke: "rgba(20,39,94,.8)", strokeW: 5, maxW: 270 });
    txt(ctx, cleanName(d.name2), 645, 392, { size: 22, color: "#fff", stroke: "rgba(20,39,94,.8)", strokeW: 5, maxW: 270 });
    return finish(canvas, ctx, d, "d19", "Winter Love");
  },

  /* ──────────────── 20. Anime Manga Panels ──────────────── */
  async function mangaPanels(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    ctx.fillStyle = "#fff8ef"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,90,140,.35)";
    for (let y = 8; y < H; y += 16) for (let x = ((y / 16) % 2) * 8; x < W; x += 16) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill(); }

    const outline = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
    const panel = (pts, img, ix, size, color) => {
      ctx.save();
      outline(pts); ctx.fillStyle = color; ctx.fill(); ctx.clip();
      ctx.drawImage(img, ix, 40, size, size);
      ctx.restore();
      ctx.save();
      outline(pts); ctx.lineWidth = 8; ctx.strokeStyle = "#1a1a1a"; ctx.lineJoin = "miter"; ctx.stroke();
      ctx.restore();
    };
    panel([[30, 70], [490, 70], [410, 470], [30, 470]], a1, 30, 440, "#ffd1e3");
    panel([[510, 70], [870, 70], [870, 470], [430, 470]], a2, 430, 440, "#cfe6ff");

    ctx.save();
    ctx.translate(450, 270);
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * TAU + randF(-0.03, 0.03);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 120, Math.sin(a) * 120); ctx.lineTo(Math.cos(a) * randF(160, 230), Math.sin(a) * randF(160, 230)); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
    starPath(ctx, 450, 270, 118, 16, 0.68, 0); ctx.fillStyle = "#ffe14d"; ctx.fill();
    ctx.restore();
    starPath(ctx, 450, 270, 118, 16, 0.68, 0); ctx.lineWidth = 6; ctx.strokeStyle = "#1a1a1a"; ctx.lineJoin = "round"; ctx.stroke();
    txt(ctx, "LOVE!", 450, 245, { size: 44, color: "#e0305f", stroke: "#1a1a1a", strokeW: 8, family: "Impact, sans-serif" });
    txt(ctx, `${d.pct}%`, 450, 298, { size: 50, color: "#fff", stroke: "#1a1a1a", strokeW: 9, family: "Impact, sans-serif" });

    ctx.save();
    ctx.translate(450, 38); ctx.transform(1, 0, -0.18, 1, 0, 0);
    ctx.fillStyle = "#e0305f"; ctx.fillRect(-260, -26, 520, 52);
    ctx.lineWidth = 5; ctx.strokeStyle = "#1a1a1a"; ctx.strokeRect(-260, -26, 520, 52);
    ctx.restore();
    txt(ctx, "MATCH FOUND!!", 450, 40, { size: 32, color: "#fff", stroke: "#1a1a1a", strokeW: 6, family: "Impact, sans-serif" });

    const tag = (x, y, t, c) => {
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 4;
      rr(ctx, x - 130, y - 18, 260, 36, 6); ctx.fill(); ctx.stroke();
      txt(ctx, cleanName(t), x, y, { size: 19, color: c, maxW: 240 });
    };
    tag(215, 440, d.name1, "#d63a74");
    tag(675, 440, d.name2, "#2f5bd6");
    return finish(canvas, ctx, d, "d20", "Match Found");
  }
];

/* ═══════════════════════ MORE DESIGNS (anime + modern) ═══════════════════════ */

const designsMore = [
  /* ──────────────── 21. School Rooftop (anime) ──────────────── */
  async function schoolRooftop(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#6f9bff"], [0.5, "#ffb3c6"], [1, "#ffd9a0"]]);
    ctx.fillStyle = rad(ctx, 450, 400, 10, 340, [[0, "rgba(255,244,200,.9)"], [1, "rgba(255,244,200,0)"]]);
    ctx.fillRect(0, 0, W, H);
    cloud(ctx, 120, 120, 40, "#fff", 0.85); cloud(ctx, 770, 160, 34, "#fff", 0.8); cloud(ctx, 590, 62, 26, "#fff", 0.7);

    ctx.fillStyle = "rgba(96,72,150,.55)";
    for (let i = 0; i < 15; i++) { const h = randInt(60, 170); ctx.fillRect(i * 62, 440 - h, 54, h); }
    ctx.fillStyle = "#d6d9e4"; ctx.fillRect(0, 440, W, 60);
    ctx.strokeStyle = "rgba(0,0,0,.08)"; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * 80, 440); ctx.lineTo(i * 80 - 30, 500); ctx.stroke(); }

    ctx.strokeStyle = "rgba(58,58,88,.85)"; ctx.lineWidth = 3;
    for (let x = 0; x <= W; x += 28) { ctx.beginPath(); ctx.moveTo(x, 350); ctx.lineTo(x, 440); ctx.stroke(); }
    ctx.lineWidth = 5;
    [360, 420].forEach((y) => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });

    for (let i = 0; i < 28; i++) petal(ctx, randF(0, W), randF(0, H), randF(5, 10), randF(0, TAU), rand(["#ff9ec4", "#ffb7d1", "#fff"]), randF(0.5, 0.9));

    drawCouple(ctx, d, a1, a2, {
      girl: { outfit: "uniform", main: "#2f4a8f", accent: "#ff4d79", acc: "ribbon" },
      boy: { outfit: "uniform", main: "#2b3558", accent: "#e0455b" }
    });
    for (let i = 0; i < 12; i++) petal(ctx, randF(0, W), randF(0, H), randF(6, 11), randF(0, TAU), "#ffb7d1", 0.9);
    txt(ctx, "SCHOOL LOVE", 450, 40, { size: 36, color: "#fff", stroke: "#e0457b", strokeW: 8, family: "serif" });
    return finish(canvas, ctx, d, "d21", "School Love");
  },

  /* ──────────────── 22. Festival Night (kimono) ──────────────── */
  async function festivalNight(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#0b1033"], [0.6, "#2b1a5c"], [1, "#5b2a6e"]]);
    for (let i = 0; i < 60; i++) sparkle(ctx, randF(0, W), randF(0, 300), randF(1.5, 4), "#fff", randF(0.4, 1));
    firework(ctx, 150, 170, 85, "#ff6fa8"); firework(ctx, 760, 150, 95, "#ffd36b"); firework(ctx, 450, 120, 66, "#6fd8ff");

    ctx.fillStyle = lin(ctx, 0, 430, 0, H, [[0, "#6b2d5c"], [1, "#2a0f3a"]]);
    ctx.fillRect(0, 440, W, 60);
    ctx.strokeStyle = "rgba(255,220,180,.7)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 28); ctx.quadraticCurveTo(450, 100, W, 28); ctx.stroke();
    [[40, 0.1], [110, 0.2], [190, 0.3], [450, 0.5], [710, 0.7], [790, 0.8], [860, 0.9]].forEach(([x, t], i) => {
      const y = (1 - t) * (1 - t) * 28 + 2 * (1 - t) * t * 100 + t * t * 28 + 26;
      lantern(ctx, x, y, 22, rand(["#ff4d4d", "#ff9a3d", "#ffc94d"]));
    });
    for (let i = 0; i < 16; i++) {
      ctx.save(); ctx.shadowColor = "#ffd36b"; ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffe9a8"; ctx.beginPath(); ctx.arc(randF(0, W), randF(330, 440), randF(1.5, 3), 0, TAU); ctx.fill(); ctx.restore();
    }

    drawCouple(ctx, d, a1, a2, {
      girl: { outfit: "kimono", main: "#ff6fa8", accent: "#ffd36b", hairStyle: "bun", acc: "flowercrown" },
      boy: { outfit: "kimono", main: "#2a3f8f", accent: "#ffd36b" }
    });
    txt(ctx, "FESTIVAL LOVE", 450, 462, { size: 26, color: "#ffe9a8", shadow: "#ff9a3d", blur: 12, family: "serif" });
    return finish(canvas, ctx, d, "d22", "Festival Love");
  },

  /* ──────────────── 23. Wedding Day (anime) ──────────────── */
  async function weddingDay(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#fff1f5"], [0.6, "#ffe0ea"], [1, "#fff7e0"]]);
    ctx.fillStyle = rad(ctx, 450, 250, 10, 420, [[0, "rgba(255,255,255,.9)"], [1, "rgba(255,255,255,0)"]]);
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(450, 560, 640, 150, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffe3ec"; ctx.beginPath(); ctx.ellipse(450, 585, 560, 130, 0, 0, TAU); ctx.fill();

    // floral arch
    for (let i = 0; i < 46; i++) {
      const a = Math.PI + (i / 45) * Math.PI;
      const ax = 450 + Math.cos(a) * 340, ay = 300 + Math.sin(a) * 235;
      ctx.fillStyle = "#6fcf86"; ctx.beginPath(); ctx.ellipse(ax + randF(-8, 8), ay + randF(-8, 8), 14, 6, a, 0, TAU); ctx.fill();
      flower(ctx, ax + randF(-6, 6), ay + randF(-6, 6), randF(13, 21), rand(["#ff8fb8", "#fff", "#ffd0e2", "#ffb3c7", "#c9a8ff"]), "#ffd54f", rand([5, 6]));
    }
    for (let i = 0; i < 40; i++) petal(ctx, randF(0, W), randF(0, H), randF(5, 10), randF(0, TAU), rand(["#ffb7d1", "#fff", "#ff9ec4"]), randF(0.5, 0.9));
    dove(ctx, 110, 130, 18); dove(ctx, 790, 100, 16); dove(ctx, 840, 200, 12);

    drawCouple(ctx, d, a1, a2, {
      girl: { outfit: "wedding", accent: "#ff8fb8", acc: "flowercrown", hairStyle: "long" },
      boy: { outfit: "wedding", main: "#16161f", accent: "#e0305f" },
      heartFill: lin(ctx, 0, 290, 0, 375, [[0, "#ff8fb8"], [1, "#e0305f"]])
    });
    txt(ctx, "WEDDING DAY", 450, 36, { size: 34, color: "#fff", stroke: "#e0457b", strokeW: 8, family: "serif" });
    return finish(canvas, ctx, d, "d23", "Wedding Day");
  },

  /* ──────────────── 24. Rainy Umbrella (anime) ──────────────── */
  async function rainyUmbrella(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#56688a"], [0.55, "#8a9bb8"], [1, "#c5d2e6"]]);
    ctx.fillStyle = lin(ctx, 0, 440, 0, H, [[0, "#6b7a96"], [1, "#4a5878"]]);
    ctx.fillRect(0, 440, W, 60);
    ctx.fillStyle = "rgba(255,255,255,.22)";
    ctx.beginPath(); ctx.ellipse(450, 470, 280, 18, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 2;
    [[150, 480, 36], [750, 478, 40], [620, 490, 28]].forEach(([x, y, r]) => {
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.3, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.55, r * 0.17, 0, 0, TAU); ctx.stroke();
    });
    ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 1.6;
    for (let i = 0; i < 150; i++) {
      const x = randF(0, W), y = randF(0, 440);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 20); ctx.stroke();
    }

    // umbrella canopy
    const cols = ["#ff8fb8", "#fff", "#ff8fb8", "#fff", "#ff8fb8", "#fff"];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i];
      ctx.beginPath(); ctx.moveTo(450, 235);
      ctx.arc(450, 235, 185, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = "#c4467d"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(450, 235, 185, Math.PI, TAU); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(450, 50); ctx.lineTo(450, 36); ctx.stroke();

    const o = drawCouple(ctx, d, a1, a2, {
      avatars: "corner",
      girl: { outfit: "casual", main: "#ffd36b", accent: "#8fd0ff", acc: "ribbon" },
      boy: { outfit: "casual", main: "#4d7cff", pants: "#2c3470" }
    });
    ctx.strokeStyle = "#8a4a2a"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(450, 235); ctx.lineTo(450, 285); ctx.stroke();
    txt(ctx, "RAINY DAY LOVE", 450, 22, { size: 26, color: "#fff", stroke: "#4a5878", strokeW: 6, family: "serif" });
    return finish(canvas, ctx, d, "d24", "Rainy Day Love");
  },

  /* ──────────────── 25. Summer Beach (anime) ──────────────── */
  async function summerBeach(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, 300, [[0, "#3fb8ff"], [1, "#c8f1ff"]]);
    ctx.fillStyle = rad(ctx, 790, 80, 8, 120, [[0, "#fff6b0"], [0.4, "#ffe36e"], [1, "rgba(255,227,110,0)"]]);
    ctx.beginPath(); ctx.arc(790, 80, 120, 0, TAU); ctx.fill();
    cloud(ctx, 130, 90, 40, "#fff", 0.95); cloud(ctx, 520, 60, 30, "#fff", 0.9); cloud(ctx, 330, 150, 24, "#fff", 0.8);
    ctx.fillStyle = lin(ctx, 0, 290, 0, 410, [[0, "#1fa3d8"], [1, "#6ad8e8"]]);
    ctx.fillRect(0, 290, W, 120);
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3;
    for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) {
      const x = i * 80 + (r % 2) * 40, y = 310 + r * 25;
      ctx.beginPath(); ctx.arc(x, y, 18, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
    ctx.fillStyle = lin(ctx, 0, 400, 0, H, [[0, "#ffe3a8"], [1, "#f1c176"]]);
    ctx.beginPath(); ctx.moveTo(0, 410); ctx.quadraticCurveTo(450, 380, W, 410); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

    [[300, 70, 14], [420, 40, 11], [680, 110, 13]].forEach(([x, y, s]) => gull(ctx, x, y, s, "#fff"));
    // palm leaves
    const palm = (px, py, dir) => {
      ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 10; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(px, 420); ctx.quadraticCurveTo(px + dir * 30, 300, px + dir * 15, py); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        ctx.save(); ctx.translate(px + dir * 15, py); ctx.rotate((i - 2.5) * 0.62);
        ctx.fillStyle = i % 2 ? "#2fa84f" : "#3dc060";
        ctx.beginPath(); ctx.ellipse(0, -42, 12, 52, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
    };
    palm(50, 215, 1); palm(W - 50, 225, -1);
    // beach ball
    const bc = ["#ff5a5a", "#ffe14d", "#4db8ff", "#fff", "#6fdc6f", "#ff9a4d"];
    for (let i = 0; i < 6; i++) { ctx.fillStyle = bc[i]; ctx.beginPath(); ctx.moveTo(115, 440); ctx.arc(115, 440, 26, (i * TAU) / 6, ((i + 1) * TAU) / 6); ctx.closePath(); ctx.fill(); }

    drawCouple(ctx, d, a1, a2, {
      girl: { outfit: "dress", main: "#ff7a59", accent: "#ffe36e", acc: "ribbon", hairStyle: "ponytail" },
      boy: { outfit: "casual", main: "#ff9a4d", pants: "#2f7fd8", acc: "glasses" }
    });
    txt(ctx, "SUMMER LOVE", 450, 38, { size: 36, color: "#fff", stroke: "#1fa3d8", strokeW: 8, family: "serif" });
    return finish(canvas, ctx, d, "d25", "Summer Love");
  },

  /* ──────────────── 26. Winter Scarf (anime) ──────────────── */
  async function winterScarf(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#0f1f4d"], [0.55, "#2a4a8f"], [1, "#9ab8ee"]]);
    for (let i = 0; i < 50; i++) sparkle(ctx, randF(0, W), randF(0, 240), randF(2, 4.5), "#fff", randF(0.4, 0.9));
    ctx.fillStyle = "#fff9d6"; ctx.beginPath(); ctx.arc(110, 80, 34, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2a4a8f"; ctx.beginPath(); ctx.arc(122, 74, 30, 0, TAU); ctx.fill();

    // houses
    [[560, 350, 70, 60], [680, 340, 80, 70], [790, 355, 70, 55]].forEach(([x, y, w, h]) => {
      ctx.fillStyle = "#1c2650"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#e8eefc"; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + w / 2, y - 30); ctx.lineTo(x + w + 6, y); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.shadowColor = "#ffd36b"; ctx.shadowBlur = 14; ctx.fillStyle = "#ffd36b"; ctx.fillRect(x + w / 2 - 8, y + 18, 16, 16); ctx.restore();
    });
    // fir trees
    const tree = (x, y, s) => {
      ctx.fillStyle = "#16403a";
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x, y - s * (1.2 - i * 0.3)); ctx.lineTo(x - s * (0.4 + i * 0.2), y - s * (0.55 - i * 0.3)); ctx.lineTo(x + s * (0.4 + i * 0.2), y - s * (0.55 - i * 0.3)); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.beginPath(); ctx.moveTo(x, y - s * 1.2); ctx.lineTo(x - s * 0.22, y - s * 0.9); ctx.lineTo(x + s * 0.22, y - s * 0.9); ctx.closePath(); ctx.fill();
    };
    tree(70, 430, 150); tree(150, 440, 110); tree(840, 435, 140);
    ctx.fillStyle = "#eef5ff"; ctx.beginPath(); ctx.ellipse(160, 540, 420, 110, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(720, 550, 480, 120, 0, 0, TAU); ctx.fill();

    drawCouple(ctx, d, a1, a2, {
      girl: { outfit: "casual", main: "#e0455b", accent: "#fff", hairStyle: "twin" },
      boy: { outfit: "casual", main: "#3a5bd6", pants: "#2a2f4a" }
    });
    // shared scarf
    ctx.save();
    ctx.lineCap = "round"; ctx.strokeStyle = "#ff3d5a"; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(317, 376); ctx.lineTo(583, 376); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,.7)";
    for (let x = 330; x < 580; x += 26) { ctx.beginPath(); ctx.moveTo(x, 369); ctx.lineTo(x + 8, 383); ctx.stroke(); }
    ctx.fillStyle = "#ff3d5a"; rr(ctx, 560, 376, 22, 58, 6); ctx.fill();
    ctx.restore();
    for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,255,255,${randF(0.5, 0.95)})`; ctx.beginPath(); ctx.arc(randF(0, W), randF(0, H), randF(1.5, 4.2), 0, TAU); ctx.fill(); }
    txt(ctx, "WINTER SCARF", 450, 38, { size: 34, color: "#fff", stroke: "#2f5ab0", strokeW: 7, family: "serif" });
    return finish(canvas, ctx, d, "d26", "Winter Scarf");
  },

  /* ──────────────── 27. Fairy Tale Royal (anime) ──────────────── */
  async function fairyRoyal(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#2a1b5e"], [0.55, "#7a3fa0"], [1, "#ffb3d1"]]);
    for (let i = 0; i < 70; i++) sparkle(ctx, randF(0, W), randF(0, 300), randF(2, 5), "#fff", randF(0.4, 1));

    // castle silhouette
    ctx.fillStyle = "#3a1f5c";
    ctx.fillRect(330, 280, 240, 170);
    [[310, 250, 40, 200], [550, 250, 40, 200], [415, 220, 70, 230]].forEach(([x, y, w, h]) => {
      ctx.fillStyle = "#3a1f5c"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#6b3a9a"; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + w / 2, y - 55); ctx.lineTo(x + w + 6, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#ffd36b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2, y - 55); ctx.lineTo(x + w / 2, y - 72); ctx.stroke();
      ctx.fillStyle = "#ff4d79"; ctx.beginPath(); ctx.moveTo(x + w / 2, y - 72); ctx.lineTo(x + w / 2 + 14, y - 67); ctx.lineTo(x + w / 2, y - 62); ctx.closePath(); ctx.fill();
    });
    ctx.save(); ctx.shadowColor = "#ffd36b"; ctx.shadowBlur = 12; ctx.fillStyle = "#ffe29a";
    [[330, 300], [550, 300], [440, 250], [330, 350], [550, 350]].forEach(([x, y]) => ctx.fillRect(x + 12, y, 10, 16));
    ctx.restore();
    ctx.fillStyle = "#7a3a9a"; ctx.beginPath(); ctx.ellipse(160, 540, 430, 120, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#9a4ab0"; ctx.beginPath(); ctx.ellipse(760, 550, 460, 120, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 20; i++) sparkle(ctx, randF(0, W), randF(300, 480), randF(3, 7), "#ffe9a8", randF(0.5, 1));

    drawCouple(ctx, d, a1, a2, {
      girl: { outfit: "dress", main: "#ff8fd0", accent: "#ffd36b", acc: "crown", hairStyle: "long" },
      boy: { outfit: "suit", main: "#2a3f8f", accent: "#ffd36b", acc: "crown" }
    });
    txt(ctx, "ROYAL FAIRY TALE", 450, 38, { size: 34, color: "#ffe29a", stroke: "#5a2a8a", strokeW: 7, family: "serif" });
    return finish(canvas, ctx, d, "d27", "Royal Fairy Tale");
  },

  /* ──────────────── 28. Neko Pastel (anime cat ears) ──────────────── */
  async function nekoPastel(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#ffd6ec"], [0.5, "#e5d4ff"], [1, "#d4eaff"]]);
    ctx.fillStyle = "rgba(255,255,255,.45)";
    for (let y = 20; y < H; y += 44) for (let x = ((y / 44) % 2) * 22 + 10; x < W; x += 44) { ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); }
    cloud(ctx, 120, 120, 40, "#fff", 0.9); cloud(ctx, 780, 90, 34, "#fff", 0.9);
    for (let i = 0; i < 14; i++) paw(ctx, randF(20, W - 20), randF(20, H - 20), randF(12, 22), rand(["#ffb3d1", "#c9a8ff", "#9fd0ff"]), 0.5);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = rand(["#ffe36e", "#fff", "#ffb3d1"]); starPath(ctx, randF(20, W - 20), randF(20, H - 60), randF(8, 15), 5, 0.5); ctx.fill(); }
    for (let i = 0; i < 12; i++) drawHeart(ctx, randF(0, W), randF(0, H), randF(14, 28), "#ff9ebd", { alpha: 0.35, rot: randF(-0.5, 0.5) });
    ctx.fillStyle = "#c9f2c7"; ctx.beginPath(); ctx.ellipse(450, 560, 640, 130, 0, 0, TAU); ctx.fill();

    drawCouple(ctx, d, a1, a2, {
      girl: { outfit: "casual", main: "#ffb3d1", accent: "#fff", acc: "catears", hairStyle: "twin" },
      boy: { outfit: "casual", main: "#b3d4ff", pants: "#6b7fd0", acc: "catears" }
    });
    txt(ctx, "NYAA MATCH", 450, 38, { size: 38, color: "#fff", stroke: "#e0457b", strokeW: 8, family: "serif" });
    return finish(canvas, ctx, d, "d28", "Nyaa Match");
  },

  /* ──────────────── 29. Autumn Maple (anime) ──────────────── */
  async function autumnMaple(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#ff9a56"], [0.55, "#ffc785"], [1, "#ffe9b8"]]);
    ctx.fillStyle = rad(ctx, 450, 330, 10, 330, [[0, "rgba(255,250,200,.85)"], [1, "rgba(255,250,200,0)"]]);
    ctx.fillRect(0, 0, W, H);
    const tree = (x, y, s) => {
      ctx.fillStyle = "#6b3f26"; ctx.fillRect(x - 12, y - s * 0.5, 24, s * 0.5);
      [["#e0452f", 0, -0.75, 0.55], ["#ff8a2e", -0.4, -0.55, 0.45], ["#ffb02e", 0.4, -0.55, 0.45], ["#d9382a", 0, -0.45, 0.5]].forEach(([c, dx, dy, r]) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill();
      });
    };
    tree(90, 440, 190); tree(810, 440, 200); tree(200, 450, 120);
    ctx.fillStyle = lin(ctx, 0, 430, 0, H, [[0, "#c9733a"], [1, "#8a4a26"]]);
    ctx.beginPath(); ctx.moveTo(0, 440); ctx.quadraticCurveTo(450, 410, W, 440); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 22; i++) leaf(ctx, randF(0, W), randF(440, 495), randF(8, 14), randF(0, TAU), rand(["#e0452f", "#ff8a2e", "#ffb02e", "#c0392b"]), 0.95);
    for (let i = 0; i < 40; i++) leaf(ctx, randF(0, W), randF(0, 440), randF(6, 13), randF(0, TAU), rand(["#e0452f", "#ff8a2e", "#ffb02e", "#c0392b"]), randF(0.7, 1));

    drawCouple(ctx, d, a1, a2, {
      girl: { outfit: "casual", main: "#c8553d", accent: "#fff3d6", scarf: "#ffd36b", hairStyle: "bob" },
      boy: { outfit: "casual", main: "#8a5a3a", pants: "#3a3a52", scarf: "#d94a3a" }
    });
    txt(ctx, "AUTUMN LOVE", 450, 38, { size: 36, color: "#fff", stroke: "#c0452f", strokeW: 8, family: "serif" });
    return finish(canvas, ctx, d, "d29", "Autumn Love");
  },

  /* ──────────────── 30. Moonlight Wish (anime) ──────────────── */
  async function moonlightWish(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#050b2a"], [0.6, "#0d1b4d"], [1, "#2a3a7a"]]);
    for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(255,255,255,${randF(0.3, 1)})`; ctx.beginPath(); ctx.arc(randF(0, W), randF(0, H), randF(0.6, 2), 0, TAU); ctx.fill(); }
    for (let i = 0; i < 12; i++) sparkle(ctx, randF(0, W), randF(0, 300), randF(5, 10), "#fff", randF(0.6, 1));
    ctx.fillStyle = rad(ctx, 450, 230, 20, 260, [[0, "rgba(255,240,170,.45)"], [1, "rgba(255,240,170,0)"]]);
    ctx.beginPath(); ctx.arc(450, 230, 260, 0, TAU); ctx.fill();
    ctx.fillStyle = lin(ctx, 330, 100, 570, 360, [[0, "#fffbe0"], [1, "#ffe39a"]]);
    ctx.beginPath(); ctx.arc(450, 230, 150, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(200,170,90,.25)";
    [[400, 190, 22], [490, 260, 30], [430, 290, 14], [500, 180, 12]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); });
    for (let i = 0; i < 2; i++) {
      const x = randF(100, 800), y = randF(20, 120);
      ctx.strokeStyle = lin(ctx, x, y, x - 120, y - 40, [[0, "rgba(255,255,255,.95)"], [1, "rgba(255,255,255,0)"]]); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 120, y - 40); ctx.stroke();
    }
    ctx.fillStyle = "#0a1236"; ctx.beginPath(); ctx.ellipse(450, 580, 620, 140, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 22; i++) { ctx.save(); ctx.shadowColor = "#ffe36e"; ctx.shadowBlur = 14; ctx.fillStyle = "#fff3a0"; ctx.beginPath(); ctx.arc(randF(0, W), randF(330, 470), randF(1.5, 3.2), 0, TAU); ctx.fill(); ctx.restore(); }

    drawCouple(ctx, d, a1, a2, {
      girl: { outfit: "dress", main: "#b3a0ff", accent: "#fff", hairStyle: "long" },
      boy: { outfit: "casual", main: "#5b6bd6", pants: "#1f2a5a" },
      heartFill: lin(ctx, 0, 290, 0, 375, [[0, "#c9a8ff"], [1, "#7a4bff"]]), heartGlow: "#9a7bff"
    });
    txt(ctx, "MOONLIGHT WISH", 450, 38, { size: 34, color: "#fff", shadow: "#9a7bff", blur: 18, family: "serif" });
    return finish(canvas, ctx, d, "d30", "Moonlight Wish");
  },

  /* ──────────────── 31. Sweet Treats (anime) ──────────────── */
  async function sweetTreats(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#ffeaf3"], [1, "#e3fff5"]]);
    ctx.save(); ctx.globalAlpha = 0.5;
    for (let i = -10; i < 30; i++) { ctx.fillStyle = i % 2 ? "#ffd6e8" : "#d6f5ea"; ctx.beginPath(); ctx.moveTo(i * 60, 0); ctx.lineTo(i * 60 + 30, 0); ctx.lineTo(i * 60 - 270, H); ctx.lineTo(i * 60 - 300, H); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    for (let i = 0; i < 90; i++) { ctx.save(); ctx.translate(randF(0, W), randF(0, H)); ctx.rotate(randF(0, Math.PI)); ctx.fillStyle = rand(["#ff7aa8", "#ffd36b", "#6fd8c0", "#8fa8ff", "#fff"]); ctx.fillRect(-5, -1.5, 10, 3); ctx.restore(); }
    iceCream(ctx, 80, 350, 44, "#ffb3d1", "#fff1c9");
    iceCream(ctx, 830, 340, 46, "#a8e6cf", "#ffd0e8");
    ctx.fillStyle = "#ffd6e8"; ctx.beginPath(); ctx.ellipse(450, 560, 640, 130, 0, 0, TAU); ctx.fill();

    drawCouple(ctx, d, a1, a2, {
      girl: { outfit: "dress", main: "#ff9ec4", accent: "#fff", acc: "ribbon", hairStyle: "bun" },
      boy: { outfit: "casual", main: "#6fd8c0", pants: "#4a5a8f" }
    });
    txt(ctx, "SWEET TREATS", 450, 38, { size: 36, color: "#fff", stroke: "#ff6fa8", strokeW: 8, family: "serif" });
    return finish(canvas, ctx, d, "d31", "Sweet Treats");
  },

  /* ──────────────── 32. Spring in Japan (anime) ──────────────── */
  async function fujiSpring(d) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [a1, a2] = await loadAvatars(d);

    fillBg(ctx, W, H, [[0, "#8fd3ff"], [0.7, "#ffe6f0"], [1, "#fff4f8"]]);
    cloud(ctx, 130, 110, 40, "#fff", 0.95); cloud(ctx, 780, 130, 34, "#fff", 0.9);
    ctx.fillStyle = "#6b86c9";
    ctx.beginPath(); ctx.moveTo(130, 450); ctx.lineTo(390, 205); ctx.lineTo(450, 190); ctx.lineTo(510, 205); ctx.lineTo(770, 450); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(390, 205); ctx.lineTo(450, 190); ctx.lineTo(510, 205); ctx.lineTo(492, 232); ctx.lineTo(470, 216); ctx.lineTo(450, 238); ctx.lineTo(430, 216); ctx.lineTo(408, 232); ctx.closePath(); ctx.fill();

    // torii gate
    ctx.fillStyle = "#e0452f";
    rr(ctx, 300, 270, 16, 175, 3); ctx.fill(); rr(ctx, 584, 270, 16, 175, 3); ctx.fill();
    rr(ctx, 270, 258, 360, 18, 6); ctx.fill(); rr(ctx, 286, 292, 328, 11, 3); ctx.fill();
    ctx.fillStyle = "#2a2a3a"; rr(ctx, 262, 250, 376, 10, 5); ctx.fill();

    // sakura tre
