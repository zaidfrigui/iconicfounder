/* ============================================================
   MENTOR DESK — open a client's answers, read them, copy the analysis prompt.
   Nothing is uploaded anywhere: files are read inside your browser.
   ============================================================ */
window.PB_bootMentor = function () {
  const P = window.PB, S = P.S, C = P.C;
  const root = document.getElementById("root");
  const RECENT = "pb_mentor_recent_v1";
  document.getElementById("brand").textContent = C.brandName;
  let promptMd = window.PB_PROMPT_MD || null;
  const PREVIEW = !!window.PB_PREVIEW;

  if (!promptMd) fetch("analysis-prompt.md", { cache: "no-cache" }).then(r => r.ok ? r.text() : Promise.reject(r.status))
    .then(t => { promptMd = t; }).catch(() => { promptMd = null; });

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v; else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach(c => { if (c == null || c === false) return; el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); });
    return el;
  }
  function toast(msg) { const t = h("div", { class: "toast", role: "status" }, msg); document.body.append(t); setTimeout(() => t.remove(), 2600); }

  const recent = {
    all() { try { return JSON.parse(localStorage.getItem(RECENT)) || []; } catch (e) { return []; } },
    add(sub) {
      try {
        const list = this.all().filter(s => s.submissionId !== sub.submissionId);
        list.unshift(sub);
        localStorage.setItem(RECENT, JSON.stringify(list.slice(0, 15)));
      } catch (e) {}
    }
  };

  /* ---------- open screen ---------- */
  function openScreen(errMsg) {
    document.getElementById("newBtn").hidden = true;
    root.innerHTML = "";
    const err = h("div", { class: "err", role: "alert" });
    const fileIn = h("input", { type: "file", accept: ".json,.txt,application/json,text/plain", hidden: true, onchange: e => e.target.files[0] && readFile(e.target.files[0], err) });
    const drop = h("div", { class: "drop" },
      h("div", { style: "font-size:28px" }, "📂"),
      h("strong", null, "Drop a client's answers file here"),
      h("p", null, "The .json file a client sent you on WhatsApp, or one you saved from the email."),
      h("button", { class: "btn btn-primary", onclick: () => fileIn.click() }, "Choose file"), fileIn);
    ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) readFile(f, err); });

    const ta = h("textarea", { class: "textarea", placeholder: "…or paste the whole email you received here (or just the JSON block)", style: "min-height:120px" });
    const list = recent.all();
    root.append(
      h("h1", { class: "m" }, "Mentor desk"),
      h("p", { class: "lead" }, "Open a client's onboarding answers, read them, then copy the analysis prompt into Claude. Files stay on this device; nothing is uploaded."),
      drop,
      h("div", { class: "or" }, "— or —"),
      ta,
      h("div", { style: "margin-top:10px" }, h("button", { class: "btn btn-ghost", onclick: () => tryOpen(ta.value, err) }, "Open pasted answers")),
      err,
      list.length ? h("div", { class: "recent" }, h("h3", null, "Recently opened on this device"),
        list.map(s => h("button", { onclick: () => show(s) }, `${s.client.name || "Unnamed"} — ${s.client.business || ""}`, h("span", null, (s.submittedAt || "").slice(0, 10))))) : null,
      h("div", { class: "recent" }, h("h3", null, "How it works"),
        h("ol", { class: "steps" },
          h("li", null, "Open the answers (file, or paste the email)."),
          h("li", null, "Read them here: ⚠ marks key questions the client skipped; ★ marks questions added by the strategist."),
          h("li", null, "Click “Copy analysis prompt”, open claude.ai, paste, and send."))));
    if (errMsg) { err.textContent = errMsg; err.style.display = "block"; }
  }
  function readFile(f, err) {
    const r = new FileReader();
    r.onload = () => tryOpen(String(r.result), err);
    r.onerror = () => { err.textContent = "Couldn't read this file."; err.style.display = "block"; };
    r.readAsText(f);
  }
  function tryOpen(text, err) {
    try { const sub = P.parseSubmission(text); recent.add(sub); show(sub); }
    catch (e) { err.textContent = "Couldn't open these answers: " + (e.message || e) + " Make sure you pasted the whole email or chose the .json file."; err.style.display = "block"; }
  }

  /* ---------- prompt ---------- */
  function buildPrompt(sub) {
    const header = [
      "# CLIENT ANSWERS",
      `Client: ${sub.client.name} — ${sub.client.business}`,
      `City: ${sub.client.city} · Market: ${sub.market} · Currency: ${sub.currency}`,
      `Questionnaire language: ${P.L(sub.language).name} (answers may be in that language, Darija or mixed)`,
      `Submitted: ${(sub.submittedAt || "").slice(0, 10)} · Time spent: ${sub.durationMinutes != null ? sub.durationMinutes + " min" : "unknown"}`,
      `Answered: ${sub.completion.answered}/${sub.completion.total} · Key questions skipped: ${sub.completion.requiredMissing.length ? sub.completion.requiredMissing.join(", ") : "none"}`,
      `Questionnaire version: ${sub.questionnaireVersion} (schema v${sub.schemaVersion})`
    ].join("\n");
    return `${promptMd.trim()}\n\n---\n\n${header}\n\n${P.toReadable(sub, { lang: "en", ids: true, stars: true })}\n`;
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = h("textarea", { style: "position:fixed;opacity:0" }); ta.value = text; document.body.append(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (x) {} ta.remove(); return ok;
    }
  }
  function loadPromptManually(cb) {
    const fi = h("input", { type: "file", accept: ".md,.txt", hidden: true, onchange: e => { const r = new FileReader(); r.onload = () => { promptMd = String(r.result); cb(); }; r.readAsText(e.target.files[0]); } });
    document.body.append(fi); fi.click();
  }

  /* ---------- answers view ---------- */
  function show(sub) {
    document.getElementById("newBtn").hidden = false;
    root.innerHTML = "";
    window.scrollTo(0, 0);
    const c = sub.client;
    const missing = sub.completion.requiredMissing || [];
    const copyBtn = h("button", { class: "btn btn-primary", onclick: async () => {
      if (!promptMd) {
        toast("analysis-prompt.md couldn't be loaded automatically — choose it from the project folder.");
        return loadPromptManually(() => copyBtn.click());
      }
      const text = buildPrompt(sub);
      const ok = await copyText(text);
      if (ok) return toast("✓ Analysis prompt copied — paste it into Claude");
      // Clipboard refused: show the prompt so it can be selected and copied by hand.
      let box = document.getElementById("promptBox");
      if (!box) { box = h("textarea", { id: "promptBox", class: "textarea", readonly: true, style: "margin-top:12px;min-height:220px;font-size:13px" }); copyBtn.closest(".card").append(box); }
      box.value = text; box.focus(); box.select();
      toast("Select all the text in the box below and copy it");
    } }, "📋 Copy analysis prompt");
    const dlPrompt = h("button", { class: "btn btn-ghost", onclick: () => {
      if (!promptMd) return loadPromptManually(() => dlPrompt.click());
      saveFile(buildPrompt(sub), `analysis-prompt_${slug(c.name)}.md`, "text/markdown");
    } }, "Download prompt (.md)");

    root.append(h("section", { class: "client card" },
      h("div", null, h("p", { class: "kicker", style: "margin:0 0 6px" }, "Client onboarding"), h("h2", null, c.name || "Unnamed client")),
      h("div", { class: "kv" },
        kv("Business", c.business), kv("City", c.city), kv("WhatsApp", c.whatsapp), kv("Email", c.email),
        kv("Language", P.L(sub.language).name), kv("Submitted", (sub.submittedAt || "").replace("T", " ").slice(0, 16)),
        kv("Time spent", sub.durationMinutes != null ? sub.durationMinutes + " min" : "—"),
        kv("Completion", `${sub.completion.answered}/${sub.completion.total} answered · ${missing.length} key skipped`)),
      h("div", { class: "actions" }, copyBtn, PREVIEW ? null : dlPrompt,
        PREVIEW ? null : h("button", { class: "btn btn-ghost", onclick: () => saveFile(JSON.stringify(sub, null, 2), `onboarding_${slug(c.name)}.json`, "application/json") }, "Download JSON"),
        PREVIEW ? null : h("button", { class: "btn btn-ghost", onclick: () => window.print() }, "Print / PDF"))));

    const body = h("div", { id: "answers" });
    const hideOpt = h("input", { type: "checkbox", onchange: e => body.classList.toggle("hide-opt", e.target.checked) });
    root.append(h("div", { class: "toolbar" },
      h("label", null, hideOpt, "Hide unanswered optional questions"),
      h("span", null, "⚠ key question skipped · ★ question added by the strategist")), body);

    S.sections.forEach((sec, i) => {
      const qs = S.questions.filter(q => q.s === sec.id);
      const ans = qs.filter(q => P.isAnswered(q, sub.answers[q.id])).length;
      body.append(h("div", { class: "sec" },
        h("h3", null, `${i}. ${P.L("en").sections[sec.id].t}`, sec.added ? h("span", { style: "color:var(--gold)" }, "★") : null, h("small", null, `${ans}/${qs.length}`)),
        qs.map(q => {
          const a = P.formatAnswer(q, sub.answers[q.id], "en", sub.market);
          const cls = a ? "qa" : q.req ? "qa miss" : "qa opt-miss";
          const clientLabel = sub.language !== "en" ? P.qt(sub.language, q.id).l : null;
          return h("div", { class: cls },
            h("div", { class: "q" }, h("code", null, q.id), q.added ? h("span", { class: "star", title: "Added by the strategist" }, "★") : null,
              h("span", null, P.qt("en", q.id).l)),
            clientLabel ? h("div", { style: "font-size:12.5px;color:var(--muted);unicode-bidi:plaintext", dir: "auto" }, clientLabel) : null,
            h("div", { class: "a", dir: "auto" }, a || (q.req ? "⚠ Not answered — key question" : "— not answered (optional)")));
        })));
    });
  }
  function kv(k, v) { return h("div", null, h("b", null, k), h("span", { dir: "auto" }, v || "—")); }
  function slug(s) { return (s || "client").trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").slice(0, 40) || "client"; }
  function saveFile(text, name, type) {
    const a = h("a", { href: URL.createObjectURL(new Blob([text], { type })), download: name });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  document.getElementById("newBtn").addEventListener("click", () => openScreen());
  window.__PB_MENTOR__ = { show, buildPrompt: s => buildPrompt(s), get promptLoaded() { return !!promptMd; } };
  openScreen();
};
if (!window.PB_DEFER_MENTOR) window.PB_bootMentor();
