'use client';

import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ');

export function useModalFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    if (!container) return;

    const focusFirstElement = () => {
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
        return;
      }

      container.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const currentElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (
          !currentElement ||
          currentElement === firstElement ||
          !container.contains(currentElement)
        ) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (
        currentElement === lastElement ||
        !container.contains(currentElement)
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    container.setAttribute('tabindex', '-1');
    window.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(focusFirstElement);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (
        previousActiveElement &&
        typeof previousActiveElement.focus === 'function'
      ) {
        previousActiveElement.focus();
      }
    };
  }, [containerRef, isOpen]);
}
