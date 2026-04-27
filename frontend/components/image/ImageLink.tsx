import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import ImageSafe, { type ImageType } from './ImageSafe';

interface ImageLinkProps {
  href: string;
  newTab?: boolean;
  src?: string;
  type: ImageType;
  label: string;
  className?: string;
  children?: ReactNode;
}

export function ImageLink({
  href,
  newTab,
  src,
  type,
  label,
  className,
  children,
}: ImageLinkProps) {
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
      rel="noopener noreferrer"
      title={title}
      aria-label={title}
      className={cn('w-9 h-9 shrink-0 relative block', className)}
    >
      <ImageSafe
        src={src}
        type={type}
        alt={`Image of ${label}`}
        width={36}
        height={36}
      />
      {children}
    </Link>
  );
}
