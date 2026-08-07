import { createClient } from "./supabase/server";

export type MembershipLevel = "free" | "vip";

export type CurrentMembership = {
  id: string | null;
  email: string | null;
  name: string;
  level: MembershipLevel;
  vipExpiresAt: string | null;
  isLoggedIn: boolean;
  isVip: boolean;
};

const guestMembership: CurrentMembership = {
  id: null,
  email: null,
  name: "訪客",
  level: "free",
  vipExpiresAt: null,
  isLoggedIn: false,
  isVip: false,
};

export async function getCurrentUserMembership(): Promise<CurrentMembership> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // 尚未登入
  if (userError || !user) {
    return guestMembership;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      name,
      level,
      vip_expires_at
    `)
    .eq("id", user.id)
    .maybeSingle();

  // 找不到 profile 時，一律視為免費會員
  if (profileError || !profile) {
    return {
      id: user.id,
      email: user.email ?? null,
      name:
        user.user_metadata?.name ??
        user.email ??
        "會員",
      level: "free",
      vipExpiresAt: null,
      isLoggedIn: true,
      isVip: false,
    };
  }

  const vipExpiresAt =
    profile.vip_expires_at ?? null;

  const vipExpiryTime =
    vipExpiresAt
      ? new Date(vipExpiresAt).getTime()
      : 0;

  const isVip =
    profile.level === "vip" &&
    vipExpiryTime > Date.now();

  return {
    id: user.id,
    email: user.email ?? null,
    name:
      profile.name ||
      user.user_metadata?.name ||
      user.email ||
      "會員",

    level: isVip ? "vip" : "free",

    vipExpiresAt,

    isLoggedIn: true,

    isVip,
  };
}