// Run: node --experimental-vm-modules --test tests/free-generate-quota.test.mjs
// Exercise the real route with mocked I/O. The SQL function has separate
// transaction-based regression tests; this suite does not reimplement it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server.js";

const routeSource = await readFile(
  new URL("../src/app/api/usage/free-generate/route.js", import.meta.url), "utf8"
);
const now = Date.parse("2026-09-16T12:00:00.000Z");
const day = 24 * 60 * 60 * 1000;
const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherUserId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const quotaId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const secret = "quota-regression-secret-only";
const cookieName = "bm_free_generate_quota";
const clone = (value) => JSON.parse(JSON.stringify(value));

function event(mode = "weekly", overrides = {}) {
  return {
    event_type: "free_generate_success",
    user_id: userId,
    session_id: "browser-session",
    created_at: new Date(now - day).toISOString(),
    metadata: { free_usage_mode: mode, local_date: "2026-09-15" },
    ...overrides,
  };
}

function weeklyEvents(count = 5) {
  return Array.from({ length: count }, () => event());
}

function signedCookie(id = quotaId) {
  return `${cookieName}=${id}.${createHmac("sha256", secret).update(id).digest("base64url")}`;
}

async function fixture(overrides = {}) {
  const state = {
    events: [], inserted: [], rpcCalls: [], authCalls: [], usageReads: 0,
    pro: false, queryError: null, rpcError: null, insertError: null,
    rpcResult: {
      recorded: true, can_generate: true, free_usage_mode: "weekly",
      weekly_count: 1, emergency_count_today: 0, emergency_remaining: 1,
    },
    ...overrides,
  };
  const admin = {
    auth: {
      getUser: async (token) => {
        state.authCalls.push(token);
        return token === "valid-token"
          ? { data: { user: { id: userId } }, error: null }
          : { data: { user: null }, error: new Error("Invalid test token") };
      },
    },
    from(table) {
      if (table === "users") {
        return { select: () => ({ eq: (_column, id) => ({
          maybeSingle: async () => ({ data: { is_pro: id === userId && state.pro } }),
        }) }) };
      }
      assert.equal(table, "usage_events");
      return {
        insert: async (row) => {
          state.inserted.push(clone(row));
          return { error: state.insertError };
        },
        select: () => {
          state.usageReads += 1;
          const filters = [];
          const query = {
            eq(column, value) { filters.push((row) => row[column] === value); return query; },
            is(column, value) { filters.push((row) => row[column] === value); return query; },
            gt(column, value) { filters.push((row) => row[column] > value); return query; },
            then(resolve, reject) {
              return Promise.resolve({
                data: state.events.filter((row) => filters.every((filter) => filter(row))),
                error: state.queryError,
              }).then(resolve, reject);
            },
          };
          return query;
        },
      };
    },
    rpc: async (name, args) => {
      state.rpcCalls.push({ name, args: clone(args) });
      return { data: state.rpcResult, error: state.rpcError };
    },
  };
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const context = createContext({
    Date: FixedDate, Buffer,
    console: { error() {} },
    process: { env: {
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "regression-service-role-only",
      FREE_GENERATE_COOKIE_SECRET: secret,
    } },
  });
  const imports = {
    "next/server": { NextResponse },
    "@supabase/supabase-js": { createClient: () => admin },
    crypto: { createHmac, randomUUID, timingSafeEqual },
  };
  const route = new SourceTextModule(routeSource, { context });
  await route.link((specifier) => {
    const exports = imports[specifier];
    assert.ok(exports, `Unexpected route dependency: ${specifier}`);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await route.evaluate();

  async function post(body = {}, { token = "valid-token", cookie = "" } = {}) {
    const response = await route.namespace.POST(new Request("https://example.invalid/api/usage/free-generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({ action: "check", sessionId: "browser-session", ...body }),
    }));
    return { status: response.status, body: await response.json(), headers: response.headers };
  }
  return { state, post };
}

test("normal allowance permits the first and fifth generation without spending emergency", async () => {
  for (const count of [0, 4]) {
    const { state, post } = await fixture({ events: weeklyEvents(count) });
    const { status, body } = await post({ useEmergencyOverride: true });
    assert.equal(status, 200);
    assert.equal(body.canGenerate, true);
    assert.equal(body.freeUsageMode, "weekly");
    assert.equal(body.weeklyCount, count);
    assert.equal(body.emergencyRemaining, 1);
    assert.equal(state.rpcCalls.length, 0, "checking must not consume a generation");
  }
});

test("sixth normal generation is blocked until emergency is explicitly requested", async () => {
  const { state, post } = await fixture({ events: weeklyEvents() });
  const denied = await post({ metadata: { selected_size: 2, weekly_limit: 999 } });
  assert.equal(denied.body.canGenerate, false);
  assert.equal(denied.body.freeUsageMode, null);
  assert.equal(denied.body.emergencyRemaining, 1);
  assert.equal(state.inserted[0].event_type, "free_generate_limit_reached");
  assert.equal(state.inserted[0].metadata.weekly_limit, 5);
  assert.equal(state.inserted[0].metadata.emergency_limit, 1);
  assert.equal(state.inserted[0].metadata.emergency_window_days, 7);
  assert.equal(state.inserted[0].metadata.selected_size, 2);
  assert.equal((await post({ useEmergencyOverride: "true" })).body.canGenerate, false);
  const allowed = await post({ useEmergencyOverride: true });
  assert.equal(allowed.body.canGenerate, true);
  assert.equal(allowed.body.freeUsageMode, "emergency");
});

test("an emergency yesterday still blocks all further attempts today", async () => {
  const { state, post } = await fixture({ events: [...weeklyEvents(), event("emergency")] });
  for (const useEmergencyOverride of [false, true]) {
    const { body } = await post({ useEmergencyOverride, localDate: "2099-01-01" });
    assert.equal(body.canGenerate, false);
    assert.equal(body.emergencyCountToday, 0);
    assert.equal(body.emergencyCountWindow, 1);
    assert.equal(body.emergencyRemaining, 0);
  }
  assert.ok(state.inserted.every((row) => row.event_type === "free_generate_limit_blocked"));
  assert.equal(state.inserted[0].metadata.local_date, "2026-09-16");
  assert.equal(state.inserted[0].metadata.client_local_date, "2099-01-01");
  assert.equal(state.inserted[0].metadata.emergency_count_window, 1);
});

test("legacy emergency records without a local date still consume the rolling allowance", async () => {
  const { post } = await fixture({ events: [...weeklyEvents(), event("emergency", {
    metadata: { free_usage_mode: "emergency" },
  }), event("emergency")] });
  const { body } = await post({ useEmergencyOverride: true });
  assert.equal(body.canGenerate, false);
  assert.equal(body.emergencyCountWindow, 2);
  assert.equal(body.emergencyRemaining, 0, "legacy usage above the new limit cannot make this negative");
});

test("normal and emergency events expire at exactly seven days", async () => {
  const expired = new Date(now - 7 * day).toISOString();
  const older = new Date(now - 7 * day - 1).toISOString();
  const { post } = await fixture({ events: [
    ...weeklyEvents(4), event("weekly", { created_at: expired }),
    event("weekly", { created_at: older }), event("emergency", { created_at: expired }),
  ] });
  const { body } = await post();
  assert.equal(body.canGenerate, true);
  assert.equal(body.weeklyCount, 4);
  assert.equal(body.emergencyRemaining, 1);
});

test("usage one millisecond inside the rolling window still counts", async () => {
  const recent = new Date(now - 7 * day + 1).toISOString();
  const { post } = await fixture({ events: [
    ...weeklyEvents(4), event("weekly", { created_at: recent }),
    event("emergency", { created_at: recent }),
  ] });
  assert.equal((await post({ useEmergencyOverride: true })).body.canGenerate, false);
});

test("a normal slot reopens independently when old normal usage expires", async () => {
  const { post } = await fixture({ events: [...weeklyEvents(4), event("emergency")] });
  const { body } = await post();
  assert.equal(body.canGenerate, true);
  assert.equal(body.freeUsageMode, "weekly");
  assert.equal(body.emergencyRemaining, 0);
});

test("quota excludes other accounts, anonymous identities, and non-success analytics", async () => {
  const { post } = await fixture({ events: [
    ...weeklyEvents(4), event("weekly", { user_id: otherUserId }),
    event("weekly", { user_id: null, session_id: quotaId }),
    event("weekly", { event_type: "generate_groups" }),
  ] });
  assert.equal((await post({ userId: otherUserId, isPro: true })).body.weeklyCount, 4);
});

test("server-verified Pro bypasses both quota reads and recording", async () => {
  const { state, post } = await fixture({ pro: true, events: [...weeklyEvents(50), event("emergency")] });
  for (const action of ["check", "record"]) {
    const { status, body } = await post({ action });
    assert.equal(status, 200);
    assert.equal(body.canGenerate, true);
    assert.equal(body.freeUsageMode, "pro");
    if (action === "record") assert.equal(body.recorded, false);
  }
  assert.equal(state.usageReads, 0);
  assert.equal(state.rpcCalls.length, 0);
  assert.equal(state.inserted.length, 0);
});

test("invalid bearer tokens fail closed even alongside a valid anonymous cookie", async () => {
  const { state, post } = await fixture();
  const { status, body } = await post({}, { token: "invalid-token", cookie: signedCookie() });
  assert.equal(status, 401);
  assert.equal(body.error, "Invalid auth token");
  assert.equal(state.usageReads, 0);
  assert.equal(state.rpcCalls.length, 0);
});

test("anonymous check creates a signed HTTP-only cookie and reuses its identity", async () => {
  const { state, post } = await fixture();
  const first = await post({}, { token: "" });
  const setCookie = first.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=lax/i);
  const cookie = setCookie.split(";")[0];
  const id = cookie.slice(`${cookieName}=`.length).split(".")[0];
  state.events = weeklyEvents().map((row) => ({ ...row, user_id: null, session_id: id }));
  const second = await post({ sessionId: "changed-client-session" }, { token: "", cookie });
  assert.equal(second.body.canGenerate, false);
  assert.equal(second.body.weeklyCount, 5);
  assert.equal(second.headers.get("set-cookie"), null);
});

test("anonymous record without a valid cookie cannot mint a fresh recording identity", async () => {
  const { state, post } = await fixture();
  const validCookie = signedCookie();
  const tamperedCookie = validCookie.slice(0, -1) + (validCookie.endsWith("a") ? "b" : "a");
  for (const cookie of ["", tamperedCookie]) {
    const { status, body, headers } = await post({ action: "record" }, { token: "", cookie });
    assert.equal(status, 429);
    assert.equal(body.recorded, false);
    assert.equal(body.canGenerate, false);
    assert.equal(headers.get("set-cookie"), null);
  }
  assert.equal(state.rpcCalls.length, 0);
});

test("recording uses the verified identity and preserves checked mode for the atomic RPC", async () => {
  const { state, post } = await fixture();
  const { status, body } = await post({ action: "record", userId: otherUserId,
    metadata: { checked_free_usage_mode: "weekly", selected_size: 2, total_names: 6 } });
  assert.equal(status, 200);
  assert.equal(body.recorded, true);
  assert.equal(body.freeUsageMode, "weekly");
  const { name, args } = state.rpcCalls[0];
  assert.equal(name, "record_free_generate_success");
  assert.equal(args.p_user_id, userId);
  assert.equal(args.p_identity_id, userId);
  assert.equal(args.p_metadata.checked_free_usage_mode, "weekly");
  assert.equal(args.p_metadata.total_names, 6);
  assert.equal(args.p_quota_date, "2026-09-16");
});

test("atomic record denial after a successful stale check returns 429 and limit analytics", async () => {
  const { state, post } = await fixture({ events: weeklyEvents(4), rpcResult: [{
    recorded: false, can_generate: false, free_usage_mode: null,
    weekly_count: 5, emergency_count_today: 0, emergency_remaining: 1,
  }] });
  assert.equal((await post()).body.canGenerate, true);
  const { status, body } = await post({ action: "record", metadata: { checked_free_usage_mode: "weekly" } });
  assert.equal(status, 429);
  assert.equal(body.canGenerate, false);
  assert.equal(body.recorded, false);
  assert.equal(body.freeUsageMode, null);
  assert.equal(body.emergencyRemaining, 1, "a denied normal attempt must not auto-spend emergency");
  assert.equal(state.rpcCalls.length, 1);
  assert.equal(state.inserted.at(-1).event_type, "free_generate_limit_blocked");
});

test("emergency recording maps the authoritative RPC result and retains the event name", async () => {
  const { state, post } = await fixture({ rpcResult: [{
    recorded: true, can_generate: true, free_usage_mode: "emergency",
    weekly_count: 5, emergency_count_today: 1, emergency_remaining: 0,
  }] });
  const { body } = await post({ action: "record", metadata: { checked_free_usage_mode: "emergency" } });
  assert.equal(body.recorded, true);
  assert.equal(body.freeUsageMode, "emergency");
  assert.equal(body.weeklyCount, 5);
  assert.equal(body.emergencyRemaining, 0);
  assert.equal(state.inserted[0].event_type, "free_generate_emergency_used");
  assert.equal(state.inserted[0].metadata.emergency_count_today, 1);
  assert.equal(state.inserted[0].metadata.emergency_window_days, 7);
});

test("query and recording failures fail closed while secondary analytics stay best effort", async () => {
  const queryFailure = await fixture({ queryError: new Error("query unavailable") });
  assert.equal((await queryFailure.post()).status, 500);
  const recordFailure = await fixture({ rpcError: new Error("RPC unavailable") });
  assert.equal((await recordFailure.post({ action: "record" })).status, 500);
  const analyticsFailure = await fixture({ events: weeklyEvents(), insertError: new Error("analytics unavailable") });
  const denied = await analyticsFailure.post();
  assert.equal(denied.status, 200);
  assert.equal(denied.body.canGenerate, false);
});

test("limit interaction analytics retain their names and current rolling quota metadata", async () => {
  const { state, post } = await fixture({ events: [...weeklyEvents(), event("emergency")] });
  for (const eventType of ["free_generate_limit_upgrade_clicked", "free_generate_limit_maybe_later_clicked"]) {
    const { body } = await post({ action: "track", eventType });
    assert.equal(body.tracked, true);
    assert.equal(state.inserted.at(-1).event_type, eventType);
    assert.equal(state.inserted.at(-1).metadata.weekly_limit, 5);
    assert.equal(state.inserted.at(-1).metadata.emergency_count_window, 1);
    assert.equal(state.inserted.at(-1).metadata.emergency_remaining, 0);
  }
  assert.equal((await post({ action: "track", eventType: "free_generate_success" })).status, 400);
});
