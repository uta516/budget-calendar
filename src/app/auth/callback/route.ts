import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database";

// Google のアクセストークンの有効期限（秒）。Supabase からは受け取れないので固定値で扱う。
const GOOGLE_ACCESS_TOKEN_TTL_SECONDS = 3600;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  const { user, provider_token, provider_refresh_token } = data.session;

  if (provider_token) {
    const row: TablesInsert<"google_tokens"> = {
      user_id: user.id,
      access_token: provider_token,
      expires_at: new Date(
        Date.now() + GOOGLE_ACCESS_TOKEN_TTL_SECONDS * 1000,
      ).toISOString(),
    };
    // refresh_token が返ってこなかったときは、保存済みの値を null で消さない
    if (provider_refresh_token) {
      row.refresh_token = provider_refresh_token;
    }

    const { error: saveError } = await supabase
      .from("google_tokens")
      .upsert(row, { onConflict: "user_id" });

    if (saveError) {
      console.error("google_tokens の保存に失敗しました:", saveError.message);
      return NextResponse.redirect(`${origin}/login?error=token_save_failed`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
