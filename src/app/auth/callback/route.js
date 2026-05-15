import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSafeNextPath(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";

  try {
    const url = new URL(value, "http://local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
