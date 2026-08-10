import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/serverAuth";
import {
  getGuestByLinkedUid,
  getGuestFromCookie,
  getTrialStatusForRequest,
  guestCookieValueFor,
  linkGuestToUser,
  toStatusPayload,
  trialCookieName
} from "@/lib/trial";

export async function GET(request: NextRequest) {
  const status = await getTrialStatusForRequest();
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(status);
  }

  // Signed in with an active guest cookie: link the guest record to the
  // account so the trial budget can follow the user across devices.
  if (!status.requiresInviteCode && status.guestId) {
    const guest = await getGuestFromCookie();
    if (guest && guest.linkedUid !== user.uid) {
      await linkGuestToUser(guest.guestId, user.uid).catch(() => undefined);
    }
    return NextResponse.json(status);
  }

  // Signed in but no cookie (new device/browser): recover the linked guest
  // record and re-issue the cookie.
  try {
    const linkedGuest = await getGuestByLinkedUid(user.uid);
    if (!linkedGuest) {
      return NextResponse.json(status);
    }

    const response = NextResponse.json(toStatusPayload(linkedGuest));
    response.cookies.set({
      name: trialCookieName(),
      value: guestCookieValueFor(linkedGuest.guestId),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180
    });
    return response;
  } catch {
    return NextResponse.json(status);
  }
}
