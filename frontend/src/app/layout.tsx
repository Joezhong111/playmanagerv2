import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "派单管理系统",
  description: "游戏陪玩派单管理系统 - 基于 Next.js 构建",
  keywords: ["游戏陪玩", "派单管理", "任务管理"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <SocketProvider>
            {children}
            <Toaster 
              position="top-right"
              richColors
              closeButton
            />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
