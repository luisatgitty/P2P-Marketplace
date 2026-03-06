"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useUser } from "@/utils/UserContext";
import SearchBar from './ui/search-bar';
import { MessageCircle } from 'lucide-react';

export default function Navbar() {
    const { clearUserData, isValidated } = useUser();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white p-2">
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
                    <Link href="/" className="text-l px-3 py-2 hover:bg-gray-700 rounded whitespace-nowrap truncate">Home</Link>
                    <Link href="/messages" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded whitespace-nowrap">
                        <MessageCircle size={20} />
                        <span className="hidden sm:inline text-l">Messages</span>
                    </Link>

                    {/* Display when user is signed in */}
                    <Link href="/profile" className="md-inline-flex items-center gap-2 text-xl px-3 py-2 hover:bg-gray-700 rounded">
                        <Image src="/profile-icon.png" alt="Profile" width={32} height={32} className="rounded-full" />
                    </Link>
                    {/* Display login/logout button depending on login status */}
                    {isValidated ? 
                    (<button
                        onClick={clearUserData} disabled={!isValidated}
                        className="text-l px-3 py-2 hover:bg-gray-700 rounded whitespace-nowrap truncate">
                        Logout
                    </button>) :
                    (<Link href="/login" className="text-l px-3 py-2 hover:bg-gray-700 rounded whitespace-nowrap truncate">Log In</Link>)}
                </div>
            </div>
        </nav>
    );
}
