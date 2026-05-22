import { supabase } from "@/supabaseClient";

export async function getAccountStatus() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      email: "",
      isPro: false,
    };
  }

  const { data: existingUser, error: selectError } = await supabase
    .from("users")
    .select("email, is_pro")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (!existingUser) {
    const { data: insertedUser, error: upsertError } = await supabase
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email,
          is_pro: false,
        },
        { onConflict: "id", ignoreDuplicates: true }
      )
      .select("email, is_pro")
      .maybeSingle();

    if (upsertError) {
      throw upsertError;
    }

    if (!insertedUser) {
      const { data: resolvedUser, error: resolveError } = await supabase
        .from("users")
        .select("email, is_pro")
        .eq("id", user.id)
        .single();

      if (resolveError) {
        throw resolveError;
      }

      return {
        user,
        email: resolvedUser.email || user.email || "",
        isPro: !!resolvedUser.is_pro,
      };
    }

    return {
      user,
      email: insertedUser.email || user.email || "",
      isPro: !!insertedUser.is_pro,
    };
  }

  return {
    user,
    email: existingUser.email || user.email || "",
    isPro: !!existingUser.is_pro,
  };
}
