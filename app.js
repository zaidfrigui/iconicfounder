/* ============================================================
   CLIENT QUESTIONNAIRE ENGINE
   Renders questions from questions.js using text from translations.js.
   Autosaves to this browser (localStorage) after every change.
   ============================================================ */
(function () {
  const P = window.PB, S = P.S, C = P.C;
  const KEY = "pb_onboarding_v1";
  const stage = document.getElementById("stage");
  const top = document.getElementById("top");
  const nav = document.getElementById("nav");

  /* ---------- state ---------- */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function guessLang() {
    const n = (navigator.language || "en").slice(0, 2).toLowerCase();
    return C.languages.includes(n) ? n : C.languages[0];
  }
  function fresh() {
    return { lang: guessLang(), market: C.defaultMarket, answers: {}, pos: -1, sid: uuid(), startedAt: null, activeMs: 0, submittedAt: null };
  }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.answers) return s; } catch (e) {}
    return null;
  }
  let st = load() || fresh();
  const hadSaved = !!(st.startedAt);
  let saveTimer = null, lastTick = Date.now();
  function save() {
    const now = Date.now();
    st.activeMs = (st.activeMs || 0) + Math.min(now - lastTick, 90000);
    lastTick = now;
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    const hint = document.querySelector(".savedhint");
    if (hint) { hint.classList.add("on"); clearTimeout(saveTimer); saveTimer = setTimeout(() => hint.classList.remove("on"), 1200); }
  }
  // Applies a URL ?lang=fr when the mentor sends a language-specific link.
  const urlLang = new URLSearchParams(location.search).get("lang");
  if (urlLang && C.languages.includes(urlLang) && !hadSaved) st.lang = urlLang;

  const steps = [];
  S.sections.forEach(sec => {
    steps.push({ k: "sec", sec });
    S.questions.filter(q => q.s === sec.id).forEach(q => steps.push({ k: "q", q, sec }));
  });
  steps.push({ k: "review" });
  const qSteps = steps.filter(s => s.k === "q");
  if (st.pos >= steps.length) st.pos = steps.length - 1;

  const t = (k, v) => P.ui(st.lang, k, Object.assign({ mentor: C.mentorName }, v || {}));
  const get = id => st.answers[id];
  function set(id, val) { st.answers[id] = val; save(); refreshNav(); }

  /* ---------- tiny DOM helper ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "value") el.value = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach(c => { if (c == null || c === false) return; el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); });
    return el;
  }
  const arrow = () => h("span", { class: "arrow", "aria-hidden": "true" }, "→");

  /* ---------- chrome ---------- */
  function applyLang() {
    const T = P.L(st.lang);
    document.documentElement.lang = st.lang;
    document.documentElement.dir = T.dir;
    document.title = C.brandName + " · " + t("kicker");
  }
  function sectionMinLeft(step) {
    const qs = S.questions.filter(q => q.s === step.sec.id);
    const total = qs.reduce((a, q) => a + q.w, 0);
    const from = step.k === "q" ? qs.indexOf(step.q) : 0;
    const left = qs.slice(from).reduce((a, q) => a + q.w, 0);
    return step.sec.min * left / total;
  }
  function renderTop(step) {
    top.innerHTML = "";
    if (!step) { top.hidden = true; return; }
    top.hidden = false;
    const secIdx = step.sec ? S.sections.indexOf(step.sec) : S.sections.length - 1;
    const doneQ = step.k === "review" ? qSteps.length : qSteps.indexOf(steps.slice(st.pos).find(s => s.k === "q"));
    const pct = Math.max(2, Math.round(100 * doneQ / qSteps.length));
    const wrap = h("div", { class: "wrap" },
      h("div", { class: "brand" }, h("span", { class: "dot" }), C.brandName),
      h("span", { class: "savedhint", "aria-live": "polite" }, "✓ " + t("saved")),
      h("button", { class: "iconbtn", onclick: openDrawer, "aria-label": t("menu") }, "☰ ", t("menu")));
    const prog = h("div", { class: "progress", role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100 }, h("i", { style: `width:${pct}%` }));
    top.append(wrap, prog);
    if (step.sec) {
      const m = sectionMinLeft(step);
      top.append(h("div", { class: "wrap" }, h("div", { class: "subbar" },
        h("span", null, h("b", null, t("sectionOf", { n: secIdx + 1, total: S.sections.length })), " · ", P.L(st.lang).sections[step.sec.id].t),
        h("span", null, m < 1 ? t("lessMin") : t("minLeft", { m: Math.ceil(m) })))));
    }
  }

  let navRefs = null;
  function renderNav(step) {
    nav.innerHTML = ""; navRefs = null;
    if (!step || step.k !== "q") { nav.hidden = true; return; }
    nav.hidden = false;
    const back = h("button", { class: "btn btn-ghost back", onclick: () => go(-1), "aria-label": t("back") }, h("span", { class: "arrow", style: "transform:scaleX(-1)" }, "→"));
    if (P.L(st.lang).dir === "rtl") back.firstChild.style.transform = "none";
    const skip = h("button", { class: "skip", onclick: () => go(1) }, t("skip"));
    const next = h("button", { class: "btn btn-primary", onclick: onNext }, t("next"), " ", arrow());
    nav.append(h("div", { class: "wrap" }, back, h("span", { class: "spacer" }), skip, next));
    navRefs = { skip, next, step };
    refreshNav();
  }
  function refreshNav() {
    if (!navRefs) return;
    const q = navRefs.step.q;
    navRefs.skip.style.display = P.isAnswered(q, get(q.id)) || ["slider", "bipolar"].includes(q.t) ? "none" : "";
    const n = document.querySelector(".nudge.show");
    if (n && P.isAnswered(q, get(q.id)) && !n.dataset.sticky) n.classList.remove("show");
  }

  function nudge(msg, sticky) {
    const n = document.querySelector(".nudge");
    if (!n) return;
    n.textContent = msg; n.classList.remove("show"); void n.offsetWidth; n.classList.add("show");
    if (sticky) n.dataset.sticky = "1"; else delete n.dataset.sticky;
  }
  function onNext() {
    const q = navRefs.step.q, v = get(q.id);
    if (q.t === "slider" && !P.isAnswered(q, v)) st.answers[q.id] = q.def;
    if (q.t === "bipolar") { const o = Object.assign({}, v || {}); q.opts.forEach(k => { if (o[k] == null) o[k] = 5; }); st.answers[q.id] = o; }
    const val = get(q.id);
    if (q.t === "multi" && q.exact && val && val.choices && val.choices.length && val.choices.length !== q.exact) return nudge(t("pickExact", { n: q.exact }), true);
    if (q.t === "rank" && q.minPick && Array.isArray(val) && val.length && val.length < q.minPick) return nudge(t("rankMin", { n: q.minPick }), true);
    if (q.req && !P.isAnswered(q, val)) return nudge(t("requiredNudge"));
    save(); go(1);
  }
  function go(d) { st.pos = Math.max(-1, Math.min(steps.length - 1, st.pos + d)); save(); render(); }
  function jump(i) { atWelcome = false; st.pos = i; save(); render(); }

  /* ---------- drawer ---------- */
  function openDrawer() {
    const close = () => { bg.remove(); dr.remove(); };
    const bg = h("div", { class: "drawer-bg", onclick: close });
    const list = S.sections.map((sec, i) => {
      const qs = S.questions.filter(q => q.s === sec.id);
      const ans = qs.filter(q => P.isAnswered(q, get(q.id))).length;
      const idx = steps.findIndex(s => s.k === "sec" && s.sec === sec);
      const cur = steps[st.pos] && steps[st.pos].sec === sec;
      return h("button", { class: "sitem" + (cur ? " cur" : ""), onclick: () => { close(); jump(idx); } },
        h("span", { class: "n" }, i + 1), P.L(st.lang).sections[sec.id].t,
        h("span", { class: "st" + (ans === qs.length ? " ok" : "") }, ans === qs.length ? "✓" : `${ans}/${qs.length}`));
    });
    const dr = h("aside", { class: "drawer", role: "dialog", "aria-label": t("menu") },
      h("h3", null, t("menu"), h("button", { class: "iconbtn", onclick: close }, t("close"))),
      langPills(() => { close(); render(); }),
      h("div", { style: "height:12px" }), list,
      h("button", { class: "sitem", onclick: () => { close(); jump(steps.length - 1); } }, h("span", { class: "n" }, "✓"), t("reviewTitle")));
    document.body.append(bg, dr);
  }
  function langPills(after) {
    return h("div", { class: "langs", role: "group", "aria-label": t("chooseLang") },
      C.languages.map(code => h("button", { "aria-pressed": String(st.lang === code), lang: code,
        onclick: () => { st.lang = code; save(); applyLang(); after && after(); } }, P.L(code).name)));
  }

  /* ---------- screens ---------- */
  let lastPos = null, atWelcome = true;
  function render() {
    applyLang();
    const animate = st.pos !== lastPos; lastPos = st.pos;
    stage.innerHTML = "";
    const step = !atWelcome && st.pos >= 0 ? steps[st.pos] : null;
    renderTop(step);
    renderNav(step);
    let scr;
    if (!step) scr = welcome();
    else if (st.submittedAt && step.k === "review") scr = doneScreen();
    else if (step.k === "sec") scr = secIntro(step);
    else if (step.k === "q") scr = question(step);
    else scr = review();
    if (!animate) scr.classList.add("still");
    stage.append(scr);
    if (animate) window.scrollTo(0, 0);
    const first = stage.querySelector("input.input, textarea");
    if (first && step && step.k === "q" && matchMedia("(min-width: 720px)").matches) first.focus({ preventScroll: true });
  }

  function welcome() {
    const initial = (C.brandName.match(/[A-Za-z؀-ۿ]/) || [C.mentorName[0]])[0].toUpperCase();
    const resume = hadSaved || st.startedAt;
    const begin = () => { atWelcome = false; if (!st.startedAt) st.startedAt = new Date().toISOString(); lastTick = Date.now(); st.pos = Math.max(0, st.pos); save(); render(); };
    return h("section", { class: "screen welcome" },
      langPills(render),
      h("div", { class: "brandname" }, h("span", { class: "mark" }, initial), C.brandName),
      h("p", { class: "kicker" }, t("kicker")),
      h("h1", { class: "title" }, t("welcomeTitle")),
      h("p", { class: "intro" }, t("welcomeIntro")),
      h("p", { class: "sign" }, t("sign")),
      h("div", { class: "metas" },
        h("div", null, h("b", null, t("metaTime")), h("span", null, t("metaTimeL"))),
        h("div", null, h("b", null, t("metaSections")), h("span", null, t("metaSectionsL"))),
        h("div", null, h("b", null, t("metaSave")), h("span", null, t("metaSaveL")))),
      resume ? h("div", { class: "notice" }, t("welcomeBack")) : null,
      h("div", { class: "stack" },
        h("button", { class: "btn btn-primary block", onclick: begin }, resume ? t("resume") : t("start"), " ", arrow()),
        resume ? h("button", { class: "linkbtn", onclick: e => {
          // Two-tap confirmation (no browser dialog: works everywhere, including embedded previews).
          const b = e.currentTarget;
          if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = t("restartConfirm"); return; }
          try { localStorage.removeItem(KEY); } catch (x) {} const l = st.lang; st = fresh(); st.lang = l; render();
        } }, t("restart")) : null));
  }

  function secIntro(step) {
    const i = S.sections.indexOf(step.sec);
    const T = P.L(st.lang).sections[step.sec.id];
    const n = S.questions.filter(q => q.s === step.sec.id).length;
    return h("section", { class: "screen secintro" },
      h("div", { class: "secnum" }, String(i + 1).padStart(2, "0")),
      h("h2", null, T.t), h("p", null, T.d),
      h("div", { class: "pills" },
        h("span", { class: "pill" }, "⏱ " + t("minLeft", { m: step.sec.min }).replace(/^≈\s*/, "≈ ")),
        h("span", { class: "pill" }, t("questionsCount", { n }))),
      h("div", { class: "stack" },
        h("button", { class: "btn btn-primary block", onclick: () => go(1) }, t("sectionStart"), " ", arrow()),
        st.pos > 0 ? h("button", { class: "linkbtn", onclick: () => go(-1) }, t("back")) : h("button", { class: "linkbtn", onclick: () => { st.pos = -1; render(); } }, t("back"))));
  }

  function question(step) {
    const q = step.q, T = P.qt(st.lang, q.id);
    const secIdx = S.sections.indexOf(step.sec);
    const qi = S.questions.filter(x => x.s === q.s).indexOf(q) + 1;
    const body = (INPUTS[q.t] || INPUTS.short)(q, T);
    return h("section", { class: "screen" },
      h("div", { class: "qhead" },
        h("div", { class: "qnum" }, `${secIdx + 1}.${qi}`, !q.req ? h("span", { class: "tag" }, t("optional")) : null,
          q.id === "q9_5" || q.id === "q0_7" ? h("span", { class: "tag" }, "🔒 " + t("confidential")) : null),
        h("h2", { class: "qlabel", id: "ql" }, T.l),
        T.h ? h("p", { class: "qhelp" }, T.h) : null),
      body,
      h("div", { class: "nudge", role: "status" }));
  }

  /* ---------- inputs ---------- */
  function autogrow(el) { const f = () => { el.style.height = "auto"; el.style.height = Math.max(el.scrollHeight + 2, 0) + "px"; }; el.addEventListener("input", f); requestAnimationFrame(f); return el; }
  function textInput(value, ph, oninput, kind) {
    if (kind === "long") return autogrow(h("textarea", { class: "textarea sm", dir: "auto", placeholder: ph || "", value: value || "", oninput: e => oninput(e.target.value) }));
    const type = kind === "email" ? "email" : kind === "tel" ? "tel" : "text";
    const el = h("input", { class: "input", type, placeholder: ph || "", value: value || "", autocomplete: kind === "email" ? "email" : kind === "tel" ? "tel" : "off",
      inputmode: kind === "number" ? "decimal" : null, dir: kind === "tel" || kind === "email" ? "ltr" : "auto",
      oninput: e => oninput(e.target.value) });
    el.addEventListener("keydown", e => { if (e.key === "Enter" && navRefs) { e.preventDefault(); onNext(); } });
    return el;
  }
  function choiceBtn(label, pressed, radio, onclick, badge) {
    return h("button", { class: "choice" + (radio ? " radio" : ""), "aria-pressed": String(!!pressed), onclick, type: "button" },
      h("span", { class: "box" }), h("span", null, label), badge != null ? h("span", { class: "badge" }, badge) : null);
  }
  function rerender() { const y = window.scrollY; render(); window.scrollTo(0, y); }

  const INPUTS = {
    short(q, T) { return textInput(get(q.id), T.ph, v => set(q.id, v), q.input); },
    long(q, T) {
      const el = h("textarea", { class: "textarea", dir: "auto", placeholder: T.ph || "", value: get(q.id) || "", "aria-labelledby": "ql", oninput: e => set(q.id, e.target.value) });
      return autogrow(el);
    },
    number(q, T) {
      const v = get(q.id);
      return h("div", { class: "unitrow" },
        textInput(v == null ? "" : String(v), T.ph, x => set(q.id, P.parseNum(x)), "number"),
        h("span", { class: "unit" }, T.unit || (q.currency ? P.market(st.market).currency : "")));
    },
    single(q, T) {
      const v = get(q.id) || {};
      const opts = P.options(q, st.lang, st.market);
      if (q.other) opts.push({ k: "other", label: t("other") });
      const wrap = h("div", null, h("div", { class: "choices" + (opts.length > 6 ? " auto2" : "") },
        opts.map(o => choiceBtn(o.label, v.choice === o.k, true, () => { set(q.id, Object.assign({}, v, { choice: o.k })); rerender(); }))));
      if (v.choice === "other") wrap.append(h("div", { class: "other" }, textInput(v.other, t("otherPh"), x => set(q.id, { choice: "other", other: x }))));
      return wrap;
    },
    multi(q, T) {
      const v = get(q.id) || { choices: [] };
      const chosen = v.choices || [];
      const opts = P.options(q, st.lang, st.market);
      if (q.other) opts.push({ k: "other", label: t("other") });
      const toggle = k => {
        let c = chosen.slice();
        if (c.includes(k)) c = c.filter(x => x !== k);
        else { if (q.exact && c.length >= q.exact) return nudge(t("pickExact", { n: q.exact }), true); c.push(k); }
        const nv = Object.assign({}, v, { choices: c });
        if (!c.includes("other")) delete nv.other;
        set(q.id, nv); rerender();
      };
      const wrap = h("div", null,
        q.exact ? h("p", { class: "counter" }, t("pickExact", { n: q.exact }) + " · " + t("pickedOf", { n: chosen.length, total: q.exact })) : null,
        h("div", { class: "choices" + (opts.length > 6 ? " auto2" : "") }, opts.map(o => choiceBtn(o.label, chosen.includes(o.k), false, () => toggle(o.k)))));
      if (chosen.includes("other")) wrap.append(h("div", { class: "other" }, textInput(v.other, t("otherPh"), x => set(q.id, Object.assign({}, get(q.id), { other: x })))));
      if (q.details) wrap.append(h("div", { class: "field", style: "margin-top:14px" }, h("label", { class: "flabel" }, t("details")),
        textInput(v.details, T.dph || t("detailsPh"), x => set(q.id, Object.assign({ choices: [] }, get(q.id), { details: x })), "long")));
      return wrap;
    },
    scale(q, T) {
      const v = get(q.id);
      const n = q.max - q.min + 1;
      return h("div", null,
        h("div", { class: "scale" + (n === 5 ? " s5" : n === 4 ? " s4" : ""), role: "radiogroup", "aria-labelledby": "ql" },
          Array.from({ length: n }, (_, i) => q.min + i).map(x => h("button", { type: "button", "aria-pressed": String(v === x), onclick: () => { set(q.id, x); rerender(); } }, x))),
        h("div", { class: "ends" }, h("span", null, `${q.min} · ${T.lo || ""}`), h("span", null, `${T.hi || ""} · ${q.max}`)));
    },
    slider(q, T) {
      const v = get(q.id);
      const cur = v == null ? q.def : v;
      const label = x => q.pct ? P.fill(t("sliderPct"), { a: 100 - x, left: T.left, b: x, right: T.right }) : x + (T.unit ? " " + T.unit : "");
      const val = h("div", { class: "sval" }, label(cur));
      if (q.pct) val.style.fontSize = "22px";
      const r = h("input", { type: "range", min: q.min, max: q.max, step: q.step, value: cur, class: v == null ? "untouched" : "", "aria-labelledby": "ql",
        oninput: e => { const x = +e.target.value; e.target.classList.remove("untouched"); val.textContent = label(x); set(q.id, x); } });
      return h("div", { class: "slider" }, val, r,
        h("div", { class: "ends" }, h("span", null, q.pct ? T.left : `${q.min}${T.lo ? " · " + T.lo : ""}`), h("span", null, q.pct ? T.right : `${T.hi ? T.hi + " · " : ""}${q.max}`)));
    },
    bipolar(q, T) {
      const v = get(q.id) || {};
      return h("div", null, q.opts.map(k => {
        const [a, b] = (T.items || {})[k] || [k, k];
        const r = h("input", { type: "range", min: 0, max: 10, step: 1, value: v[k] == null ? 5 : v[k], class: v[k] == null ? "untouched" : "", "aria-label": `${a} – ${b}`,
          oninput: e => { e.target.classList.remove("untouched"); set(q.id, Object.assign({}, get(q.id) || {}, { [k]: +e.target.value })); } });
        return h("div", { class: "bip" }, h("div", { class: "ends" }, h("span", null, a), h("span", null, b)), r);
      }));
    },
    rank(q, T) {
      let v = Array.isArray(get(q.id)) ? get(q.id) : [];
      let opts;
      if (q.from) {
        const src = (get(q.from) || {}).choices || [];
        opts = src.map(k => ({ k, label: (P.L(st.lang).lists[q.list] || {})[k] || k }));
        v = v.filter(k => src.includes(k));
        if (!opts.length) return h("div", { class: "notice" }, t("rankEmpty"));
      } else opts = P.options(q, st.lang, st.market);
      const max = q.top || opts.length;
      const tap = k => {
        let nv = v.slice();
        if (nv.includes(k)) nv = nv.filter(x => x !== k); else if (nv.length < max) nv.push(k); else return;
        set(q.id, nv); rerender();
      };
      return h("div", null,
        h("p", { class: "counter" }, t("rankHint") + (q.minPick ? " " + t("rankMin", { n: q.minPick }) : "")),
        h("div", { class: "choices" }, opts.map(o => { const i = v.indexOf(o.k); return choiceBtn(o.label, i >= 0, false, () => tap(o.k), i >= 0 ? i + 1 : null); })),
        v.length ? h("button", { class: "linkbtn", style: "margin-top:8px", onclick: () => { set(q.id, []); rerender(); } }, t("reset")) : null);
    },
    ratingGrid(q, T) {
      const v = get(q.id) || {};
      const [lo, hi] = q.scale;
      const vals = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
      return h("div", null,
        h("div", { class: "gridlegend" }, h("span", null, `${lo} = ${T.lo}`), h("span", null, `${hi} = ${T.hi}`)),
        h("div", { class: "grid" }, P.options(q, st.lang, st.market).map(o => h("div", { class: "grow" },
          h("div", { class: "rl" }, o.label),
          h("div", { class: "seg", role: "radiogroup", "aria-label": o.label }, vals.map(x => h("button", { type: "button", "aria-pressed": String(v[o.k] === x),
            onclick: () => { const nv = Object.assign({}, get(q.id) || {}); nv[o.k] = x; set(q.id, nv); rerender(); } }, x)))))));
    },
    choiceGrid(q, T) {
      const v = get(q.id) || {};
      return h("div", { class: "grid" }, P.options(q, st.lang, st.market).map(o => h("div", { class: "grow" },
        h("div", { class: "rl" }, o.label),
        h("div", { class: "seg" + (q.cols.length > 3 ? " wrap5" : ""), role: "radiogroup", "aria-label": o.label }, q.cols.map(c => h("button", { type: "button", "aria-pressed": String(v[o.k] === c),
          onclick: () => { const nv = Object.assign({}, get(q.id) || {}); nv[o.k] = c; set(q.id, nv); rerender(); } }, P.colLabel(q, st.lang, c)))))));
    },
    checkGrid(q, T) {
      const v = get(q.id) || {};
      return h("div", { class: "grid" }, P.options(q, st.lang, st.market).map(o => h("div", { class: "grow" },
        h("div", { class: "rl" }, o.label),
        h("div", { class: "seg" }, q.cols.map(c => h("button", { type: "button", "aria-pressed": String((v[o.k] || []).includes(c)),
          onclick: () => { const nv = Object.assign({}, get(q.id) || {}); const a = (nv[o.k] || []).slice(); const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); else a.push(c); nv[o.k] = q.cols.filter(x => a.includes(x)); set(q.id, nv); rerender(); } }, P.colLabel(q, st.lang, c)))))));
    },
    table(q, T) {
      const v = get(q.id) || {};
      const upd = (row, col, val) => { const nv = JSON.parse(JSON.stringify(get(q.id) || {})); nv[row] = Object.assign({}, nv[row], { [col]: val }); set(q.id, nv); };
      return h("div", { class: "grid" }, P.options(q, st.lang, st.market).map(o => {
        const row = v[o.k] || {};
        const textCols = q.cols.filter(c => c.input !== "seg");
        const segCols = q.cols.filter(c => c.input === "seg");
        return h("div", { class: "grow" },
          h("div", { class: "rl" }, o.label),
          h("div", { class: "trow", style: textCols.length === 3 ? "grid-template-columns:1fr 1fr 1fr" : "" }, textCols.map(c => {
            const ct = (T.cols || {})[c.k] || {};
            return h("label", null, h("span", { class: "flabel", style: "font-weight:500;font-size:12.5px" }, ct.l),
              textInput(row[c.k] == null ? "" : String(row[c.k]), ct.ph, x => upd(o.k, c.k, c.input === "number" ? P.parseNum(x) : x), c.input));
          })),
          segCols.map(c => {
            const ct = (T.cols || {})[c.k] || {};
            return h("div", { class: "seg", style: "margin-top:8px" }, c.opts.map(x => h("button", { type: "button", "aria-pressed": String(row[c.k] === x),
              onclick: () => { upd(o.k, c.k, row[c.k] === x ? "" : x); rerender(); } }, (ct.o || {})[x] || x)));
          }));
      }));
    },
    repeater(q, T) {
      let v = Array.isArray(get(q.id)) ? get(q.id).slice() : [];
      while (v.length < q.min) v.push({});
      const upd = (i, k, val) => { const nv = (Array.isArray(get(q.id)) ? get(q.id) : []).map(r => Object.assign({}, r)); while (nv.length <= i) nv.push({}); nv[i][k] = val; set(q.id, nv); };
      const wrap = h("div", null, v.map((row, i) => h("div", { class: "rcard" },
        h("div", { class: "rhead" }, h("span", null, "#" + (i + 1)),
          v.length > q.min ? h("button", { type: "button", onclick: () => { v.splice(i, 1); set(q.id, v); rerender(); } }, t("remove")) : null),
        q.fields.map(f => {
          const ft = (T.f || {})[f.k] || {};
          if (f.input === "select") {
            return h("div", { class: "field" }, h("span", { class: "flabel" }, ft.l),
              h("div", { class: "seg wrap5" }, f.opts.map(x => h("button", { type: "button", "aria-pressed": String(row[f.k] === x), onclick: () => { upd(i, f.k, x); rerender(); } }, (ft.o || {})[x] || x))));
          }
          return h("label", { class: "field", style: "display:block" }, h("span", { class: "flabel" }, ft.l), textInput(row[f.k], ft.ph, x => upd(i, f.k, x), f.input));
        }))));
      if (v.length < q.max) wrap.append(h("button", { class: "addrow", type: "button", onclick: () => { v.push({}); set(q.id, v); rerender(); } }, "+ " + t("addRow")));
      return wrap;
    },
    fields(q, T) {
      const v = get(q.id) || {};
      return h("div", null, q.fields.map(f => {
        const ft = (T.f || {})[f.k] || {};
        return h("label", { class: "field", style: "display:block" },
          h("span", { class: "flabel" }, ft.l, !f.req && q.fields.some(x => x.req) ? h("span", { style: "color:var(--muted);font-weight:400" }, " · " + t("optional")) : null),
          textInput(v[f.k], ft.ph, x => set(q.id, Object.assign({}, get(q.id) || {}, { [f.k]: x })), f.input));
      }));
    }
  };

  /* ---------- review & sending ---------- */
  function review() {
    const missing = qSteps.filter(s => s.q.req && !P.isAnswered(s.q, get(s.q.id)));
    const card = h("div", { class: "card" },
      h("p", { style: "margin:0;color:var(--ink-2)" }, missing.length ? t("reviewSkipped", { n: missing.length }) : t("reviewAllGood")),
      missing.length ? h("ul", { class: "missing" }, missing.map(s => {
        const secIdx = S.sections.indexOf(s.sec);
        const qi = S.questions.filter(x => x.s === s.q.s).indexOf(s.q) + 1;
        return h("li", null, h("span", null, `${secIdx + 1}.${qi} · ${P.qt(st.lang, s.q.id).l}`),
          h("button", { onclick: () => jump(steps.indexOf(s)) }, t("answerIt")));
      })) : null);
    const sendBtn = h("button", { class: "btn btn-primary block", onclick: () => send(sendBtn) }, t("send"), " ", arrow());
    return h("section", { class: "screen" },
      h("div", { class: "qhead" }, h("div", { class: "qnum" }, "✓"), h("h2", { class: "qlabel" }, t("reviewTitle"))),
      card, h("div", { style: "height:20px" }),
      h("div", { class: "stack" }, sendBtn, h("button", { class: "linkbtn", onclick: () => go(-1) }, t("back"))));
  }

  let lastSub = null;
  const keyOk = () => C.web3formsKey && !/YOUR-|XXXX/i.test(C.web3formsKey) && C.web3formsKey.length >= 20;
  function fileName(sub) {
    const slug = (sub.client.name || "client").trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").slice(0, 40) || "client";
    return `onboarding_${slug}_${sub.submittedAt.slice(0, 10)}.json`;
  }
  function jsonText(sub) { return JSON.stringify(sub, null, 2); }
  function emailBody(sub) {
    return `New brand onboarding — ${sub.client.name} (${sub.client.business})\n` +
      `Language: ${sub.language} · Answered: ${sub.completion.answered}/${sub.completion.total} · Key questions missing: ${sub.completion.requiredMissing.length}\n` +
      `WhatsApp: ${sub.client.whatsapp} · Email: ${sub.client.email}\n\n` +
      `HOW TO OPEN: copy this whole email (or just the JSON block below) and paste it into your mentor page.\n\n` +
      P.toReadable(sub, { lang: "en", ids: true, stars: true }) +
      `\n\n${P.BEGIN}\n${JSON.stringify(sub)}\n${P.END}\n`;
  }
  async function send(btn) {
    btn.disabled = true; btn.innerHTML = ""; btn.append(h("span", { class: "spinner" }), " ", t("sending"));
    lastSub = P.buildSubmission(st);
    if (window.PB_PREVIEW) return previewDone(lastSub);
    if (!keyOk()) return failScreen();
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: C.web3formsKey,
          subject: `Brand onboarding — ${lastSub.client.name || "New client"}`,
          from_name: C.brandName,
          name: lastSub.client.name, email: lastSub.client.email,
          message: emailBody(lastSub), botcheck: ""
        })
      });
      clearTimeout(to);
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) throw new Error(j.message || res.status);
      st.submittedAt = lastSub.submittedAt; save();
      stage.innerHTML = ""; stage.append(doneScreen()); top.hidden = true; window.scrollTo(0, 0);
    } catch (e) { console.warn("Send failed:", e); failScreen(); }
  }
  function download(sub) {
    const blob = new Blob([jsonText(sub)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: fileName(sub) });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const waOk = () => /^\d{9,15}$/.test(String(C.mentorWhatsApp || "")) && !/^2126?0+$/.test(String(C.mentorWhatsApp));
  function waLink() { return `https://wa.me/${String(C.mentorWhatsApp).replace(/\D/g, "")}?text=${encodeURIComponent(t("waMsg"))}`; }
  function failScreen() {
    const sub = lastSub || P.buildSubmission(st);
    const file = (() => { try { return new File([jsonText(sub)], fileName(sub), { type: "application/json" }); } catch (e) { return null; } })();
    const canShare = file && navigator.canShare && navigator.canShare({ files: [file] });
    stage.innerHTML = ""; top.hidden = true;
    stage.append(h("section", { class: "screen done" },
      h("div", { class: "seal", style: "background:var(--gold);box-shadow:0 0 0 8px var(--gold-soft)" }, "↗"),
      h("h2", null, t("failTitle")), h("p", null, t("failBody")),
      h("div", { class: "stack", style: "max-width:420px;margin:0 auto" },
        canShare ? h("button", { class: "btn btn-primary block", onclick: () => navigator.share({ files: [file], title: fileName(sub), text: t("waMsg") }).catch(() => {}) }, t("shareFile")) : null,
        h("button", { class: canShare ? "btn btn-ghost block" : "btn btn-primary block", onclick: () => download(sub) }, "⬇ ", t("download")),
        waOk() ? h("a", { class: "btn btn-ghost block", href: waLink(), target: "_blank", rel: "noopener" }, t("whatsapp")) : null,
        keyOk() ? h("button", { class: "linkbtn", onclick: () => { st.pos = steps.length - 1; render(); } }, t("retry")) : null),
      h("p", { class: "tip" }, t("failTip"))));
    window.scrollTo(0, 0);
  }
  function doneScreen() {
    const first = ((get("q0_1") || "").trim().split(/\s+/)[0]) || "";
    return h("section", { class: "screen done" },
      h("div", { class: "seal" }, "✓"),
      h("h2", null, t("sentTitle", { name: first }).replace(/,\s*\./, ".").replace(/\s+\./, ".")),
      h("p", null, t("sentBody")),
      window.PB_PREVIEW ? previewCard() : h("button", { class: "linkbtn", onclick: () => download(P.buildSubmission(Object.assign({}, st))) }, t("keepCopy")));
  }

  // Preview mode (used only by the one-click demo): nothing is sent; the mentor desk opens with these answers.
  function previewDone(sub) {
    st.submittedAt = sub.submittedAt; save();
    stage.innerHTML = ""; top.hidden = true; nav.hidden = true;
    stage.append(doneScreen()); window.scrollTo(0, 0);
  }
  function previewCard() {
    return h("div", { class: "card", dir: "ltr", lang: "en", style: "margin-top:28px;text-align:start" },
      h("p", { class: "kicker", style: "margin:0 0 6px" }, "Preview mode · only you see this"),
      h("p", { style: "margin:0 0 14px;color:var(--ink-2);font-size:15px;max-width:none" }, "In the live version, the answers are emailed to you at this point. Here, nothing was sent. Open the mentor desk to see exactly what you'd receive, then copy the analysis prompt."),
      h("button", { class: "btn btn-gold block", onclick: () => window.PB_openMentorPreview && window.PB_openMentorPreview(P.buildSubmission(st)) }, "Open the mentor desk with these answers ", arrow()));
  }

  // Expose a hook for automated tests.
  window.__PB_APP__ = { get state() { return st; }, render: () => { atWelcome = false; render(); }, steps };
  render();
})();
