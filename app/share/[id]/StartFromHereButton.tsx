"use client";

import { useRouter } from "next/navigation";

export function StartFromHereButton({ shareId }: { shareId: string }) {
  const router = useRouter();

  function handleClick() {
    sessionStorage.setItem("allpath-from-share-id", shareId);
    router.push("/chat");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
    >
      Start from here with this team →
    </button>
  );
}
