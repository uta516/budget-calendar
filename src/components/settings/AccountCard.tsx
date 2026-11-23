import LogoutButton from "@/components/LogoutButton";

// アカウント（ログアウト）
export default function AccountCard() {
  return (
    <section className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm">
      <h2 className="font-bold">アカウント</h2>
      <LogoutButton />
    </section>
  );
}
