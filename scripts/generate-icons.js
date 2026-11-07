import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// SVG icon for web & vector display
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="50%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#3B82F6" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#EF4444" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0F172A" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background rounded squircle -->
  <rect x="24" y="24" width="464" height="464" rx="104" fill="url(#bg)" />

  <!-- Dnevnik stylized book / journal & badge -->
  <g filter="url(#shadow)">
    <!-- Diary cover / base -->
    <rect x="110" y="110" width="292" height="292" rx="36" fill="#FFFFFF" fill-opacity="0.96" />
    
    <!-- Diary spine line -->
    <rect x="136" y="110" width="16" height="292" fill="#DBEAFE" />

    <!-- Ruled lines representing grades and diary feed -->
    <rect x="180" y="160" width="180" height="18" rx="9" fill="#93C5FD" />
    <rect x="180" y="200" width="130" height="14" rx="7" fill="#BFDBFE" />
    <rect x="180" y="235" width="150" height="14" rx="7" fill="#BFDBFE" />

    <!-- Gosuslugi / Russian shield badge emblem in corner -->
    <circle cx="330" cy="315" r="58" fill="url(#accent)" />
    
    <!-- Big 5 mark (Отлично / Top Mark) in badge -->
    <text x="330" y="342" font-family="system-ui, -apple-system, Roboto, sans-serif" font-weight="900" font-size="74" fill="#FFFFFF" text-anchor="middle">5</text>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);

// Simple pure Node PNG generator function
function createPng(width, height, isMaskable = false) {
  // RGBA buffer: width * 4 bytes per row + 1 filter byte per row
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (rowBytes + 1));

  const cx = width / 2;
  const cy = height / 2;
  const cornerRadius = isMaskable ? 0 : width * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Distance from center for radial / squircle
      let inside = true;
      if (!isMaskable) {
        const dx = Math.max(0, Math.abs(x - cx) - (cx - cornerRadius));
        const dy = Math.max(0, Math.abs(y - cy) - (cy - cornerRadius));
        if (Math.hypot(dx, dy) > cornerRadius) {
          inside = false;
        }
      }

      if (!inside) {
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Gradient background: Deep blue (#1d4ed8) to royal blue (#2563eb)
      const t = (x + y) / (width + height);
      let r = Math.round(30 + t * 25);
      let g = Math.round(64 + t * 45);
      let b = Math.round(180 + t * 65);

      // Book shape in center
      const bookMargin = isMaskable ? width * 0.24 : width * 0.20;
      const bx1 = bookMargin;
      const bx2 = width - bookMargin;
      const by1 = bookMargin;
      const by2 = height - bookMargin;

      if (x >= bx1 && x <= bx2 && y >= by1 && y <= by2) {
        // Book page
        r = 250;
        g = 252;
        b = 255;

        // Spine
        if (x <= bx1 + (bx2 - bx1) * 0.12) {
          r = 219;
          g = 234;
          b = 254;
        }

        // Horizontal notebook lines
        const lineY1 = by1 + (by2 - by1) * 0.28;
        const lineY2 = by1 + (by2 - by1) * 0.44;
        const lineX1 = bx1 + (bx2 - bx1) * 0.28;
        const lineX2 = bx2 - (bx2 - bx1) * 0.15;
        if (x >= lineX1 && x <= lineX2 && ((y >= lineY1 && y <= lineY1 + (by2-by1)*0.06) || (y >= lineY2 && y <= lineY2 + (by2-by1)*0.05))) {
          r = 147;
          g = 197;
          b = 253;
        }
      }

      // Circle badge for "5"
      const badgeR = (bx2 - bx1) * 0.30;
      const badgeCx = bx2 - badgeR * 0.7;
      const badgeCy = by2 - badgeR * 0.7;
      const distBadge = Math.hypot(x - badgeCx, y - badgeCy);

      if (distBadge <= badgeR) {
        // Golden orange red
        r = 245;
        g = 158;
        b = 11;
        // Inner badge rim
        if (distBadge > badgeR - 3) {
          r = 255;
          g = 255;
          b = 255;
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = 255;
    }
  }

  // Build PNG chunk helper
  function crc32(buf) {
    let table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ -1) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcBuf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = crc32(crcBuf);
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT (Deflated raw data)
  const compressed = zlib.deflateSync(rawData, { level: 6 });
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate PWA icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(64, 64, false));

console.log('Icons generated successfully in public/');
