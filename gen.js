// 命令ならべ の問題（ブラウザと node の両方で使う）。
// ます目の上のロボットに、命令のカード（まえへ・右を向く・左を向く・くりかえす・もし〜なら）を並べて動かす。
// 考え方（順次・くり返し・条件分岐）は文部科学省「小学校プログラミング教育の手引（第三版）」に合わせる（出どころは SRC）。
// 問題は決まった種から全部ここで作る（BANK）。1問は「種類|番号」の key を持ち、同じ key ならいつも同じ問題になる。
// 作り方（make* と N）を変えると、過去の日の問題も変わる。変えた PR に一言書く。QA はロボットを別の動かし方で動かして答えを確かめる。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ日なら、どの端末でも同じ問題になる。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];

  // 出どころ（短い名前と URL）
  const SRC = {
    tebiki: ["文部科学省「小学校プログラミング教育の手引（第三版）」", "https://www.mext.go.jp/content/20200218-mxt_jogai02-100003171_002.pdf"],
    tebikiP: ["文部科学省「小学校プログラミング教育の手引」", "https://www.mext.go.jp/a_menu/shotou/zyouhou/detail/1403162.htm"],
    kyoiku: ["文部科学省「プログラミング教育」", "https://www.mext.go.jp/a_menu/shotou/zyouhou/detail/1375607.htm"],
    kenshu: ["文部科学省「小学校プログラミング教育に関する研修教材」", "https://www.mext.go.jp/a_menu/shotou/zyouhou/detail/1416408.htm"],
  };

  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pickN = (R, arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const ri = (R, n) => Math.floor(R() * n);

  // 向き：0 上・1 右・2 下・3 左（画面の上が「上」）。右・左を向くのは、ロボットから見た右・左
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], DIR = ["上", "右", "下", "左"];
  // 命令：「F」まえへ（1マス）・「R」右を向く・「L」左を向く・{ r:回数, b:[中身] } くりかえす・{ c:1, t:[かべのとき], e:[そうでないとき] } もし まえが かべなら・{ q:1 } 空いた所（？）
  const NAME = { F: "まえへ", R: "右を向く", L: "左を向く" };
  const turn = (d, c) => (c === "R" ? (d + 1) % 4 : c === "L" ? (d + 3) % 4 : d);
  function progText(p) { return p.map((c) => (typeof c === "string" ? NAME[c] : c.r ? `${c.r}回くりかえす〔${progText(c.b)}〕` : c.c ? `もし まえが かべなら〔${progText(c.t)}〕でなければ〔${progText(c.e)}〕` : "？")).join("・"); }
  const fill = (p, v) => p.map((c) => (typeof c === "string" ? c : c.q ? v : c.r ? { r: c.r, b: fill(c.b, v) } : c.c ? { c: 1, t: fill(c.t, v), e: fill(c.e, v) } : c));
  const key2 = (x, y) => x + "," + y;

  // ロボットを動かす。m：{ w, h, wall:[[x,y]], s:[x,y,向き], g:[x,y] }。ますの外と、かべには進めない（進もうとすると、ぶつかって止まる）
  function run(m, prog, cap = 300) {
    const W = new Set(m.wall.map(([x, y]) => key2(x, y)));
    let [x, y, d] = m.s, bump = null, steps = 0, card = -1, fwd = 0;
    const path = [[x, y]];
    const blocked = () => { const nx = x + DX[d], ny = y + DY[d]; return nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || W.has(key2(nx, ny)); };
    function exec(list, top) {
      for (let i = 0; i < list.length; i++) {
        if (bump || steps > cap) return;
        if (top) card = i;
        const c = list[i];
        if (c === "F") { steps++; if (blocked()) { bump = [x + DX[d], y + DY[d]]; return; } x += DX[d]; y += DY[d]; path.push([x, y]); fwd++; }
        else if (c === "R" || c === "L") { steps++; d = turn(d, c); }
        else if (c && c.r) { for (let k = 0; k < c.r && !bump && steps <= cap; k++) { steps++; exec(c.b, false); } } // 1回ごとに数える（中が空でも、回数が大きすぎても止まる）
        else if (c && c.c) { steps++; exec(blocked() ? c.t : c.e, false); }
        else { bump = [x, y]; return; } // 空いた所は動かない
      }
    }
    exec(prog, true);
    return { x, y, d, path, bump, card, fwd, over: steps > cap, ok: !bump && steps <= cap && !!m.g && x === m.g[0] && y === m.g[1] };
  }
  const expand = (p) => p.flatMap((c) => (typeof c === "string" ? [c] : c.r ? Array.from({ length: c.r }, () => expand(c.b)).flat() : [c]));

  // かべを、通らない所に置く（keep：かべにしない所）
  function walls(R, w, h, keep, p) {
    const k = new Set(keep.map(([x, y]) => key2(x, y))), out = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r = R(); if (!k.has(key2(x, y)) && r < p) out.push([x, y]); }
    return out;
  }
  // まだ通っていない所を、かべにぶつからずに進む順の命令を作る（向きを変えたら必ず1マス進む）
  function walk(R, w, h, nF) {
    const s = [ri(R, w), ri(R, h), ri(R, 4)];
    let [x, y, d] = s, f = 0, guard = 0;
    const seen = new Set([key2(x, y)]), prog = [];
    const can = (dd) => { const nx = x + DX[dd], ny = y + DY[dd]; return nx >= 0 && ny >= 0 && nx < w && ny < h && !seen.has(key2(nx, ny)); };
    while (f < nF && guard++ < 40) {
      const last = prog[prog.length - 1], r = R(), turned = last === "R" || last === "L";
      if (can(d) && (turned || r < (prog.length ? 0.6 : 0.7))) { prog.push("F"); x += DX[d]; y += DY[d]; seen.add(key2(x, y)); f++; continue; }
      if (turned) return null;
      const ts = []; if (can(turn(d, "R"))) ts.push("R"); if (can(turn(d, "L"))) ts.push("L");
      if (!ts.length) return null;
      const t = ts[ri(R, ts.length)]; prog.push(t); d = turn(d, t);
    }
    return f < nF ? null : { s, prog, end: [x, y, d], seen };
  }
  const floorCells = (m) => { const W = new Set(m.wall.map(([x, y]) => key2(x, y))), out = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (!W.has(key2(x, y))) out.push([x, y]); return out; };
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  // A・B・C の印：止まる所1つと、まちがえやすい所2つ（ロボットのいる所・かべには置かない）
  function labels(R, m, end, decoys) {
    const cand = [];
    for (const c of decoys) if (c && !same(c, end) && !same(c, m.s) && c[0] >= 0 && c[1] >= 0 && c[0] < m.w && c[1] < m.h && !cand.some((x) => same(x, c))) cand.push(c);
    const more = pickN(R, floorCells(m).filter((c) => !same(c, end) && !same(c, m.s) && !cand.some((x) => same(x, c))), 4);
    const two = [...cand, ...more].slice(0, 2);
    if (two.length < 2) return null;
    const cells = pickN(R, [end, ...two], 3), lab = {};
    ["A", "B", "C"].forEach((L, i) => { lab[L] = cells[i]; });
    return { lab, ans: ["A", "B", "C"].find((L) => same(lab[L], end)) };
  }
  const W = 5, H = 5;
  const grid = (m, progs, extra) => ({ t: "grid", w: m.w, h: m.h, wall: m.wall, s: m.s, ...(m.g ? { g: m.g } : {}), ...(extra || {}), progs });
  const traceOf = (m, prog) => { const r = run(m, prog); return { path: r.path, ...(r.bump ? { bump: r.bump } : {}), end: [r.x, r.y, r.d] }; };
  const CARD = ["まえへ", "右を向く", "左を向く"], CODE = { まえへ: "F", 右を向く: "R", 左を向く: "L" };

  const B = []; // BANK
  const add = (kind, id, q) => B.push({ key: kind + "|" + id, kind, ...q });
  // 種類ごとに、決まった種から N 問を作る（作れない形は捨てて次を試す。同じ絵の問題は入れない）
  function build(kind, N, one) {
    const R = rng(seedOf("gen:" + kind)), seen = new Set();
    for (let tries = 0; tries < 6000 && seen.size < N; tries++) {
      const q = one(R); if (!q) continue;
      const sig = JSON.stringify(q.scene); if (seen.has(sig)) continue;
      seen.add(sig); add(kind, String(seen.size), q);
    }
  }

  // ---- やさしい（順次） ----
  // ことば：考え方の名前（手引 p.13 の注・p.14・p.15・p.25・p.32）
  const KOTOBA = [
    ["命令を、上から1つずつ順に行うことを何という？", ["順次", "くり返し", "条件分岐"], "順次", "命令を順序立てて並べ、上から順に行うのが「順次」です。プログラムの基本の1つです。"],
    ["同じ命令を何回も行わせることを何という？", ["くり返し", "順次", "条件分岐"], "くり返し", "命令をくり返させるのが「くり返し（反復）」です。プログラムを短く書けます。"],
    ["「もし〜なら」で、することを変えることを何という？", ["条件分岐", "くり返し", "順次"], "条件分岐", "条件を決めて命令を分けるのが「条件分岐」です。"],
    ["センサーで「もし障害物を感じたら止まる」と命令するのは？", ["条件分岐", "順次", "くり返し"], "条件分岐", "手引では、センサーが感じたら止まるように命令を分岐させる例があります。"],
    ["くりかえしの命令を使うと、プログラムはどうなる？", ["短く書ける", "必ず長くなる", "動かなくなる"], "短く書ける", "同じ命令を並べる代わりに「○回くりかえす」と書くと、短く（簡潔に）書けます。"],
    ["正三角形をかく「100進む・120度曲がる」を短く書くと？", ["3回くりかえす", "4回くりかえす", "6回くりかえす"], "3回くりかえす", "正三角形は辺が3つなので、「進む・曲がる」を3回くりかえします（手引 p.14）。"],
    ["正三角形をかくとき、1つの角で曲がる角度は？", ["120度", "60度", "90度"], "120度", "正三角形の外側を回るので、1つの角で120度曲がります（手引 p.14 の図）。"],
    ["正方形をかく「進む・90度曲がる」は何回くりかえす？", ["4回", "3回", "5回"], "4回", "正方形は辺が4つなので、「進む・90度曲がる」を4回くりかえします。"],
    ["やりたい動きを命令にするとき、はじめにすることは？", ["必要な動きを分けて考える", "命令を全部くりかえしにする", "とにかく長く並べる"], "必要な動きを分けて考える", "手引では「動きを分けて考える」「命令にする」「組み合わせる」の順に考えます。"],
    ["分けた動きを命令にしたら、次にすることは？", ["命令を組み合わせる", "命令を全部消す", "同じ命令だけにする"], "命令を組み合わせる", "一つ一つの動きを命令にしたら、それらを組み合わせて一連の動きにします（手引 p.15）。"],
  ];
  KOTOBA.forEach(([t, o, a, w], i) => add("kotoba", String(i + 1), { scene: { t: "q", text: t }, text: "", opts: o, ans: a, src: ["tebiki"], why: w }));

  // 向き：右・左を向いたあと、どちらを向いている？
  build("muki", 24, (R) => {
    const n = 2 + ri(R, 3), prog = Array.from({ length: n }, () => (R() < 0.5 ? "R" : "L")), d0 = ri(R, 4);
    const m = { w: 3, h: 3, wall: [], s: [1, 1, d0] }, r = run(m, prog);
    return { scene: grid(m, [{ prog }], { trace: traceOf(m, prog) }), text: "命令を全部すると、ロボットはどちらを向く？", opts: ["上を向く", "右を向く", "下を向く", "左を向く"], ans: DIR[r.d] + "を向く", src: ["tebiki"], fix: 1,
      why: `はじめは${DIR[d0]}向き。右・左は、ロボットから見た向きです。順に回すと${DIR[r.d]}を向きます。` };
  });
  // どこで止まる？（順に読む）
  build("doko", 30, (R) => {
    const wk = walk(R, W, H, 2 + ri(R, 3)); if (!wk || wk.prog.length < 3 || wk.prog.length > 6) return null;
    const m = { w: W, h: H, wall: [], s: wk.s }, path = run(m, wk.prog).path;
    // まちがえやすい所：右と左を取りちがえたとき・1マス足りないとき
    const sw = wk.prog.map((c) => (c === "R" ? "L" : c === "L" ? "R" : c)), rs = run(m, sw);
    const lb = labels(R, m, wk.end, [rs.bump ? null : [rs.x, rs.y], path[path.length - 2]]); if (!lb) return null;
    m.wall = walls(R, W, H, [...path, ...Object.values(lb.lab)], 0.18);
    const fin = run(m, wk.prog); if (fin.bump || !same([fin.x, fin.y], wk.end)) return null;
    return { scene: grid(m, [{ prog: wk.prog }], { lab: lb.lab, trace: traceOf(m, wk.prog) }), text: "命令のとおりに動くと、ロボットはどこで止まる？", opts: ["A", "B", "C"], ans: lb.ans, src: ["tebiki"],
      why: `上のカードから順に動かすと（順次）、${lb.ans}で止まります。右・左はロボットから見た向きです。` };
  });
  // ？に入るカード（旗に止まる）
  build("tsugi", 30, (R) => {
    const wk = walk(R, W, H, 2 + ri(R, 3)); if (!wk || wk.prog.length < 4 || wk.prog.length > 6) return null;
    const m = { w: W, h: H, wall: [], s: wk.s, g: wk.end.slice(0, 2) }, path = run(m, wk.prog).path;
    m.wall = walls(R, W, H, path, 0.22);
    const i = ri(R, wk.prog.length), prog = wk.prog.map((c, j) => (j === i ? { q: 1 } : c));
    const okOpts = CARD.filter((o) => run(m, fill(prog, CODE[o])).ok);
    if (okOpts.length !== 1) return null;
    const alt = Object.fromEntries(CARD.map((o) => [o, fill(prog, CODE[o])]));
    return { scene: grid(m, [{ prog }], { trace: traceOf(m, wk.prog) }), text: "？に入るカードはどれ？ 旗のますで止まるようにしよう。", opts: CARD.slice(), ans: okOpts[0], alt, src: ["tebiki"], fix: 1,
      why: `${i + 1}枚目は「${okOpts[0]}」。上から順に1枚ずつたどると、旗で止まります。` };
  });
  // どのプログラムが旗に着く？
  function mutants(R, prog) {
    const out = [], sw = (c) => (c === "R" ? "L" : c === "L" ? "R" : c);
    prog.forEach((c, i) => { if (c !== "F") out.push(prog.map((x, j) => (j === i ? sw(x) : x))); });
    prog.forEach((c, i) => { if (c === "F") out.push(prog.filter((_, j) => j !== i)); });
    out.push([...prog, "F"]);
    for (let i = 0; i + 1 < prog.length; i++) if (prog[i] !== prog[i + 1]) { const p = prog.slice(); [p[i], p[i + 1]] = [p[i + 1], p[i]]; out.push(p); }
    return pickN(R, out, out.length);
  }
  build("dore", 30, (R) => {
    const wk = walk(R, W, H, 2 + ri(R, 3)); if (!wk || wk.prog.length < 3 || wk.prog.length > 6) return null;
    const m = { w: W, h: H, wall: [], s: wk.s, g: wk.end.slice(0, 2) }, path = run(m, wk.prog).path;
    m.wall = walls(R, W, H, path, 0.22);
    const bad = mutants(R, wk.prog).filter((p) => p.length && !run(m, p).ok).slice(0, 2); if (bad.length < 2) return null;
    const progs = pickN(R, [wk.prog, ...bad], 3), labs = ["A", "B", "C"], ans = labs[progs.indexOf(wk.prog)];
    return { scene: grid(m, progs.map((p, i) => ({ name: labs[i], prog: p })), { trace: traceOf(m, wk.prog) }), text: "旗のますで止まるプログラムはどれ？", opts: labs.slice(), ans, alt: Object.fromEntries(labs.map((l, i) => [l, progs[i]])), src: ["tebiki"],
      why: `${ans}は、上から順にたどると旗で止まります。ほかは、かべにぶつかるか、ちがう所で止まります。` };
  });

  // ---- ふつう（くり返し） ----
  const BODIES = [["F"], ["F", "F"], ["F", "R"], ["F", "L"], ["R", "F"], ["L", "F"], ["F", "F", "R"], ["F", "F", "L"], ["F", "R", "F", "L"], ["F", "L", "F", "R"]];
  const PRE = [[], [], ["F"], ["R"], ["L"]], POST = [[], [], ["F"], ["R", "F"], ["L", "F"]];
  // くりかえしのあるプログラムを、ますの外に出ない所から作る
  function repProg(R, w, h, minF) {
    const b = BODIES[ri(R, BODIES.length)], n = 2 + ri(R, 3), pre = PRE[ri(R, PRE.length)], post = POST[ri(R, POST.length)];
    const prog = [...pre, { r: n, b }, ...post], s = [ri(R, w), ri(R, h), ri(R, 4)], m = { w, h, wall: [], s }, r = run(m, prog);
    if (r.bump || r.fwd < minF || same([r.x, r.y], s)) return null;
    return { prog, m, r, n, b, pre, post };
  }
  build("kdoko", 30, (R) => {
    const g = repProg(R, W, H, 3); if (!g) return null;
    const { m, r, n, b, pre, post } = g, less = run(m, [...pre, { r: n - 1, b }, ...post]), more = run(m, [...pre, { r: n + 1, b }, ...post]);
    const lb = labels(R, m, [r.x, r.y], [less.bump ? null : [less.x, less.y], more.bump ? null : [more.x, more.y]]); if (!lb) return null;
    m.wall = walls(R, W, H, [...r.path, ...Object.values(lb.lab)], 0.15);
    const fin = run(m, g.prog); if (fin.bump || !same([fin.x, fin.y], [r.x, r.y])) return null;
    return { scene: grid(m, [{ prog: g.prog }], { lab: lb.lab, trace: traceOf(m, g.prog) }), text: "このプログラムで、ロボットはどこで止まる？", opts: ["A", "B", "C"], ans: lb.ans, src: ["tebiki"],
      why: `〔 〕の中を${n}回くりかえしてから、次のカードへ進みます。たどると${lb.ans}で止まります。` };
  });
  build("kkai", 30, (R) => {
    const g = repProg(R, W, H, 3); if (!g || g.n < 2) return null;
    const { m, r, n, b, pre, post } = g;
    m.g = [r.x, r.y]; m.wall = walls(R, W, H, r.path, 0.2);
    const prog = [...pre, { r: "？", b }, ...post], ks = [n - 1, n, n + 1].filter((k) => k >= 1);
    const alt = Object.fromEntries(ks.map((k) => [k + "回", [...pre, { r: k, b }, ...post]]));
    const oks = ks.filter((k) => run(m, alt[k + "回"]).ok); if (oks.length !== 1 || ks.length < 3) return null;
    return { scene: grid(m, [{ prog }], { trace: traceOf(m, g.prog) }), text: "？回くりかえすと、旗のますで止まる。？に入る数は？", opts: ks.map((k) => k + "回"), ans: n + "回", alt, src: ["tebiki"], fix: 1,
      why: `〔${progText(b)}〕を${n}回くりかえすと、旗で止まります。1回ずつ指でたどると分かります。` };
  });
  build("kdore", 30, (R) => {
    const g = repProg(R, W, H, 3); if (!g) return null;
    const { m, r, n, b, pre, post } = g;
    m.g = [r.x, r.y]; m.wall = walls(R, W, H, r.path, 0.2);
    const sw = (c) => (c === "R" ? "L" : c === "L" ? "R" : c);
    const cand = [[...pre, { r: n + 1, b }, ...post], [...pre, { r: n - 1, b }, ...post], [...pre, { r: n, b: b.map(sw) }, ...post], [...pre, { r: n, b: b.slice().reverse() }, ...post], [...pre.map(sw), { r: n, b }, ...post], [...pre, { r: n, b }, ...post.map(sw)]];
    const seenT = new Set([progText(g.prog)]), bad = [];
    for (const p of pickN(R, cand, cand.length)) { const t = progText(p); if (!seenT.has(t) && p.every((c) => !c.r || c.r >= 1) && !run(m, p).ok) { seenT.add(t); bad.push(p); } }
    if (bad.length < 2) return null;
    const progs = pickN(R, [g.prog, ...bad.slice(0, 2)], 3), labs = ["A", "B", "C"], ans = labs[progs.indexOf(g.prog)];
    return { scene: grid(m, progs.map((p, i) => ({ name: labs[i], prog: p })), { trace: traceOf(m, g.prog) }), text: "旗のますで止まるプログラムはどれ？", opts: labs.slice(), ans, alt: Object.fromEntries(labs.map((l, i) => [l, progs[i]])), src: ["tebiki"],
      why: `${ans}です。くりかえす回数と〔 〕の中の順番が、どちらも合っているのは${ans}だけです。` };
  });
  // くりかえしで短く書く
  build("matome", 30, (R) => {
    const b = BODIES.filter((x) => x.length >= 2)[ri(R, 7)], n = 3 + ri(R, 2), seq = Array.from({ length: n }, () => b).flat();
    const m = { w: W, h: H, wall: [], s: [ri(R, W), ri(R, H), ri(R, 4)] }, r = run(m, seq);
    if (r.bump || same([r.x, r.y], m.s)) return null;
    m.g = [r.x, r.y]; m.wall = walls(R, W, H, r.path, 0.15);
    const sw = (c) => (c === "R" ? "L" : c === "L" ? "R" : c);
    const right = [{ r: n, b }], wrong = pickN(R, [[{ r: n - 1, b }], [{ r: n + 1, b }], [{ r: n, b: b.map(sw) }], [{ r: n, b: b.slice().reverse() }], [{ r: n, b: b.slice(0, -1) }]], 5);
    const eq = (p) => JSON.stringify(expand(p)) === JSON.stringify(seq), opts = [right];
    for (const p of wrong) if (!eq(p) && p[0].b.length && !opts.some((o) => progText(o) === progText(p))) opts.push(p);
    if (opts.length < 3) return null;
    const three = opts.slice(0, 3), texts = three.map(progText);
    return { scene: grid(m, [{ prog: seq }], { trace: traceOf(m, seq) }), text: "このプログラムを「くりかえす」で短く書くと、どれ？", opts: texts, ans: texts[0], alt: Object.fromEntries(texts.map((t, i) => [t, three[i]])), seq, src: ["tebiki"],
      why: `「${progText(b)}」が${n}回ならんでいます。くりかえしを使うと短く書けます（手引 p.25）。` };
  });
  // ぶつかるのは何枚目？
  build("butsu", 30, (R) => {
    const wk = walk(R, W, H, 3 + ri(R, 2)); if (!wk || wk.prog.length < 4 || wk.prog.length > 7) return null;
    const m = { w: W, h: H, wall: [], s: wk.s }, full = run(m, wk.prog), Fs = wk.prog.map((c, i) => (c === "F" && i >= 1 ? i : -1)).filter((i) => i >= 0);
    if (Fs.length < 2) return null;
    const k = Fs[ri(R, Fs.length)], before = run(m, wk.prog.slice(0, k)), wc = [before.x + DX[before.d], before.y + DY[before.d]];
    m.wall = [wc, ...walls(R, W, H, [...full.path.slice(0, before.path.length), wc], 0.15).filter((c) => !same(c, wc))];
    const r = run(m, wk.prog); if (!r.bump || r.card !== k) return null;
    const others = pickN(R, wk.prog.map((_, i) => i).filter((i) => i !== k), 2), opts = [k, ...others].sort((a, b) => a - b).map((i) => `${i + 1}枚目`);
    return { scene: grid(m, [{ prog: wk.prog }], { trace: traceOf(m, wk.prog) }), text: "このロボットは、何枚目のカードで、かべにぶつかる？", opts, ans: `${k + 1}枚目`, src: ["tebiki"], fix: 1,
      why: `上から順にたどると、${k + 1}枚目の「まえへ」で前がかべです。ここを直せば先へ進めます。` };
  });

  // ---- むずかしい（条件分岐・くりかえしの中のくりかえし） ----
  // もし まえが かべなら〔右か左を向く〕でなければ〔まえへ〕を何回かくりかえす
  function condProg(R, minF) {
    const m = { w: W, h: H, wall: walls(R, W, H, [], 0.24), s: [0, 0, 0] }, fl = floorCells(m); if (fl.length < 10) return null;
    const c0 = fl[ri(R, fl.length)]; m.s = [c0[0], c0[1], ri(R, 4)];
    const T = R() < 0.5 ? "R" : "L", n = 5 + ri(R, 5), pre = R() < 0.3 ? ["F"] : [], prog = [...pre, { r: n, b: [{ c: 1, t: [T], e: ["F"] }] }];
    const r = run(m, prog); if (r.bump || r.fwd < minF || same([r.x, r.y], m.s)) return null;
    const turns = r.fwd < n + pre.length; // 少なくとも1回はかべの前で向きを変える
    if (!turns) return null;
    return { m, prog, r, T, n, pre };
  }
  build("mdoko", 30, (R) => {
    const g = condProg(R, 3); if (!g) return null;
    const { m, r, T, n, pre } = g, oth = run(m, [...pre, { r: n, b: [{ c: 1, t: [T === "R" ? "L" : "R"], e: ["F"] }] }]), less = run(m, [...pre, { r: n - 2, b: [{ c: 1, t: [T], e: ["F"] }] }]);
    const lb = labels(R, m, [r.x, r.y], [oth.bump ? null : [oth.x, oth.y], [less.x, less.y]]); if (!lb) return null;
    return { scene: grid(m, [{ prog: g.prog }], { lab: lb.lab, trace: traceOf(m, g.prog) }), text: "このプログラムで、ロボットはどこで止まる？", opts: ["A", "B", "C"], ans: lb.ans, src: ["tebiki"],
      why: `1回ごとに前を見て、かべなら${NAME[T]}、でなければ1マス進みます（条件分岐）。${n}回で${lb.ans}に止まります。` };
  });
  build("mdore", 30, (R) => {
    const g = condProg(R, 4); if (!g) return null;
    const { m, r, T, n, pre } = g; m.g = [r.x, r.y];
    const U = T === "R" ? "L" : "R", body = (t, e) => [{ c: 1, t, e }];
    const cand = [[...pre, { r: n, b: body([U], ["F"]) }], [...pre, { r: n, b: body(["F"], [T]) }], [...pre, { r: n + 2, b: body([T], ["F"]) }], [...pre, { r: n - 2, b: body([T], ["F"]) }], [...pre, { r: n, b: body([U], ["F"]) }, "F"]];
    const bad = []; for (const p of pickN(R, cand, cand.length)) if (!run(m, p).ok && !bad.some((x) => progText(x) === progText(p))) bad.push(p);
    if (bad.length < 2) return null;
    const progs = pickN(R, [g.prog, ...bad.slice(0, 2)], 3), labs = ["A", "B", "C"], ans = labs[progs.indexOf(g.prog)];
    return { scene: grid(m, progs.map((p, i) => ({ name: labs[i], prog: p })), { trace: traceOf(m, g.prog) }), text: "旗のますで止まるプログラムはどれ？", opts: labs.slice(), ans, alt: Object.fromEntries(labs.map((l, i) => [l, progs[i]])), src: ["tebiki"],
      why: `${ans}です。かべの前で${NAME[T]}、それ以外は進む、を${n}回くりかえすと旗で止まります。` };
  });
  build("mtsugi", 30, (R) => {
    const g = condProg(R, 4); if (!g) return null;
    const { m, r, n, pre } = g; m.g = [r.x, r.y];
    const prog = [...pre, { r: n, b: [{ c: 1, t: [{ q: 1 }], e: ["F"] }] }];
    const alt = Object.fromEntries(CARD.map((o) => [o, fill(prog, CODE[o])])), oks = CARD.filter((o) => run(m, alt[o]).ok);
    if (oks.length !== 1) return null;
    return { scene: grid(m, [{ prog }], { trace: traceOf(m, g.prog) }), text: "？に入るカードはどれ？ 旗のますで止まるようにしよう。", opts: CARD.slice(), ans: oks[0], alt, src: ["tebiki"], fix: 1,
      why: `かべの前では「${oks[0]}」。そうすると${n}回のくりかえしのあとで、旗のますに止まります。` };
  });
  // くりかえしの中のくりかえし
  function nestProg(R) {
    const a = 2 + ri(R, 3), b = 1 + ri(R, 3), T = R() < 0.5 ? "R" : "L", pre = R() < 0.3 ? ["F"] : [];
    const inner = R() < 0.5 ? [{ r: b, b: ["F"] }, T] : [T, { r: b, b: ["F"] }];
    if (b === 1) inner.splice(inner.findIndex((c) => c.r), 1, "F");
    const prog = [...pre, { r: a, b: inner }], m = { w: 6, h: 6, wall: [], s: [ri(R, 6), ri(R, 6), ri(R, 4)] }, r = run(m, prog);
    if (r.bump || r.fwd < 3 || same([r.x, r.y], m.s)) return null;
    return { m, prog, r, a, b, T, pre, inner };
  }
  build("nest", 30, (R) => {
    const g = nestProg(R); if (!g) return null;
    const { m, r, a, pre, inner } = g, less = run(m, [...pre, { r: a - 1, b: inner }]), flip = run(m, [...pre, { r: a, b: inner.map((c) => (c === "R" ? "L" : c === "L" ? "R" : c)) }]);
    const lb = labels(R, m, [r.x, r.y], [flip.bump ? null : [flip.x, flip.y], [less.x, less.y]]); if (!lb) return null;
    m.wall = walls(R, 6, 6, [...r.path, ...Object.values(lb.lab)], 0.12);
    const fin = run(m, g.prog); if (fin.bump || !same([fin.x, fin.y], [r.x, r.y])) return null;
    return { scene: grid(m, [{ prog: g.prog }], { lab: lb.lab, trace: traceOf(m, g.prog) }), text: "このプログラムで、ロボットはどこで止まる？", opts: ["A", "B", "C"], ans: lb.ans, src: ["tebiki"],
      why: `外の〔 〕を${a}回。その1回ごとに、中の命令を全部行います。たどると${lb.ans}で止まります。` };
  });
  // 全部で何マス進む？
  build("kaisu", 30, (R) => {
    const g = R() < 0.5 ? nestProg(R) : condProg(R, 4); if (!g) return null;
    const { m, r } = g;
    if (!g.T || g.m.w === 6) m.wall = walls(R, m.w, m.h, r.path, 0.12);
    const fin = run(m, g.prog); if (fin.bump || fin.fwd !== r.fwd) return null;
    const v = r.fwd, ds = pickN(R, [v - 2, v - 1, v + 1, v + 2, v * 2].filter((x) => x >= 1 && x !== v), 2), opts = [v, ...ds].sort((x, y) => x - y).map((x) => x + "マス");
    return { scene: grid(m, [{ prog: g.prog }], { trace: traceOf(m, g.prog) }), text: "このプログラムで、ロボットは全部で何マス進む？（向きを変えるのは数えない）", opts, ans: v + "マス", src: ["tebiki"], fix: 1,
      why: `「まえへ」が行われる回数を数えます。くりかえしの中は、回数の分だけ行います。全部で${v}マスです。` };
  });

  // 種類：id・難しさ・帳に出す名前・見るところ（ヒント1）
  const KINDS = [
    { id: "kotoba", lv: 0, name: "考え方のことば", look: "順に・何回も・もし〜なら、のどれでしょう。" },
    { id: "muki", lv: 0, name: "どちらを向く", look: "ロボットの顔の向きで、右・左を考えます。" },
    { id: "doko", lv: 0, name: "どこで止まる", look: "上のカードから1枚ずつ、指でたどりましょう。" },
    { id: "tsugi", lv: 0, name: "？に入るカード", look: "？の前まで動かして、旗の向きを見ます。" },
    { id: "dore", lv: 0, name: "旗に着くのはどれ", look: "1つずつたどり、かべにぶつからないか見ます。" },
    { id: "kdoko", lv: 1, name: "くりかえして止まる所", look: "〔 〕の中を、書いてある回数だけ行います。" },
    { id: "kkai", lv: 1, name: "くりかえす回数", look: "〔 〕の中を1回すると、どれだけ動くでしょう。" },
    { id: "kdore", lv: 1, name: "くりかえしを選ぶ", look: "回数と、〔 〕の中の順番を見くらべます。" },
    { id: "matome", lv: 1, name: "短く書く", look: "同じ並びが、何回出てくるか数えましょう。" },
    { id: "butsu", lv: 1, name: "ぶつかる所", look: "「まえへ」のたびに、前がかべか見ましょう。" },
    { id: "mdoko", lv: 2, name: "もし〜なら（止まる所）", look: "1回ごとに、ロボットの前がかべかを見ます。" },
    { id: "mdore", lv: 2, name: "もし〜なら（選ぶ）", look: "かべの前で、右と左のどちらへ向くとよいか。" },
    { id: "mtsugi", lv: 2, name: "もし〜なら（？に入る）", look: "はじめてかべの前に来たとき、どちらへ行く？" },
    { id: "nest", lv: 2, name: "くりかえしの中のくりかえし", look: "外の1回ごとに、中を全部行います。" },
    { id: "kaisu", lv: 2, name: "何マス進む", look: "「まえへ」が行われる回数だけを数えます。" },
  ];
  B.forEach((q) => { q.lv = KINDS.find((k) => k.id === q.kind).lv; });
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);
  const BANK = Object.fromEntries(B.map((q) => [q.key, q]));
  const keysOf = (kind) => B.filter((q) => q.kind === kind).map((q) => q.key);

  // 1問を作る。tag は key（「種類|番号」）。選び肢は key の種で並べ替える（2択・並びに意味のある選び肢 fix・A B C はそのまま）
  function make(tag) {
    const q = Object.prototype.hasOwnProperty.call(BANK, tag) ? BANK[tag] : null; if (!q) return null;
    const k = BY[q.kind], opts = q.opts.length === 2 || q.fix || q.opts.every((o) => /^[ABC]$/.test(o)) ? q.opts.slice() : pickN(rng(seedOf(tag)), q.opts, q.opts.length);
    return { tag, kind: q.kind, lv: k.lv, name: k.name, look: k.look, scene: q.scene, text: q.text || "", opts, ans: q.ans, why: q.why, src: q.src.map((s) => SRC[s]) };
  }
  const pickKey = (R, kind) => { const ks = keysOf(kind); return ks[Math.floor(R() * ks.length)]; };

  // 今日の5問（やさしい2・ふつう2・むずかしい1）。種類は重ねない
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), m = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...m, ...h].map((id) => pickKey(R, id));
  }
  // 上級の3問（むずかしいだけ・今日の5問のむずかしいとは別の種類）
  function hardTags(date) {
    const dh = BANK[dailyTags(date)[4]].kind, R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id) => pickKey(R, id));
  }

  const G = { KINDS, BY, LV, SRC, DIR, NAME, BANK, keysOf, kindsOf, seedOf, rng, make, dailyTags, hardTags, pickN, run, progText, expand };
  if (typeof module !== "undefined" && module.exports) module.exports = G; else root.MEIREI = G;
})(typeof self !== "undefined" ? self : this);
