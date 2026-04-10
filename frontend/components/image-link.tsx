import Link from 'next/link';
import { SafeImage } from './ui/safe-image';
import { ImageType } from '@/types/image';
import { cn } from '@/lib/utils';

interface ImageLinkProps {
  href: string;
  newTab?: boolean;
  src?: string;
  type: ImageType;
  label: string;
  className?: string;
}

export function ImageLink({ href, newTab, src, type, label, className }: ImageLinkProps) {
  let title = '';
  if (type === 'profile') {
    title = `View ${label} Profile`;
  } else if (type === 'thumbnail' || type === 'card') {
    title = `View listing of ${label}`;
  } else if (type === 'id') {
    title = `View ${label}`;
  }
  return (
    <Link
      href={href}
      target={newTab ? '_blank' : '_self'}
      rel='noopener noreferrer'
      title={title}
      aria-label={title}
      className={cn('w-9 h-9 shrink-0', className)}
    >
      <SafeImage
        src={src}
        type={type}
        alt={`Image of ${label}`}
        width={36}
        height={36}
      />
    </Link>
  );
}
