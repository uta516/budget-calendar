"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LoginHero from "@/components/login/LoginHero";
import GoogleLoginButton from "@/components/login/GoogleLoginButton";
import LoginError from "@/components/login/LoginError";

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
    <main className="flex flex-1 flex-col bg-gradient-to-b from-teal-50 to-zinc-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between px-6 pb-10 pt-24">
        <LoginHero />
        <div className="mt-16 space-y-3">
          <GoogleLoginButton loading={loading} onClick={signInWithGoogle} />
          <LoginError message={error} />
          <p className="text-center text-xs leading-relaxed text-zinc-500">
            Googleカレンダーの予定を読み込むために、
            <br />
            カレンダーへのアクセスを許可してください
          </p>
        </div>
      </div>
    </main>
  );
}
