import test from "node:test";
import assert from "node:assert/strict";
import { resolveAttribution, sanitizeAttribution, safeReferrer, getAttribution } from "../src/lib/attribution.mjs";

test("Instagram campaign survives upgrade, login and payment return without copying sensitive URL data", () => {
  const first = resolveAttribution({}, "https://www.buddymatcher.co.uk/teachers?utm_source=instagram&utm_campaign=teacher_outreach&email=private#token", "https://l.instagram.com/?secret=1#token", "2026-10-06T12:00:00.000Z");
  assert.equal(first.utm_source, "instagram");
  assert.equal(first.utm_campaign, "teacher_outreach");
  assert.equal(first.landing_path, "/teachers");
  assert.equal(first.referrer, "https://l.instagram.com/");
  assert.equal(first.referrer_host, "l.instagram.com");
  for (const route of ["/upgrade", "/login?next=/upgrade", "/upgrade/success?session_id=cs_test_secret"]) {
    assert.deepEqual(resolveAttribution(first, `https://www.buddymatcher.co.uk${route}`, "https://checkout.stripe.com/"), first);
  }
  assert.ok(!JSON.stringify(first).includes("private"));
  assert.ok(!JSON.stringify(first).includes("token"));
});

test("a new explicit campaign replaces old tags without carrying over stale campaign fields", () => {
  const first = resolveAttribution({}, "https://example.com/?utm_source=instagram&utm_campaign=old", "");
  const next = resolveAttribution(first, "https://example.com/teachers?utm_source=newsletter", "");
  assert.equal(next.utm_source, "newsletter");
  assert.equal(next.utm_campaign, undefined);
  assert.equal(next.landing_path, "/teachers");
  assert.deepEqual(resolveAttribution(first, "https://example.com/?utm_source=instagram&utm_campaign=old", "", "later"), first);
});

test("checkout attribution is allowlisted, bounded and cannot override payment identity", () => {
  const result = sanitizeAttribution({ utm_source: "x".repeat(700), utm_medium: ["invalid"], utm_campaign: "\n campaign \r", session_id: "spoof", user_id: "spoof", referrer: "https://user:pass@example.com/path?secret=1#secret", landing_path: "/teachers?secret=1", extra: "ignored" });
  assert.equal(result.utm_source.length, 400);
  assert.equal(result.utm_medium, undefined);
  assert.equal(result.utm_campaign, "campaign");
  assert.equal(result.session_id, undefined);
  assert.equal(result.user_id, undefined);
  assert.equal(result.referrer, "https://example.com/path");
  assert.equal(result.landing_path, "/teachers");
  assert.equal(result.extra, undefined);
  assert.deepEqual(sanitizeAttribution(null), {});
  assert.deepEqual(sanitizeAttribution([]), {});
  assert.equal(safeReferrer("javascript:alert(1)"), "");
});

test("blocked storage still permits attribution in memory", () => {
  globalThis.window = { location: { href: "https://example.com/?utm_source=instagram" }, get sessionStorage() { throw new Error("blocked"); } };
  globalThis.document = { referrer: "" };
  try {
    assert.equal(getAttribution().utm_source, "instagram");
    window.location.href = "https://example.com/upgrade";
    assert.equal(getAttribution().utm_source, "instagram");
  } finally { delete globalThis.window; delete globalThis.document; }
});
