import { Message, Mode, SessionConfig, StreamEvent } from "@/lib/types";

type Subscriber = (event: StreamEvent) => void;

interface QueueItem {
  messageId: string;
  mode: Mode;
  targetParticipantIds?: string[];
}

interface InternalSessionState {
  config: SessionConfig;
  subscribers: Set<Subscriber>;
  queue: QueueItem[];
}

declare global {
  // Keep in-memory state stable across Next.js dev hot reloads.
  // eslint-disable-next-line no-var
  var __allpathSessions: Map<string, InternalSessionState> | undefined;
}

const sessions =
  globalThis.__allpathSessions ?? new Map<string, InternalSessionState>();

if (!globalThis.__allpathSessions) {
  globalThis.__allpathSessions = sessions;
}

export function getSession(sessionId: string): InternalSessionState | undefined {
  return sessions.get(sessionId);
}

export function createSession(config: SessionConfig): InternalSessionState {
  const value: InternalSessionState = {
    config,
    subscribers: new Set<Subscriber>(),
    queue: []
  };

  sessions.set(config.sessionId, value);
  return value;
}

export function subscribe(sessionId: string, subscriber: Subscriber): () => void {
  const session = sessions.get(sessionId);
  if (!session) {
    return () => undefined;
  }

  session.subscribers.add(subscriber);
  return () => {
    session.subscribers.delete(subscriber);
  };
}

export function emit(sessionId: string, event: StreamEvent): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  for (const subscriber of session.subscribers) {
    subscriber(event);
  }
}

export function addMessage(sessionId: string, message: Message): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  session.config.messages.push(message);
  emit(sessionId, { type: "message_created", payload: { message } });
}

export function updateMessage(
  sessionId: string,
  messageId: string,
  updater: (message: Message) => void
): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  const message = session.config.messages.find((item) => item.messageId === messageId);
  if (!message) {
    return;
  }

  updater(message);
  emit(sessionId, { type: "message_updated", payload: { message } });
}

export function removeMessage(sessionId: string, messageId: string): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  const index = session.config.messages.findIndex((item) => item.messageId === messageId);
  if (index < 0) {
    return;
  }

  session.config.messages.splice(index, 1);
  emit(sessionId, { type: "message_removed", payload: { messageId } });
}

export function pushQueue(
  sessionId: string,
  item: { messageId: string; mode: Mode; targetParticipantIds?: string[] }
): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  session.queue.push({
    messageId: item.messageId,
    mode: item.mode,
    targetParticipantIds: item.targetParticipantIds?.length ? item.targetParticipantIds : undefined
  });
}

export function shiftQueue(sessionId: string): QueueItem | undefined {
  const session = sessions.get(sessionId);
  if (!session) {
    return undefined;
  }

  return session.queue.shift();
}

export function setSessionMode(sessionId: string, mode: Mode): boolean {
  const session = sessions.get(sessionId);
  if (!session) {
    return false;
  }

  session.config.mode = mode;
  emit(sessionId, {
    type: "session_state",
    payload: { status: session.config.status, roundNumber: session.config.roundNumber, mode }
  });

  return true;
}

export function setParticipantMuted(
  sessionId: string,
  participantId: string,
  muted: boolean
): SessionConfig["participants"] | null {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const participant = session.config.participants.find((item) => item.id === participantId);
  if (!participant) {
    return null;
  }

  participant.muted = muted;
  emit(sessionId, {
    type: "session_state",
    payload: {
      status: session.config.status,
      roundNumber: session.config.roundNumber,
      mode: session.config.mode,
      participants: session.config.participants
    }
  });

  return session.config.participants;
}
