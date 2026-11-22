// ログインを始められなかったときの表示
export default function LoginError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-700" role="alert">
      {message}
    </p>
  );
}
