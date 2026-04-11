'use client';

import { useState, useEffect, useMemo } from 'react';
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
  card: {
    fallback: '/broken-image-sm.png',
    alt: 'Listing post card image',
    class:
      'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300',
  },
  cover: {
    fallback: '/broken-image-sm.png',
    alt: 'Listing image',
    class:
      'w-full h-full object-cover',
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

const failedImageUrlCache = new Set<string>();

function getResolvedSrc(src: string, fallback: string) {
  if (!src || failedImageUrlCache.has(src)) return fallback;
  return src;
}

export function SafeImage({
  src,
  type,
  alt,
  className,
  onError,
  ...props
}: SafeImageProps) {
  const config = IMAGE_CONFIG[type];
  const normalizedSrc = useMemo(
    () => (src ? validateImageURL(src) : ''),
    [src],
  );

  const [imgSrc, setImgSrc] = useState<string>(() =>
    getResolvedSrc(normalizedSrc, config.fallback),
  );

  // Update internal state if the 'src' prop changes externally
  useEffect(() => {
    setImgSrc(getResolvedSrc(normalizedSrc, config.fallback));
  }, [normalizedSrc, config.fallback]);

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt || config.alt}
      className={cn(config.class, className)}
      // If the src fails to load, fallback to the placeholder image
      // NOTE: Broken image can cause flickering if the URL is valid but the server is down
      onError={(event) => {
        if (imgSrc !== config.fallback && normalizedSrc) {
          failedImageUrlCache.add(normalizedSrc);
          setImgSrc(config.fallback);
        }
        onError?.(event);
      }}
    />
  );
}
