import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function makeCanvas(width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  const blend = (x, y, color) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    const a = color[3] / 255;
    const inv = 1 - a;
    pixels[i] = Math.round(color[0] * a + pixels[i] * inv);
    pixels[i + 1] = Math.round(color[1] * a + pixels[i + 1] * inv);
    pixels[i + 2] = Math.round(color[2] * a + pixels[i + 2] * inv);
    pixels[i + 3] = Math.min(255, Math.round(color[3] + pixels[i + 3] * inv));
  };
  const fillEllipse = (cx, cy, rx, ry, color) => {
    const x0 = Math.floor(cx - rx);
    const x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry);
    const y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) blend(x, y, color);
      }
    }
  };
  const fillPolygon = (points, color) => {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i < xs.length; i += 2) {
        for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) blend(x, y, color);
      }
    }
  };
  const line = (x1, y1, x2, y2, color, w = 2) => {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      fillEllipse(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, w / 2, w / 2, color);
    }
  };
  const rect = (x, y, w, h, color) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) blend(xx, yy, color);
  };
  return { pixels, blend, fillEllipse, fillPolygon, line, rect };
}

function drawMascot(width, height, variant) {
  const c = makeCanvas(width, height);
  const s = Math.min(width / 256, height / 170);
  const ox = (width - 256 * s) / 2;
  const oy = (height - 170 * s) / 2;
  const p = (x, y) => [ox + x * s, oy + y * s];
  const black = [28, 29, 34, 255];
  const ink = [13, 18, 28, 235];
  const cream = [255, 246, 219, 255];
  const yellow = [248, 205, 82, 255];
  const blue = [71, 140, 190, 230];
  const red = [220, 92, 81, 230];
  const green = [111, 165, 116, 230];
  const purple = [156, 116, 188, 230];

  if (variant === "celebration") {
    for (const [x1, y1, x2, y2, color] of [
      [24, 28, 8, 12, red], [45, 18, 42, 2, yellow], [200, 25, 220, 8, blue],
      [226, 56, 246, 51, green], [35, 142, 17, 157, purple], [215, 138, 238, 154, red]
    ]) c.line(...p(x1, y1), ...p(x2, y2), color, 4 * s);
  }

  // 4x4 crayon grid card.
  const [gx, gy] = p(154, 52);
  const gw = 70 * s;
  const gh = 70 * s;
  c.rect(gx, gy, gw, gh, [255, 248, 230, 235]);
  for (let i = 0; i <= 4; i++) {
    c.line(gx + (gw * i) / 4, gy, gx + (gw * i) / 4, gy + gh, blue, 2 * s);
    c.line(gx, gy + (gh * i) / 4, gx + gw, gy + (gh * i) / 4, green, 2 * s);
  }
  c.line(gx, gy, gx + gw, gy, ink, 3 * s);
  c.line(gx + gw, gy, gx + gw, gy + gh, ink, 3 * s);
  c.line(gx + gw, gy + gh, gx, gy + gh, ink, 3 * s);
  c.line(gx, gy + gh, gx, gy, ink, 3 * s);

  // Body, tail, head, ears.
  c.fillEllipse(...p(86, 101), 49 * s, 40 * s, black);
  c.line(...p(43, 102), ...p(18, 78), black, 16 * s);
  c.line(...p(18, 78), ...p(33, 62), black, 13 * s);
  c.fillEllipse(...p(91, 68), 42 * s, 35 * s, black);
  c.fillPolygon([p(57, 48), p(70, 17), p(84, 51)], black);
  c.fillPolygon([p(99, 48), p(123, 18), p(128, 58)], black);
  c.fillPolygon([p(64, 45), p(71, 28), p(78, 47)], [238, 143, 132, 230]);
  c.fillPolygon([p(105, 47), p(119, 30), p(121, 53)], [238, 143, 132, 230]);

  c.fillEllipse(...p(78, 68), 8 * s, 10 * s, yellow);
  c.fillEllipse(...p(105, 69), 8 * s, 10 * s, yellow);
  c.line(...p(78, 64), ...p(78, 73), ink, 2 * s);
  c.line(...p(105, 65), ...p(105, 74), ink, 2 * s);
  c.fillEllipse(...p(92, 85), 18 * s, 12 * s, cream);
  c.fillEllipse(...p(92, 80), 4 * s, 3 * s, ink);

  if (variant === "empty") {
    c.line(...p(82, 89), ...p(91, 93), ink, 2 * s);
    c.line(...p(91, 93), ...p(102, 88), ink, 2 * s);
    c.line(...p(150, 134), ...p(218, 134), [120, 120, 120, 170], 3 * s);
  } else {
    c.line(...p(82, 88), ...p(91, 93), ink, 2 * s);
    c.line(...p(91, 93), ...p(103, 88), ink, 2 * s);
  }

  // Crayon whiskers and paws.
  for (const y of [77, 84]) {
    c.line(...p(63, y), ...p(35, y - 5), cream, 2 * s);
    c.line(...p(116, y), ...p(143, y - 4), cream, 2 * s);
  }
  c.fillEllipse(...p(63, 134), 13 * s, 8 * s, black);
  c.fillEllipse(...p(107, 134), 13 * s, 8 * s, black);
  c.line(...p(57, 134), ...p(68, 132), cream, 1.4 * s);
  c.line(...p(101, 132), ...p(113, 134), cream, 1.4 * s);

  if (variant === "celebration") {
    for (const [x, y, color] of [[151, 39, red], [178, 34, yellow], [219, 37, purple], [238, 84, blue], [199, 137, green]]) {
      c.fillEllipse(...p(x, y), 5 * s, 5 * s, color);
    }
  }

  return png(width, height, c.pixels);
}

const outputs = [
  ["standard", "nanamicat_mascot_standard"],
  ["empty", "nanamicat_mascot_empty"],
  ["celebration", "nanamicat_mascot_celebration"]
];

for (const [variant, name] of outputs) {
  writeFileSync(join(root, "public", `${name}.png`), drawMascot(256, 170, variant));
  for (const [scale, size] of [["1x", 52], ["2x", 104], ["3x", 156]]) {
    writeFileSync(
      join(root, "NanamiCat-iOS/NanamiCat/Resources/Assets.xcassets", `${name}.imageset`, `${name}-${scale}.png`),
      drawMascot(size, size, variant)
    );
  }
}

console.log("Generated black-cat mascot PNG assets for Web and iOS.");
