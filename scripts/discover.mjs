import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Curated source registry.
 * Adapter types:
 * - "rss": Standard RSS 2.0 or Atom XML feeds
 * - "json": Public JSON career/program endpoints (supports dot-path `itemsPath` & field mapping)
 * - "grant_program": Structured JSON or HTML announcement pages for grants, credits, and early-access programs
 */
const SOURCES = [
  // Example RSS/Atom source:
  // {
  //   id: "huggingface-blog",
  //   name: "Hugging Face",
  //   adapter: "rss",
  //   url: "https://huggingface.co/blog/feed.xml",
  //   defaultCategory: "Early Access & Credits",
  //   defaultLocation: "International / Remote",
  //   keywordsOnly: ["grant", "credits", "hackathon", "fellowship", "beta", "evaluator", "bounty"]
  // },

  // Example JSON API source (e.g., Greenhouse / Lever / Ashby / custom JSON):
  // {
  //   id: "anthropic-greenhouse",
  //   name: "Anthropic",
  //   adapter: "json",
  //   url: "https://boards-api.greenhouse.io/v1/boards/anthropic/jobs",
  //   itemsPath: "jobs",
  //   fields: { title: "title", url: "absolute_url", location: "location.name", updatedAt: "updated_at" },
  //   defaultCategory: "Recruitment & Contracting",
  //   keywordsOnly: ["evaluation", "evaluator", "fellow", "research", "safety", "model", "developer"]
  // },

  // Example Grant / Early-Access / Research Program tracker:
  // {
  //   id: "openai-researcher-access",
  //   name: "OpenAI",
  //   adapter: "grant_program",
  //   url: "https://openai.com/form/researcher-access-program/",
  //   title: "OpenAI Researcher Access Program (API Credits)",
  //   defaultCategory: "Grants & Competitions",
  //   defaultLocation: "International (Research affiliation required)",
  //   summary: "Up to $1,000 in API credits for qualifying AI safety, evaluation, and societal impact research.",
  //   tags: ["credits", "research", "api", "evaluation"],
  //   markers: ["researcher access", "api credits", "apply"]
  // }
];

const PROFILE = {
  skills: [
    "llm",
    "evaluation",
    "evaluator",
    "eval",
    "agents",
    "agentic",
    "typescript",
    "python",
    "iot",
    "debugging",
    "ast",
    "developer",
    "tooling",
    "reasoning",
    "benchmark",
    "red-team"
  ],
  priorityLocations: ["sweden", "remote", "europe", "eu", "nordic", "international", "worldwide", "global"],
  excludedLocations: ["us only", "united states only", "must reside in the us", "on-site san francisco"]
};

const PRIMARY_DATA_PATH = path.resolve("public/data/opportunities.json");
const DIST_DATA_PATH = path.resolve("dist/data/opportunities.json");

// --- Helpers ---

function sanitizeSafeUrl(rawUrl, fallback = "") {
  try {
    const u = new URL(String(rawUrl || "").trim());
    if (u.protocol === "https:" || u.protocol === "http:") {
      return u.toString();
    }
  } catch {
    // ignore invalid URL
  }
  return fallback;
}

function canonicalizeUrl(rawUrl) {
  if (!rawUrl) return "";
  try {
    const u = new URL(rawUrl.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    u.hash = "";
    const dropParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "gh_src"];
    for (const p of dropParams) u.searchParams.delete(p);
    const cleaned = u.toString().replace(/\/$/, "");
    return cleaned.toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDedupeKey(item) {
  const canonUrl = canonicalizeUrl(item.url);
  if (canonUrl && !canonUrl.endsWith("/careers") && !canonUrl.endsWith("/jobs")) {
    return `url:${crypto.createHash("sha256").update(canonUrl).digest("hex").slice(0, 16)}`;
  }
  const orgTitle = `${normalizeTitle(item.organization)}::${normalizeTitle(item.title)}`;
  return `org_title:${crypto.createHash("sha256").update(orgTitle).digest("hex").slice(0, 16)}`;
}

function getByPath(obj, dotPath) {
  if (!dotPath) return obj;
  return dotPath.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSourceFilter(item, source) {
  if (!Array.isArray(source.keywordsOnly) || source.keywordsOnly.length === 0) return true;
  const hay = `${item.title} ${item.summary} ${(item.tags || []).join(" ")}`.toLowerCase();
  return source.keywordsOnly.some((kw) => hay.includes(kw.toLowerCase()));
}

// --- Scoring & Eligibility Engine ---

function assessOpportunity(item) {
  const hay = `${item.title} ${item.organization} ${item.category} ${item.location} ${item.summary} ${(item.tags || []).join(" ")}`.toLowerCase();

  // 1. Skills & technical overlap (30%)
  const matchedSkills = PROFILE.skills.filter((s) => hay.includes(s));
  const skillScore = Math.min(30, Math.round((matchedSkills.length / 4) * 30));

  // 2. Eligibility & geography (25%)
  const loc = (item.location || "unknown").toLowerCase();
  let eligibility = "uncertain";
  let eligScore = 10;

  if (PROFILE.excludedLocations.some((ex) => hay.includes(ex))) {
    eligibility = "ineligible";
    eligScore = 0;
  } else if (loc.includes("sweden") || hay.includes("sweden")) {
    eligibility = "confirmed_eligible";
    eligScore = 25;
  } else if (PROFILE.priorityLocations.some((pl) => loc.includes(pl))) {
    eligibility = "likely_eligible";
    eligScore = 20;
  }

  // 3. Opportunity category & benefit preference (20%)
  const isHighValueProgram =
    item.category === "Research & Model Evaluation" ||
    item.category === "Early Access & Credits" ||
    item.category === "Grants & Competitions" ||
    /credit|grant|fellow|evaluat|beta|early access|stipend/.test(hay);
  const prefScore = isHighValueProgram ? 20 : 13;

  // 4. AI systems / builder relevance (15%)
  const isBuilderFit = /eval|agent|model|llm|sdk|api|benchmark|research|reasoning|code|coding/.test(hay);
  const techScore = isBuilderFit ? 15 : 7;

  // 5. Freshness / deadline urgency (10%)
  const urgencyScore = /deadline|closing|apply by|cohort|pilot|2026|2027/.test(hay) ? 10 : 6;

  const rawTotal = skillScore + eligScore + prefScore + techScore + urgencyScore;
  const score = eligibility === "ineligible" ? Math.min(35, rawTotal) : Math.min(100, rawTotal);

  return {
    score,
    eligibility,
    matchedSkills,
    rationale: `Skills: [${matchedSkills.join(", ") || "general AI"}] · Eligibility: ${eligibility} · Category fit: ${prefScore}/20`
  };
}

// --- Source Adapters ---

async function fetchRssAdapter(source) {
  const res = await fetch(source.url, {
    headers: { "User-Agent": "OpportunityHunterBot/1.1 (+https://github.com)" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();

  // Support both RSS <item> and Atom <entry>
  const blocks = [
    ...[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((m) => ({ kind: "rss", body: m[1] })),
    ...[...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map((m) => ({ kind: "atom", body: m[1] }))
  ];

  return blocks.map(({ kind, body }) => {
    const title = stripHtml(
      body.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] || "Untitled"
    );

    let link = "";
    if (kind === "atom") {
      link =
        body.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
        body.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ||
        source.url;
    } else {
      link = body.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1] || source.url;
    }

    const rawDesc =
      body.match(/<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content)>/i)?.[1] ||
      "";
    const pubDate =
      body.match(/<(?:pubDate|updated|published)[^>]*>([\s\S]*?)<\/(?:pubDate|updated|published)>/i)?.[1] || "";
    const parsedDate = pubDate ? new Date(pubDate) : null;

    return {
      title,
      organization: source.name,
      category: source.defaultCategory || "Recruitment & Contracting",
      location: source.defaultLocation || "Remote / Check listing",
      url: sanitizeSafeUrl(link, source.url),
      summary: stripHtml(rawDesc).slice(0, 320),
      tags: [source.id, "rss"],
      publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : null,
      sourceId: source.id
    };
  });
}

async function fetchJsonAdapter(source) {
  const res = await fetch(source.url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "OpportunityHunterBot/1.1 (+https://github.com)"
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  const list = getByPath(payload, source.itemsPath || "");
  if (!Array.isArray(list)) return [];

  const f = source.fields || {};
  return list.map((entry) => {
    const title = stripHtml(getByPath(entry, f.title || "title") || "Untitled");
    const url = sanitizeSafeUrl(getByPath(entry, f.url || "url"), source.url);
    const location = stripHtml(getByPath(entry, f.location || "location") || source.defaultLocation || "Check listing");
    const rawSummary = String(getByPath(entry, f.summary || "description") || "");
    const rawTags = getByPath(entry, f.tags || "tags");

    return {
      title,
      organization: source.name,
      category: source.defaultCategory || "Recruitment & Contracting",
      location,
      url,
      summary: stripHtml(rawSummary).slice(0, 320),
      tags: Array.isArray(rawTags) ? rawTags.map((t) => stripHtml(t)).filter(Boolean) : [source.id, "json"],
      publishedAt: null,
      sourceId: source.id
    };
  });
}

async function fetchGrantProgramAdapter(source) {
  const res = await fetch(source.url, {
    headers: { "User-Agent": "OpportunityHunterBot/1.1 (+https://github.com)" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();

  // If endpoint returns structured JSON list of grants/programs
  if (contentType.includes("application/json")) {
    const data = JSON.parse(raw);
    const items = Array.isArray(data) ? data : data.programs || data.grants || [];
    return items.map((p) => ({
      title: stripHtml(p.title || p.name || source.title || "AI Program"),
      organization: stripHtml(p.organization || source.name),
      category: p.category || source.defaultCategory || "Grants & Competitions",
      location: stripHtml(p.location || source.defaultLocation || "International"),
      url: sanitizeSafeUrl(p.url, source.url),
      summary: stripHtml(p.summary || p.description || "").slice(0, 320),
      tags: Array.isArray(p.tags) ? p.tags.map((t) => stripHtml(t)).filter(Boolean) : [source.id, "grant-program"],
      publishedAt: p.deadline || null,
      sourceId: source.id
    }));
  }

  // Otherwise verify program landing page availability & marker signals
  const text = stripHtml(raw);
  const lower = text.toLowerCase();
  const markers = Array.isArray(source.markers) ? source.markers : [];
  const matchedMarkers = markers.filter((m) => lower.includes(m.toLowerCase()));
  const closedSignal = /applications are closed|program has ended|no longer accepting/.test(lower);

  if (markers.length > 0 && matchedMarkers.length === 0) {
    return [];
  }

  return [
    {
      title: source.title || `${source.name} Program`,
      organization: source.name,
      category: source.defaultCategory || "Early Access & Credits",
      location: source.defaultLocation || "International",
      url: sanitizeSafeUrl(source.url, ""),
      summary: source.summary || text.slice(0, 280),
      tags: source.tags || [source.id, "program"],
      externalStatus: closedSignal ? "closed" : "open",
      publishedAt: null,
      sourceId: source.id
    }
  ];
}

const ADAPTERS = {
  rss: fetchRssAdapter,
  json: fetchJsonAdapter,
  grant_program: fetchGrantProgramAdapter
};

// --- Persistence & Deduplication ---

function loadExistingFeed() {
  try {
    if (fs.existsSync(PRIMARY_DATA_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(PRIMARY_DATA_PATH, "utf8"));
      if (Array.isArray(parsed.items)) return parsed.items;
    }
  } catch (err) {
    console.warn("Could not read existing opportunities.json, starting fresh:", err.message);
  }
  return [];
}

async function run() {
  const existingItems = loadExistingFeed();
  const byDedupeKey = new Map();

  for (const item of existingItems) {
    const key = item.dedupeKey || buildDedupeKey(item);
    byDedupeKey.set(key, { ...item, dedupeKey: key });
  }

  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);
  let newlyAdded = 0;
  let updatedCount = 0;
  const sourceStats = [];

  for (const source of SOURCES) {
    const adapterFn = ADAPTERS[source.adapter];
    if (!adapterFn) {
      console.warn(`Unknown adapter "${source.adapter}" for source "${source.id}"`);
      continue;
    }

    try {
      const rawItems = await adapterFn(source);
      const relevantItems = rawItems.filter((item) => matchesSourceFilter(item, source));

      for (const candidate of relevantItems) {
        const dedupeKey = buildDedupeKey(candidate);
        const assessment = assessOpportunity(candidate);
        const existing = byDedupeKey.get(dedupeKey);

        if (existing) {
          byDedupeKey.set(dedupeKey, {
            ...existing,
            title: candidate.title || existing.title,
            location: candidate.location || existing.location,
            summary: candidate.summary || existing.summary,
            externalStatus: candidate.externalStatus || existing.externalStatus || "open",
            score: assessment.score,
            eligibility: assessment.eligibility,
            matchedSkills: assessment.matchedSkills,
            rationale: assessment.rationale,
            lastCheckedAt: today
          });
          updatedCount++;
        } else {
          byDedupeKey.set(dedupeKey, {
            id: `opp-${dedupeKey.replace(/[^a-z0-9]/gi, "").slice(0, 14)}`,
            dedupeKey,
            title: candidate.title,
            organization: candidate.organization,
            category: candidate.category,
            location: candidate.location,
            url: candidate.url,
            summary: candidate.summary,
            tags: [...new Set(candidate.tags || [])],
            externalStatus: candidate.externalStatus || "open",
            workflowStatus: "new",
            discoveredAt: today,
            lastCheckedAt: today,
            ...assessment
          });
          newlyAdded++;
        }
      }

      sourceStats.push({ id: source.id, status: "ok", fetched: rawItems.length, kept: relevantItems.length });
    } catch (err) {
      console.warn(`Source "${source.id}" failed: ${err.message}`);
      sourceStats.push({ id: source.id, status: "error", error: err.message });
    }
  }

  // Sort by score descending, then newest discoveredAt
  const mergedItems = [...byDedupeKey.values()].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    return String(b.discoveredAt || "").localeCompare(String(a.discoveredAt || ""));
  });

  const output = {
    updatedAt: nowIso,
    stats: {
      total: mergedItems.length,
      newlyAdded,
      updated: updatedCount,
      sources: sourceStats
    },
    items: mergedItems
  };

  fs.mkdirSync(path.dirname(PRIMARY_DATA_PATH), { recursive: true });
  fs.writeFileSync(PRIMARY_DATA_PATH, JSON.stringify(output, null, 2));

  if (fs.existsSync(path.resolve("dist"))) {
    fs.mkdirSync(path.dirname(DIST_DATA_PATH), { recursive: true });
    fs.writeFileSync(DIST_DATA_PATH, JSON.stringify(output, null, 2));
  }

  console.log(`Discovery finished: ${mergedItems.length} total (${newlyAdded} new, ${updatedCount} refreshed).`);
}

run();
