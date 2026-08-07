export type MembershipLevel =
  | "free"
  | "vip";

export type UserMembership = {
  id: string;
  name: string;
  level: MembershipLevel;
};

export function hasVipAccess(
  user: UserMembership | null,
): boolean {
  return user?.level === "vip";
}

export function getMembershipName(
  level: MembershipLevel,
): string {
  switch (level) {
    case "vip":
      return "VIP會員";

    default:
      return "免費會員";
  }
}