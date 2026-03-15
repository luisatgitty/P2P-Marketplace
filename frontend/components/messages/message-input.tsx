"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Image, Folder, MapPin, X, CornerUpLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReplyPreview } from "@/types/messaging";

interface MessageInputProps {
  onSend:     (content: string) => void;
  disabled?:  boolean;
  replyTo?:   ReplyPreview | null;
  onCancelReply?: () => void;
}

const ATTACH_OPTS = [
  { icon: Image,  label: "Photo / Video" },
  { icon: Folder, label: "File"          },
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachRef   = useRef<HTMLDivElement>(null);

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

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape" && replyTo)     { onCancelReply?.(); }
  };

  const canSend = value.trim().length > 0 && !disabled;

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
      <div className="flex items-end gap-2 bg-white dark:bg-[#1c1f2e] border border-border rounded-2xl pl-4 pr-1 py-1">

        {/* Attach */}
        <div className="relative" ref={attachRef}>
          <button
            onClick={() => setAttachOpen((v) => !v)}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
            aria-label="Attach file"
          >
            <Paperclip size={17} />
          </button>

          {attachOpen && (
            <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-[#1c1f2e] border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-100 z-20">
              {ATTACH_OPTS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => setAttachOpen(false)}
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
          onClick={handleSend}
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
  );
}
