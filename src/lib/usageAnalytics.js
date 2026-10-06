import { supabase } from "@/supabaseClient";
import { usageMetadata } from "@/lib/attribution.mjs";

export function getSessionId() {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem("bm_session_id");
    if (!id) { id = crypto.randomUUID(); window.localStorage.setItem("bm_session_id", id); }
    return id;
  } catch { return ""; }
}

export async function trackUsageEvent(eventType, metadata = {}, userId) {
  try {
    const sessionId = getSessionId();
    if (!sessionId) return;
    // Capture synchronously so navigation/auth waits cannot change event attribution.
    const context = usageMetadata(metadata);
    if (userId === undefined) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id ?? null;
    }
    const { error } = await supabase.from("usage_events").insert({
      event_type: eventType, session_id: sessionId, user_id: userId ?? null, metadata: context,
    });
    if (error) console.error("Could not track usage event:", error.code);
  } catch { /* Analytics must never interrupt the tool or checkout. */ }
}
