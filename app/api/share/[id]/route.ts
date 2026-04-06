// app/api/share/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getShareRecord } from "@/lib/share";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Share ID is required." }, { status: 400 });
  }

  const record = await getShareRecord(id);

  if (!record) {
    return NextResponse.json({ error: "Share not found or expired." }, { status: 404 });
  }

  return NextResponse.json(record);
}
