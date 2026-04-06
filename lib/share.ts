import { randomUUID } from "crypto";
import { getFirestoreDb } from "@/lib/firestore";
import { Message, Mode, ShareableParticipant, ShareRecord } from "@/lib/types";

const SHARES_COLLECTION = "shared_sessions";
const SHARE_TTL_DAYS = 30;

function nowIso(): string {
  return new Date().toISOString();
}

function expiresAtIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + SHARE_TTL_DAYS);
  return d.toISOString();
}

function deriveTitle(transcript: Message[]): string {
  const firstUserMessage = transcript.find((m) => m.sourceRole === "user");
  const text = firstUserMessage?.content ?? "Untitled Session";
  return text.length > 80 ? text.slice(0, 77) + "…" : text;
}

export async function createShareRecord(input: {
  mode: Mode;
  transcript: Message[];
  agentConfig: ShareableParticipant[];
}): Promise<ShareRecord> {
  const db = getFirestoreDb();
  const shareId = randomUUID();
  const record: ShareRecord = {
    shareId,
    createdAt: nowIso(),
    expiresAt: expiresAtIso(),
    mode: input.mode,
    title: deriveTitle(input.transcript),
    transcript: input.transcript,
    agentConfig: input.agentConfig
  };

  // JSON round-trip strips undefined fields (e.g. optional Message.attachments)
  // which Firestore rejects without ignoreUndefinedProperties.
  const sanitized = JSON.parse(JSON.stringify(record)) as ShareRecord;
  await db.collection(SHARES_COLLECTION).doc(shareId).set(sanitized);
  return record;
}

export async function getShareRecord(shareId: string): Promise<ShareRecord | null> {
  const db = getFirestoreDb();
  const doc = await db.collection(SHARES_COLLECTION).doc(shareId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as ShareRecord;

  // Treat expired shares as missing
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
    return null;
  }

  return data;
}
