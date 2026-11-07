// アプリのアイコン（icon-192.png・icon-512.png）を作る。藍の地に、白います目と朱の旗、上向きの矢印。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）。maskable でも欠けないよう、絵は真ん中の円（直径80%）に収める
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    const cells = []; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) cells.push(`<rect x="${27 + x * 16}" y="${27 + y * 16}" width="14" height="14" rx="2.5" fill="#fff"/>`);
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#2b4a6f"/>
      <rect x="25" y="25" width="50" height="50" rx="4" fill="#2a2420"/>${cells.join("")}
      <polygon points="34,63 29,71 39,71" fill="#2b4a6f"/><rect x="32.5" y="70" width="3" height="3" fill="#2b4a6f"/>
      <line x1="34" y1="62" x2="34" y2="40" stroke="#b8402a" stroke-width="2" stroke-dasharray="3 2"/><line x1="34" y1="38" x2="62" y2="38" stroke="#b8402a" stroke-width="2" stroke-dasharray="3 2"/>
      <line x1="66" y1="29" x2="66" y2="40" stroke="#2a2420" stroke-width="1.6"/><polygon points="66,29 73,32 66,35" fill="#b8402a"/></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
