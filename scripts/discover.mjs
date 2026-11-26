import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  buildDedupeKey,
  sanitizeText,
  sanitizeUrl,
  scoreOpportunity
} from "../shared/scoring-core.mjs";

const PROFILE_PATH = path.resolve("shared/default-profile.json");
const PROFILE = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8"));

/**
 * Curated live source registry.
 * Every endpoint listed here has been verified to return structured RSS/Atom or JSON feeds.
 */
const SOURCES = [
  {
    id: "remotive-ai",
    name: "Remotive AI",
    adapter: "json",
    url: "https://remotive.com/api/remote-jobs?search=AI&limit=30",
    itemsPath: "jobs",
    fields: {
      title: "title",
      organization: "company_name",
      url: "url",
      location: "candidate_required_location",
      compensation: "salary",
      summary: "description",
      tags: "tags",
      publishedAt: "publication_date"
    },
    defaultCategory: "Recruitment & Contracting",
    defaultLocation: "Remote / Check region",
    keywordsOnly: ["ai", "llm", "evaluation", "eval", "agent", "agents", "python", "typescript", "ml", "research", "systems"],
    maxItems: 20
  },
  {
    id: "anthropic-greenhouse",
    name: "Anthropic",
    adapter: "json",
    url: "https://boards-api.greenhouse.io/v1/boards/anthropic/jobs",
    itemsPath: "jobs",
    fields: {
      title: "title",
      url: "absolute_url",
      location: "location.name",
      updatedAt: "updated_at"
    },
    defaultCategory: "Recruitment & Contracting",
    defaultLocation: "Check listing",
    keywordsOnly: ["evaluation", "evaluator", "eval", "fellow", "research", "safety", "alignment", "agent", "developer", "interpretability"],
    maxItems: 25
  },
  {
    id: "scaleai-greenhouse",
    name: "Scale AI",
    adapter: "json",
    url: "https://boards-api.greenhouse.io/v1/boards/scaleai/jobs",
    itemsPath: "jobs",
    fields: {
      title: "title",
      url: "absolute_url",
      location: "location.name",
      updatedAt: "updated_at"
    },
    defaultCategory: "Research & Model Evaluation",
    defaultLocation: "Check listing",
    keywordsOnly: ["evaluation", "evaluator", "eval", "trainer", "coding", "research", "llm", "agent", "benchmark", "quality"],
    maxItems: 20
  },
  {
    id: "weworkremotely-prog",
    name: "We Work Remotely",
    adapter: "rss",
    url: "https://weworkremotely.com/categories/remote-programming-jobs.rss",
    defaultCategory: "Recruitment & Contracting",
    defaultLocation: "Remote / Worldwide",
    keywordsOnly: ["ai", "llm", "agent", "evaluation", "ml", "python", "typescript", "applied ai"],
    maxItems: 15
  },
  {
    id: "huggingface-blog",
    kind: "announcement",
    name: "Hugging Face",
    adapter: "rss",
    url: "https://huggingface.co/blog/feed.xml",
    defaultCategory: "Early Access & Credits",
    defaultLocation: "International / Remote",
    keywordsOnly: ["grant", "credits", "hackathon", "fellowship", "beta", "eval", "evaluation", "benchmark", "bounty", "challenge"],
    maxItems: 15
  },
  {
    id: "openai-news",
    kind: "announcement",
    name: "OpenAI",
    adapter: "rss",
    url: "https://openai.com/news/rss.xml",
    defaultCategory: "Grants & Competitions",
    defaultLocation: "International",
    keywordsOnly: ["grant", "grants", "credits", "researcher", "fellowship", "evaluation", "eval", "red team", "safety", "pioneers"],
    maxItems: 15
  }
];

const PRIMARY_DATA_PATH = path.resolve("public/data/opportunities.json");
const DIST_DATA_PATH = path.resolve("dist/data/opportunities.json");

function getByPath(obj, dotPath) {
  if (!dotPath) return obj;
  return dotPath.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function hashId(key) {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 14);
}

function matchesSourceFilter(item, source) {
  if (!Array.isArray(source.keywordsOnly) || source.keywordsOnly.length === 0) return true;
  const hay = `${item.title} ${item.summary} ${(item.tags || []).join(" ")}`.toLowerCase();
  return source.keywordsOnly.some((kw) => hay.includes(kw.toLowerCase()));
}

// --- Source Adapters ---

async function fetchRssAdapter(source) {
  const res = await fetch(source.url, {
    headers: { "User-Agent": "OpportunityHunterBot/1.2 (+https://github.com/benneberg/opportunity-hunter)" },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();

  const blocks = [
    ...[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((m) => ({ kind: "rss", body: m[1] })),
    ...[...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map((m) => ({ kind: "atom", body: m[1] }))
  ];

  return blocks.map(({ kind, body }) => {
    const title = sanitizeText(
      body.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] || "Untitled",
      180
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
      location: source.defaultLocation || "Not stated (check listing)",
      url: sanitizeUrl(link) || source.url,
      summary: sanitizeText(rawDesc, 320),
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
      "User-Agent": "OpportunityHunterBot/1.2 (+https://github.com/benneberg/opportunity-hunter)"
    },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  const list = getByPath(payload, source.itemsPath || "");
  if (!Array.isArray(list)) return [];

  const f = source.fields || {};
  return list.map((entry) => {
    const title = sanitizeText(getByPath(entry, f.title || "title") || "Untitled", 180);
    const organization = sanitizeText(
      (f.organization ? getByPath(entry, f.organization) : source.name) || source.name,
      120
    );
    const url = sanitizeUrl(getByPath(entry, f.url || "url")) || source.url;
    const location = sanitizeText(
      getByPath(entry, f.location || "location") || source.defaultLocation || "Check listing",
      120
    );
    const compensation = sanitizeText(
      f.compensation ? getByPath(entry, f.compensation) : "",
      100
    );
    const rawSummary = String(getByPath(entry, f.summary || "description") || "");
    const rawTags = getByPath(entry, f.tags || "tags");
    const pubRaw = f.publishedAt ? getByPath(entry, f.publishedAt) : null;
    const parsedPub = pubRaw ? new Date(String(pubRaw)) : null;

    return {
      title,
      organization,
      category: source.defaultCategory || "Recruitment & Contracting",
      location,
      url,
      compensation: compensation || undefined,
      summary: sanitizeText(rawSummary, 320),
      tags: Array.isArray(rawTags)
        ? rawTags.map((t) => sanitizeText(t, 40)).filter(Boolean).slice(0, 8)
        : [source.id, "json"],
      publishedAt: parsedPub && !Number.isNaN(parsedPub.getTime()) ? parsedPub.toISOString().slice(0, 10) : null,
      sourceId: source.id
    };
  });
}

async function fetchGrantProgramAdapter(source) {
  const res = await fetch(source.url, {
    headers: { "User-Agent": "OpportunityHunterBot/1.2 (+https://github.com/benneberg/opportunity-hunter)" },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (contentType.includes("application/json")) {
    const data = JSON.parse(raw);
    const items = Array.isArray(data) ? data : data.programs || data.grants || [];
    return items.map((p) => ({
      title: sanitizeText(p.title || p.name || source.title || "AI Program", 180),
      organization: sanitizeText(p.organization || source.name, 120),
      category: p.category || source.defaultCategory || "Grants & Competitions",
      location: sanitizeText(p.location || source.defaultLocation || "International", 120),
      url: sanitizeUrl(p.url) || source.url,
      summary: sanitizeText(p.summary || p.description || "", 320),
      tags: Array.isArray(p.tags) ? p.tags.map((t) => sanitizeText(t, 40)).filter(Boolean) : [source.id, "grant-program"],
      publishedAt: p.deadline || null,
      sourceId: source.id
    }));
  }

  const text = sanitizeText(raw, 4000);
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
      url: sanitizeUrl(source.url) || source.url,
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

function loadExistingFeed() {
  try {
    if (fs.existsSync(PRIMARY_DATA_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(PRIMARY_DATA_PATH, "utf8"));
      return {
        updatedAt: parsed.updatedAt || null,
        items: Array.isArray(parsed.items) ? parsed.items : []
      };
    }
  } catch (err) {
    console.warn("Could not read existing opportunities.json, starting fresh:", err.message);
  }
  return { updatedAt: null, items: [] };
}

function loadLeads() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.resolve("public/data/leads.json"), "utf8"));
    return {
      leads: Array.isArray(raw.leads) ? raw.leads : [],
      resources: Array.isArray(raw.resources) ? raw.resources : []
    };
  } catch {
    return { leads: [], resources: [] };
  }
}

async function run() {
  const previous = loadExistingFeed();
  const byDedupeKey = new Map();

  for (const item of previous.items) {
    const key = item.dedupeKey || buildDedupeKey(item);
    const srcDef = SOURCES.find((s) => s.id === item.provenance?.sourceId);
    const provenance = { ...(item.provenance || {}) };
    // Feed items are never verified by the pipeline; only the user can verify in the app.
    provenance.verificationStatus = "unverified";
    delete provenance.lastVerifiedAt;
    byDedupeKey.set(key, {
      ...item,
      dedupeKey: key,
      itemType: srcDef?.kind === "announcement" ? "announcement" : item.itemType || "opportunity",
      provenance
    });
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
      sourceStats.push({ id: source.id, name: source.name, status: "error", error: `Unknown adapter ${source.adapter}` });
      continue;
    }

    try {
      const rawItems = await adapterFn(source);
      const relevantItems = rawItems
        .filter((item) => matchesSourceFilter(item, source))
        .slice(0, source.maxItems || 25);

      for (const candidate of relevantItems) {
        const dedupeKey = buildDedupeKey(candidate);
        const existing = byDedupeKey.get(dedupeKey);

        const baseRecord = {
          id: existing?.id || `opp-${hashId(dedupeKey)}`,
          dedupeKey,
          itemType: source.kind === "announcement" ? "announcement" : "opportunity",
          title: candidate.title || existing?.title || "Untitled",
          organization: candidate.organization || existing?.organization || source.name,
          category: candidate.category || existing?.category || source.defaultCategory,
          location: candidate.location || existing?.location || "Not stated (check listing)",
          url: candidate.url || existing?.url || source.url,
          compensation: candidate.compensation || existing?.compensation,
          deadline: candidate.deadline || existing?.deadline,
          summary: candidate.summary || existing?.summary || "",
          tags: Array.from(new Set([...(candidate.tags || []), ...(existing?.tags || [])])).slice(0, 10),
          externalStatus: candidate.externalStatus || existing?.externalStatus || "open",
          workflowStatus: existing?.workflowStatus || "new",
          discoveredAt: existing?.discoveredAt || candidate.publishedAt || today,
          lastCheckedAt: today,
          source: "feed",
          provenance: {
            sourceId: source.id,
            sourceName: source.name,
            sourceUrl: source.url,
            discoveredAt: existing?.provenance?.discoveredAt || existing?.discoveredAt || today,
            verificationStatus: "unverified"
          }
        };

        const assessment = scoreOpportunity(baseRecord, PROFILE);
        byDedupeKey.set(dedupeKey, { ...baseRecord, ...assessment });

        if (existing) {
          updatedCount++;
        } else {
          newlyAdded++;
        }
      }

      sourceStats.push({
        id: source.id,
        name: source.name,
        status: "ok",
        fetched: rawItems.length,
        kept: relevantItems.length
      });
    } catch (err) {
      console.warn(`Source "${source.id}" failed: ${err.message}`);
      sourceStats.push({
        id: source.id,
        name: source.name,
        status: "error",
        error: err.message
      });
    }
  }

  // Curated, hand-maintained leads and resource links (public/data/leads.json).
  // Leads are never marked verified; they are starting points to check at the source.
  const leadsFile = loadLeads();
  for (const lead of leadsFile.leads) {
    const dedupeKey = buildDedupeKey({ title: lead.title, organization: lead.organization, url: lead.url || "" });
    const existing = byDedupeKey.get(dedupeKey);
    const baseRecord = {
      id: existing?.id || `lead-${hashId(dedupeKey)}`,
      dedupeKey,
      itemType: "opportunity",
      title: lead.title,
      organization: lead.organization,
      category: lead.category,
      location: lead.location || "Not stated (check listing)",
      url: lead.url || "",
      compensation: lead.compensation,
      summary: lead.summary || "",
      tags: (lead.tags || []).slice(0, 10),
      externalStatus: lead.externalStatus || "unknown",
      excludedRegions: lead.excludedRegions,
      eligibilityNote: lead.eligibilityNote,
      workflowStatus: existing?.workflowStatus || "new",
      discoveredAt: existing?.discoveredAt || today,
      lastCheckedAt: today,
      source: "feed",
      provenance: {
        sourceId: "curated-leads",
        sourceName: "Curated leads (from research notes)",
        sourceUrl: lead.url || undefined,
        discoveredAt: existing?.discoveredAt || today,
        verificationStatus: "unverified"
      }
    };
    byDedupeKey.set(dedupeKey, { ...baseRecord, ...scoreOpportunity(baseRecord, PROFILE) });
    if (existing) updatedCount++;
    else newlyAdded++;
  }

  // Re-score everything so older records always reflect the current scoring rules.
  for (const [k, v] of byDedupeKey) byDedupeKey.set(k, { ...v, ...scoreOpportunity(v, PROFILE) });

  const mergedItems = [...byDedupeKey.values()].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    return String(b.discoveredAt || "").localeCompare(String(a.discoveredAt || ""));
  });

  const failedSources = sourceStats.filter((s) => s.status === "error").length;
  const syncHealth =
    failedSources === 0
      ? "healthy"
      : failedSources === sourceStats.length
        ? "failed"
        : "partial";

  const output = {
    updatedAt: nowIso,
    stats: {
      total: mergedItems.length,
      newlyAdded,
      updated: updatedCount,
      syncHealth,
      sources: sourceStats
    },
    resources: leadsFile.resources,
    items: mergedItems
  };

  fs.mkdirSync(path.dirname(PRIMARY_DATA_PATH), { recursive: true });
  fs.writeFileSync(PRIMARY_DATA_PATH, JSON.stringify(output, null, 2));

  if (fs.existsSync(path.resolve("dist"))) {
    fs.mkdirSync(path.dirname(DIST_DATA_PATH), { recursive: true });
    fs.writeFileSync(DIST_DATA_PATH, JSON.stringify(output, null, 2));
  }

  console.log(
    `Discovery finished (${syncHealth}): ${mergedItems.length} total (${newlyAdded} new, ${updatedCount} refreshed across ${sourceStats.length} sources).`
  );
}

run();
