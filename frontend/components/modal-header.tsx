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
import { ReactNode } from 'react';

export interface ModalHeaderProps {
  icon: LucideIcon;
  type: string;
  title: string;
  subTitle: string;
  onClose: () => void;
  handleSend: () => void;
  canSend: boolean;
  sending: boolean;
  submitLabel: string;
  children?: ReactNode;
}

export function ModalHeader({
  icon: Icon,
  type,
  title,
  subTitle,
  onClose,
  handleSend,
  canSend,
  sending,
  submitLabel,
  children,
}: ModalHeaderProps) {
  let iconColorClass = '';
  let btnColorClass = '';

  if (type.toLowerCase() === 'sell') {
    iconColorClass = 'text-orange-600';
    btnColorClass = 'bg-orange-600 hover:bg-orange-500';
  } else if (type.toLowerCase() === 'rent') {
    iconColorClass = 'text-emerald-600';
    btnColorClass = 'bg-emerald-600 hover:bg-emerald-500';
  } else if (type.toLowerCase() === 'service') {
    iconColorClass = 'text-violet-600';
    btnColorClass = 'bg-violet-600 hover:bg-violet-500';
  } else if (type.toLowerCase() === 'report') {
    iconColorClass = 'text-red-600';
    btnColorClass = 'bg-red-600 hover:bg-red-500';
  }

  return (
    <div
      className='fixed z-50 inset-0 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm'
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className='relative bg-card-foreground rounded-lg w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[86vh] sm:mt-16'>
        {/* Close Button */}
        <Button
          variant={'ghost'}
          size={'sm'}
          type='button'
          onClick={onClose}
          className='absolute top-2 right-2'
        >
          <X className='w-4 h-4 text-primary-foreground' />
        </Button>

        {/* ── Header ── */}
        <CardHeader className='flex items-start justify-between shrink-0'>
          <div className='min-w-0'>
            <CardTitle className='flex items-center gap-2 mb-1 text-primary-foreground'>
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
            size='lg'
            type='button'
            onClick={onClose}
            className='flex-1 rounded-lg border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors'
          >
            Cancel
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
  );
}
