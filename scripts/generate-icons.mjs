/**
 * 生成 Tauri 需要的应用图标（PNG + Windows ICO）。
 *
 * 为什么要手写这个：本机没有 imagemagick / rsvg / inkscape，也没有 sharp，
 * 而 Tauri 打包**必须**有 `icons/icon.ico` 和几个 PNG，否则构建直接失败。
 * 与其为一次性的事引一个带原生二进制的依赖，不如直接用 Node 自带的 zlib
 * 把 PNG 编出来 —— 图形很简单（圆角方块 + 一段圆弧），用不到通用光栅化器。
 *
 * 这个脚本是**一次性工具**：跑出来的图已经提交进仓库，日常构建不需要再跑。
 * 要改图标就改下面的参数再跑一次。
 *
 * 用法：node scripts/generate-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

// ── 图标设计（和 app/icon.svg 同一套母题）────────────────────────────
const BACKGROUND = [0x0e, 0x13, 0x1c]; // --card 的暗色值
const RING = [0x39, 0x87, 0xe5]; // --asset 的暗色值
const CORNER_RADIUS = 7 / 32; // 相对边长
const RING_RADIUS = 7.5 / 32;
const RING_HALF_WIDTH = 4.5 / 32 / 2;
const RING_SWEEP = (280 / 180) * Math.PI; // 顺时针画 280°，留一个缺口

// ── 光栅化 ──────────────────────────────────────────────────────────
function insideRoundedSquare(px, py, size, radius) {
  const r = radius * size;
  const cx = Math.min(Math.max(px, r), size - r);
  const cy = Math.min(Math.max(py, r), size - r);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

/** 返回 [r,g,b,a]，a 是 0..1 */
function sample(px, py, size) {
  if (!insideRoundedSquare(px, py, size, CORNER_RADIUS)) return [0, 0, 0, 0];

  const center = size / 2;
  const dx = px - center;
  const dy = py - center;
  const distance = Math.hypot(dx, dy);

  const inner = (RING_RADIUS - RING_HALF_WIDTH) * size;
  const outer = (RING_RADIUS + RING_HALF_WIDTH) * size;

  if (distance >= inner && distance <= outer) {
    // atan2 的 y 轴朝下，所以角度增大方向就是屏幕上的顺时针。
    // 把起点挪到 12 点方向（-π/2），再归一化到 0..2π。
    const angle = (Math.atan2(dy, dx) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    if (angle <= RING_SWEEP) return [...RING, 1];
  }

  return [...BACKGROUND, 1];
}

/** 超采样抗锯齿：每个像素取 N×N 个样本求平均。 */
function render(size, samples) {
  const rgba = Buffer.alloc(size * size * 4);
  const step = 1 / samples;
  const offset = step / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const [pr, pg, pb, pa] = sample(x + offset + sx * step, y + offset + sy * step, size);
          // 预乘 alpha 再平均，避免边缘出现黑边
          r += pr * pa;
          g += pg * pa;
          b += pb * pa;
          a += pa;
        }
      }
      const total = samples * samples;
      const i = (y * size + x) * 4;
      if (a > 0) {
        rgba[i] = Math.round(r / a);
        rgba[i + 1] = Math.round(g / a);
        rgba[i + 2] = Math.round(b / a);
      }
      rgba[i + 3] = Math.round((a / total) * 255);
    }
  }

  return rgba;
}

// ── PNG 编码 ────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(rgba, size) {
  // 每行前面加一个 filter 字节（0 = 不滤波）
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 位深
  ihdr[9] = 6; // 颜色类型 6 = RGBA
  // 10..12 保持 0：压缩/滤波/隔行都是默认值

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── ICO 编码 ────────────────────────────────────────────────────────
/** Vista 之后的 ICO 允许直接内嵌 PNG，不用再写一遍 BMP 那一套。 */
function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = 图标
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(16 * entries.length);
  let offset = 6 + directory.length;

  entries.forEach((entry, index) => {
    const at = index * 16;
    // 256 在这个字段里用 0 表示
    directory[at] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 1] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 2] = 0; // 调色板数
    directory[at + 3] = 0; // 保留
    directory.writeUInt16LE(1, at + 4); // 色彩平面
    directory.writeUInt16LE(32, at + 6); // 位深
    directory.writeUInt32LE(entry.png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += entry.png.length;
  });

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.png)]);
}

// ── 产出 ────────────────────────────────────────────────────────────
const OUT_DIR = "src-tauri/icons";
mkdirSync(OUT_DIR, { recursive: true });

/** 大图少采几次样，小图多采几次 —— 小图边缘像素占比高，更需要抗锯齿。 */
function renderPng(size) {
  const samples = size <= 64 ? 4 : 2;
  return encodePng(render(size, samples), size);
}

const PNG_TARGETS = [
  [32, "32x32.png"],
  [128, "128x128.png"],
  [256, "128x128@2x.png"],
  [512, "icon.png"],
  [1024, "icon-1024.png"],
];

for (const [size, name] of PNG_TARGETS) {
  const png = renderPng(size);
  writeFileSync(`${OUT_DIR}/${name}`, png);
  console.log(`  ${name.padEnd(18)} ${String(size).padStart(4)}px  ${png.length} 字节`);
}

const icoSizes = [16, 32, 48, 64, 128, 256];
const ico = encodeIco(icoSizes.map((size) => ({ size, png: renderPng(size) })));
writeFileSync(`${OUT_DIR}/icon.ico`, ico);
console.log(`  ${"icon.ico".padEnd(18)} ${icoSizes.join("/")}  ${ico.length} 字节`);
