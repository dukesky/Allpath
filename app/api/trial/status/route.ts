import { NextResponse } from "next/server";
import { getTrialStatusForRequest } from "@/lib/trial";

export async function GET() {
  const status = await getTrialStatusForRequest();
  return NextResponse.json(status);
}
