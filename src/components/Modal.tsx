import React, { useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import styles from './ui.module.css';

interface ModalProps {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Modal accesible: role="dialog", trap de foco, cierre con Escape y clic
 * en el fondo, y bloqueo del scroll del body mientras está abierto.
 */
export const Modal: React.FC<ModalProps> = ({ title, onClose, children, maxWidth }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foco inicial dentro del diálogo
    const focusables = contentRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusables?.[0]?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !contentRef.current) return;

      const focusables = Array.from(
        contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter(el => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        className={`${styles.modalContent} glass-panel`}
        style={maxWidth ? { maxWidth } : undefined}
      >
        <header className={styles.modalHeader}>
          <h2 id={titleId.current} className={styles.modalTitle}>{title}</h2>
          <button type="button" onClick={onClose} className={styles.modalClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo de confirmación para acciones destructivas (reemplaza window.confirm). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal title={title} onClose={onCancel} maxWidth={440}>
    <div className={styles.confirmBody}>{message}</div>
    <div className={styles.confirmActions}>
      <Button variant="secondary" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button variant="danger" onClick={onConfirm} loading={loading}>
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);
