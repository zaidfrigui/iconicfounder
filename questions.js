/* ============================================================
   QUESTION SCHEMA — structure only (no text).
   All wording lives in translations.js, keyed by the same IDs.

   Fields:
     id        stable question ID (never reuse or rename once clients answered)
     s         section ID
     t         type: short | long | number | single | multi | scale | slider |
               bipolar | rank | ratingGrid | choiceGrid | checkGrid | table |
               repeater | fields
     req       required (client can still skip, but it is flagged in review + report)
     added     ★ question added by the strategist (shown only on the mentor page)
     opts      option keys (labels in translations q.<id>.o or a shared list)
     list      take option labels from translations.lists.<name>
     marketList option keys come from markets[market].<name>
     range     options are money ranges from markets[market].ranges.<name>
   ============================================================ */
(function () {
  const sections = [
    { id: "s0", min: 1 }, { id: "s1", min: 6 }, { id: "s2", min: 4 }, { id: "s3", min: 4 },
    { id: "s4", min: 6 }, { id: "s5", min: 2 }, { id: "s6", min: 4 }, { id: "s7", min: 5 },
    { id: "s8", min: 3 }, { id: "s9", min: 2, added: true }, { id: "s10", min: 2, added: true },
    { id: "s11", min: 3 }, { id: "s12", min: 3 }, { id: "s13", min: 2 }, { id: "s14", min: 2, added: true }
  ];

  const lists = {
    ages: ["u25", "a18", "a25", "a35", "a45", "a55"],
    platforms: ["instagram", "tiktok", "youtube", "linkedin", "facebook", "x", "snapchat", "podcasts"],
    langs: ["darija", "french", "arabic", "english", "amazigh"],
    values: ["integrity", "family", "faith", "excellence", "freedom", "discipline", "generosity", "ambition",
      "humility", "loyalty", "innovation", "courage", "respect", "transparency", "impact", "growth", "health", "simplicity"],
    interests: ["money", "productivity", "family", "marriage", "fitness", "food", "travel", "faith", "selfdev",
      "style", "cars", "tech", "sport", "culture", "career", "kidsEdu", "realestate", "mental", "books"],
    metrics: ["followers", "views", "leads", "clients", "opps"]
  };

  // Market-specific data. To add a market later (e.g. "AE"), copy MA and adapt.
  const markets = {
    MA: {
      currency: "MAD",
      locations: ["casa", "rabat", "marrakech", "tanger", "fes", "agadir", "oriental", "allma", "diaspora", "mena", "intl"],
      ranges: {
        revenue: [[0, 1e6], [1e6, 5e6], [5e6, 2e7], [2e7, 5e7], [5e7, 1e8], [1e8, null]],   // per year
        income: [[0, 5e3], [5e3, 1e4], [1e4, 2e4], [2e4, 5e4], [5e4, 1e5], [1e5, null]],    // per month
        budget: [[0, 5e3], [5e3, 15e3], [15e3, 3e4], [3e4, 6e4], [6e4, null]]               // per month
      }
    }
  };

  const Q = [
    // 0 · Basics
    { id: "q0_1", s: "s0", t: "short", req: true, key: "name" },
    { id: "q0_2", s: "s0", t: "short", req: true, key: "business" },
    { id: "q0_3", s: "s0", t: "fields", req: true, fields: [{ k: "whatsapp", input: "tel", req: true }, { k: "email", input: "email", req: true }] },
    { id: "q0_4", s: "s0", t: "short", req: true },
    { id: "q0_5", s: "s0", t: "single", req: true, added: true, list: "ages", opts: ["u25", "a25", "a35", "a45", "a55"] },
    { id: "q0_6", s: "s0", t: "single", req: true, other: true, opts: ["ecommerce", "marketing", "realestate", "finance", "health", "education", "tech", "consulting", "industry", "hospitality", "retail", "construction", "food"] },
    { id: "q0_7", s: "s0", t: "single", req: true, added: true, range: "revenue", na: true },

    // 1 · Identity & story
    { id: "q1_1", s: "s1", t: "long", req: true },
    { id: "q1_2", s: "s1", t: "long", req: true, w: 3 },
    { id: "q1_3", s: "s1", t: "repeater", req: true, min: 3, max: 3, fields: [{ k: "title", input: "short" }, { k: "story", input: "long" }], w: 5 },
    { id: "q1_4", s: "s1", t: "long", req: true },
    { id: "q1_5", s: "s1", t: "long", added: true },
    { id: "q1_6", s: "s1", t: "long", req: true },
    { id: "q1_7a", s: "s1", t: "multi", req: true, added: true, other: true, opts: ["results", "experience", "network", "access", "skill", "story", "method", "resources", "languages"] },
    { id: "q1_7b", s: "s1", t: "long", req: true, added: true },
    { id: "q1_8", s: "s1", t: "long", req: true, added: true },
    { id: "q1_9", s: "s1", t: "fields", added: true, fields: [{ k: "spouse" }, { k: "friend" }, { k: "employee" }] },

    // 2 · Vision, mission & values
    { id: "q2_1", s: "s2", t: "long", req: true },
    { id: "q2_2", s: "s2", t: "long", req: true },
    { id: "q2_2b", s: "s2", t: "long", req: true },
    { id: "q2_3", s: "s2", t: "long", req: true, added: true },
    { id: "q2_4", s: "s2", t: "long", req: true },
    { id: "q2_5", s: "s2", t: "multi", req: true, list: "values", opts: lists.values, exact: 5 },
    { id: "q2_5b", s: "s2", t: "rank", req: true, list: "values", from: "q2_5", top: 3 },
    { id: "q2_6", s: "s2", t: "long", req: true },
    { id: "q2_7", s: "s2", t: "long", added: true },

    // 3 · Business & offer
    { id: "q3_1", s: "s3", t: "repeater", req: true, min: 1, max: 6, fields: [{ k: "name", input: "short" }, { k: "price", input: "short" }, { k: "type", input: "select", opts: ["service", "program", "consulting", "product", "software", "event", "other"] }], w: 3 },
    { id: "q3_2", s: "s3", t: "long", req: true },
    { id: "q3_3", s: "s3", t: "rank", req: true, opts: ["leads", "authority", "hiring", "fundraising", "partnerships", "media", "legacy", "launch"], minPick: 3 },
    { id: "q3_4", s: "s3", t: "short", req: true, added: true },
    { id: "q3_5", s: "s3", t: "long", req: true, added: true },
    { id: "q3_6", s: "s3", t: "number", req: true, added: true },
    { id: "q3_7", s: "s3", t: "single", req: true, added: true, opts: ["company", "personal", "both"] },
    { id: "q3_8", s: "s3", t: "long", added: true },

    // 4 · Target persona
    { id: "q4_1", s: "s4", t: "short", req: true },
    { id: "q4_2a", s: "s4", t: "slider", req: true, min: 0, max: 100, step: 5, def: 50, pct: true },
    { id: "q4_2b", s: "s4", t: "multi", req: true, list: "ages", opts: ["a18", "a25", "a35", "a45", "a55"] },
    { id: "q4_2c", s: "s4", t: "multi", req: true, marketList: "locations" },
    { id: "q4_3", s: "s4", t: "multi", req: true, other: true, opts: ["student", "employee", "manager", "executive", "freelancer", "smallbiz", "founder", "investor"] },
    { id: "q4_4", s: "s4", t: "single", req: true, range: "income", na: true },
    { id: "q4_5", s: "s4", t: "long", req: true },
    { id: "q4_6", s: "s4", t: "fields", req: true, fields: [{ k: "p1", req: true }, { k: "p2" }, { k: "p3" }] },
    { id: "q4_7", s: "s4", t: "long", req: true },
    { id: "q4_8", s: "s4", t: "long", req: true },
    { id: "q4_9", s: "s4", t: "long", req: true, added: true },
    { id: "q4_10", s: "s4", t: "long", req: true, added: true },
    { id: "q4_11", s: "s4", t: "long", req: true, added: true },
    { id: "q4_12a", s: "s4", t: "multi", req: true, added: true, list: "platforms", opts: lists.platforms },
    { id: "q4_12b", s: "s4", t: "short", added: true },
    { id: "q4_13", s: "s4", t: "multi", req: true, added: true, list: "langs", opts: lists.langs },
    { id: "q4_14", s: "s4", t: "long", added: true },

    // 5 · Interests outside the niche
    { id: "q5_1", s: "s5", t: "ratingGrid", req: true, list: "interests", opts: lists.interests, scale: [0, 3], w: 3 },
    { id: "q5_2", s: "s5", t: "multi", req: true, added: true, list: "interests", opts: lists.interests },
    { id: "q5_3", s: "s5", t: "long", req: true },
    { id: "q5_4", s: "s5", t: "long", added: true },

    // 6 · Perception
    { id: "q6_1", s: "s6", t: "fields", req: true, fields: [{ k: "w1", req: true }, { k: "w2", req: true }, { k: "w3", req: true }, { k: "w4" }, { k: "w5" }] },
    { id: "q6_2", s: "s6", t: "multi", req: true, other: true, opts: ["arrogant", "showoff", "salesy", "guru", "distant", "boring", "fake", "aggressive", "preachy", "tryhard"] },
    { id: "q6_3", s: "s6", t: "bipolar", req: true, added: true, opts: ["expert", "serious", "polished", "calm", "exclusive", "teacher", "reserved"], w: 2 },
    { id: "q6_4", s: "s6", t: "repeater", req: true, min: 2, max: 5, fields: [{ k: "name", input: "short" }, { k: "why", input: "long" }], w: 3 },
    { id: "q6_5", s: "s6", t: "repeater", req: true, min: 2, max: 5, fields: [{ k: "name", input: "short" }, { k: "why", input: "long" }], w: 3 },
    { id: "q6_6", s: "s6", t: "long", added: true },
    { id: "q6_7", s: "s6", t: "long", req: true, added: true },

    // 7 · Content ideas
    { id: "q7_1", s: "s7", t: "long", req: true },
    { id: "q7_2", s: "s7", t: "fields", req: true, fields: [{ k: "client", input: "long" }, { k: "personal", input: "long" }, { k: "backstage", input: "long" }], w: 4 },
    { id: "q7_3", s: "s7", t: "long", req: true, added: true },
    { id: "q7_4", s: "s7", t: "long", req: true, added: true },
    { id: "q7_5", s: "s7", t: "long", added: true },
    { id: "q7_6", s: "s7", t: "ratingGrid", req: true, opts: ["talking", "vlog", "podcast", "interview", "street", "carousel", "youtube", "live", "bts", "tutorial", "story", "reaction", "linkedin"], scale: [1, 5], w: 3 },
    { id: "q7_7", s: "s7", t: "long", added: true },

    // 8 · Red flags
    { id: "q8_1", s: "s8", t: "multi", req: true, other: true, opts: ["politics", "religion", "competitors", "money", "family", "gossip", "relationships", "crypto", "health"] },
    { id: "q8_2", s: "s8", t: "multi", req: true, other: true, opts: ["dancing", "lipsync", "pranks", "clickbait", "luxury", "drama", "trendaudio", "memes", "emotional", "hardsell"] },
    { id: "q8_3", s: "s8", t: "long" },
    { id: "q8_4", s: "s8", t: "multi", added: true, other: true, opts: ["arguing", "paidpromo", "publicfilm", "showmoney", "collabs", "reactions", "giveaways", "lives"] },
    { id: "q8_5", s: "s8", t: "single", req: true, added: true, opts: ["yes", "soft", "none"] },
    { id: "q8_6", s: "s8", t: "single", req: true, added: true, opts: ["ignore", "reply", "team", "delete"] },
    { id: "q8_7", s: "s8", t: "long", added: true },

    // 9 · ★ Personal life & boundaries
    { id: "q9_1", s: "s9", t: "slider", req: true, added: true, min: 0, max: 10, step: 1, def: 5 },
    { id: "q9_2", s: "s9", t: "choiceGrid", req: true, added: true, opts: ["spouse", "children", "parents", "home", "car", "faith", "travel", "fitness", "income", "routine", "team", "friends"], cols: ["yes", "maybe", "never"], w: 3 },
    { id: "q9_3", s: "s9", t: "long", added: true },
    { id: "q9_4", s: "s9", t: "long", req: true, added: true },
    { id: "q9_5", s: "s9", t: "long", added: true },

    // 10 · ★ Language & voice
    { id: "q10_1", s: "s10", t: "ratingGrid", req: true, added: true, list: "langs", opts: lists.langs, scale: [1, 5] },
    { id: "q10_2a", s: "s10", t: "single", req: true, added: true, list: "langs", opts: ["darija", "french", "arabic", "english"] },
    { id: "q10_2b", s: "s10", t: "single", req: true, added: true, opts: ["yes", "little", "no"] },
    { id: "q10_3", s: "s10", t: "multi", added: true, opts: ["none", "darija", "arabic", "french", "english"] },
    { id: "q10_4", s: "s10", t: "single", req: true, added: true, opts: ["script", "bullets", "improvise", "mix"] },
    { id: "q10_5", s: "s10", t: "short", added: true },

    // 11 · Capacity
    { id: "q11_1", s: "s11", t: "checkGrid", req: true, opts: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], cols: ["morning", "afternoon", "evening"], w: 2 },
    { id: "q11_2", s: "s11", t: "slider", req: true, min: 1, max: 20, step: 1, def: 4 },
    { id: "q11_3", s: "s11", t: "single", req: true, added: true, opts: ["weekly", "biweekly", "monthly", "daily"] },
    { id: "q11_4a", s: "s11", t: "scale", req: true, min: 1, max: 10 },
    { id: "q11_4b", s: "s11", t: "long" },
    { id: "q11_5", s: "s11", t: "choiceGrid", req: true, opts: ["strategy", "scripting", "filming", "editing", "posting", "community", "ads"], cols: ["me", "inhouse", "freelancer", "agency", "nobody"], w: 2 },
    { id: "q11_6", s: "s11", t: "multi", added: true, opts: ["phone", "camera", "mic", "lights", "teleprompter", "office", "studio"] },
    { id: "q11_7", s: "s11", t: "single", req: true, range: "budget", na: true },
    { id: "q11_8", s: "s11", t: "single", req: true, added: true, opts: ["me24", "me72", "team", "none"] },
    { id: "q11_9", s: "s11", t: "long", added: true },

    // 12 · Current presence
    { id: "q12_1", s: "s12", t: "table", req: true, list: "platforms", opts: ["instagram", "tiktok", "linkedin", "youtube", "facebook", "x", "snapchat"], cols: [{ k: "handle", input: "short" }, { k: "followers", input: "number" }, { k: "status", input: "seg", opts: ["active", "rarely", "inactive"] }], w: 2 },
    { id: "q12_2", s: "s12", t: "long", req: true },
    { id: "q12_3", s: "s12", t: "long", added: true },
    { id: "q12_4", s: "s12", t: "multi", added: true, details: true, opts: ["press", "podcasts", "talks", "photos", "archive", "awards", "book"] },
    { id: "q12_5", s: "s12", t: "single", req: true, added: true, opts: ["yes", "test", "no"] },

    // 13 · Goals in numbers
    { id: "q13_1", s: "s13", t: "table", req: true, list: "metrics", opts: lists.metrics, cols: [{ k: "m3", input: "number" }, { k: "m6", input: "number" }, { k: "m12", input: "number" }], w: 3 },
    { id: "q13_2", s: "s13", t: "single", req: true, list: "platforms", opts: ["instagram", "tiktok", "youtube", "linkedin", "facebook", "x", "snapchat"] },
    { id: "q13_3", s: "s13", t: "single", req: true, added: true, list: "metrics", opts: lists.metrics },
    { id: "q13_4", s: "s13", t: "number", added: true, currency: true },

    // 14 · ★ Success & commitment
    { id: "q14_1", s: "s14", t: "long", req: true, added: true },
    { id: "q14_2", s: "s14", t: "long", req: true, added: true },
    { id: "q14_3a", s: "s14", t: "scale", req: true, added: true, min: 1, max: 10 },
    { id: "q14_3b", s: "s14", t: "long", added: true },
    { id: "q14_4", s: "s14", t: "single", req: true, added: true, opts: ["together", "dfy", "unsure"] },
    { id: "q14_5", s: "s14", t: "single", req: true, added: true, opts: ["weekly", "biweekly", "monthly", "async"] },
    { id: "q14_6", s: "s14", t: "long" }
  ];

  // Relative effort weight per type (used for "time left in this section").
  const W = { short: 1, number: 0.6, long: 3, single: 0.6, multi: 1, scale: 0.4, slider: 0.4, bipolar: 2, rank: 1.5,
    ratingGrid: 2, choiceGrid: 2, checkGrid: 1.5, table: 2, repeater: 3, fields: 1.5 };
  Q.forEach(q => { if (q.w == null) q.w = W[q.t] || 1; });

  window.PB_SCHEMA = { schemaId: "pb-onboarding", schemaVersion: 1, sections, lists, markets, questions: Q };
})();
