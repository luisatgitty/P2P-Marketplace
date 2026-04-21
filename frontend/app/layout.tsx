import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Inter } from "next/font/google";
import { UserProvider } from "@/utils/UserContext";
import { UnsavedChangesProvider } from "@/utils/UnsavedChangesContext";
import { ConfirmDialogProvider } from "@/utils/ConfirmDialogContext";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner"
import AppChrome from "@/components/app-chrome";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "P2P Marketplace",
  description: "Buy, sell, rent, and avail services from people near you.",
};

export default function RootLayout({ children }:
  Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${dmSans.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <UserProvider>
            <UnsavedChangesProvider>
              <ConfirmDialogProvider>
                <AppChrome slot="top" />
                <main className="flex-1">
                  {children}
                </main>
                <Toaster />
                <AppChrome slot="bottom" />
              </ConfirmDialogProvider>
            </UnsavedChangesProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}