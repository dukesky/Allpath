import { getFirestoreDb } from "@/lib/firestore";
import {
  Message,
  MessageAttachment,
  Mode,
  ParticipantConfig,
  SessionConfig
} from "@/lib/types";

// Sessions owned by signed-in users are persisted under:
//   users/{uid}/sessions/{persistentId}                — PersistedSessionDoc
//   users/{uid}/sessions/{persistentId}/messages/{id}  — sanitized Message docs
// Secrets (provider apiKeys, globalApiKey) are never written. Attachment
// payloads (dataUrl/textContent) are stripped to stay within Firestore limits.

const USERS_COLLECTION = "users";
const SESSIONS_COLLECTION = "sessions";
const MESSAGES_COLLECTION = "messages";
const TITLE_MAX_LENGTH = 80;

export interface PersistedParticipant {
  id: string;
  label: string;
  avatarUrl?: string;
  model: string;
  muted?: boolean;
  roleTitle?: string;
  character?: string;
  provider: { type: ParticipantConfig["provider"]["type"]; baseUrl?: string };
}

export interface PersistedSessionDoc {
  persistentId: string;
  ownerUid: string;
  liveSessionId: string;
  title: string;
  mode: Mode;
  agentInitialPrompt?: string;
  participants: PersistedParticipant[];
  summarizer?: PersistedParticipant;
  roundNumber: number;
  messageCount: number;
  updatedAt: string;
}

type PersistedAttachment = Pick<MessageAttachment, "attachmentId" | "name" | "mimeType" | "kind">;

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

export function sanitizeParticipantForPersistence(participant: ParticipantConfig): PersistedParticipant {
  return omitUndefined({
    id: participant.id,
    label: participant.label,
    avatarUrl: participant.avatarUrl,
    model: participant.model,
    muted: participant.muted,
    roleTitle: participant.roleTitle,
    character: participant.character,
    provider: omitUndefined({
      type: participant.provider.type,
      baseUrl: participant.provider.baseUrl
    })
  });
}

export function sanitizeMessageForPersistence(message: Message): Message {
  const attachments: PersistedAttachment[] | undefined = message.attachments?.map((attachment) =>
    omitUndefined({
      attachmentId: attachment.attachmentId,
      name: attachment.name,
      mimeType: attachment.mimeType,
      kind: attachment.kind
    })
  );

  return omitUndefined({
    messageId: message.messageId,
    roundId: message.roundId,
    parentId: message.parentId,
    sourceRole: message.sourceRole,
    sourceModel: message.sourceModel,
    sourceLabel: message.sourceLabel,
    sourceAvatarUrl: message.sourceAvatarUrl,
    createdAt: message.createdAt,
    status: message.status,
    content: message.content,
    attachments
  }) as Message;
}

function deriveTitle(config: SessionConfig): string {
  if (config.title?.trim()) {
    return config.title.trim().slice(0, TITLE_MAX_LENGTH);
  }

  const firstUserMessage = config.messages.find(
    (message) => message.sourceRole === "user" && message.content.trim().length > 0
  );
  if (firstUserMessage) {
    return firstUserMessage.content.trim().slice(0, TITLE_MAX_LENGTH);
  }

  return "New session";
}

export function buildSessionDoc(config: SessionConfig, updatedAt: string): PersistedSessionDoc {
  if (!config.ownerUid || !config.persistentId) {
    throw new Error("buildSessionDoc requires ownerUid and persistentId");
  }

  return omitUndefined({
    persistentId: config.persistentId,
    ownerUid: config.ownerUid,
    liveSessionId: config.sessionId,
    title: deriveTitle(config),
    mode: config.mode,
    agentInitialPrompt: config.agentInitialPrompt,
    participants: config.participants.map(sanitizeParticipantForPersistence),
    summarizer: config.summarizer ? sanitizeParticipantForPersistence(config.summarizer) : undefined,
    roundNumber: config.roundNumber,
    messageCount: config.messages.length,
    updatedAt
  });
}

function sessionDocRef(ownerUid: string, persistentId: string) {
  return getFirestoreDb()
    .collection(USERS_COLLECTION)
    .doc(ownerUid)
    .collection(SESSIONS_COLLECTION)
    .doc(persistentId);
}

// Persists the session doc plus message docs. `recentRoundsOnly` limits the
// batch to the last two rounds (used on the per-round hot path); the initial
// persist writes the full transcript (e.g. sessions recreated from a stored
// transcript or a share import).
export async function persistSessionState(
  config: SessionConfig,
  options: { recentRoundsOnly?: boolean } = {}
): Promise<void> {
  if (!config.ownerUid || !config.persistentId) {
    return;
  }

  const now = new Date().toISOString();
  const docRef = sessionDocRef(config.ownerUid, config.persistentId);
  const db = getFirestoreDb();
  const batch = db.batch();

  batch.set(docRef, buildSessionDoc(config, now), { merge: true });

  const messages = config.messages.filter(
    (message) =>
      message.status !== "streaming" &&
      (!options.recentRoundsOnly || message.roundId >= config.roundNumber - 1)
  );

  for (const message of messages.slice(-400)) {
    batch.set(
      docRef.collection(MESSAGES_COLLECTION).doc(message.messageId),
      sanitizeMessageForPersistence(message)
    );
  }

  await batch.commit();
}

export async function listPersistedSessions(ownerUid: string): Promise<PersistedSessionDoc[]> {
  const snapshot = await getFirestoreDb()
    .collection(USERS_COLLECTION)
    .doc(ownerUid)
    .collection(SESSIONS_COLLECTION)
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get();

  return snapshot.docs.map((doc) => doc.data() as PersistedSessionDoc);
}

export async function getPersistedSession(
  ownerUid: string,
  persistentId: string
): Promise<{ session: PersistedSessionDoc; messages: Message[] } | null> {
  const docRef = sessionDocRef(ownerUid, persistentId);
  const [docSnapshot, messagesSnapshot] = await Promise.all([
    docRef.get(),
    docRef.collection(MESSAGES_COLLECTION).orderBy("createdAt", "asc").get()
  ]);

  if (!docSnapshot.exists) {
    return null;
  }

  return {
    session: docSnapshot.data() as PersistedSessionDoc,
    messages: messagesSnapshot.docs.map((doc) => doc.data() as Message)
  };
}

export async function deletePersistedSession(ownerUid: string, persistentId: string): Promise<boolean> {
  const docRef = sessionDocRef(ownerUid, persistentId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return false;
  }

  const db = getFirestoreDb();
  // Delete the messages subcollection in pages before removing the doc itself.
  for (;;) {
    const page = await docRef.collection(MESSAGES_COLLECTION).limit(300).get();
    if (page.empty) {
      break;
    }
    const batch = db.batch();
    for (const doc of page.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  await docRef.delete();
  return true;
}
