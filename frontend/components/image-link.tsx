import Link from 'next/link';
import { SafeImage } from './ui/safe-image';
import { ImageType } from '@/types/image';
import { cn } from '@/lib/utils';

interface ImageLinkProps {
  type: ImageType;
  href: string;
  newTab?: boolean;
  src?: string;
  label: string;
  className?: string;
}

export function ImageLink({ type, href, newTab, src, label, className }: ImageLinkProps) {
  let title = '';
  if (type === 'profile') {
    title = `View ${label} Profile`;
  } else if (type === 'thumbnail' || type === 'preview') {
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
