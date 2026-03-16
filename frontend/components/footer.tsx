"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TwitterIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const YoutubeIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const LINKS = [
  { label: "Buy",          href: "/?type=sell"   },
  { label: "Rent",         href: "/?type=rent"   },
  { label: "Services",     href: "/?type=service"},
  { label: "FAQ",          href: "/faq"     },
  { label: "Privacy",      href: "/privacy" },
  { label: "Terms",        href: "/terms"   },
];

const SOCIALS = [
  { icon: <TwitterIcon />,   href: "#" },
  { icon: <InstagramIcon />, href: "#" },
  { icon: <FacebookIcon />,  href: "#" },
  { icon: <YoutubeIcon />,   href: "#" },
];

export default function Footer() {
  const pathname = usePathname();

  if (pathname === "/messages" || pathname.startsWith("/messages/")) {
    return null;
  }

  return (
    <footer className="bg-[#161d2b] px-4 sm:px-6 lg:px-8 py-6 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Image src="/logo.png" alt="P2P Marketplace" width={40} height={40} />
              <span className="text-stone-100 font-semibold text-lg">P2P Marketplace</span>
            </div>
            <p className="text-stone-400 text-sm max-w-xs leading-relaxed">
              Buy, sell, rent, and avail services from people near you. Your community marketplace.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-2 gap-y-2">
            {LINKS.map((link) => (
              <Link
              key={link.label}
              href={link.href}
              className="px-2 py-1 text-stone-400 text-sm hover:bg-amber-800 hover:text-stone-100 rounded-lg whitespace-nowrap"
              >
              {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-stone-700 mt-4 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-stone-500 text-sm">© {new Date().getFullYear()} P2P Marketplace. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {SOCIALS.map((s, i) => (
              <a key={i} href={s.href} className="text-stone-500 hover:text-stone-100 transition-colors">{s.icon}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
