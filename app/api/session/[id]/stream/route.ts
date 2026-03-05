import { NextRequest } from "next/server";
import { getSession, subscribe } from "@/lib/store";
import { StreamEvent } from "@/lib/types";

const encoder = new TextEncoder();

function toSse(event: StreamEvent): Uint8Array {
  return encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  let teardown: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      teardown?.();
    },
    start(controller) {
      const unsubscribe = subscribe(id, (event) => {
        controller.enqueue(toSse(event));
      });

      controller.enqueue(
        toSse({
          type: "session_state",
          payload: {
            status: session.config.status,
            roundNumber: session.config.roundNumber,
            mode: session.config.mode,
            existingMessages: session.config.messages
          }
        })
      );

      const timer = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15000);

      teardown = () => {
        clearInterval(timer);
        unsubscribe();
      };
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
