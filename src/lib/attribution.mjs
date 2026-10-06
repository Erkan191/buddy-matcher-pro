export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const KEY = "bm_attribution_v1";
let memory = {};

// Never retain URL queries/fragments: recovery links can contain credentials.
export function safeReferrer(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? `${url.origin}${url.pathname}`.slice(0, 400) : "";
  } catch { return ""; }
}

export function sanitizeAttribution(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  for (const key of [...UTM_KEYS, "landing_path", "referrer", "referrer_host", "attribution_captured_at"]) {
    if (typeof value[key] !== "string" || !value[key].trim()) continue;
    let text = value[key].trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 400);
    if (key === "referrer") text = safeReferrer(text);
    if (key === "landing_path") text = text.startsWith("/") && !text.startsWith("//") ? text.split(/[?#]/)[0] : "";
    if (text) result[key] = text;
  }
  return result;
}

export function resolveAttribution(previous, href, referrer, now = new Date().toISOString()) {
  const saved = sanitizeAttribution(previous);
  const url = new URL(href);
  const campaign = sanitizeAttribution(Object.fromEntries(UTM_KEYS.map(key => [key, url.searchParams.get(key)])));
  const changedCampaign = Object.keys(campaign).length > 0 && UTM_KEYS.some(key => campaign[key] !== saved[key]);
  if (saved.landing_path && !changedCampaign) return saved;
  const cleanReferrer = safeReferrer(referrer);
  return sanitizeAttribution({ ...campaign, landing_path: url.pathname, referrer: cleanReferrer,
    referrer_host: cleanReferrer ? new URL(cleanReferrer).hostname : "", attribution_captured_at: now });
}

export function getAttribution() {
  if (typeof window === "undefined") return {};
  let previous = memory;
  try { previous = JSON.parse(window.sessionStorage.getItem(KEY)) || previous; } catch { /* Storage is optional. */ }
  memory = resolveAttribution(previous, window.location.href, document.referrer);
  try { window.sessionStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* Retain in memory. */ }
  return memory;
}

export function usageMetadata(metadata = {}) {
  return { ...getAttribution(), ...metadata, path: typeof window === "undefined" ? "" : window.location.pathname };
}
