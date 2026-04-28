import { ShieldCheck } from 'lucide-react';

interface VerificationBadgeProps {
  verified: boolean;
  size?: number;
}

export default function VerificationBadge({
  verified,
  size = 13.5,
}: VerificationBadgeProps) {
  return verified ? (
    <ShieldCheck size={size} className="text-sky-600 dark:text-blue-400" />
  ) : null; // Do not render anything if not verified
}
