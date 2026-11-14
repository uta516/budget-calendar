import { notFound } from "next/navigation";

// src/app/dev 以下は開発中の確認用。本番（NODE_ENV=production）では開けないようにする
export default function DevLayout({ children }: LayoutProps<"/dev">) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return children;
}
