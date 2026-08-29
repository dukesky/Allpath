import { NextRequest, NextResponse } from "next/server";
import { getFirestoreDb } from "@/lib/firestore";

/**
 * Ingest + read API for the Trading Agent's public journal.
 *
 * POST — called once per trading day by the (self-hosted) trading agent
 * after its close-of-day reflection. Auth is a single bearer secret
 * (`TRADING_LOG_TOKEN`, injected from Secret Manager like the other
 * secrets in cloudbuild.yaml). The payload is stored as-is under
 * `tradingJournal/{date}` — idempotent upsert, so a re-publish of the same
 * day simply overwrites it.
 *
 * GET — public, returns the most recent entries for the journal page (the
 * page itself reads Firestore directly server-side; this endpoint exists
 * for debugging and for anyone who wants the raw data).
 */

const COLLECTION = "tradingJournal";
const MAX_BODY_BYTES = 256 * 1024; // a day's digest is a few KB; cap hard.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function authorized(req: NextRequest): boolean {
  const token = process.env.TRADING_LOG_TOKEN ?? "";
  if (!token) return false; // unset secret = ingest disabled, never open
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${token}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const date = typeof body.date === "string" ? body.date : "";
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "invalid or missing date" }, { status: 400 });
  }
  await getFirestoreDb()
    .collection(COLLECTION)
    .doc(date)
    .set({ ...body, receivedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true, date });
}

export async function GET() {
  const snapshot = await getFirestoreDb()
    .collection(COLLECTION)
    .orderBy("date", "desc")
    .limit(30)
    .get();
  return NextResponse.json(
    { entries: snapshot.docs.map((d) => d.data()) },
    { headers: { "cache-control": "public, max-age=300" } }
  );
}
