"use client";

import { usePathname } from "next/navigation";

import Footer from "@/components/footer";
import Navbar from "@/components/navbar";

type AppChromeProps = {
  slot: "top" | "bottom";
};

export default function AppChrome({ slot }: AppChromeProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    return null;
  }

  return slot === "top" ? <Navbar /> : <Footer />;
}
