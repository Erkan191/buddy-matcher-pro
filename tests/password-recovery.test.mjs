import test from "node:test";
import assert from "node:assert/strict";
import {
  clearPasswordRecovery,
  getPasswordRecoveryUser,
  initializePasswordRecovery,
  readRecoveryLink,
} from "../src/lib/passwordRecovery.mjs";

const MARKER_KEY = "bm_password_recovery";
const USER_ID = "e7257b5c-1a92-4ce4-bef5-86c2b4a77051";
const SESSION_ID = "2e585e75-8ae2-4ae6-a21f-bae57896f455";
const OTHER_USER_ID = "f8fc1954-13e0-4d08-a9ee-e3c26dff582a";
const OTHER_SESSION_ID = "d60dd3e8-e818-4a79-ac45-d3a150b6c37e";

function jwt(claims = {}) {
  const encoded = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encoded({ alg: "HS256", typ: "JWT" })}.${encoded({
    sub: USER_ID,
    session_id: SESSION_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...claims,
  })}.test-signature`;
}

function session(overrides = {}) {
  return {
    access_token: jwt(),
    refresh_token: "test-refresh-token",
    user: { id: USER_ID, email: "member@example.test" },
    ...overrides,
  };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function marker(overrides = {}) {
  return JSON.stringify({
    userId: USER_ID,
    sessionId: SESSION_ID,
    expiresAt: Date.now() + 30 * 60 * 1000,
    ...overrides,
  });
}

function recoveryHash(currentSession) {
  return `#${new URLSearchParams({
    type: "recovery",
    access_token: currentSession.access_token,
    refresh_token: currentSession.refresh_token,
    token_type: "bearer",
    expires_in: "3600",
  })}`;
}

function fakeAuth(options = {}) {
  let currentSession = options.session === undefined ? session() : options.session;
  const calls = [];
  return {
    calls,
    setSession(nextSession) {
      currentSession = nextSession;
    },
    async initialize() {
      calls.push({ method: "initialize" });
      return { error: options.initializeError ?? null };
    },
    async getSession() {
      calls.push({ method: "getSession" });
      return { data: { session: currentSession }, error: options.sessionError ?? null };
    },
    async getUser(token) {
      calls.push({ method: "getUser", token });
      return {
        data: { user: options.user === undefined ? currentSession?.user ?? null : options.user },
        error: options.userError ?? null,
      };
    },
  };
}

test("ordinary links contain no recovery credentials", () => {
  for (const hash of ["", "#features", "#next=tool"]) {
    const link = readRecoveryLink(hash);
    assert.equal(link.hasAuthParams, false);
    assert.equal(link.isRecovery, false);
    assert.equal(link.hasError, false);
    assert.ok(!link.accessToken);
  }
});

test("recovery link captures the token before the SDK can remove the fragment", () => {
  const currentSession = session();
  const link = readRecoveryLink(recoveryHash(currentSession));
  assert.equal(link.hasAuthParams, true);
  assert.equal(link.isRecovery, true);
  assert.equal(link.hasError, false);
  assert.equal(link.accessToken, currentSession.access_token);
});

test("URL errors are captured even when the provider omits the recovery type", () => {
  for (const hash of [
    "#error=access_denied",
    "#error_code=otp_expired",
    "#error_description=Email+link+is+invalid+or+has+expired",
  ]) {
    const link = readRecoveryLink(hash);
    assert.equal(link.hasAuthParams, true);
    assert.equal(link.hasError, true);
  }
});

test("a verified recovery link establishes a user- and session-bound marker", async () => {
  const currentSession = session();
  const auth = fakeAuth({ session: currentSession });
  const storage = memoryStorage();
  const startedAt = Date.now();
  const user = await initializePasswordRecovery(auth, readRecoveryLink(recoveryHash(currentSession)), storage);

  assert.deepEqual(user, currentSession.user);
  assert.ok(auth.calls.some((call) => call.method === "initialize"));
  assert.ok(auth.calls.some((call) => call.method === "getUser" && call.token === currentSession.access_token));
  const saved = JSON.parse(storage.getItem(MARKER_KEY));
  assert.equal(saved.userId, USER_ID);
  assert.equal(saved.sessionId, SESSION_ID);
  assert.ok(saved.expiresAt > startedAt);
  assert.ok(saved.expiresAt <= Date.now() + 60 * 60 * 1000);
  const claims = JSON.parse(Buffer.from(currentSession.access_token.split(".")[1], "base64url").toString());
  assert.ok(saved.expiresAt <= claims.exp * 1000);
  assert.ok(!storage.getItem(MARKER_KEY).includes(currentSession.access_token));
  assert.ok(!storage.getItem(MARKER_KEY).includes(currentSession.refresh_token));
});

test("the recovery marker cannot outlive a shorter token lifetime", async () => {
  const expiresAt = Math.floor(Date.now() / 1000) + 90;
  const currentSession = session({ access_token: jwt({ exp: expiresAt }) });
  const storage = memoryStorage();
  assert.ok(await initializePasswordRecovery(fakeAuth({ session: currentSession }), readRecoveryLink(recoveryHash(currentSession)), storage));
  assert.ok(JSON.parse(storage.getItem(MARKER_KEY)).expiresAt <= expiresAt * 1000);
});

test("a direct reset-page visit does not authorize an ordinary logged-in session", async () => {
  const auth = fakeAuth();
  const storage = memoryStorage();
  assert.equal(await initializePasswordRecovery(auth, readRecoveryLink(""), storage), null);
  assert.equal(await getPasswordRecoveryUser(auth, storage), null);
  assert.equal(storage.getItem(MARKER_KEY), null);
});

test("a valid new link replaces an earlier account's recovery marker", async () => {
  const currentSession = session();
  const storage = memoryStorage({ [MARKER_KEY]: marker({ userId: OTHER_USER_ID, sessionId: OTHER_SESSION_ID }) });
  assert.ok(await initializePasswordRecovery(fakeAuth({ session: currentSession }), readRecoveryLink(recoveryHash(currentSession)), storage));
  const saved = JSON.parse(storage.getItem(MARKER_KEY));
  assert.equal(saved.userId, USER_ID);
  assert.equal(saved.sessionId, SESSION_ID);
});

test("an expired-link error blocks a stored session and invalidates an older marker", async () => {
  const storage = memoryStorage({ [MARKER_KEY]: marker() });
  const auth = fakeAuth();
  const user = await initializePasswordRecovery(auth, readRecoveryLink("#error=access_denied&error_code=otp_expired"), storage);
  assert.equal(user, null);
  assert.equal(storage.getItem(MARKER_KEY), null);
  assert.equal(auth.calls.filter((call) => call.method === "getUser").length, 0);
});

test("SDK initialization failure never falls back to an existing session", async () => {
  const currentSession = session();
  const storage = memoryStorage({ [MARKER_KEY]: marker() });
  const auth = fakeAuth({ session: currentSession, initializeError: new Error("Expired recovery link") });
  assert.equal(await initializePasswordRecovery(auth, readRecoveryLink(recoveryHash(currentSession)), storage), null);
  assert.equal(storage.getItem(MARKER_KEY), null);
});

test("an incomplete or non-recovery auth fragment cannot reuse an earlier marker", async () => {
  for (const hash of ["#type=recovery", "#access_token=incomplete", "#type=signup&access_token=signup-token"]) {
    const storage = memoryStorage({ [MARKER_KEY]: marker() });
    assert.equal(await initializePasswordRecovery(fakeAuth(), readRecoveryLink(hash), storage), null);
    assert.equal(storage.getItem(MARKER_KEY), null);
  }
});

test("recovery must initialize the exact incoming token instead of a different logged-in account", async () => {
  const incomingSession = session();
  const storedSession = session({
    access_token: jwt({ sub: OTHER_USER_ID, session_id: OTHER_SESSION_ID }),
    user: { id: OTHER_USER_ID, email: "other@example.test" },
  });
  const storage = memoryStorage({ [MARKER_KEY]: marker() });
  assert.equal(await initializePasswordRecovery(fakeAuth({ session: storedSession }), readRecoveryLink(recoveryHash(incomingSession)), storage), null);
  assert.equal(storage.getItem(MARKER_KEY), null);
});

test("malformed, expired or session-less tokens cannot establish recovery", async () => {
  const tokens = [
    "malformed-token",
    "header.invalid-json.signature",
    jwt({ session_id: undefined }),
    jwt({ exp: Math.floor(Date.now() / 1000) - 10 }),
  ];
  for (const accessToken of tokens) {
    const currentSession = session({ access_token: accessToken });
    const storage = memoryStorage();
    assert.equal(await initializePasswordRecovery(fakeAuth({ session: currentSession }), readRecoveryLink(recoveryHash(currentSession)), storage), null);
    assert.equal(storage.getItem(MARKER_KEY), null);
  }
});

test("a rejected user verification cannot establish recovery", async () => {
  const currentSession = session();
  const storage = memoryStorage();
  const auth = fakeAuth({ session: currentSession, user: null, userError: new Error("JWT rejected") });
  assert.equal(await initializePasswordRecovery(auth, readRecoveryLink(recoveryHash(currentSession)), storage), null);
  assert.equal(storage.getItem(MARKER_KEY), null);
});

test("a validated recovery survives a reload without a URL fragment", async () => {
  const storage = memoryStorage({ [MARKER_KEY]: marker() });
  const auth = fakeAuth();
  const user = await initializePasswordRecovery(auth, readRecoveryLink(""), storage);
  assert.equal(user?.id, USER_ID);
  assert.equal((await getPasswordRecoveryUser(auth, storage))?.id, USER_ID);
});

test("a token refresh keeps recovery available for the same verified user and session", async () => {
  const storage = memoryStorage({ [MARKER_KEY]: marker() });
  const refreshedSession = session({ access_token: jwt({ exp: Math.floor(Date.now() / 1000) + 7200 }) });
  const auth = fakeAuth({ session: refreshedSession });
  assert.equal((await getPasswordRecoveryUser(auth, storage))?.id, USER_ID);
  assert.ok(auth.calls.some((call) => call.method === "getUser" && call.token === refreshedSession.access_token));
});

test("same user signing in through a different session must obtain a new recovery link", async () => {
  const storage = memoryStorage({ [MARKER_KEY]: marker() });
  const auth = fakeAuth({ session: session({ access_token: jwt({ session_id: OTHER_SESSION_ID }) }) });
  assert.equal(await getPasswordRecoveryUser(auth, storage), null);
  assert.equal(storage.getItem(MARKER_KEY), null);
});

test("switching the logged-in account invalidates a previous recovery marker", async () => {
  const storage = memoryStorage({ [MARKER_KEY]: marker() });
  const auth = fakeAuth({ session: session({
    access_token: jwt({ sub: OTHER_USER_ID, session_id: OTHER_SESSION_ID }),
    user: { id: OTHER_USER_ID, email: "other@example.test" },
  }) });
  assert.equal(await getPasswordRecoveryUser(auth, storage), null);
  assert.equal(storage.getItem(MARKER_KEY), null);
});

test("expired or malformed stored markers are rejected and cleared", async () => {
  for (const value of [
    marker({ expiresAt: Date.now() - 1 }),
    marker({ expiresAt: "not-a-time" }),
    marker({ userId: "" }),
    marker({ sessionId: "" }),
    "not-json",
    "null",
    "{}",
  ]) {
    const storage = memoryStorage({ [MARKER_KEY]: value });
    assert.equal(await getPasswordRecoveryUser(fakeAuth(), storage), null);
    assert.equal(storage.getItem(MARKER_KEY), null);
  }
});

test("loss of session or rejected session verification clears recovery permission", async () => {
  for (const options of [
    { session: null },
    { sessionError: new Error("Session unavailable") },
    { user: null, userError: new Error("Session revoked") },
  ]) {
    const storage = memoryStorage({ [MARKER_KEY]: marker() });
    assert.equal(await getPasswordRecoveryUser(fakeAuth(options), storage), null);
    assert.equal(storage.getItem(MARKER_KEY), null);
  }
});

test("clearing recovery removes only its marker and prevents later reuse", async () => {
  const storage = memoryStorage({ [MARKER_KEY]: marker(), unrelated: "keep-me" });
  clearPasswordRecovery(storage);
  assert.equal(storage.getItem(MARKER_KEY), null);
  assert.equal(storage.getItem("unrelated"), "keep-me");
  assert.equal(await getPasswordRecoveryUser(fakeAuth(), storage), null);
});
