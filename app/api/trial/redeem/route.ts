import { NextRequest, NextResponse } from "next/server";
import { redeemInviteCode, trialCookieName } from "@/lib/trial";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { code?: string };

  try {
    const result = await redeemInviteCode(body.code ?? "");
    const response = NextResponse.json({
      available: true,
      requiresInviteCode: false,
      guestId: result.guest.guestId,
      redeemedCode: result.guest.redeemedCode,
      trialStatus: result.guest.trialStatus,
      trialBudgetUsd: result.guest.trialBudgetUsd,
      trialSpentUsd: result.guest.trialSpentUsd,
      remainingBudgetUsd: result.guest.trialBudgetUsd,
      hasPersonalOpenRouterKey: false
    });

    response.cookies.set({
      name: trialCookieName(),
      value: result.cookieValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to redeem invite code.";
    const code =
      typeof error === "object" && error && "code" in error ? String(error.code) : "trial_redeem_failed";
    const status =
      typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message, code }, { status });
  }
}
