/* ============================================================
   CORE — shared by the client questionnaire and the mentor page.
   Option resolution, answer checks, readable formatting, JSON export.
   ============================================================ */
(function () {
  const S = window.PB_SCHEMA, C = window.PB_CONFIG, I = window.PB_I18N;
  const byId = Object.fromEntries(S.questions.map(q => [q.id, q]));

  const L = lang => I[lang] || I.en;
  const fill = (str, vars) => String(str == null ? "" : str).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));
  const qt = (lang, id) => Object.assign({}, I.en.q[id] || {}, L(lang).q[id] || {});
  const ui = (lang, key, vars) => fill((L(lang).ui[key] != null ? L(lang).ui[key] : I.en.ui[key]), vars);
  const market = m => S.markets[m] || S.markets[C.defaultMarket];

  function money(n, lang, mk, noCur) {
    const loc = L(lang).locale || "en-GB";
    let s;
    try { s = new Intl.NumberFormat(loc, { notation: "compact", maximumFractionDigits: 1 }).format(n); }
    catch (e) { s = String(n); }
    if (noCur) return s;
    const cur = lang === "en" || lang === "fr" ? market(mk).currency : (L(lang).cur || market(mk).currency);
    return s + " " + cur;
  }
  function rangeLabel(r, lang, mk) {
    const [a, b] = r;
    if (!a) return ui(lang, "under", { x: money(b, lang, mk) });
    if (b == null) return ui(lang, "over", { x: money(a, lang, mk) });
    return money(a, lang, mk, true) + " – " + money(b, lang, mk);
  }
  function listLabel(q, lang, k) {
    const T = L(lang), E = I.en;
    if (q.list) return (T.lists[q.list] || {})[k] || (E.lists[q.list] || {})[k] || k;
    if (q.marketList) return (T.lists[q.marketList] || {})[k] || (E.lists[q.marketList] || {})[k] || k;
    const o = qt(lang, q.id).o || {};
    return o[k] || ((E.q[q.id] || {}).o || {})[k] || k;
  }
  // Returns [{k, label}] for choice questions and grid rows.
  function options(q, lang, mk) {
    if (q.range) {
      const out = market(mk).ranges[q.range].map((r, i) => ({ k: "r" + i, label: rangeLabel(r, lang, mk), range: r }));
      if (q.na) out.push({ k: "na", label: qt(lang, q.id).na || ui(lang, "notSure") });
      return out;
    }
    const keys = q.marketList ? market(mk)[q.marketList] : (q.opts || []);
    return keys.map(k => ({ k, label: listLabel(q, lang, k) }));
  }
  function colLabel(q, lang, k) {
    const c = (qt(lang, q.id).cols || {})[k];
    if (c == null) return k;
    return typeof c === "string" ? c : c.l;
  }

  const empty = v => v == null || (typeof v === "string" && v.trim() === "");

  function isAnswered(q, v) {
    if (v == null) return false;
    switch (q.t) {
      case "short": case "long": return !empty(v);
      case "number": return !empty(v);
      case "single": return !!(v.choice) && (v.choice !== "other" || !empty(v.other));
      case "multi": return (v.choices && v.choices.length > 0) || !empty(v.other);
      case "scale": case "slider": return typeof v === "number";
      case "bipolar": return Object.keys(v).length > 0;
      case "rank": return Array.isArray(v) && v.length >= (q.minPick || q.top || 1);
      case "ratingGrid": case "choiceGrid": return Object.keys(v).length > 0;
      case "checkGrid": return Object.values(v).some(a => a && a.length);
      case "table": return Object.values(v).some(r => r && Object.values(r).some(x => !empty(x)));
      case "repeater": return Array.isArray(v) && v.some(r => r && Object.values(r).some(x => !empty(x)));
      case "fields": {
        const reqs = q.fields.filter(f => f.req);
        if (reqs.length) return reqs.every(f => !empty(v[f.k]));
        return Object.values(v).some(x => !empty(x));
      }
    }
    return false;
  }

  // Human-readable answer (multi-line string). Empty string if unanswered.
  function formatAnswer(q, v, lang, mk) {
    if (!isAnswered(q, v)) return "";
    const T = qt(lang, q.id);
    const opt = k => { const o = options(q, lang, mk).find(x => x.k === k); return o ? o.label : (k === "other" ? ui(lang, "other") : k); };
    switch (q.t) {
      case "short": case "long": return String(v).trim();
      case "number": return String(v) + (T.unit ? " " + T.unit : q.currency ? " " + market(mk).currency : "");
      case "single": {
        let s = opt(v.choice);
        if (v.choice === "other" || !empty(v.other)) s = ui(lang, "other") + ": " + (v.other || "");
        return s;
      }
      case "multi": {
        const parts = (v.choices || []).filter(k => k !== "other").map(opt);
        if (!empty(v.other)) parts.push(ui(lang, "other") + ": " + v.other.trim());
        let s = parts.join(", ");
        if (!empty(v.details)) s += "\n" + ui(lang, "details") + ": " + v.details.trim();
        return s;
      }
      case "scale": return v + " / " + q.max + (T.lo ? `  (${q.min} = ${T.lo}, ${q.max} = ${T.hi})` : "");
      case "slider":
        if (q.pct) return fill(ui(lang, "sliderPct"), { a: 100 - v, left: T.left, b: v, right: T.right });
        return v + (T.unit ? " " + T.unit : " / " + q.max) + (T.lo ? `  (${q.min} = ${T.lo}, ${q.max} = ${T.hi})` : "");
      case "bipolar":
        return q.opts.filter(k => v[k] != null).map(k => {
          const [a, b] = (T.items || {})[k] || [k, k];
          const n = v[k];
          const bar = "▮".repeat(n) + "─".repeat(10 - n);
          return `${a} ${bar} ${b}  (${n}/10 → ${n === 5 ? ui(lang, "balanced") : n < 5 ? a : b})`;
        }).join("\n");
      case "rank": return v.map((k, i) => `${i + 1}. ${opt(k)}`).join("\n");
      case "ratingGrid": {
        const max = q.scale[1];
        return options(q, lang, mk).filter(o => v[o.k] != null)
          .sort((a, b) => v[b.k] - v[a.k])
          .map(o => `${o.label}: ${v[o.k]}/${max}`).join("\n") + (T.lo ? `\n(${q.scale[0]} = ${T.lo}, ${max} = ${T.hi})` : "");
      }
      case "choiceGrid":
        return options(q, lang, mk).filter(o => v[o.k]).map(o => `${o.label}: ${colLabel(q, lang, v[o.k])}`).join("\n");
      case "checkGrid":
        return options(q, lang, mk).map(o => `${o.label}: ${(v[o.k] || []).length ? v[o.k].map(c => colLabel(q, lang, c)).join(", ") : "—"}`).join("\n");
      case "table":
        return options(q, lang, mk).filter(o => v[o.k] && Object.values(v[o.k]).some(x => !empty(x))).map(o => {
          const row = v[o.k];
          const cells = q.cols.filter(c => !empty(row[c.k])).map(c => {
            let val = row[c.k];
            if (c.input === "seg") { const cc = (qt(lang, q.id).cols || {})[c.k] || {}; val = (cc.o || {})[val] || val; }
            return `${colLabel(q, lang, c.k)}: ${val}`;
          });
          return `${o.label} — ${cells.join(" · ")}`;
        }).join("\n");
      case "repeater":
        return v.filter(r => r && Object.values(r).some(x => !empty(x))).map((r, i) => {
          const parts = q.fields.filter(f => !empty(r[f.k])).map(f => {
            const ft = (T.f || {})[f.k] || {};
            let val = r[f.k];
            if (f.input === "select") val = (ft.o || {})[val] || val;
            return `${ft.l || f.k}: ${String(val).trim()}`;
          });
          return `#${i + 1}\n  ` + parts.join("\n  ");
        }).join("\n");
      case "fields":
        return q.fields.filter(f => !empty(v[f.k])).map(f => `${((T.f || {})[f.k] || {}).l || f.k}: ${String(v[f.k]).trim()}`).join("\n");
    }
    return JSON.stringify(v);
  }

  function parseNum(s) {
    if (typeof s === "number") return s;
    if (empty(s)) return "";
    let t = String(s).trim().toLowerCase().replace(/\s| | /g, "");
    const m = t.match(/^([\d.,]+)(k|m|mio|million|millions|ألف|الف|مليون)?$/);
    if (!m) return String(s).trim();
    let num = m[1];
    if (num.includes(",") && num.includes(".")) num = num.replace(/,/g, "");
    else if (num.includes(",")) num = /,\d{1,2}$/.test(num) && m[2] ? num.replace(",", ".") : num.replace(/,/g, "");
    if ((num.match(/\./g) || []).length > 1) num = num.replace(/\./g, "");
    let n = parseFloat(num);
    if (isNaN(n)) return String(s).trim();
    const mult = { k: 1e3, "ألف": 1e3, "الف": 1e3, m: 1e6, mio: 1e6, million: 1e6, millions: 1e6, "مليون": 1e6 }[m[2]] || 1;
    return Math.round(n * mult * 100) / 100;
  }

  function buildSubmission(st) {
    const a = st.answers || {};
    const missing = S.questions.filter(q => q.req && !isAnswered(q, a[q.id])).map(q => q.id);
    const answered = S.questions.filter(q => isAnswered(q, a[q.id])).length;
    const now = new Date();
    const mk = st.market || C.defaultMarket;
    return {
      schema: S.schemaId,
      schemaVersion: S.schemaVersion,
      questionnaireVersion: C.questionnaireVersion,
      submissionId: st.sid,
      market: mk,
      currency: market(mk).currency,
      language: st.lang,
      client: {
        name: (a.q0_1 || "").trim(),
        business: (a.q0_2 || "").trim(),
        whatsapp: ((a.q0_3 || {}).whatsapp || "").trim(),
        email: ((a.q0_3 || {}).email || "").trim(),
        city: (a.q0_4 || "").trim()
      },
      startedAt: st.startedAt,
      submittedAt: now.toISOString(),
      durationMinutes: st.activeMs ? Math.round(st.activeMs / 60000) : null,
      completion: { answered, total: S.questions.length, requiredMissing: missing },
      answers: a
    };
  }

  // Full readable report of a submission, grouped by section.
  // opts: { lang: label language (default "en"), ids: show question IDs, stars: show ★ for added questions }
  function toReadable(sub, opts) {
    opts = Object.assign({ lang: "en", ids: true, stars: false }, opts || {});
    const lang = opts.lang, mk = sub.market;
    const out = [];
    S.sections.forEach((sec, i) => {
      out.push(`\n## ${i}. ${L(lang).sections[sec.id].t}`);
      S.questions.filter(q => q.s === sec.id).forEach(q => {
        const label = qt(lang, q.id).l;
        const ans = formatAnswer(q, (sub.answers || {})[q.id], lang, mk);
        const tag = (opts.ids ? `[${q.id}] ` : "") + (opts.stars && q.added ? "★ " : "");
        out.push(`\n**${tag}${label}**`);
        out.push(ans ? ans : (q.req ? "⚠ NOT ANSWERED (key question)" : "— not answered (optional)"));
      });
    });
    return out.join("\n").trim();
  }

  const BEGIN = "=====BEGIN PB-ONBOARDING JSON=====", END = "=====END PB-ONBOARDING JSON=====";
  // Accepts a JSON file's text, or a whole pasted email that contains the JSON block.
  function parseSubmission(text) {
    text = String(text || "");
    let body = text;
    const b = text.indexOf(BEGIN), e = text.indexOf(END);
    if (b >= 0 && e > b) body = text.slice(b + BEGIN.length, e);
    else { const f = text.indexOf("{"), l = text.lastIndexOf("}"); if (f >= 0 && l > f) body = text.slice(f, l + 1); }
    const obj = JSON.parse(body.trim());
    if (!obj || obj.schema !== S.schemaId || !obj.answers) throw new Error("This doesn't look like an onboarding answers file.");
    return obj;
  }

  window.PB = { S, C, I, byId, L, fill, qt, ui, market, options, colLabel, isAnswered, formatAnswer, parseNum,
    buildSubmission, toReadable, parseSubmission, BEGIN, END, empty };
})();
