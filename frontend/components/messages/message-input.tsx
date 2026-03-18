"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Image, MapPin, X, CornerUpLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReplyPreview } from "@/types/messaging";
import { toast } from "sonner";

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
}

const ATTACH_OPTS = [
  { icon: Image,  label: "Photo / Video" },
  { icon: MapPin, label: "Location"      },
];

export default function MessageInput({
  onSend,
  disabled,
  replyTo,
  onCancelReply,
}: MessageInputProps) {
  const [value,      setValue]      = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [stagedMedia, setStagedMedia] = useState<Array<{ id: string; file: File; previewUrl: string; isVideo: boolean }>>([]);
  const [preparingSend, setPreparingSend] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachRef   = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);

  // Focus textarea when a reply is set
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  // Close attach menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node))
        setAttachOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        stagedMedia.map(async (item) => ({
          name: item.file.name,
          mimeType: item.file.type,
          data: await toBase64(item.file),
        }))
      );

      await onSend(trimmed, attachments);
      setValue("");
      stagedMedia.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setStagedMedia([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
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
    setAttachOpen(false);
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
    setAttachOpen(false);

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
    <div className="px-3 pt-3 pb-5 border-t border-border bg-white dark:bg-[#1c1f2e] shrink-0">

      {/* ── Reply banner ───────────────────────────────────────────────── */}
      {replyTo && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 mb-2 rounded-xl",
          "bg-stone-50 dark:bg-[#13151f] border border-border"
        )}>
          <CornerUpLeft size={13} className="text-amber-600 dark:text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-500 leading-none mb-0.5">
              Replying to {replyTo.senderName}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
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
      <div className="bg-white dark:bg-[#1c1f2e] border border-border rounded-2xl px-1 py-1">

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

        <div className="flex items-end gap-2 pl-3 pr-1 pb-1">

        {/* Attach */}
        <div className="relative pr-2 border-r-2 border-stone-300 dark:border-stone-600" ref={attachRef}>
          <button
            onClick={() => setAttachOpen((v) => !v)}
            className="text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
            aria-label="Attach file"
          >
            <Paperclip size={17} />
          </button>

          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleMediaSelected}
          />

          {attachOpen && (
            <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-[#1c1f2e] border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-100 z-20">
              {ATTACH_OPTS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={label === "Photo / Video" ? handlePickPhotoVideo : handleShareLocation}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5 transition-colors whitespace-nowrap"
                >
                  <Icon size={14} className="text-stone-400 dark:text-stone-500" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={replyTo ? `Reply to ${replyTo.senderName}…` : "Type a message… (Enter to send)"}
          rows={1}
          disabled={disabled}
          className={cn(
            "flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed py-0.5",
            "text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600",
            "max-h-28 disabled:opacity-50",
          )}
        />

        {/* Send */}
        <button
          onClick={() => void handleSend()}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "p-2 rounded-xl transition-all duration-150",
            canSend
              ? "bg-amber-700 text-white hover:bg-amber-600 shadow-sm"
              : "bg-transparent text-stone-300 dark:text-stone-600 cursor-not-allowed"
          )}
        >
          <Send size={15} className={canSend ? "-translate-x-px" : ""} />
        </button>
        </div>
      </div>
    </div>
  );
}
