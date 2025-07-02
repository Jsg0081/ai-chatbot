'use client';

import { LoaderIcon } from '@/components/icons';
import { Button } from './ui/button';

export function SubmitButton({
  children,
  isSuccessful,
  pending,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
  pending: boolean;
}) {
  return (
    <Button
      type="submit"
      aria-disabled={pending || isSuccessful}
      disabled={pending || isSuccessful}
      className="relative"
    >
      {children}
      {(pending || isSuccessful) && (
        <span className="animate-spin absolute right-4">
          <LoaderIcon />
        </span>
      )}
      <output aria-live="polite" className="sr-only">
        {pending || isSuccessful ? 'Loading' : 'Submit form'}
      </output>
    </Button>
  );
}
