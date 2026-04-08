"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { validateImageURL } from "@/utils/validation";

type SafeImageProps = Omit<ImageProps, "src"> & {
  src: string;
  fallbackSrc: string;
};

export function SafeImage({
  src,
  fallbackSrc,
  ...props
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(validateImageURL(src));
  if (!imgSrc) setImgSrc(fallbackSrc);

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={fallbackSrc}
      // If the link is dead, this fires
      onError={() => {
        setImgSrc(fallbackSrc);
      }}
    />
  );
}
