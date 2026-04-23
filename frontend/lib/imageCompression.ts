/**
 * Centralized image compression utility
 * Uses browser-image-compression library with type-specific configurations
 * Output format: WebP at 75% quality
 */

import imageCompression from "browser-image-compression";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ImageType = "profile" | "cover" | "listing" | "message" | "id";

export interface EncodedImagePayload {
  name: string;
  mimeType: string;
  data: string;
}

interface CompressionConfig {
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType: string;
  quality: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration per image type
// ─────────────────────────────────────────────────────────────────────────────

function getCompressionConfig(type: ImageType): CompressionConfig {
  const baseConfig = {
    useWebWorker: true,
    fileType: "image/webp" as const,
    quality: 0.75,
  };

  switch (type) {
    case "profile":
      // Profile photo: max 400x400 px
      return {
        ...baseConfig,
        maxWidthOrHeight: 400,
      };
    case "cover":
      // Cover photo: max width 1500px, then crop to center 250px height
      return {
        ...baseConfig,
        maxWidthOrHeight: 1500,
      };
    case "listing":
      // Listing images: max 1200px width, retain ratio
      return {
        ...baseConfig,
        maxWidthOrHeight: 1200,
      };
    case "message":
      // Message images: max 1080px wide, retain ratio
      return {
        ...baseConfig,
        maxWidthOrHeight: 1080,
      };
    case "id":
      // ID images: max 1800px wide, retain ratio
      return {
        ...baseConfig,
        maxWidthOrHeight: 1800,
      };
    default:
      throw new Error(`Unknown image type: ${type}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core compression functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compress an image file to specified type and constraints
 * Returns a Blob ready for encoding or uploading
 */
export async function compressImage(
  file: File,
  type: ImageType
): Promise<Blob> {
  const config = getCompressionConfig(type);

  const options = {
    maxWidthOrHeight: config.maxWidthOrHeight,
    useWebWorker: config.useWebWorker,
    fileType: config.fileType,
    initialQuality: config.quality,
  };

  try {
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch (err) {
    console.error(`Failed to compress ${type} image:`, err);
    throw err;
  }
}

/**
 * Compress an image and encode it to base64
 * Ready to send in API payload
 */
export async function encodeImageToPayload(
  file: File,
  type: ImageType,
  fieldName?: string
): Promise<EncodedImagePayload> {
  const compressed =
    type === "cover"
      ? await compressAndCropCoverBlob(file)
      : await compressImage(file, type);
  const data = await blobToBase64(compressed);

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const name = fieldName ? `${fieldName}.webp` : `${baseName}.webp`;

  return {
    name,
    mimeType: "image/webp",
    data,
  };
}

/**
 * Compress and center-crop a profile photo to 1:1 (max 400x400)
 */
export async function encodeSquareProfileImageToPayload(
  file: File,
  fieldName: string = "profileImage",
): Promise<EncodedImagePayload> {
  const compressed = await compressImage(file, "profile");
  const square = await cropCenterToBlob(compressed, 1, 400, 400);
  const data = await blobToBase64(square);

  return {
    name: `${fieldName}.webp`,
    mimeType: "image/webp",
    data,
  };
}

/**
 * Convert a Blob to base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 data (remove data:image/webp;base64, prefix)
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compress and center-crop a cover photo
 * Returns both the compressed blob and encoded payload
 */
export async function compressAndCropCoverPhoto(
  file: File,
  fieldName?: string
): Promise<EncodedImagePayload> {
  const cropped = await compressAndCropCoverBlob(file);
  const data = await blobToBase64(cropped);
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const name = fieldName ? `${fieldName}.webp` : `${baseName}.webp`;

  return {
    name,
    mimeType: "image/webp",
    data,
  };
}

async function compressAndCropCoverBlob(file: File): Promise<Blob> {
  const compressed = await compressImage(file, "cover");
  return cropCenterToBlob(compressed, 1500 / 250, 1500, 250);
}

async function cropCenterToBlob(
  blob: Blob,
  targetAspect: number,
  outputWidth: number,
  outputHeight: number,
): Promise<Blob> {
  const image = await blobToImage(blob);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Failed to process cover image.");
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const sourceAspect = image.width / image.height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceAspect > targetAspect) {
    sourceWidth = Math.round(image.height * targetAspect);
    sourceX = Math.round((image.width - sourceWidth) / 2);
  } else {
    sourceHeight = Math.round(image.width / targetAspect);
    sourceY = Math.round((image.height - sourceHeight) / 2);
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((output) => {
      if (output) {
        resolve(output);
        return;
      }
      reject(new Error("Failed to create blob from cover image."));
    }, "image/webp", 0.75);
  });
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load image."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
