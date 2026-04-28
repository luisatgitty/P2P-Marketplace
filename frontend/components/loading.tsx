import { Spinner } from '@/components/ui/spinner';

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner className="size-8" />
    </div>
  );
}
