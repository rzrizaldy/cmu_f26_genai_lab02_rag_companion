// The RAG funnel, drawn in true isometric projection.
//
// Built once (the index):  job postings fall into the funnel and are cut into grains (chunks). Each grain is
//   embedded and lands on the "meaning space" slab, next to grains with similar meaning (colour = role family,
//   a label we know from the data table). Grains stay on the slab; nothing is used up by a question.
// Every question:  the question lands on the slab too. Every grain is scored against it (brighter = closer), the
//   five closest rise to the question and go to Gemma, which writes an answer with citations.
// Your resume:  goes through its own small funnel with the same model, so its grains land in the same space,
//   each one tied by short threads to its nearest job grains. That is all the matcher does.
// Evaluate:  a separate test with 48 questions (is the right posting in the top 5?), drawn off to the side.
//
// RAGFunnel.svg(t, active) returns SVG markup for time t (seconds); it is a pure function of t, so the companion
// animates it live and the film can render it frame by frame.
(function (root) {
  // ---------------------------------------------------------------- helpers
  const C30 = Math.cos(Math.PI / 6);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const mix = (a, b, k) => a + (b - a) * k;
  const rnd = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const f = v => v.toFixed(1);
  const OX = 300, OY = 318, U = 19;
  const P = (x, y, z = 0) => [OX + (x - y) * C30 * U, OY + (x + y) * .5 * U - z * U];
  const pts = a => a.map(p => f(p[0]) + "," + f(p[1])).join(" ");
  const poly = (a, fill, op = 1, stroke = "none", sw = 1) => `<polygon points="${pts(a)}" fill="${fill}" fill-opacity="${op}" stroke="${stroke}" stroke-width="${sw}"/>`;
  function slab(x, y, z, w, d, h, top, left, right, op = 1, stroke = "rgba(255,255,255,.55)") {
    return poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], left, op, stroke) +
      poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], right, op, stroke) +
      poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top, op, stroke);
  }
  // a horizontal circle of radius r (iso units) seen in isometric projection
  const ell = (cx, cy, cz, r) => { const [x, y] = P(cx, cy, cz); return { x, y, rx: r * U * 1.2247, ry: r * U * .7071 }; };
  const arc = (e, half) => `M${f(e.x - e.rx)} ${f(e.y)} A${f(e.rx)} ${f(e.ry)} 0 0 ${half === "back" ? 1 : 0} ${f(e.x + e.rx)} ${f(e.y)}`;
  const txt = (x, y, s, size, fill, w = 700, anchor = "start", op = 1) =>
    `<text x="${f(x)}" y="${f(y)}" font-family="Archivo,system-ui,sans-serif" font-size="${size}" font-weight="${w}" fill="${fill}" text-anchor="${anchor}" opacity="${op}">${s}</text>`;

  // ---------------------------------------------------------------- scene data
  const FAM = ["#4C8FE6", "#2A9D8F", "#C2577A", "#C79A3C", "#6FA34A", "#8E7CF0"];
  const SLAB = { x0: -5, y0: -5, s: 10, z: .7 };                      // the meaning space
  const CL = [[-2.6, 2.6], [-2.8, -1.4], [1.6, 2.8], [2.6, -2.2], [-.2, .4], [.4, -3.4]];   // cluster centres per family
  const JOB = { cx: -1.8, cy: -7.4, rim: 9.0, neck: 3.6, R: 3.4, r: .35 };                // job-posting funnel
  const RES = { cx: 6.4, cy: -6.2, rim: 7.4, neck: 3.2, R: 1.5, r: .25 };                  // resume funnel
  const Q = { x: -2.4, y: 2.2 };                                     // where the question lands (data cluster)
  const GEM = { x: 8.6, y: .6, z: 2.2 };                            // Gemma cube
  const N = 140;
  const G = [...Array(N)].map((_, i) => {
    const c = i % 6, a = rnd(i, 1) * Math.PI * 2, rr = Math.sqrt(rnd(i, 2)) * 1.25;
    return { c, x: clamp(CL[c][0] + Math.cos(a) * rr, -4.6, 4.6), y: clamp(CL[c][1] + Math.sin(a) * rr, -4.6, 4.6) };
  });
  // similarity to the question (closer on the slab = more similar); the top five are the nearest grains
  G.forEach(g => { g.d = Math.hypot(g.x - Q.x, g.y - Q.y); g.sim = Math.exp(-(g.d * g.d) / 6); });
  const TOP = [...G.keys()].sort((a, b) => G[a].d - G[b].d).slice(0, 5);
  // resume grains: land next to their nearest job grains (mostly the data cluster, one near software)
  const RG = [[-1.7, 3.3], [-3.2, 1.5], [-1.4, 1.6], [-2.1, -.8]].map(([x, y], i) => {
    const near = [...G.keys()].sort((a, b) => Math.hypot(G[a].x - x, G[a].y - y) - Math.hypot(G[b].x - x, G[b].y - y)).slice(0, 2);
    return { x, y, near, ph: i / 4 };
  });

  const LEVELS = [
    { n: 1, name: "Chunk", note: ["424 postings", "→ 2,841 chunks"] },
    { n: 2, name: "Embed", note: ["one shared space,", "256 numbers each"] },
    { n: 3, name: "Retrieve", note: ["5 closest to the", "question → Gemma"] },
    { n: 4, name: "Evaluate", note: ["tested separately:", "47 of 48 found"] },
    { n: 5, name: "Your resume", note: ["same model,", "same space"] },
  ];

  // ---------------------------------------------------------------- drawing
  function funnel(F, on, tint, t, seed, docs) {
    let s = "";
    const rim = ell(F.cx, F.cy, F.rim, F.R), neck = ell(F.cx, F.cy, F.neck, F.r);
    const glass = on ? "#E8892B" : tint, edge = on ? "#FFB45E" : "rgba(255,255,255,.75)";
    // documents dropping into the rim, cut as they enter
    if (docs) for (let k = 0; k < 3; k++) {
      const q = (t * .3 + k / 3) % 1, y = mix(rim.y - 120, rim.y - 8, ease(q / .7)), op = q < .7 ? 1 : clamp(1 - (q - .7) / .1);
      if (op <= 0) continue;
      const x = rim.x + (k - 1) * rim.rx * .45, cut = q > .5;
      s += `<g transform="translate(${f(x)},${f(y)}) rotate(${(k - 1) * 9})" opacity="${f(op)}"><rect x="-13" y="-17" width="26" height="34" rx="3" fill="#F4F6FB" stroke="#AEB8D8"/>` +
        [0, 1, 2, 3].map(j => `<rect x="-8" y="${-11 + j * 6}" width="${j ? 16 : 10}" height="2.4" fill="${j ? "#8A96B8" : "#1D3270"}"/>`).join("") +
        (cut ? `<line x1="-17" y1="-3" x2="17" y2="-3" stroke="#E8892B" stroke-width="2" stroke-dasharray="4 3"/><line x1="-17" y1="9" x2="17" y2="9" stroke="#E8892B" stroke-width="2" stroke-dasharray="4 3"/>` : "") + `</g>`;
    }
    // glass cone: back rim, body, grains, front rim
    s += `<path d="${arc(rim, "back")}" fill="none" stroke="${edge}" stroke-width="1.5" opacity=".6"/>`;
    s += `<path d="M${f(rim.x - rim.rx)} ${f(rim.y)} L${f(neck.x - neck.rx)} ${f(neck.y)} A${f(neck.rx)} ${f(neck.ry)} 0 0 0 ${f(neck.x + neck.rx)} ${f(neck.y)} L${f(rim.x + rim.rx)} ${f(rim.y)} A${f(rim.rx)} ${f(rim.ry)} 0 0 1 ${f(rim.x - rim.rx)} ${f(rim.y)}Z" fill="${glass}" fill-opacity="${on ? .28 : .16}"/>`;
    // left / right shading strips give the cone a solid, lit look
    s += `<path d="M${f(rim.x - rim.rx)} ${f(rim.y)} L${f(neck.x - neck.rx)} ${f(neck.y)} L${f(neck.x)} ${f(neck.y + neck.ry)} L${f(rim.x - rim.rx * .35)} ${f(rim.y + rim.ry * .94)}Z" fill="#FFFFFF" fill-opacity=".07"/>`;
    const n = docs ? 26 : 9;
    for (let i = 0; i < n; i++) {
      const q = (t / 4.5 + rnd(i + seed, 3)) % 1, a = rnd(i + seed, 4) * 6.28 + q * 5, z = mix(F.rim - .2, F.neck, q), rr = mix(F.R, F.r, q) * .8 * Math.sqrt(rnd(i + seed, 5));
      const [x, y] = P(F.cx + Math.cos(a) * rr, F.cy + Math.sin(a) * rr, z);
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(mix(3.2, 2.4, q))}" fill="${docs ? "#F4F6FB" : "#F08A24"}" opacity="${f(.95 - q * .25)}"/>`;
    }
    s += `<path d="${arc(rim, "front")}" fill="none" stroke="${edge}" stroke-width="2.2"/>`;
    s += `<ellipse cx="${f(neck.x)}" cy="${f(neck.y)}" rx="${f(neck.rx)}" ry="${f(neck.ry)}" fill="none" stroke="${edge}" stroke-width="1.6"/>`;
    return s;
  }

  function svg(t, active = 1) {
    let s = "";
    const on = n => active === n;
    const dim = n => (active === n ? 1 : .55);

    // ---- phase tags
    s += txt(18, 26, "BUILT ONCE", 12, "#AEB8D8", 800) + txt(18, 41, "chunk + embed the postings", 12, "#7F8DB8", 500);
    s += txt(622, 470, "EVERY QUESTION", 12, "#AEB8D8", 800, "end") + txt(622, 485, "compare, pick 5, answer", 12, "#7F8DB8", 500, "end");

    // ---- evaluate (off to the side: a separate test)
    const ev = on(4);
    s += slab(-1.6, 7.6, 0, 4.4, 3.3, .35, ev ? "#3a2f2a" : "#1D3270", "#16285c", "#122250", .95, ev ? "#FFB45E" : "rgba(255,255,255,.35)");
    for (let i = 0; i < 48; i++) {
      const cx = -1.35 + (i % 8) * .52, cy = 7.85 + Math.floor(i / 8) * .48;
      const k = ev ? clamp((t % 6) * 1.6 - i * .06) : 1, miss = i === 35;
      s += slab(cx, cy, .35 + k * .12, .38, .36, .1, miss ? "#E46B6B" : k < 1 ? "#5A6FB0" : "#3FBF7F", "#2A3F80", "#22346A", ev ? 1 : .7, "none");
    }

    // ---- the meaning-space slab
    const em = on(2);
    s += slab(SLAB.x0, SLAB.y0, 0, SLAB.s, SLAB.s, SLAB.z, em ? "#3B3170" : "#26357A", em ? "#C46A17" : "#4C519E", em ? "#A95810" : "#3F4489", 1, em ? "#FFB45E" : "rgba(255,255,255,.55)");
    // faint grid on the slab top
    for (let g = 1; g < 5; g++) {
      const a = SLAB.x0 + g * 2;
      s += `<line x1="${f(P(a, SLAB.y0, SLAB.z)[0])}" y1="${f(P(a, SLAB.y0, SLAB.z)[1])}" x2="${f(P(a, SLAB.y0 + SLAB.s, SLAB.z)[0])}" y2="${f(P(a, SLAB.y0 + SLAB.s, SLAB.z)[1])}" stroke="#6F84C8" stroke-width=".8" opacity=".55"/>`;
      s += `<line x1="${f(P(SLAB.x0, a, SLAB.z)[0])}" y1="${f(P(SLAB.x0, a, SLAB.z)[1])}" x2="${f(P(SLAB.x0 + SLAB.s, a, SLAB.z)[0])}" y2="${f(P(SLAB.x0 + SLAB.s, a, SLAB.z)[1])}" stroke="#6F84C8" stroke-width=".8" opacity=".55"/>`;
    }

    // ---- question cycle: land, score every grain, lift the 5 closest, send to Gemma
    const qp = (t / 8) % 1, land = ease(clamp(qp / .12)), score = clamp((qp - .14) / .2), lift = ease(clamp((qp - .38) / .16)), fly = ease(clamp((qp - .56) / .16)), ans = clamp((qp - .72) / .08) * (1 - clamp((qp - .95) / .05));
    const qOn = on(3);

    // grains on the slab: they persist; while a question is being scored, brightness follows similarity
    G.forEach((g, i) => {
      const [x, y] = P(g.x, g.y, SLAB.z + .02);
      const b = score > 0 ? mix(1, .25 + .75 * g.sim, score) : 1;
      const top = TOP.includes(i) && score > .6;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${top ? 3.8 : 2.8}" fill="${top ? "#FFF1A8" : FAM[g.c]}" opacity="${f(b)}"/>`;
    });

    // job funnel pours new grains onto the slab (the index being built)
    const jn = ell(JOB.cx, JOB.cy, JOB.neck, JOB.r);
    for (let i = 0; i < 6; i++) {
      const q = (t / 3 + i / 6) % 1, g = G[(i * 23) % N];
      const [sx, sy] = [jn.x, jn.y], [tx, ty] = P(g.x, g.y, SLAB.z + .02);
      const x = mix(sx, tx, ease(q)), y = mix(sy, ty, q) - Math.sin(q * Math.PI) * 18;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="2.8" fill="${q < .5 ? "#F4F6FB" : FAM[g.c]}" opacity="${f(1 - clamp((q - .9) / .1))}"/>`;
    }
    s += funnel(JOB, on(1), "#E8E6F6", t, 0, true);

    // the question pin and its score ring
    const [qx, qy] = P(Q.x, Q.y, SLAB.z + .02), pinY = mix(qy - 110, qy - 46, land);
    if (score > 0) s += `<ellipse cx="${f(qx)}" cy="${f(qy)}" rx="${f(score * 120)}" ry="${f(score * 60)}" fill="none" stroke="#FFD36B" stroke-width="1.5" opacity="${f((1 - score) * .9)}"/>`;
    s += `<line x1="${f(qx)}" y1="${f(pinY + 10)}" x2="${f(qx)}" y2="${f(qy)}" stroke="#FFD36B" stroke-width="1.5" stroke-dasharray="3 3" opacity="${f(land * (qOn ? 1 : .6))}"/>`;
    s += `<path d="M${f(qx)} ${f(pinY - 11)} l11 11 l-11 11 l-11 -11z" fill="#FFD36B" opacity="${f(qOn ? 1 : .75)}"/>`;
    s += txt(qx - 16, pinY - 4, "question", 13, "#FFD36B", 800, "end", qOn ? 1 : .75);

    // the five closest: copies rise to the question, then fly into Gemma (the originals stay on the slab)
    const [gx, gy] = P(GEM.x, GEM.y, GEM.z + .6);
    TOP.forEach((i, j) => {
      if (lift <= 0 || fly >= 1) return;
      const g = G[i], [x0, y0] = P(g.x, g.y, SLAB.z + .02);
      const x1 = qx + (j - 2) * 9, y1 = pinY + 22;
      const x = fly > 0 ? mix(x1, gx, fly) : mix(x0, x1, lift), y = fly > 0 ? mix(y1, gy, fly) - Math.sin(fly * Math.PI) * 40 : mix(y0, y1, lift);
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="7" fill="#FFF1A8" opacity=".3"/><circle cx="${f(x)}" cy="${f(y)}" r="3.8" fill="#FFF1A8"/>`;
    });

    // Gemma cube and the answer card
    const gh = qOn ? 1 : .8;
    s += slab(GEM.x - .8, GEM.y - .8, GEM.z, 1.6, 1.6, 1.6, "#F2A04A", "#C46A17", "#A95810", gh, qOn ? "#FFD9A8" : "rgba(255,255,255,.5)");
    const [lx, ly] = P(GEM.x - .8, GEM.y + .8, GEM.z + .5);
    s += `<text transform="translate(${f(lx + 3)},${f(ly - 2)}) skewY(30)" font-family="Archivo,system-ui,sans-serif" font-size="11" font-weight="800" fill="#fff">Gemma</text>`;
    const [ax, ay] = P(GEM.x + 1.2, GEM.y - 2.6, GEM.z + 2.6);
    s += `<g opacity="${f(ans * (qOn ? 1 : .8))}"><rect x="${f(ax)}" y="${f(ay - 22)}" width="128" height="58" rx="9" fill="#fff"/>` +
      txt(ax + 10, ay - 3, "BI Analyst [1]", 12, "#1E2A36", 800) + txt(ax + 10, ay + 13, "Tableau, SQL [2]", 12, "#4A5563", 600) + txt(ax + 10, ay + 28, "Power BI [4] …", 12, "#4A5563", 600) + `</g>`;

    // ---- resume funnel: same model, same space; its grains land next to their nearest job grains
    const ro = on(5);
    s += funnel(RES, ro, "#F08A24", t, 50, false);
    const rn = ell(RES.cx, RES.cy, RES.neck, RES.r);
    RG.forEach((r, i) => {
      const q = (t / 5 + r.ph) % 1, land2 = ease(clamp(q / .35)), [tx, ty] = P(r.x, r.y, SLAB.z + .02);
      const x = mix(rn.x, tx, land2), y = mix(rn.y, ty, land2) - Math.sin(land2 * Math.PI) * 50;
      if (land2 >= 1) r.near.forEach(k => { const [nx, ny] = P(G[k].x, G[k].y, SLAB.z + .02); s += `<line x1="${f(tx)}" y1="${f(ty)}" x2="${f(nx)}" y2="${f(ny)}" stroke="#F08A24" stroke-width="${ro ? 2.2 : 1.4}" opacity="${ro ? .95 : .65}"/>`; });
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${ro ? 5.2 : 4.4}" fill="#F08A24" stroke="#FFFFFF" stroke-width="1.6" opacity="${f(ro ? 1 : .9)}"/>`;
    });

    // ---- labels
    const lab = (n, x, y, anchor = "start") => {
      const L = LEVELS[n - 1], c = on(n) ? "#FFB45E" : "#FFFFFF", nc = on(n) ? "#FFD9A8" : "#AEB8D8";
      return txt(x, y, `${n} · ${L.name}`, 17, c, 800, anchor) + txt(x, y + 18, L.note[0], 13, nc, 500, anchor) + txt(x, y + 33, L.note[1], 13, nc, 500, anchor);
    };
    s += lab(1, 18, 92) + lab(2, 18, 252) + lab(3, 622, 398, "end") + lab(4, 18, 470) + lab(5, 622, 112, "end");
    return s;
  }

  // invisible click targets (viewBox coordinates); later entries win where they overlap
  const HIT = [
    { n: 2, x: 0, y: 225, w: 470, h: 170 }, { n: 1, x: 0, y: -30, w: 420, h: 255 },
    { n: 3, x: 470, y: 230, w: 170, h: 220 }, { n: 4, x: 0, y: 395, w: 330, h: 125 }, { n: 5, x: 420, y: 60, w: 220, h: 170 },
  ];
  root.RAGFunnel = { svg, LEVELS, HIT, VIEW: "0 -30 640 560" };
})(typeof window !== "undefined" ? window : globalThis);
