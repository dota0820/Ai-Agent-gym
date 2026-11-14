import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import ClientOnly from "@/components/ClientOnly";
import TabBar from "@/components/TabBar";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: "练练 · AI 健身教练",
  description: "给健身新手的 AI 教练:安排训练、教动作、记录每一次进步",
  appleWebApp: { capable: true, title: "练练", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f2f6fc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased" data-theme="frost" suppressHydrationWarning>
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
          <main className="flex-1 px-4 pt-5 pb-24">
            <ClientOnly>{children}</ClientOnly>
          </main>
          <Suspense>
            <TabBar />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
