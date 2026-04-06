// app/api/share/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getShareRecord } from "@/lib/share";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let record;
  try {
    record = await getShareRecord(id);
  } catch (err) {
    console.error("[share] Firestore read failed:", err);
    return NextResponse.json({ error: "Failed to load share record." }, { status: 500 });
  }

  if (!record) {
    return NextResponse.json({ error: "Share not found or expired." }, { status: 404 });
  }

  return NextResponse.json(record);
}
