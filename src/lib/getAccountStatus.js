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
        { onConflict: "id" }
      )
      .select("email, is_pro")
      .single();

    if (upsertError) {
      throw upsertError;
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