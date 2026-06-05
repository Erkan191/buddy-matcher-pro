import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";

const FREE_GENERATE_WEEKLY_LIMIT = 30;
const FREE_GENERATE_WINDOW_DAYS = 7;
const FREE_GENERATE_WINDOW_MS =
  FREE_GENERATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const FREE_GENERATE_EMERGENCY_DAILY_LIMIT = 3;
const FREE_GENERATE_SUCCESS_EVENT = "free_generate_success";
const FREE_GENERATE_QUOTA_COOKIE_NAME = "bm_free_generate_quota";
const FREE_GENERATE_QUOTA_COOKIE_MAX_AGE = 60 * 24 * 60 * 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function getCleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getServerQuotaDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCookieSecret() {
  return (
    process.env.FREE_GENERATE_COOKIE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

function signQuotaId(quotaId) {
  const secret = getCookieSecret();

  if (!secret) {
    throw new Error("Missing free generate cookie signing secret");
  }

  return createHmac("sha256", secret).update(quotaId).digest("base64url");
}

function createSignedQuotaCookieValue(quotaId) {
  return `${quotaId}.${signQuotaId(quotaId)}`;
}

function readQuotaCookieValue(request) {
  const nextCookieValue =
    request.cookies?.get(FREE_GENERATE_QUOTA_COOKIE_NAME)?.value || "";

  if (nextCookieValue) return nextCookieValue;

  const cookieHeader = request.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${FREE_GENERATE_QUOTA_COOKIE_NAME}=`));

  return cookie ? cookie.slice(FREE_GENERATE_QUOTA_COOKIE_NAME.length + 1) : "";
}

function getVerifiedQuotaId(cookieValue) {
  const [quotaId, signature, extra] = cookieValue.split(".");

  if (extra || !quotaId || !signature) return "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      quotaId
    )
  ) {
    return "";
  }

  const expected = Buffer.from(signQuotaId(quotaId));
  const received = Buffer.from(signature);

  if (expected.length !== received.length) return "";

  return timingSafeEqual(expected, received) ? quotaId : "";
}

function getAnonymousQuotaCookie(request, { createIfMissing = true } = {}) {
  const cookieValue = readQuotaCookieValue(request);
  const existingQuotaId = cookieValue ? getVerifiedQuotaId(cookieValue) : "";

  if (existingQuotaId) {
    return {
      quotaId: existingQuotaId,
      cookieValue: "",
    };
  }

  if (!createIfMissing) {
    return {
      quotaId: "",
      cookieValue: "",
    };
  }

  const quotaId = randomUUID();

  return {
    quotaId,
    cookieValue: createSignedQuotaCookieValue(quotaId),
  };
}

function withQuotaCookie(response, cookieValue) {
  if (!cookieValue) return response;

  response.cookies.set({
    name: FREE_GENERATE_QUOTA_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: FREE_GENERATE_QUOTA_COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return "";

  return authHeader.slice(7).trim();
}

function filterIdentity(query, identity) {
  if (identity.userId) {
    return query.eq("user_id", identity.userId);
  }

  return query.is("user_id", null).eq("session_id", identity.sessionId);
}

function buildUsageMetadata({ identity, quotaDate, status, metadata = {} }) {
  return {
    ...metadata,
    free_generate_identity_type: identity.type,
    free_generate_identity_id: identity.id,
    local_date: quotaDate,
    weekly_count: status.weeklyCount,
    weekly_limit: FREE_GENERATE_WEEKLY_LIMIT,
    window_days: FREE_GENERATE_WINDOW_DAYS,
    emergency_count_today: status.emergencyCountToday,
    emergency_limit: FREE_GENERATE_EMERGENCY_DAILY_LIMIT,
    emergency_remaining: status.emergencyRemaining,
  };
}

async function resolveIdentity(
  request,
  clientSessionId,
  { createAnonymousQuota = true } = {}
) {
  const token = getBearerToken(request);

  if (token) {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      console.error("Free generate auth lookup failed:", error);
      return { error: "Invalid auth token", status: 401 };
    }

    if (user) {
      return {
        identity: {
          type: "user",
          id: user.id,
          userId: user.id,
          sessionId: clientSessionId,
        },
      };
    }
  }

  const quotaCookie = getAnonymousQuotaCookie(request, {
    createIfMissing: createAnonymousQuota,
  });

  if (!quotaCookie.quotaId) {
    return {
      error: "Missing anonymous quota cookie",
      status: 429,
      body: {
        recorded: false,
        canGenerate: false,
        freeUsageMode: null,
        weeklyCount: 0,
        emergencyCountToday: 0,
        emergencyRemaining: 0,
      },
    };
  }

  return {
    identity: {
      type: "session",
      id: quotaCookie.quotaId,
      userId: null,
      sessionId: quotaCookie.quotaId,
    },
    quotaCookieValue: quotaCookie.cookieValue,
  };
}

async function getIsPro(userId) {
  if (!userId) return false;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("is_pro")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!data?.is_pro;
}

async function getFreeGenerateStatus(identity, quotaDate) {
  const windowStart = new Date(Date.now() - FREE_GENERATE_WINDOW_MS).toISOString();

  let query = supabaseAdmin
    .from("usage_events")
    .select("metadata")
    .eq("event_type", FREE_GENERATE_SUCCESS_EVENT)
    .gte("created_at", windowStart);

  query = filterIdentity(query, identity);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const events = data || [];
  const weeklyCount = events.filter(
    (event) => event.metadata?.free_usage_mode === "weekly"
  ).length;
  const emergencyCountToday = events.filter(
    (event) =>
      event.metadata?.free_usage_mode === "emergency" &&
      event.metadata?.local_date === quotaDate
  ).length;
  const emergencyRemaining = Math.max(
    0,
    FREE_GENERATE_EMERGENCY_DAILY_LIMIT - emergencyCountToday
  );

  return {
    weeklyCount,
    emergencyCountToday,
    emergencyRemaining,
  };
}

async function insertUsageEvent({
  eventType,
  identity,
  quotaDate,
  status,
  metadata = {},
}) {
  const { error } = await supabaseAdmin.from("usage_events").insert({
    event_type: eventType,
    session_id: identity.sessionId || null,
    user_id: identity.userId || null,
    metadata: buildUsageMetadata({
      identity,
      quotaDate,
      status,
      metadata,
    }),
  });

  if (error) {
    throw error;
  }
}

async function insertUsageEventBestEffort(args) {
  try {
    await insertUsageEvent(args);
  } catch (error) {
    console.error("Could not track free generate usage event:", error);
  }
}

function proResponse() {
  return {
    canGenerate: true,
    freeUsageMode: "pro",
    weeklyCount: 0,
    emergencyCountToday: 0,
    emergencyRemaining: FREE_GENERATE_EMERGENCY_DAILY_LIMIT,
  };
}

async function checkAllowance({
  identity,
  isPro,
  quotaDate,
  useEmergencyOverride,
  metadata,
}) {
  if (isPro) {
    return NextResponse.json(proResponse());
  }

  const status = await getFreeGenerateStatus(identity, quotaDate);

  if (status.weeklyCount < FREE_GENERATE_WEEKLY_LIMIT) {
    return NextResponse.json({
      canGenerate: true,
      freeUsageMode: "weekly",
      ...status,
    });
  }

  if (useEmergencyOverride && status.emergencyRemaining > 0) {
    return NextResponse.json({
      canGenerate: true,
      freeUsageMode: "emergency",
      ...status,
    });
  }

  await insertUsageEventBestEffort({
    eventType:
      status.emergencyRemaining > 0
        ? "free_generate_limit_reached"
        : "free_generate_limit_blocked",
    identity,
    quotaDate,
    status,
    metadata,
  });

  return NextResponse.json({
    canGenerate: false,
    freeUsageMode: null,
    ...status,
  });
}

async function recordSuccessfulGenerate({
  identity,
  isPro,
  quotaDate,
  metadata,
}) {
  if (isPro) {
    return NextResponse.json({
      recorded: false,
      ...proResponse(),
    });
  }

  const { data, error } = await supabaseAdmin.rpc(
    "record_free_generate_success",
    {
      p_identity_type: identity.type,
      p_identity_id: identity.id,
      p_user_id: identity.userId,
      p_session_id: identity.sessionId || null,
      p_quota_date: quotaDate,
      p_metadata: metadata,
    }
  );

  if (error) {
    throw error;
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    throw new Error("Missing free generate quota RPC result");
  }

  const status = {
    weeklyCount: Number(result.weekly_count) || 0,
    emergencyCountToday: Number(result.emergency_count_today) || 0,
    emergencyRemaining: Number(result.emergency_remaining) || 0,
  };

  if (!result.recorded) {
    await insertUsageEventBestEffort({
      eventType: "free_generate_limit_blocked",
      identity,
      quotaDate,
      status,
      metadata,
    });

    return NextResponse.json(
      {
        recorded: false,
        canGenerate: false,
        freeUsageMode: null,
        ...status,
      },
      { status: 429 }
    );
  }

  const freeUsageMode = result.free_usage_mode || "";

  if (freeUsageMode === "emergency") {
    await insertUsageEventBestEffort({
      eventType: "free_generate_emergency_used",
      identity,
      quotaDate,
      status,
      metadata: {
        ...metadata,
        free_usage_mode: freeUsageMode,
      },
    });
  }

  return NextResponse.json({
    recorded: true,
    canGenerate: true,
    freeUsageMode,
    ...status,
  });
}

async function trackLimitEvent({ identity, quotaDate, eventType, metadata }) {
  const allowedEvents = new Set([
    "free_generate_limit_upgrade_clicked",
    "free_generate_limit_maybe_later_clicked",
  ]);

  if (!allowedEvents.has(eventType)) {
    return NextResponse.json({ error: "Unsupported event type" }, { status: 400 });
  }

  const status = await getFreeGenerateStatus(identity, quotaDate);

  await insertUsageEventBestEffort({
    eventType,
    identity,
    quotaDate,
    status,
    metadata,
  });

  return NextResponse.json({
    tracked: true,
    ...status,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = getCleanString(body.action);
    const clientSessionId = getCleanString(body.sessionId);
    const clientLocalDate = getCleanString(body.localDate);
    const quotaDate = getServerQuotaDate();
    const metadata =
      body.metadata &&
      typeof body.metadata === "object" &&
      !Array.isArray(body.metadata)
        ? body.metadata
        : {};
    const requestMetadata = {
      ...metadata,
      ...(clientLocalDate ? { client_local_date: clientLocalDate } : {}),
      ...(clientSessionId ? { client_session_id: clientSessionId } : {}),
    };

    const resolved = await resolveIdentity(request, clientSessionId, {
      createAnonymousQuota: action !== "record",
    });

    if (resolved.error) {
      return NextResponse.json(
        { error: resolved.error, ...(resolved.body || {}) },
        { status: resolved.status }
      );
    }

    const { identity } = resolved;
    const addQuotaCookie = (response) =>
      withQuotaCookie(response, resolved.quotaCookieValue);
    const isPro = await getIsPro(identity.userId);

    if (action === "check") {
      return addQuotaCookie(
        await checkAllowance({
          identity,
          isPro,
          quotaDate,
          useEmergencyOverride: body.useEmergencyOverride === true,
          metadata: requestMetadata,
        })
      );
    }

    if (action === "record") {
      return addQuotaCookie(
        await recordSuccessfulGenerate({
          identity,
          isPro,
          quotaDate,
          metadata: requestMetadata,
        })
      );
    }

    if (action === "track") {
      return addQuotaCookie(
        await trackLimitEvent({
          identity,
          quotaDate,
          eventType: getCleanString(body.eventType),
          metadata: requestMetadata,
        })
      );
    }

    return addQuotaCookie(
      NextResponse.json({ error: "Unsupported action" }, { status: 400 })
    );
  } catch (error) {
    console.error("Free generate usage API error:", error);
    return NextResponse.json(
      { error: "Could not process free generate usage" },
      { status: 500 }
    );
  }
}
