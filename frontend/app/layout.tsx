import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono, Inter } from "next/font/google";
import { UserProvider } from "@/utils/UserContext";
import Navbar from "../components/navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
    <html lang="en">
        <body className={`${inter.variable} ${dmSans.variable} antialiased`}>
          <UserProvider>
            <Navbar />
            {children}
          </UserProvider>
        </body>
    </html>
  );
}
