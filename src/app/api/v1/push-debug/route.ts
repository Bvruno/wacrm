import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/automations/admin-client"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get("account_id")

  if (!accountId) {
    const { data: allSubs, error } = await supabaseAdmin()
      .from("push_subscriptions")
      .select("user_id, account_id, endpoint, created_at")
      .order("created_at", { ascending: false })

    return NextResponse.json({
      total: allSubs?.length ?? 0,
      subscriptions: allSubs ?? [],
      error: error?.message ?? null,
      hint: "Pass ?account_id=UUID to filter by account",
    })
  }

  const { data: direct, error: directErr } = await supabaseAdmin()
    .from("push_subscriptions")
    .select("user_id, account_id, endpoint, preferences, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })

  const { data: profiles } = await supabaseAdmin()
    .from("profiles")
    .select("user_id")
    .eq("account_id", accountId)

  const userIds = profiles?.map((p) => p.user_id) ?? []

  const { data: viaProfiles } =
    userIds.length > 0
      ? await supabaseAdmin()
          .from("push_subscriptions")
          .select("user_id, account_id, endpoint, preferences, created_at")
          .in("user_id", userIds)
          .order("created_at", { ascending: false })
      : { data: [] }

  const directEndpoints = direct?.map((s) => s.endpoint) ?? []

  return NextResponse.json({
    account_id: accountId,
    direct_matches: direct?.length ?? 0,
    direct_subscriptions: direct ?? [],
    profiles_in_account: profiles?.length ?? 0,
    user_ids: userIds,
    via_profiles_matches: viaProfiles?.length ?? 0,
    via_profiles_subscriptions:
      viaProfiles?.filter((s) => !directEndpoints.includes(s.endpoint)) ?? [],
    vapid_configured:
      !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      !!process.env.VAPID_PRIVATE_KEY,
    direct_error: directErr?.message ?? null,
  })
}
