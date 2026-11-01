// The RAG funnel. Job postings fall in at the top and are cut into grains (chunks). Grains get their numbers and
// drift into lanes by meaning (colour = role family). At the neck, the question is compared with every grain and
// only the closest five fit through. They land in the cup, where we check the answer. On the right, your resume
// goes through its own small funnel, and each of its grains is compared with the closest job grains.
//
// RAGFunnel.svg(t, active, opts) returns SVG markup for time t (seconds) with level `active` (1-5) highlighted.
// It is a pure function of t, so the companion animates it live and the film renders it frame by frame.
(function (root) {
  const FAM = ["#4C8FE6", "#2A9D8F", "#C2577A", "#C79A3C", "#6FA34A", "#8E7CF0"];
  const rnd = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const mix = (a, b, k) => a + (b - a) * k;
  const f1 = v => v.toFixed(1);

  // geometry (viewBox 600 × 480)
  const CX = 300, Y = { rim: 92, emb: 205, neck: 300, cupTop: 360, cupBot: 420 };
  const RX = { rim: 138, emb: 92, neck: 22, cup: 56 };
  const RY = r => r * .36;                                   // isometric-looking ellipse
  const rxAt = y => y <= Y.emb ? mix(RX.rim, RX.emb, (y - Y.rim) / (Y.emb - Y.rim)) : mix(RX.emb, RX.neck, clamp((y - Y.emb) / (Y.neck - Y.emb)));
  const RES = { cx: 520, top: 150, rx: 38, neck: 230 };     // the small resume funnel

  const LEVELS = [
    { n: 1, name: "Chunk", note: ["424 postings", "→ 2,841 chunks"], y: Y.rim - 8 },
    { n: 2, name: "Embed", note: ["256 numbers", "per chunk"], y: Y.emb - 4 },
    { n: 3, name: "Retrieve", note: ["top 5 closest", "→ Gemma answers"], y: Y.neck - 6 },
    { n: 4, name: "Evaluate", note: ["right posting in", "top 5: 47 of 48"], y: Y.cupTop + 22 },
    { n: 5, name: "Your resume", note: ["your chunks vs", "the job chunks"], y: 0 },
  ];

  const N = 132, PICK = new Set([7, 33, 58, 86, 111]);
  const G = [...Array(N)].map((_, i) => ({ u: rnd(i, 1) * 2 - 1, d: rnd(i, 2) * 2 - 1, c: i % 6, sp: .8 + .45 * rnd(i, 3), ph: rnd(i, 4), pick: PICK.has(i) }));
  const R = [...Array(12)].map((_, i) => ({ u: rnd(i, 11) * 2 - 1, ph: rnd(i, 12), sp: .9 + .3 * rnd(i, 13) }));

  function ellipse(cx, cy, rx, ry, fill, stroke, op = 1, sw = 1.5, half = 0) {
    // half: 0 = full, 1 = back (upper) half only, 2 = front (lower) half only
    if (!half) return `<ellipse cx="${cx}" cy="${cy}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"/>`;
    const sweep = half === 1 ? 1 : 0;
    return `<path d="M${f1(cx - rx)} ${cy} A${f1(rx)} ${f1(ry)} 0 0 ${sweep} ${f1(cx + rx)} ${cy}" fill="none" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"/>`;
  }
  function band(y1, r1, y2, r2, fill, op) {
    // the funnel wall between two rings (front face)
    return `<path d="M${f1(CX - r1)} ${y1} L${f1(CX - r2)} ${y2} A${f1(r2)} ${f1(RY(r2))} 0 0 0 ${f1(CX + r2)} ${y2} L${f1(CX + r1)} ${y1} A${f1(r1)} ${f1(RY(r1))} 0 0 1 ${f1(CX - r1)} ${y1}Z" fill="${fill}" opacity="${op}"/>`;
  }

  function svg(t, active = 1, o = {}) {
    const dark = o.dark !== false, ink = dark ? "#FFFFFF" : "#1E2A36", soft = dark ? "#AEB8D8" : "#4A5563";
    const lav = "#C9C6E6", hot = "#E8892B";
    const glass = (n) => active === n ? hot : lav;
    let s = "";

    // ---- funnel body: back rims, walls, grains, front rims
    s += ellipse(CX, Y.rim, RX.rim, RY(RX.rim), "rgba(201,198,230,.10)", glass(1), 1, 2, 1);
    s += ellipse(CX, Y.emb, RX.emb, RY(RX.emb), "none", glass(2), .55, 1.5, 1);
    s += band(Y.rim, RX.rim, Y.emb, RX.emb, active === 1 ? "rgba(232,137,43,.16)" : active === 2 ? "rgba(232,137,43,.10)" : "rgba(201,198,230,.10)", 1);
    s += band(Y.emb, RX.emb, Y.neck, RX.neck, active === 3 ? "rgba(232,137,43,.18)" : active === 2 ? "rgba(232,137,43,.12)" : "rgba(201,198,230,.12)", 1);
    // spout
    s += `<rect x="${CX - RX.neck * .7}" y="${Y.neck}" width="${RX.neck * 1.4}" height="${Y.cupTop - Y.neck - 16}" fill="${active === 3 ? "rgba(232,137,43,.22)" : "rgba(201,198,230,.14)"}"/>`;
    // cup
    s += `<path d="M${CX - RX.cup} ${Y.cupTop} L${CX - RX.cup * .72} ${Y.cupBot} A${RX.cup * .72} ${f1(RY(RX.cup * .72))} 0 0 0 ${CX + RX.cup * .72} ${Y.cupBot} L${CX + RX.cup} ${Y.cupTop}Z" fill="${active === 4 ? "rgba(232,137,43,.30)" : "rgba(106,111,196,.45)"}"/>`;
    s += ellipse(CX, Y.cupTop, RX.cup, RY(RX.cup), active === 4 ? "rgba(232,137,43,.18)" : "rgba(106,111,196,.30)", glass(4), 1, 2);

    // documents falling into the rim (three cards, cycling), with cut marks
    for (let k = 0; k < 3; k++) {
      const q = (t * .32 + k / 3) % 1, y = mix(-34, Y.rim - 22, ease(q / .7)), op = q < .7 ? 1 : clamp(1 - (q - .7) / .12);
      const x = CX - 70 + k * 70, cut = q > .55;
      if (op <= 0) continue;
      s += `<g opacity="${f1(op)}" transform="translate(${x},${f1(y)}) rotate(${(k - 1) * 8})"><rect x="-17" y="-22" width="34" height="44" rx="3" fill="#F4F6FB" stroke="#AEB8D8"/>` +
        [0, 1, 2, 3, 4].map(j => `<rect x="-11" y="${-14 + j * 7}" width="${j === 0 ? 14 : 22}" height="2.6" fill="${j === 0 ? "#1D3270" : "#8A96B8"}"/>`).join("") +
        (cut ? `<line x1="-21" y1="-4" x2="21" y2="-4" stroke="${hot}" stroke-width="2" stroke-dasharray="4 3"/><line x1="-21" y1="10" x2="21" y2="10" stroke="${hot}" stroke-width="2" stroke-dasharray="4 3"/>` : "") + `</g>`;
    }

    // grains
    const lane = c => (c - 2.5) / 2.5;
    const cmpPts = [];
    for (let i = 0; i < N; i++) {
      const g = G[i], q = (t * g.sp / 7 + g.ph) % 1;
      let x, y, r = 3.1, col, op = 1;
      if (q < .42) {                                     // falling from the rim to the embed ring, picking up colour
        const k = q / .42; y = mix(Y.rim + 4, Y.emb, k);
        const rx = rxAt(y) * .86, sortK = ease(clamp((k - .45) / .55));
        x = CX + mix(g.u, lane(g.c) * .78 + g.u * .18, sortK) * rx;
        y += g.d * RY(rxAt(y)) * .55;
        col = k < .35 ? "#E8ECF6" : FAM[g.c]; r = mix(4.2, 3.1, k);
      } else if (q < .78) {                              // sorted by meaning, sliding to the neck
        const k = (q - .42) / .36; y = mix(Y.emb, Y.neck - 4, k);
        const rx = rxAt(y) * .86;
        x = CX + (lane(g.c) * .78 + g.u * .18) * rx;
        y += g.d * RY(rxAt(y)) * .5;
        col = FAM[g.c];
        if (!g.pick) op = clamp(1 - (k - .72) / .28);    // not close enough: stays in the funnel
        else { col = k > .5 ? "#FFB45E" : FAM[g.c]; r = mix(3.1, 4.6, clamp((k - .5) * 2)); }
        if (k > .55 && (active === 3 || active === 5)) cmpPts.push([x, y, g.pick]);
      } else {                                           // only the five closest pass the neck and land in the cup
        if (!g.pick) continue;
        const k = (q - .78) / .22; x = CX + g.u * 6 * (1 - k) + g.u * RX.cup * .5 * k; y = mix(Y.neck, Y.cupTop + 6 + Math.abs(g.d) * 10, ease(k));
        col = "#FFB45E"; r = 4.6;
        if (k > .95) op = clamp(1 - (k - .95) / .05);
      }
      const glow = col === "#FFB45E" ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 2.6)}" fill="#FFD36B" opacity="${f1(op * .28)}"/>` : "";
      s += glow + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${col}" opacity="${f1(op)}"/>`;
    }

    // the question at the neck, compared with the grains near it
    const qx = CX + RX.neck + 46, qy = Y.neck - 22;
    s += `<g opacity="${active === 3 ? 1 : .55}"><path d="M${qx} ${qy - 12} l12 12 l-12 12 l-12 -12z" fill="#FFD36B"/><text x="${qx + 18}" y="${qy + 5}" font-size="14" font-weight="700" fill="#FFD36B" font-family="Archivo">question</text></g>`;
    if (active === 3) cmpPts.slice(0, 16).forEach(([x, y, p]) => { s += `<line x1="${qx}" y1="${qy}" x2="${f1(x)}" y2="${f1(y)}" stroke="${p ? "#FFB45E" : "#8A96B8"}" stroke-width="${p ? 1.6 : .8}" stroke-dasharray="3 3" opacity="${p ? .9 : .45}"/>`; });

    // Gemma on the spout: the five closest grains become an answer here
    const gy = Y.neck + 22, gOn = active === 3;
    s += `<rect x="${CX - 34}" y="${gy}" width="68" height="24" rx="7" fill="${gOn ? "#E8892B" : "#C46A17"}" opacity="${gOn ? 1 : .8}"/>` +
      `<text x="${CX}" y="${gy + 17}" text-anchor="middle" font-family="Archivo" font-size="13" font-weight="800" fill="#fff">Gemma 4</text>`;
    // check in the cup
    const ck = active === 4 ? 1 : .55;
    s += `<path d="M${CX - 12} ${Y.cupTop + 30} l9 9 l18 -20" fill="none" stroke="#3FBF7F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="${ck}"/>`;

    // the resume funnel (right) and its comparisons with job grains
    const ra = active === 5 ? 1 : .6, rr = RES;
    s += `<g opacity="${ra}">` + ellipse(rr.cx, rr.top, rr.rx, RY(rr.rx), "rgba(224,154,0,.12)", active === 5 ? hot : "#E09A00", 1, 2) +
      `<path d="M${rr.cx - rr.rx} ${rr.top} L${rr.cx - 6} ${rr.neck} L${rr.cx + 6} ${rr.neck} L${rr.cx + rr.rx} ${rr.top}" fill="rgba(224,154,0,.14)" stroke="none"/>`;
    const rq = (t * .32) % 1, ry0 = mix(rr.top - 70, rr.top - 18, ease(rq / .7)), rop = rq < .7 ? 1 : clamp(1 - (rq - .7) / .12);
    s += `<g opacity="${f1(rop)}" transform="translate(${rr.cx},${f1(ry0)})"><rect x="-15" y="-20" width="30" height="40" rx="3" fill="#FFF4DA" stroke="#E09A00"/><text x="0" y="5" text-anchor="middle" font-size="10" font-weight="800" fill="#B37A00" font-family="Archivo">CV</text></g>`;
    const resPts = [];
    R.forEach((g, i) => {
      const q = (t * g.sp / 6 + g.ph) % 1, y = mix(rr.top + 4, rr.neck - 6, q), w = mix(rr.rx * .8, 5, q);
      const x = rr.cx + g.u * w, yy = y + g.u * 3;
      s += `<circle cx="${f1(x)}" cy="${f1(yy)}" r="3.6" fill="#E09A00"/>`;
      resPts.push([x, yy]);
    });
    s += `</g>`;
    if (active === 5) {
      // each resume grain is compared with job grains in the embed band
      resPts.slice(0, 6).forEach(([x, y], i) => {
        const tx = CX + (i - 2.5) / 2.5 * RX.emb * .7, ty = Y.emb + (i % 2 ? 8 : -6);
        s += `<path d="M${f1(x)} ${f1(y)} Q${f1((x + tx) / 2)} ${f1(Math.min(y, ty) - 40)} ${f1(tx)} ${f1(ty)}" fill="none" stroke="#FFD36B" stroke-width="1.4" stroke-dasharray="4 3" opacity=".85"/>`;
      });
    }

    // front rims on top of the grains
    s += ellipse(CX, Y.rim, RX.rim, RY(RX.rim), "none", glass(1), 1, 2.5, 2);
    s += ellipse(CX, Y.emb, RX.emb, RY(RX.emb), "none", glass(2), .9, 2, 2);
    s += ellipse(CX, Y.neck, RX.neck, RY(RX.neck), "none", glass(3), 1, 2.5);

    // labels (left), level 5 under the resume funnel
    LEVELS.forEach(L => {
      const on = active === L.n, c = on ? "#FFB45E" : ink, nc = on ? "#FFD9A8" : soft;
      const x = L.n === 5 ? rr.cx - 50 : 14, y = L.n === 5 ? rr.neck + 34 : L.y;
      s += `<text x="${x}" y="${y}" font-family="Archivo" font-size="17" font-weight="800" fill="${c}">${L.n} · ${L.name}</text>` +
        `<text x="${x}" y="${y + 19}" font-family="Archivo" font-size="13" font-weight="500" fill="${nc}">${L.note[0]}</text>` +
        `<text x="${x}" y="${y + 35}" font-family="Archivo" font-size="13" font-weight="500" fill="${nc}">${L.note[1]}</text>`;
    });
    return s;
  }

  // invisible click targets for each level (viewBox coordinates)
  const HIT = [
    { n: 1, x: 0, y: -36, w: 450, h: 171 }, { n: 2, x: 0, y: 135, w: 450, h: 120 }, { n: 3, x: 0, y: 255, w: 450, h: 80 },
    { n: 4, x: 0, y: 335, w: 450, h: 120 }, { n: 5, x: 455, y: 60, w: 145, h: 260 },
  ];
  root.RAGFunnel = { svg, LEVELS, HIT, VIEW: "0 -40 600 510" };
})(typeof window !== "undefined" ? window : globalThis);
