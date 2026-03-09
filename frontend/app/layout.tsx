import type { Metadata } from "next";
import { Inter, Lusitana } from "next/font/google";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const lusitana = Lusitana({ variable: "--font-lusitana", weight: ["400", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "P2P Marketplace",
  description: "Buy, sell, rent, and avail services from people near you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${lusitana.variable} antialiased`}>
        <Navbar isLoggedIn={false} messageCount={3} notifCount={2} />
        <main className="pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}