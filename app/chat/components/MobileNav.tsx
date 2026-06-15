"use client";

interface MobileNavProps {
  mobileActivePanel: "chat" | "sessions" | "setup";
  sessionId: string | null;
  onSetPanel: (panel: "chat" | "sessions" | "setup") => void;
}

export function MobileNav({ mobileActivePanel, sessionId, onSetPanel }: MobileNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-around gap-2">
        <button
          type="button"
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
            mobileActivePanel === "chat" ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
          }`}
          onClick={() => onSetPanel(sessionId ? "chat" : "setup")}
        >
          Chat
        </button>
        <button
          type="button"
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
            mobileActivePanel === "sessions" ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
          }`}
          onClick={() => onSetPanel("sessions")}
        >
          Sessions
        </button>
        <button
          type="button"
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
            mobileActivePanel === "setup" ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
          }`}
          onClick={() => onSetPanel("setup")}
        >
          Setup
        </button>
      </div>
    </nav>
  );
}
