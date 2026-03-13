"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Image, Folder, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

const ATTACH_OPTS = [
  { icon: Image,  label: "Photo / Video" },
  { icon: Folder, label: "File" },
  { icon: MapPin, label: "Location" },
];

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value,        setValue]      = useState("");
  const [attachOpen,   setAttachOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachRef   = useRef<HTMLDivElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);

  // Close attach menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setAttachOpen(false);
      }
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="px-3 py-2.5 border-t border-border bg-white dark:bg-[#1c1f2e] shrink-0">
      <div className="flex items-end gap-2 bg-stone-100 dark:bg-[#13151f] rounded-2xl px-3 py-2">

        {/* Attach */}
        <div className="relative" ref={attachRef}>
          <button
            onClick={() => setAttachOpen((v) => !v)}
            className="p-1 mb-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
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
          placeholder="Type a message… (Enter to send)"
          rows={1}
          disabled={disabled}
          className={cn(
            "flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed py-0.5",
            "text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600",
            "max-h-[120px] disabled:opacity-50"
          )}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "p-2 rounded-xl transition-all duration-150 mb-0.5",
            canSend
              ? "bg-amber-700 text-white hover:bg-amber-600 shadow-sm"
              : "bg-transparent text-stone-300 dark:text-stone-600 cursor-not-allowed"
          )}
        >
          <Send size={15} className={canSend ? "-translate-x-px" : ""} />
        </button>
      </div>

      <p className="text-[10px] text-stone-400 dark:text-stone-600 text-center mt-1.5">
        Shift + Enter for new line
      </p>
    </div>
  );
}
