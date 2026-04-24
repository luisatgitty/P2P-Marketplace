"use client";

import { useEffect, useRef } from "react";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { useModalFocusTrap } from "@/utils/useModalFocusTrap";

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
  const containerRef = useRef<HTMLDivElement>(null);
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

  useModalFocusTrap(containerRef, activeIndex >= 0, onClose);

  useEffect(() => {
    if (activeIndex >= 0) {
      requestAnimationFrame(() => {
        containerRef.current?.focus();
      });
    }
  }, [activeIndex]);

  return (
    <div ref={containerRef} tabIndex={-1} role="dialog" aria-modal="true" className="outline-none">
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
          width: 52,
          height: 52,
          border: 1,
          borderRadius: 8,
          gap: 8,
        }}
        carousel={{
          finite: true,
        }}
        controller={{
          closeOnBackdropClick: true,
        }}
      />
    </div>
  );
}
