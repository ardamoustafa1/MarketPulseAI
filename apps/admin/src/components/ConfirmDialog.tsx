import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isProcessing?: boolean;
  closeOnBackdrop?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isProcessing = false,
  closeOnBackdrop = true,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    cancelButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isProcessing) {
        onCancel();
        return;
      }
      if (event.key === 'Enter' && !isProcessing) {
        event.preventDefault();
        onConfirm();
        return;
      }
      if (event.key === 'Tab') {
        const focusables = [cancelButtonRef.current, confirmButtonRef.current].filter(
          Boolean
        ) as HTMLButtonElement[];
        if (focusables.length === 0) {
          return;
        }
        const currentIndex = focusables.findIndex((el) => el === document.activeElement);
        if (event.shiftKey) {
          if (currentIndex <= 0) {
            event.preventDefault();
            focusables[focusables.length - 1].focus();
          }
        } else if (currentIndex === focusables.length - 1) {
          event.preventDefault();
          focusables[0].focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isProcessing, onCancel, onConfirm]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={() => {
        if (closeOnBackdrop && !isProcessing) {
          onCancel();
        }
      }}
    >
      <div className="confirm-dialog panel" ref={dialogRef}>
        <h3 id={titleId}>{title}</h3>
        <p id={descriptionId}>{message}</p>
        {children ? <div className="confirm-body">{children}</div> : null}
        <div className="confirm-actions" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="ghost-btn"
            onClick={onCancel}
            disabled={isProcessing}
            ref={cancelButtonRef}
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={isProcessing} ref={confirmButtonRef}>
            {isProcessing ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
