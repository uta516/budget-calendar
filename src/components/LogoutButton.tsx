"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 仮のログアウトボタン
export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
    >
      ログアウト
    </button>
  );
}
