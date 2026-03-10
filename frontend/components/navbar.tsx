"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useUser } from "@/utils/UserContext";
import SearchBar from './ui/search-bar';
import { Sun, Moon, Home, MessageCircle, LogOut, User } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function Navbar() {
    const { clearUserData, isValidated } = useUser();
    const { theme, setTheme } = useTheme();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-800 dark:bg-[#0f1623] text-white p-2">
            <div className="container mx-auto flex items-center justify-between">
                {/* Left Side */}
                <div className="flex items-center min-w-0">
                    <Link href="/" className="flex items-center min-w-0">
                        <Image src="/logo.png" alt="Logo" width={40} height={40} className="mr-2" />
                    </Link>
                    <div className="ml-2 mr-8 text-2xl font-bold truncate max-w-36 sm:max-w-48">P2P Marketplace</div>
                    <div className="flex-1 min-w-0">
                        <SearchBar className="shrink" />
                    </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-1">

                    {/* Dark mode toggle */}
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="px-3 py-2 hover:bg-gray-700 rounded transition-colors"
                        aria-label="Toggle dark mode">
                        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {isValidated ? (
                        /* Profile dropdown */
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center px-2 py-1 hover:bg-gray-700 rounded transition-colors">
                                <Image src="/profile-icon.png" alt="Profile" width={32} height={32} className="rounded-full" />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-gray-800 dark:bg-[#1e2433] border border-gray-700 dark:border-white/10 rounded-xl shadow-lg overflow-hidden z-50">
                                    <Link href="/"
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 dark:hover:bg-white/10 transition-colors text-sm">
                                        <Home size={16} /> Home
                                    </Link>
                                    <Link href="/messages"
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 dark:hover:bg-white/10 transition-colors text-sm">
                                        <MessageCircle size={16} /> Messages
                                    </Link>
                                    <Link href="/profile"
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 dark:hover:bg-white/10 transition-colors text-sm">
                                        <User size={16} /> Profile
                                    </Link>
                                    <div className="border-t border-gray-700 dark:border-white/10" />
                                    <button
                                        onClick={() => { clearUserData(); setDropdownOpen(false); }}
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-700 dark:hover:bg-white/10 transition-colors text-sm text-red-400">
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link href="/login" className="text-l px-3 py-2 hover:bg-gray-700 rounded whitespace-nowrap truncate">Log In</Link>
                    )}
                </div>
            </div>
        </nav>
    );
}