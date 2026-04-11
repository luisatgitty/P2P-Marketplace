import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationBadgeProps {
  verified: boolean;
  className?: string;
}

export default function VerificationBadge({
  verified,
  className,
}: VerificationBadgeProps) {
  let badgeTone;
  if (verified) badgeTone = 'text-sky-600 dark:text-blue-400';
  else badgeTone = 'text-amber-600 dark:text-amber-400';

  return <ShieldCheck className={cn('w-4 h-4', badgeTone, className)} />;
}
