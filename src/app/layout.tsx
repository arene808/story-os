import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Story OS",
  description: "AI-powered long-form story writing and story-world management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 font-sans">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
            <a href="/" className="text-lg font-semibold tracking-tight">
              Story OS
            </a>
            <span className="text-xs text-zinc-400">MVP v0.1</span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
