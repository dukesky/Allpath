import { Message, SessionConfig, StreamEvent } from "@/lib/types";

type Subscriber = (event: StreamEvent) => void;

interface InternalSessionState {
  config: SessionConfig;
  subscribers: Set<Subscriber>;
  queue: string[];
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

export function pushQueue(sessionId: string, messageId: string): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  session.queue.push(messageId);
}

export function shiftQueue(sessionId: string): string | undefined {
  const session = sessions.get(sessionId);
  if (!session) {
    return undefined;
  }

  return session.queue.shift();
}
