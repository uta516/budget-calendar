export type Message = { type: "warning" | "error" | "success"; text: string } | null;

const STYLES = {
  warning: "bg-orange-50 font-bold text-orange-700",
  error: "bg-red-50 text-red-700",
  success: "bg-teal-50 font-bold text-teal-700",
};

// 注意・エラー・「保存しました」の表示
export default function FormMessage({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p
      className={`rounded-xl p-2.5 text-sm ${STYLES[message.type]}`}
      role={message.type === "success" ? "status" : "alert"}
    >
      {message.text}
    </p>
  );
}
