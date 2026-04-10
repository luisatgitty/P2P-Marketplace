'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { validateImageURL } from '@/utils/validation';
import { cn } from '@/lib/utils';
import { ImageType } from '@/types/image';

type SafeImageProps = Omit<ImageProps, 'src' | 'alt'> & {
  src?: string;
  type: ImageType;
  alt?: string;
};

const IMAGE_CONFIG: Record<
  ImageType,
  { fallback: string; alt: string; class: string }
> = {
  profile: {
    fallback: '/profile-placeholder-sm.png',
    alt: 'User profile picture',
    class:
      'w-full h-full rounded-full object-cover border border-stone-200 dark:border-[#2a2d3e]',
  },
  thumbnail: {
    fallback: '/broken-image-sm.png',
    alt: 'Listing thumbnail',
    class:
      'w-full h-full rounded-md object-cover border border-stone-200 dark:border-[#2a2d3e]',
  },
  preview: {
    fallback: '/broken-image-sm.png',
    alt: 'Listing thumbnail',
    class:
      'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300',
  },
  id: {
    fallback: '/broken-image-lg.png',
    alt: 'ID document',
    class: 'w-full h-auto object-contain max-h-[70vh]',
  },
  full: {
    fallback: '/broken-image-lg.png',
    alt: 'Full resolution preview',
    class: 'w-full h-full object-contain',
  },
};

export function SafeImage({
  src,
  type,
  alt,
  className,
  onError,
  ...props
}: SafeImageProps) {
  const config = IMAGE_CONFIG[type];
  const [imgSrc, setImgSrc] = useState<string>(
    src ? validateImageURL(src) : config.fallback,
  );

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt || config.alt}
      className={cn(config.class, className)}
      // If the src fails to load, fallback to the placeholder image
      onError={() => {
        setImgSrc(config.fallback);
      }}
    />
  );
}
