const RECOVERY_KEY = "bm_password_recovery";
const MAX_RECOVERY_AGE_MS = 60 * 60 * 1000;

export function readRecoveryLink(hash = "") {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    hasAuthParams: ["type", "access_token", "refresh_token", "error", "error_code", "error_description"].some((key) => params.has(key)),
    isRecovery: params.get("type") === "recovery",
    hasError: ["error", "error_code", "error_description"].some((key) => params.has(key)),
    accessToken: params.get("access_token") || "",
  };
}

export function clearPasswordRecovery(storage) {
  try { storage.removeItem(RECOVERY_KEY); } catch { /* Storage can be disabled. */ }
}

function sessionClaims(token) {
  try {
    const claims = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof claims.session_id === "string" && Number.isFinite(claims.exp) ? claims : null;
  } catch { return null; }
}

async function verifiedSession(auth) {
  const { data, error } = await auth.getSession();
  if (error || !data?.session?.access_token) return null;
  const session = data.session;
  const claims = sessionClaims(session.access_token);
  if (!claims || claims.exp * 1000 <= Date.now()) return null;
  // Supabase verifies the token; decoded claims only bind the recovery marker.
  const result = await auth.getUser(session.access_token);
  if (result.error || !result.data?.user || result.data.user.id !== session.user.id) return null;
  return { user: result.data.user, session, claims };
}

export async function getPasswordRecoveryUser(auth, storage) {
  try {
    const marker = JSON.parse(storage.getItem(RECOVERY_KEY) || "null");
    if (!marker || !Number.isFinite(marker.expiresAt) || marker.expiresAt <= Date.now()) {
      clearPasswordRecovery(storage);
      return null;
    }
    const verified = await verifiedSession(auth);
    if (!verified || marker.userId !== verified.user.id || marker.sessionId !== verified.claims.session_id) {
      clearPasswordRecovery(storage);
      return null;
    }
    return verified.user;
  } catch {
    clearPasswordRecovery(storage);
    return null;
  }
}

export async function initializePasswordRecovery(auth, link, storage) {
  try {
    if (link.hasAuthParams) clearPasswordRecovery(storage);
    const initialized = await auth.initialize();
    if (initialized.error || link.hasError || (link.hasAuthParams && (!link.isRecovery || !link.accessToken))) {
      clearPasswordRecovery(storage);
      return null;
    }
    if (!link.hasAuthParams) return getPasswordRecoveryUser(auth, storage);
    const verified = await verifiedSession(auth);
    if (!verified || verified.session.access_token !== link.accessToken) return null;
    storage.setItem(RECOVERY_KEY, JSON.stringify({
      userId: verified.user.id,
      sessionId: verified.claims.session_id,
      expiresAt: Math.min(Date.now() + MAX_RECOVERY_AGE_MS, verified.claims.exp * 1000),
    }));
    return verified.user;
  } catch {
    clearPasswordRecovery(storage);
    return null;
  }
}
