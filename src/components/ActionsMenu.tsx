import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import styles from './ui.module.css';

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

/** Menú desplegable "⋯" para agrupar acciones secundarias por fila. */
export const ActionsMenu: React.FC<{ items: ActionItem[]; label?: string }> = ({
  items,
  label = 'Más acciones',
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div className={styles.actionsMenuWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.actionsMenuTrigger}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div role="menu" className={styles.actionsMenuList}>
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={`${styles.actionsMenuItem} ${item.danger ? styles.actionsMenuItemDanger : ''}`}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
