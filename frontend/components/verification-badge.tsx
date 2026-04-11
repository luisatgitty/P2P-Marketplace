import { ShieldCheck } from 'lucide-react';

interface VerificationBadgeProps {
  verified: boolean;
  size?: number;
}

export default function VerificationBadge({
  verified,
  size = 13.5,
}: VerificationBadgeProps) {
  let badgeTone;
  if (verified) badgeTone = 'text-sky-600 dark:text-blue-400';
  else badgeTone = 'text-amber-600 dark:text-amber-400';

  return <ShieldCheck size={size} className={badgeTone} />;
}
