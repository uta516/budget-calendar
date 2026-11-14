"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/calendar.events",
        queryParams: { access_type: "offline", prompt: "consent" },
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // 成功時は Google の画面へ移動するので、ここに来るのは失敗時だけ
    if (error) {
      setError("ログインを開始できませんでした。もう一度お試しください。");
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {loading ? "移動中…" : "Googleでログイン"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  );
}
