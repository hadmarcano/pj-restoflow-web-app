import React, { useEffect } from 'react';
import { Check, AlertCircle, AlertTriangle, X } from 'lucide-react';
import styles from './ui.module.css';

type AlertType = 'success' | 'error' | 'warning';

interface AlertProps {
  type: AlertType;
  children: React.ReactNode;
  onDismiss?: () => void;
  /** Autocierra la alerta (por defecto 5s si es success y hay onDismiss). */
  autoDismissMs?: number;
}

const typeClass: Record<AlertType, string> = {
  success: styles.alertSuccess,
  error: styles.alertError,
  warning: styles.alertWarning,
};

const typeIcon: Record<AlertType, React.ReactNode> = {
  success: <Check size={17} style={{ flexShrink: 0, marginTop: 1 }} />,
  error: <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />,
  warning: <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} />,
};

export const Alert: React.FC<AlertProps> = ({ type, children, onDismiss, autoDismissMs }) => {
  const effectiveAutoDismiss =
    autoDismissMs ?? (type === 'success' && onDismiss ? 5000 : undefined);

  useEffect(() => {
    if (!effectiveAutoDismiss || !onDismiss) return;
    const t = setTimeout(onDismiss, effectiveAutoDismiss);
    return () => clearTimeout(t);
  }, [effectiveAutoDismiss, onDismiss]);

  return (
    <div className={`${styles.alert} ${typeClass[type]}`} role={type === 'error' ? 'alert' : 'status'}>
      {typeIcon[type]}
      <span className={styles.alertMessage}>{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className={styles.alertDismiss} aria-label="Descartar aviso">
          <X size={15} />
        </button>
      )}
    </div>
  );
};
