"use client";

import { useState, useRef, useEffect } from "react";
import { Image, MapPin, X, CornerUpLeft, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReplyPreview } from "@/types/messaging";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MESSAGE_MAX_LENGTH, limitMessageInputLength } from "@/utils/validation";
import { encodeImageToPayload } from "@/lib/imageCompression";

type OutgoingAttachment = {
  name: string;
  mimeType: string;
  data: string;
};

interface MessageInputProps {
  onSend:     (content: string, attachments: OutgoingAttachment[]) => Promise<void>;
  disabled?:  boolean;
  replyTo?:   ReplyPreview | null;
  onCancelReply?: () => void;
  autoFocusKey?: string;
}

export default function MessageInput({
  onSend,
  disabled,
  replyTo,
  onCancelReply,
  autoFocusKey,
}: MessageInputProps) {
  const [value,      setValue]      = useState("");
  const [stagedMedia, setStagedMedia] = useState<Array<{ id: string; file: File; previewUrl: string; isVideo: boolean }>>([]);
  const [preparingSend, setPreparingSend] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Auto-grow textarea until 4 lines, then allow vertical scrolling.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";

    const lineHeight = Number.parseFloat(window.getComputedStyle(el).lineHeight || "20");
    const maxHeight = Math.round(lineHeight * 4);
    const nextHeight = Math.min(el.scrollHeight, maxHeight);

    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  // Focus textarea when a reply is set
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  // Focus textarea whenever a conversation is opened/switched and input becomes enabled.
  useEffect(() => {
    if (!autoFocusKey || disabled) return;

    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoFocusKey, disabled]);

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const commaIndex = result.indexOf(",");
        if (commaIndex < 0) {
          reject(new Error("Invalid file payload."));
          return;
        }
        resolve(result.slice(commaIndex + 1));
      };
      reader.onerror = () => reject(new Error("Failed to read attachment."));
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    const trimmed = value.trim();
    if ((!trimmed && stagedMedia.length === 0) || disabled || preparingSend) return;

    setPreparingSend(true);
    try {
      const attachments: OutgoingAttachment[] = await Promise.all(
        stagedMedia.map(async (item) => {
          if (item.file.type.startsWith("image/")) {
            return encodeImageToPayload(item.file, "message");
          }

          return {
            name: item.file.name,
            mimeType: item.file.type,
            data: await toBase64(item.file),
          };
        })
      );

      await onSend(trimmed, attachments);
      setValue("");
      stagedMedia.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setStagedMedia([]);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : "Failed to send message.";
      if (errMessage.toLowerCase().includes("read attachment")) {
        toast.error(errMessage, { position: "top-center" });
      }
    } finally {
      setPreparingSend(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
    if (e.key === "Escape" && replyTo)     { onCancelReply?.(); }
  };

  const canSend = (value.trim().length > 0 || stagedMedia.length > 0) && !disabled && !preparingSend;

  const appendComposerText = (text: string) => {
    setValue((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n${text}` : text;
    });
    textareaRef.current?.focus();
  };

  const handlePickPhotoVideo = () => {
    mediaInputRef.current?.click();
  };

  const handleMediaSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const nextItems = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    }));

    setStagedMedia((prev) => [...prev, ...nextItems]);
    textareaRef.current?.focus();

    e.target.value = "";
  };

  const handleRemoveStagedMedia = (id: string) => {
    setStagedMedia((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  useEffect(() => {
    return () => {
      stagedMedia.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [stagedMedia]);

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported on this device/browser.", { position: "top-center" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        appendComposerText(`📍 My location: ${mapsLink}`);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location access was denied. Please allow location permission."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Could not determine your current location."
              : error.code === error.TIMEOUT
                ? "Location request timed out. Please try again."
                : "Failed to get your location.";

        toast.error(message, { position: "top-center" });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

return (
  <div className="px-3 pt-3 pb-4">

    {/* ── Reply banner ───────────────────────────────────────────────── */}
    {replyTo && (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 ml-16 mr-10 mb-2 rounded-lg",
        "bg-stone-50 dark:bg-[#13151f] border border-border"
      )}>
        <CornerUpLeft size={13} className="text-amber-600 dark:text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-500 leading-none mb-0.5">
            Replying to {replyTo.senderName}
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-400 truncate">
            {replyTo.contentPreview}
          </p>
        </div>
        <button
          onClick={onCancelReply}
          className="shrink-0 p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-white/10 transition-colors"
          aria-label="Cancel reply"
        >
          <X size={13} />
        </button>
      </div>
    )}

    {/* ── Input row ──────────────────────────────────────────────────── */}
    <div>

        {/* ── Attachment staging area ─────────────────────────────────── */}
        {stagedMedia.length > 0 && (
          <div className="pl-3 pr-2 pt-2 pb-1">
            <div className="flex items-center gap-2 overflow-x-auto no-scroll">
              {stagedMedia.map((item) => (
                <div key={item.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0 bg-stone-100 dark:bg-[#13151f]">
                  {item.isVideo ? (
                    <video src={item.previewUrl} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveStagedMedia(item.id)}
                    className="absolute top-1 right-1 w-4.5 h-4.5 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                    aria-label={`Remove ${item.file.name}`}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end">

          {/* Photo / Video */}
          <Button
            type="button"
            variant="ghost"
            onClick={handlePickPhotoVideo}
            className="w-8 h-8 inline-flex items-center justify-center text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
            aria-label="Attach photo or video"
            title="Photo / Video"
          >
            <Image size={18} />
          </Button>

          {/* Location */}
          <Button
            type="button"
            variant="ghost"
            onClick={handleShareLocation}
            className="w-8 h-8 inline-flex items-center justify-center text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
            aria-label="Share location"
            title="Location"
          >
            <MapPin size={20} />
          </Button>

          {/* Hidden media input */}
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleMediaSelected}
          />

          {/* Message input */}
          <div className="flex-1 min-w-0 mx-2">
            <Textarea
              ref={textareaRef}
              id="message-input"
              value={value}
              onChange={(e) => setValue(limitMessageInputLength(e.target.value))}
              onKeyDown={handleKeyDown}
              placeholder={replyTo ? `Reply to ${replyTo.senderName}…` : "Type a message…"}
              disabled={disabled}
              rows={1}
              maxLength={MESSAGE_MAX_LENGTH}
              className={cn(
                "min-h-9 max-h-32 resize-none",
                "bg-white dark:bg-[#1c1f2e] border border-border",
                "text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600",
                "disabled:opacity-50"
              )}
            />
          </div>

          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            aria-label="Send message"
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 shrink-0 self-end hover:bg-transparent",
              canSend
                ? "text-amber-700 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-400"
                : "text-stone-300 dark:text-stone-600 cursor-not-allowed"
            )}
          >
            <SendHorizontal size={15} className={canSend ? "-translate-x-px" : ""} />
          </Button>
        </div>
      </div>
    </div>
  );
}
