'use client';

import { Pen, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useModalFocusTrap } from '@/utils/useModalFocusTrap';
import { MESSAGE_MAX_LENGTH } from '@/utils/validation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { editMessage } from '../_services/conversation';

export function MessageEditModal({
  initial,
  onSave,
  onClose,
  messageId,
  conversationId,
}: {
  initial: string;
  onSave: (val: string) => void;
  onClose: () => void;
  messageId: string;
  conversationId: string;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  useModalFocusTrap(dialogRef, true, onClose);

  return (
    <div
      className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="relative rounded-lg w-full max-w-sm shadow-2xl flex flex-col max-h-[95vh]"
      >
        {/* Close Button */}
        <Button
          variant={'ghost'}
          size={'sm'}
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2"
        >
          <X className="w-4 h-4 text-foreground" />
        </Button>

        {/* ── Header ── */}
        <CardHeader className="flex items-start justify-between shrink-0">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 mb-1 text-foreground">
              <Pen className={cn('w-4 h-4 shrink-0')} />
              Edit message
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col py-4 bg-card overflow-y-auto gap-4">
          <Textarea
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (value.trim()) onSave(value.trim());
              }
            }}
            rows={3}
            maxLength={MESSAGE_MAX_LENGTH}
            className={cn(
              'w-full rounded-lg px-3.5 py-2.5 text-sm outline-none',
              'bg-stone-50 dark:bg-[#13151f] border border-border',
              'text-stone-800 dark:text-stone-100 focus:ring-1 focus:ring-amber-500/50',
            )}
          />
        </CardContent>

        {/* ── Footer ── */}
        <CardFooter className="flex gap-3 shrink-0">
          <Button
            variant={'outline'}
            size="lg"
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border  text-sm font-semibold hover:bg-stone-200 transition-colors"
          >
            Cancel
          </Button>
          <Button
            size="lg"
            type="button"
            onClick={async () => {
              if (!value.trim() || value.trim() === initial) return;
              setIsLoading(true);
              try {
                await editMessage(conversationId, messageId, value.trim());
                toast.success('Message edited successfully.', {
                  position: 'top-center',
                });
                onSave(value.trim());
                onClose();
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : 'Failed to edit message.',
                  { position: 'top-center' },
                );
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={!value.trim() || value.trim() === initial}
            className={cn(
              'flex-1 rounded-lg text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
              value.trim() && value.trim() !== initial
                ? 'bg-amber-700 text-white hover:bg-amber-600'
                : 'bg-stone-100 dark:bg-[#252837] text-stone-400 cursor-not-allowed',
            )}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
