"use client";

import Link from "next/link";
import { useState } from "react";

const CartIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13l-1-4h12" />
  </svg>
);
const SearchIcon = () => (
  <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const MessageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
  </svg>
);
const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 0 0-9.33-5M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const UserIcon = () => (
  <svg className="w-5 h-5 text-stone-500" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z" />
  </svg>
);

interface NavbarProps {
  isLoggedIn?: boolean;
  messageCount?: number;
  notifCount?: number;
}

export default function Navbar({
  isLoggedIn = false,
  messageCount = 0,
  notifCount = 0,
}: NavbarProps) {
  const [search, setSearch] = useState("");

  return (
    <nav className="bg-stone-50 border-b border-stone-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center">
                <CartIcon />
              </div>
              <span className="font-brand text-xl text-stone-800 font-semibold tracking-tight">
                P2P
              </span>
            </Link>
            <div className="hidden md:flex items-center bg-stone-100 border border-stone-200 rounded-full px-4 py-2 gap-2 w-80 focus-within:border-stone-400 transition-colors">
              <SearchIcon />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items, rentals, services…"
                className="bg-transparent text-sm text-stone-700 placeholder-stone-400 outline-none w-full"
              />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {["Buy", "Rent", "Services"].map((label) => (
              <Link key={label} href={`/${label.toLowerCase()}`}
                className="text-sm text-stone-600 font-medium px-3 py-2 rounded-lg hover:bg-stone-100 hover:text-stone-800 transition-colors">
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/post/create"
              className="hidden sm:flex items-center gap-2 bg-stone-800 text-stone-100 text-sm font-medium px-4 py-2 rounded-full hover:bg-stone-700 transition-colors">
              <PlusIcon />
              Post
            </Link>
            {isLoggedIn ? (
              <>
                <button className="relative p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-colors">
                  <MessageIcon />
                  {messageCount > 0 && <span className="badge-pulse absolute top-1 right-1 w-2 h-2 bg-rose-400 rounded-full" />}
                </button>
                <button className="relative p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-colors">
                  <BellIcon />
                  {notifCount > 0 && <span className="badge-pulse absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" />}
                </button>
                <button className="w-9 h-9 rounded-full bg-stone-300 border-2 border-stone-200 flex items-center justify-center hover:border-stone-400 transition-colors">
                  <UserIcon />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm text-stone-600 font-medium px-4 py-2 rounded-full hover:bg-stone-100 transition-colors">Log in</Link>
                <Link href="/register" className="text-sm bg-stone-800 text-stone-100 font-medium px-4 py-2 rounded-full hover:bg-stone-700 transition-colors">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="md:hidden px-4 pb-3">
        <div className="flex items-center bg-stone-100 border border-stone-200 rounded-full px-4 py-2 gap-2 focus-within:border-stone-400 transition-colors">
          <SearchIcon />
          <input type="text" placeholder="Search…" className="bg-transparent text-sm text-stone-700 placeholder-stone-400 outline-none w-full" />
        </div>
      </div>
    </nav>
  );
}