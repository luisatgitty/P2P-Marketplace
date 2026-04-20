"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook to handle navigation with unsaved changes confirmation
 * Checks for unsaved changes and shows confirmation dialog if needed
 */
export function useFormNavigation(hasUnsavedChanges: boolean) {
  const router = useRouter();

  const handleNavigate = useCallback(
    (href: string, confirmMessage = "Are you sure you want to discard your changes?") => {
      if (!hasUnsavedChanges) {
        router.push(href);
        return;
      }

      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        router.push(href);
      }
    },
    [hasUnsavedChanges, router],
  );

  return { handleNavigate };
}
