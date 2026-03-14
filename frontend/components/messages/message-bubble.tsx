"use client";

import { useState, useRef, useEffect } from "react";
import { Check, CheckCheck, MoreHorizontal, SmilePlus, Reply, Copy, Pencil, Trash2, CornerUpLeft, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, MessageAttachment, ReactionType, ReplyPreview } from "@/types/messaging";
import { REACTIONS } from "@/types/messaging";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  showTime?: boolean;
  /** Name of the other participant (for reply labels) */
  otherName: string;
  onReply:  (msg: Message) => void;
  onReact:  (messageId: string, reaction: ReactionType | null) => void;
  onEdit:   (messageId: string, currentContent: string) => void;
  onDelete: (messageId: string, unsend: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

// ─── Attachment Grid ──────────────────────────────────────────────────────────
// Layout rules:
//   1 file  → full width, 16:9 for video, 4:3 for image
//   2 files → side by side, equal width, square crop
//   3 files → big left (2/3) + two stacked right (1/3)
//   4 files → 2×2 grid
//   5+ files→ 2×2 grid, last cell shows "+N more" overlay

function AttachmentGrid({ attachments }: { attachments: MessageAttachment[] }) {
  const count = attachments.length;

  const MediaCell = ({
    att,
    className,
    overlay,
  }: {
    att: MessageAttachment;
    className?: string;
    overlay?: React.ReactNode;
  }) => (
    <div className={cn("relative overflow-hidden bg-stone-900 rounded-lg", className)}>
      {att.fileType === "VIDEO" ? (
        <>
          <video
            src={att.fileUrl}
            className="w-full h-full object-cover"
            preload="metadata"
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md">
              <Play size={16} className="text-stone-800 ml-0.5" fill="currentColor" />
            </div>
          </div>
        </>
      ) : (
        <img
          src={att.fileUrl}
          alt={att.fileName ?? "attachment"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}
      {overlay}
    </div>
  );

  if (count === 1) {
    const att = attachments[0];
    return (
      <MediaCell
        att={att}
        className={cn("w-full", att.fileType === "VIDEO" ? "aspect-video" : "aspect-4/3")}
      />
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1">
        {attachments.map((att) => (
          <MediaCell key={att.id} att={att} className="aspect-square" />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-3 gap-1" style={{ gridTemplateRows: "1fr 1fr" }}>
        {/* Big cell spans 2 rows on the left (2/3 width) */}
        <MediaCell att={attachments[0]} className="col-span-2 row-span-2 aspect-square" />
        <MediaCell att={attachments[1]} className="aspect-square" />
        <MediaCell att={attachments[2]} className="aspect-square" />
      </div>
    );
  }

  // 4+ files → 2×2 grid, last cell may show "+N more"
  const visible = attachments.slice(0, 4);
  const remaining = count - 4;

  return (
    <div className="grid grid-cols-2 gap-1">
      {visible.map((att, i) => {
        const isLast = i === 3 && remaining > 0;
        return (
          <MediaCell
            key={att.id}
            att={att}
            className="aspect-square"
            overlay={
              isLast ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                  <span className="text-white font-bold text-lg">+{remaining}</span>
                </div>
              ) : undefined
            }
          />
        );
      })}
    </div>
  );
}

// ─── Reply Quote ──────────────────────────────────────────────────────────────

function ReplyQuote({
  replyTo,
  isMe,
  currentUserId,
  otherName,
}: {
  replyTo: ReplyPreview;
  isMe: boolean;
  currentUserId: string;
  otherName: string;
}) {
  const senderLabel = replyTo.senderId === currentUserId ? "You" : otherName;
  return (
    <div
      className={cn(
        "flex gap-2 px-3 pt-2 pb-1 rounded-t-xl -mb-1 border-l-2 text-xs",
        isMe
          ? "bg-amber-800/40 border-amber-300/60"
          : "bg-stone-100 dark:bg-stone-700/40 border-stone-400 dark:border-stone-500"
      )}
    >
      <CornerUpLeft size={11} className={cn("mt-0.5 shrink-0", isMe ? "text-amber-200/70" : "text-stone-400 dark:text-stone-500")} />
      <div className="min-w-0">
        <p className={cn("font-semibold text-[10px] truncate", isMe ? "text-amber-200" : "text-stone-500 dark:text-stone-400")}>
          {senderLabel}
        </p>
        <p className={cn("truncate leading-snug", isMe ? "text-amber-100/70" : "text-stone-400 dark:text-stone-500")}>
          {replyTo.contentPreview}
        </p>
      </div>
    </div>
  );
}

// ─── Reaction Picker ──────────────────────────────────────────────────────────

function ReactionPicker({
  onSelect,
  currentReaction,
  onClose,
}: {
  onSelect: (r: ReactionType | null) => void;
  currentReaction?: ReactionType | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={cn(
        "absolute bottom-full mb-1.5 z-50",
        "flex items-center gap-1 px-2 py-1.5",
        "bg-white dark:bg-[#1c1f2e] border border-border rounded-full shadow-xl",
        "animate-in fade-in zoom-in-95 duration-100"
      )}
    >
      {REACTIONS.map(({ type, emoji, label }) => (
        <button
          key={type}
          onClick={() => { onSelect(currentReaction === type ? null : type); onClose(); }}
          title={label}
          className={cn(
            "text-lg leading-none p-1 rounded-full transition-all duration-100",
            "hover:scale-125 hover:bg-stone-100 dark:hover:bg-white/10",
            currentReaction === type && "bg-amber-100 dark:bg-amber-900/30 scale-110"
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

function ContextMenu({
  isMe,
  hasContent,
  onReply,
  onCopy,
  onEdit,
  onUnsend,
  onDelete,
  onClose,
  alignRight,
}: {
  isMe: boolean;
  hasContent: boolean;
  onReply: () => void;
  onCopy:  () => void;
  onEdit:  () => void;
  onUnsend: () => void;
  onDelete: () => void;
  onClose:  () => void;
  alignRight: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  type MenuItem = {
    icon: React.ElementType;
    label: string;
    action: () => void;
    danger?: boolean;
    show?: boolean;
  };

  const items: MenuItem[] = [
    { icon: Reply,  label: "Reply",  action: onReply },
    { icon: Copy,   label: "Copy",   action: onCopy,   show: hasContent },
    { icon: Pencil, label: "Edit",   action: onEdit,   show: isMe && hasContent },
    { icon: Trash2, label: "Unsend", action: onUnsend, show: isMe,  danger: true },
    { icon: Trash2, label: "Delete", action: onDelete, show: !isMe, danger: true },
  ];

  return (
    <div
      ref={ref}
      className={cn(
        "absolute bottom-full mb-1.5 z-50 w-36",
        alignRight ? "right-0" : "left-0",
        "bg-white dark:bg-[#1c1f2e] border border-border rounded-xl shadow-xl overflow-hidden",
        "animate-in fade-in slide-in-from-bottom-1 duration-100"
      )}
    >
      {items
        .filter((item) => item.show !== false)
        .map(({ icon: Icon, label, action, danger }) => (
          <button
            key={label}
            onClick={() => { action(); onClose(); }}
            className={cn(
              "flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-medium transition-colors",
              danger
                ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5"
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
    </div>
  );
}

// ─── Reaction Summary Row ─────────────────────────────────────────────────────

function ReactionSummary({
  reactions,
  currentUserId,
  isMe,
}: {
  reactions: NonNullable<Message["reactions"]>;
  currentUserId: string;
  isMe: boolean;
}) {
  if (!reactions.length) return null;

  // Group by type, count occurrences
  const grouped = REACTIONS.map(({ type, emoji }) => ({
    type,
    emoji,
    count: reactions.filter((r) => r.type === type).length,
  })).filter((g) => g.count > 0);

  return (
    <div className={cn("relative z-10 flex flex-wrap gap-1 -mt-2 mb-0.5 px-1", isMe ? "justify-end" : "justify-start")}>
      {grouped.map(({ type, emoji, count }) => (
        <span
          key={type}
          className={cn(
            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px]",
            "bg-white dark:bg-[#252837] border border-border shadow-sm leading-none"
          )}
        >
          {emoji}
          {count > 1 && <span className="text-stone-500 dark:text-stone-400 font-medium">{count}</span>}
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MessageBubble({
  message,
  currentUserId,
  showTime,
  otherName,
  onReply,
  onReact,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const isMe = message.senderId === currentUserId;
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMenu,           setShowMenu]           = useState(false);
  // Keep hover-actions visible while a popover is open
  const actionsVisible = showReactionPicker || showMenu;

  const myReaction = message.reactions?.find((r) => r.userId === currentUserId)?.type ?? null;

  const handleCopy = () => {
    if (message.content) navigator.clipboard.writeText(message.content).catch(() => {});
  };

  const replyPreviewText = (): string => {
    if (message.content) return message.content;
    const atts = message.attachments ?? [];
    if (!atts.length) return "";
    const imgs = atts.filter((a) => a.fileType === "IMAGE").length;
    const vids = atts.filter((a) => a.fileType === "VIDEO").length;
    const parts = [];
    if (imgs) parts.push(`📷 ${imgs > 1 ? `${imgs} photos` : "Photo"}`);
    if (vids) parts.push(`🎥 ${vids > 1 ? `${vids} videos` : "Video"}`);
    return parts.join(", ");
  };

  // ── Unsent message ────────────────────────────────────────────────────────
  if (message.isUnsent) {
    return (
      <div className={cn("flex my-0.5", isMe ? "justify-end" : "justify-start")}>
        <p className="italic text-xs text-stone-400 dark:text-stone-600 px-3.5 py-2 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700">
          {isMe ? "You unsent a message." : "This message was unsent."}
        </p>
      </div>
    );
  }

  const hasAttachments = (message.attachments?.length ?? 0) > 0;
  const hasContent     = !!message.content;

  // ── Hover action buttons ──────────────────────────────────────────────────
  const ActionButtons = () => (
    <div
      className={cn(
        "flex items-center gap-0.5 self-center pb-6 shrink-0 transition-opacity duration-100",
        actionsVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}
    >
      {/* Reaction trigger */}
      <div className="relative">
        <button
          onClick={() => { setShowMenu(false); setShowReactionPicker((v) => !v); }}
          className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
          aria-label="React"
        >
          <SmilePlus size={15} />
        </button>
        {showReactionPicker && (
          <ReactionPicker
            currentReaction={myReaction}
            onSelect={(r) => onReact(message.id, r)}
            onClose={() => setShowReactionPicker(false)}
          />
        )}
      </div>

      {/* More options trigger */}
      <div className="relative">
        <button
          onClick={() => { setShowReactionPicker(false); setShowMenu((v) => !v); }}
          className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal size={15} />
        </button>
        {showMenu && (
          <ContextMenu
            isMe={isMe}
            hasContent={hasContent}
            onReply={() => onReply(message)}
            onCopy={handleCopy}
            onEdit={() => onEdit(message.id, message.content ?? "")}
            onUnsend={() => onDelete(message.id, true)}
            onDelete={() => onDelete(message.id, false)}
            onClose={() => setShowMenu(false)}
            alignRight={isMe}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("group flex items-center gap-1 my-0.5", isMe ? "flex-row-reverse" : "flex-row")}>
      {/* Bubble column */}
      <div className={cn("flex flex-col max-w-[72%] sm:max-w-[62%]", isMe ? "items-end" : "items-start")}>

        {/* Reply quote */}
        {message.replyTo && (
          <ReplyQuote
            replyTo={message.replyTo}
            isMe={isMe}
            currentUserId={currentUserId}
            otherName={otherName}
          />
        )}

        {/* Bubble */}
        <div
          className={cn(
            "w-full overflow-hidden",
            // If there's a reply quote, connect the top corners to it
            message.replyTo ? "rounded-b-2xl rounded-t-none" : "rounded-2xl",
            isMe ? "rounded-br-sm" : "rounded-bl-sm",
            // Background
            hasAttachments && !hasContent
              ? "bg-transparent"   // attachments-only: no bubble bg
              : isMe
                ? "bg-amber-700 text-white shadow-sm"
                : "bg-white dark:bg-[#252837] text-stone-800 dark:text-stone-100 border border-border shadow-sm"
          )}
        >
          {/* Attachment grid */}
          {hasAttachments && (
            <div className={cn(hasContent && "rounded-t-xl overflow-hidden")}>
              <AttachmentGrid attachments={message.attachments!} />
            </div>
          )}

          {/* Text content */}
          {hasContent && (
            <p
              className={cn(
                "text-sm leading-relaxed wrap-break-word whitespace-pre-wrap px-3.5",
                hasAttachments ? "pt-1.5 pb-2.5" : "py-2.5"
              )}
            >
              {message.content}
              {message.isEdited && (
                <span className={cn("text-[10px] ml-1.5 italic", isMe ? "text-amber-200/70" : "text-stone-400 dark:text-stone-500")}>
                  edited
                </span>
              )}
            </p>
          )}
        </div>

        {/* Reaction summary */}
        {(message.reactions?.length ?? 0) > 0 && (
          <ReactionSummary
            reactions={message.reactions!}
            currentUserId={currentUserId}
            isMe={isMe}
          />
        )}

        {/* Time + status */}
        {showTime && (
          <div className={cn("flex items-center gap-1 text-[11px] text-stone-400 dark:text-stone-500 px-1 mt-0.5", isMe && "flex-row-reverse")}>
            <span>{formatTime(message.createdAt)}</span>
            {isMe && (
              message.status === "READ"      ? <CheckCheck size={11} className="text-amber-500" /> :
              message.status === "DELIVERED" ? <CheckCheck size={11} className="text-stone-400 dark:text-stone-500" /> :
                                              <Check      size={11} className="text-stone-400 dark:text-stone-500" />
            )}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <ActionButtons />
    </div>
  );
}
