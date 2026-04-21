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

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const profileImage = svgToDataUri(
  `<svg
    xmlns='http://www.w3.org/2000/svg'
    width='96'
    height='96'
    fill='#0F172B'
    viewBox='42 42 173 173'
  >
    <path d='M172,120a44,44,0,1,1-44-44A44.05,44.05,0,0,1,172,120Zm60,8A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88.09,88.09,0,0,0-91.47-87.93C77.43,41.89,39.87,81.12,40,128.25a87.65,87.65,0,0,0,22.24,58.16A79.71,79.71,0,0,1,84,165.1a4,4,0,0,1,4.83.32,59.83,59.83,0,0,0,78.28,0,4,4,0,0,1,4.83-.32,79.71,79.71,0,0,1,21.79,21.31A87.62,87.62,0,0,0,216,128Z' />
  </svg>`,
);

const brokenImage = svgToDataUri(
  `<svg
    xmlns='http://www.w3.org/2000/svg'
    width='96'
    height='64'
    fill='#0F172B'
    viewBox='0 0 256 256'
  >
    <path d='M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16h64a8,8,0,0,0,7.59-5.47l14.83-44.48L163,151.43a8.07,8.07,0,0,0,4.46-4.46l14.62-36.55,44.48-14.83A8,8,0,0,0,232,88V56A16,16,0,0,0,216,40ZM117,152.57a8,8,0,0,0-4.62,4.9L98.23,200H40V160.69l46.34-46.35a8,8,0,0,1,11.32,0l32.84,32.84Zm115-30.84V200a16,16,0,0,1-16,16H137.73a8,8,0,0,1-7.59-10.53l7.94-23.8a8,8,0,0,1,4.61-4.9l35.77-14.31,14.31-35.77a8,8,0,0,1,4.9-4.61l23.8-7.94A8,8,0,0,1,232,121.73Z' />
  </svg>`,
);

const brokenImageCover = svgToDataUri(
  `<svg
    xmlns='http://www.w3.org/2000/svg'
    width='96'
    height='16'
    fill='#0f172b'
    viewBox='0 0 256 256'
  >
    <path d='M241.75,51.32a15.87,15.87,0,0,0-13.86-2.77l-3.48.94C205.61,54.56,170.61,64,128,64S50.39,54.56,31.59,49.49l-3.48-.94A16,16,0,0,0,8,64V192a16,16,0,0,0,16,16,16.22,16.22,0,0,0,4.18-.55l3.18-.86C50.13,201.49,85.17,192,128,192s77.87,9.49,96.69,14.59l3.18.86A16,16,0,0,0,248,192V64A15.9,15.9,0,0,0,241.75,51.32ZM204,96a12,12,0,1,1-12,12A12,12,0,0,1,204,96Zm-76,80c-45,0-82.72,10.23-100.87,15.14L24,192v-39.3l46.34-46.35a8,8,0,0,1,11.32,0L152.28,177C144.49,176.35,136.37,176,128,176Zm100.87,15.14a448.7,448.7,0,0,0-51-11.2l-35.26-35.26L157,130.34a8,8,0,0,1,11.31,0l60.89,60.88Z' />
  </svg>`,
);

const IMAGE_CONFIG: Record<
  ImageType,
  { fallback: string; alt: string; class: string }
> = {
  profile: {
    fallback: profileImage,
    alt: 'User profile picture',
    class:
      'w-full h-full rounded-full object-cover bg-stone-200',
  },
  thumbnail: {
    fallback: brokenImage,
    alt: 'Listing thumbnail',
    class:
      'w-full h-full rounded-lg object-cover bg-stone-200',
  },
  card: {
    fallback: brokenImage,
    alt: 'Listing post card image',
    class:
      'w-full h-full object-cover bg-stone-200 group-hover:scale-105 transition-transform duration-300',
  },
  listing: {
    fallback: brokenImage,
    alt: 'Listing image',
    class: 'w-full h-full object-cover bg-stone-200',
  },
  cover: {
    fallback: brokenImageCover,
    alt: 'Listing image',
    class: 'w-full h-full object-cover bg-stone-200',
  },
  id: {
    fallback: brokenImage,
    alt: 'ID document',
    class: 'w-full h-auto object-contain max-h-[70vh] bg-stone-200',
  }
};

const failedImageUrlCache = new Set<string>();

function getResolvedSrc(src: string, fallback: string): string {
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
      loading="eager"
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
