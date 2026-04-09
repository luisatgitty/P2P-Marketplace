'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { validateImageURL } from '@/utils/validation';
import { cn } from '@/lib/utils';

type ImageType = 'profile' | 'thumbnail' | 'full';

type SafeImageProps = Omit<ImageProps, 'alt'> & {
  src: string;
  type: ImageType;
  alt?: string;
};

const IMAGE_CONFIG: Record<
  ImageType,
  { fallback: string; alt: string; class: string }
> = {
  profile: {
    fallback: '/profile-icon.png',
    alt: 'User profile picture',
    class:
      'w-10 h-10 rounded-full object-cover border border-stone-200 dark:border-[#2a2d3e] shrink-0',
  },
  thumbnail: {
    fallback: '/logo.png',
    alt: 'Listing thumbnail',
    class: 'w-10 h-10 rounded-md object-cover border border-stone-200 dark:border-[#2a2d3e] shrink-0',
  },
  full: {
    fallback: '/images/image-not-found.png',
    alt: 'Full resolution preview',
    class: 'w-full h-full object-contain',
  },
};

export function SafeImage({
  src,
  type,
  alt,
  className,
  ...props
}: SafeImageProps) {
  const config = IMAGE_CONFIG[type];
  const [imgSrc, setImgSrc] = useState<string>(
    validateImageURL(src) || config.fallback,
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
