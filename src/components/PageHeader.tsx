import React from 'react';
import styles from './ui.module.css';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <header className={styles.pageHeader}>
    <div>
      <h1 className={styles.pageHeaderTitle}>{title}</h1>
      {subtitle && <p className={styles.pageHeaderSubtitle}>{subtitle}</p>}
    </div>
    {actions && <div className={styles.pageHeaderActions}>{actions}</div>}
  </header>
);
