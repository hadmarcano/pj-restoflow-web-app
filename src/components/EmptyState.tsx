import React from 'react';
import styles from './ui.module.css';

interface EmptyStateProps {
  icon?: React.ReactNode;
  message: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, message, action }) => (
  <div className={styles.emptyState}>
    {icon && <div className={styles.emptyStateIcon}>{icon}</div>}
    <p className={styles.emptyStateText}>{message}</p>
    {action}
  </div>
);
