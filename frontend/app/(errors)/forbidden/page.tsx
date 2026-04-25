'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldX,
  ArrowLeft,
  Home,
  LogIn,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Quick-links shown below the main CTAs ─────────────────────────────────────
const QUICK_LINKS = [
  { label: 'Browse Listings', href: '/' },
  { label: 'Login', href: '/login' },
  { label: 'Create Account', href: '/signup' },
  { label: 'Contact Support', href: '/support' },
];

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className='min-h-screen bg-stone-100 dark:bg-[#0f1117] flex flex-col'>
      {/* ── Top accent bar (mirrors navbar amber stripe) ── */}
      <div className='h-1 w-full bg-linear-to-r from-[#1e2433] via-[#3a4a6a] to-[#1e2433] shrink-0' />

      {/* ── Main content ── */}
      <div className='flex-1 flex items-center justify-center px-4 py-16'>
        <div className='w-full max-w-lg'>
          {/* ── Card ── */}
          <div className='bg-white dark:bg-[#1c1f2e] rounded-lg border border-stone-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden'>
            {/* Card header — dark navy band */}
            <div className='bg-[#1e2433] px-8 py-8 flex flex-col items-center text-center relative overflow-hidden'>
              {/* Decorative background rings */}
              <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                <div className='w-64 h-64 rounded-full border border-white/5' />
              </div>
              <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                <div className='w-44 h-44 rounded-full border border-white/5' />
              </div>

              {/* Icon cluster */}
              <div className='relative mb-5'>
                {/* Outer glow ring */}
                <div className='w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center'>
                  {/* Inner circle */}
                  <div className='w-16 h-16 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center'>
                    <ShieldX
                      className='w-8 h-8 text-red-400'
                      strokeWidth={1.75}
                    />
                  </div>
                </div>

                {/* Small lock badge */}
                <div className='absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#1e2433] border-2 border-[#2a3a55] flex items-center justify-center shadow-lg'>
                  <Lock
                    className='w-3.5 h-3.5 text-stone-400'
                    strokeWidth={2}
                  />
                </div>
              </div>

              {/* Error code */}
              <p className='text-[11px] font-bold text-stone-500 dark:text-stone-500 uppercase tracking-[0.2em] mb-1'>
                Error 403
              </p>

              {/* Heading */}
              <h1 className='text-2xl font-extrabold text-white leading-tight mb-2'>
                Access Restricted
              </h1>

              {/* Sub-heading */}
              <p className='text-sm text-slate-400 leading-relaxed max-w-xs'>
                You don&apos;t have permission to view this page. This could be
                because you&apos;re not logged in, or your account doesn&apos;t
                have the required access level.
              </p>
            </div>

            {/* ── Card body ── */}
            <div className='px-8 py-7 flex flex-col gap-5'>
              {/* Possible reasons box */}
              <div className='bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4'>
                <div className='flex items-center gap-2 mb-2.5'>
                  <AlertTriangle className='w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0' />
                  <p className='text-sm font-bold text-amber-800 dark:text-amber-300'>
                    Why am I seeing this?
                  </p>
                </div>
                <ul className='flex flex-col gap-1.5'>
                  {[
                    'You are not signed in to your account',
                    'This page is restricted to verified users',
                    'You followed an expired or invalid link',
                    'Your account does not have the required role',
                  ].map((reason) => (
                    <li
                      key={reason}
                      className='flex items-start gap-2 text-[12.5px] text-amber-700 dark:text-amber-400'
                    >
                      <span className='text-amber-400 dark:text-amber-600 mt-0.5 shrink-0'>
                        •
                      </span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Primary CTA buttons */}
              <div className='flex flex-col gap-2.5'>
                {/* Login — primary action */}
                <Link
                  href='/login'
                  className='flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]'
                  style={{
                    background:
                      'linear-gradient(135deg, #1e2433 0%, #3a4a6a 100%)',
                  }}
                >
                  <LogIn className='w-4 h-4' />
                  Log In to Your Account
                </Link>

                {/* Go home */}
                <Link
                  href='/'
                  className='flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-stone-200 dark:border-[#2a2d3e] text-stone-700 dark:text-stone-200 text-sm font-semibold hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#252837] transition-all'
                >
                  <Home className='w-4 h-4' />
                  Back to Home
                </Link>

                {/* Go back */}
                <button
                  type='button'
                  onClick={() => router.back()}
                  className='flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-stone-500 dark:text-stone-400 text-sm font-medium hover:text-stone-700 dark:hover:text-stone-200 transition-colors'
                >
                  <ArrowLeft className='w-3.5 h-3.5' />
                  Go Back to Previous Page
                </button>
              </div>

              {/* Divider */}
              <div className='flex items-center gap-3'>
                <div className='flex-1 h-px bg-stone-200 dark:bg-[#2a2d3e]' />
                <span className='text-xs text-stone-400 dark:text-stone-600 shrink-0'>
                  or explore
                </span>
                <div className='flex-1 h-px bg-stone-200 dark:bg-[#2a2d3e]' />
              </div>

              {/* Quick links */}
              <div className='grid grid-cols-2 gap-2'>
                {QUICK_LINKS.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'text-center text-xs font-semibold px-3 py-2.5 rounded-lg transition-all',
                      'bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e]',
                      'text-stone-600 dark:text-stone-400',
                      'hover:border-stone-400 dark:hover:border-stone-500',
                      'hover:text-stone-800 dark:hover:text-stone-100',
                      'hover:bg-white dark:hover:bg-[#252837]',
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Footer note ── */}
          <p className='text-center text-xs text-stone-400 dark:text-stone-600 mt-6'>
            If you believe this is a mistake, please{' '}
            <Link
              href='/support'
              className='text-stone-600 dark:text-stone-400 underline underline-offset-2 hover:text-stone-900 dark:hover:text-stone-200 transition-colors'
            >
              contact support
            </Link>
            .
          </p>
        </div>
      </div>

      {/* ── Bottom accent bar ── */}
      <div className='h-1 w-full bg-linear-to-r from-[#1e2433] via-[#3a4a6a] to-[#1e2433] shrink-0' />
    </div>
  );
}
