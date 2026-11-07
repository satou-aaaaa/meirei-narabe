// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、作りもののます目とカードの例だけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const grid = ["....F", ".#...", "...#.", "#....", "R...."], cells = grid.join("").split("").map((c) => `<div style="background:${c === "#" ? "#6b5f55" : "#fff"};border-radius:8px;display:grid;place-items:center;font-size:40px">${c === "F" ? "🚩" : c === "R" ? "🤖" : ""}</div>`).join("");
  const card = (t, bg, fg) => `<div style="display:inline-block;background:${bg};color:${fg};border:3px solid #2b4a6f;border-radius:10px;padding:4px 14px;font-size:26px;font-weight:900;margin:4px 0">${t}</div>`;
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:56px 64px;background:#f6f1e7;color:#2a2420;display:flex;gap:44px;align-items:center">
    <div style="flex:1">
      <div style="font-size:32px;color:#86291a;letter-spacing:.06em">ロボットを旗まで動かす1日5問</div>
      <div style="font-size:112px;font-weight:900;margin-top:8px;color:#1f3a5c;white-space:nowrap">命令<span style="color:#b8402a">ならべ</span></div>
      <div style="font-size:31px;margin-top:14px;line-height:1.5;white-space:nowrap">順次・くり返し・条件分岐<br>文部科学省の手引にもとづく</div>
      <div style="margin-top:18px">${card("⬆ まえへ", "#2b4a6f", "#fff")} ${card("↻ 右を向く", "#fff", "#1f3a5c")} ${card("🔁 3回くりかえす", "#fffaf0", "#2a2420")}</div>
    </div>
    <div style="width:400px;height:400px;background:#2a2420;border-radius:22px;padding:10px;box-sizing:border-box;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);gap:6px">${cells}</div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
