"use client";

import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";
// @ts-expect-error Next.js resolves package CSS side-effect imports at build time.
import "yet-another-react-lightbox/styles.css";
// @ts-expect-error Next.js resolves package CSS side-effect imports at build time.
import "yet-another-react-lightbox/plugins/thumbnails.css";

export type MediaViewerItem = {
  id?: string;
  fileUrl: string;
  fileType: "IMAGE" | "VIDEO";
  fileName?: string;
};

export function MediaViewerModal({
  mediaItems,
  activeIndex,
  onSelect,
  onClose,
}: {
  mediaItems: MediaViewerItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const slides = mediaItems.map((item) => {
    if (item.fileType === "VIDEO") {
      return {
        type: "video" as const,
        sources: [{ src: item.fileUrl, type: "video/mp4" }],
        poster: item.fileUrl,
      };
    }

    return {
      src: item.fileUrl,
      alt: item.fileName ?? "media",
    };
  });

  return (
    <Lightbox
      open={activeIndex >= 0}
      close={onClose}
      index={activeIndex}
      slides={slides}
      plugins={[Zoom, Thumbnails, Video]}
      on={{
        view: ({ index }) => onSelect(index),
      }}
      zoom={{
        maxZoomPixelRatio: 4,
        zoomInMultiplier: 2,
        doubleTapDelay: 250,
      }}
      thumbnails={{
        position: "bottom",
        width: 72,
        height: 72,
        border: 1,
        borderRadius: 8,
        gap: 8,
      }}
      carousel={{
        finite: false,
      }}
      controller={{
        closeOnBackdropClick: true,
      }}
    />
  );
}
