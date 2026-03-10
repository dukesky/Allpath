import { NextRequest, NextResponse } from "next/server";
import { getGuestFromCookie, saveGuestPersonalOpenRouterKey, toStatusPayload } from "@/lib/trial";

export async function POST(request: NextRequest) {
  const guest = await getGuestFromCookie();
  if (!guest) {
    return NextResponse.json(
      { error: "Redeem an invite code before saving a personal OpenRouter key.", code: "trial_invite_required" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { apiKey?: string };

  try {
    const nextGuest = await saveGuestPersonalOpenRouterKey(guest.guestId, body.apiKey ?? "");
    return NextResponse.json(toStatusPayload(nextGuest));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save personal OpenRouter key.";
    const code =
      typeof error === "object" && error && "code" in error ? String(error.code) : "trial_personal_key_failed";
    const status =
      typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
    return NextResponse.json({ error: message, code }, { status });
  }
}
