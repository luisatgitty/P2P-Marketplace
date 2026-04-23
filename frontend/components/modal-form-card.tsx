"use client";

import { LucideIcon, X } from 'lucide-react';
import { Button } from './ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardContent,
} from './ui/card';
import { cn } from '@/lib/utils';
import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ModalFormCardProps {
  icon: LucideIcon;
  type: string;
  title: string;
  subTitle: string;
  onClose: () => void;
  onCancel?: () => void;
  handleSend: () => void;
  canSend: boolean;
  sending: boolean;
  submitLabel: string;
  cancelLabel?: string;
  children?: ReactNode;
}

export function ModalFormCard({
  icon: Icon,
  type,
  title,
  subTitle,
  onClose,
  onCancel,
  handleSend,
  canSend,
  sending,
  submitLabel,
  cancelLabel,
  children,
}: ModalFormCardProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  let iconColorClass = '';
  let btnColorClass = '';

  if (type.toUpperCase() === 'SELL') {
    iconColorClass = 'text-orange-600';
    btnColorClass = 'bg-orange-500 hover:bg-orange-400';
  } else if (type.toUpperCase() === 'RENT') {
    iconColorClass = 'text-emerald-600';
    btnColorClass = 'bg-emerald-600 hover:bg-emerald-500';
  } else if (type.toUpperCase() === 'SERVICE') {
    iconColorClass = 'text-violet-600';
    btnColorClass = 'bg-violet-600 hover:bg-violet-500';
  } else if (type.toUpperCase() === 'REPORT') {
    iconColorClass = 'text-red-600';
    btnColorClass = 'bg-red-600 hover:bg-red-500';
  } else if (type.toUpperCase() === 'REVIEW') {
    iconColorClass = 'text-yellow-600';
    btnColorClass = 'bg-yellow-600 hover:bg-yellow-500';
  }

  if (!isMounted) {
    return null;
  }

  return createPortal((
    <div
      className='fixed inset-0 z-100 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm'
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className='relative bg-background rounded-lg w-full max-w-sm shadow-2xl flex flex-col max-h-[95vh]'>
        {/* Close Button */}
        <Button
          variant={'ghost'}
          size={'sm'}
          type='button'
          onClick={onClose}
          className='absolute top-2 right-2'
        >
          <X className='w-4 h-4 text-foreground' />
        </Button>

        {/* ── Header ── */}
        <CardHeader className='flex items-start justify-between shrink-0'>
          <div className='min-w-0'>
            <CardTitle className='flex items-center gap-2 mb-1 text-foreground'>
              <Icon className={cn('w-5 h-5 shrink-0', iconColorClass)} />
              {title}
            </CardTitle>
            <CardDescription className='truncate'>{subTitle}</CardDescription>
          </div>
        </CardHeader>

        {/* ── Content ── */}
        <CardContent className='flex flex-col py-4 bg-card overflow-y-auto gap-4'>
          {children}
        </CardContent>

        {/* ── Footer ── */}
        <CardFooter className='flex gap-3 shrink-0'>
          <Button
            variant={'outline'}
            size='lg'
            type='button'
            onClick={onCancel || onClose}
            className='flex-1 rounded-lg border  text-sm font-semibold hover:bg-stone-200 transition-colors'
          >
            {cancelLabel || 'Cancel'}
          </Button>
          <Button
            size='lg'
            type='button'
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              'flex-1 rounded-lg text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
              btnColorClass,
            )}
          >
            {sending ? 'Sending...' : submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </div>
  ), document.body);
}
