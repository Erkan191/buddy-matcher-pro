import { createClient } from "@supabase/supabase-js";

import { readRecoveryLink } from "@/lib/passwordRecovery.mjs";

// Capture recovery details before Supabase consumes the URL fragment.
export const initialRecoveryLink = readRecoveryLink(
  typeof window !== "undefined" && window.location.pathname === "/reset-password"
    ? window.location.hash
    : ""
);

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);