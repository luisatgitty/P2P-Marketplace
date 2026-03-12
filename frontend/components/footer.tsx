import Link from "next/link";
import { ShoppingBag, Key, Wrench, Mail, Phone, MapPin, Heart } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">

          {/* ── Branding Column ── */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xs tracking-tight">P2P</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-gray-900 dark:text-white text-sm">P2P Marketplace</span>
                <span className="text-[10px] text-gray-400 tracking-wide">Buy · Rent · Services</span>
              </div>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              Your trusted community marketplace for buying, renting, and hiring
              services locally.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Philippines</span>
            </div>
          </div>

          {/* ── Browse Column ── */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">
              Browse
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/?tab=buy", icon: ShoppingBag, label: "Buy Items" },
                { href: "/?tab=rent", icon: Key, label: "Rent Items" },
                { href: "/?tab=services", icon: Wrench, label: "Hire Services" },
                { href: "/create", icon: null, label: "Post a Listing" },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Account Column ── */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">
              Account
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/login", label: "Login" },
                { href: "/signup", label: "Sign Up" },
                { href: "/profile", label: "My Profile" },
                { href: "/messages", label: "Messages" },
                { href: "/verify", label: "Get Verified" },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Support Column ── */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">
              Support
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/help", label: "Help Center" },
                { href: "/safety", label: "Safety Tips" },
                { href: "/terms", label: "Terms of Service" },
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/contact", label: "Contact Us" },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom Bar ── */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © {currentYear} P2P Marketplace. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-red-400 fill-red-400" /> in the Philippines
          </p>
        </div>
      </div>
    </footer>
  );
}
