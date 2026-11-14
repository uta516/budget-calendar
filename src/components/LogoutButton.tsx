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
      className="rounded-full border border-black/[.08] px-4 py-2 text-sm hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
    >
      ログアウト
    </button>
  );
}
