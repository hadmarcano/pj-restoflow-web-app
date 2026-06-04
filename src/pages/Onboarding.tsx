import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, CheckCircle } from 'lucide-react';
import styles from './Onboarding.module.css';

export const Onboarding: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className={styles.container}>
      <div className={`${styles.onboardingCard} glass-panel`}>
        <div className={styles.iconWrapper}>
          <ShieldAlert size={36} />
        </div>
        <h1 className={styles.title}>Restaurant Assignment Required</h1>
        
        <p className={styles.message}>
          Hello <strong>{user?.name || 'User'}</strong>! Your account has been authenticated successfully.
          However, your profile has not yet been assigned to any restaurant or company tenant by a system administrator.
        </p>

        <div className={styles.statusIndicator}>
          <div className={styles.statusRow}>
            <span className={styles.label}>Auth Status:</span>
            <span className={styles.value} style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={14} /> Active Session
            </span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.label}>Email Address:</span>
            <span className={styles.value}>{user?.email}</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.label}>Assigned Role:</span>
            <span className={styles.value}>{user?.role}</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.label}>Restaurant:</span>
            <span className={styles.value} style={{ color: '#f59e0b', fontWeight: 600 }}>Unassigned (Pending)</span>
          </div>
        </div>

        <p className={styles.message} style={{ fontSize: '0.85rem', marginBottom: 24 }}>
          Please contact your workspace manager or get in touch with the platform superadmin 
          at <strong>superadmin@restaurant.com</strong> to link your account. 
          Once assigned, refresh this page to access your operational dashboards.
        </p>

        <button onClick={logout} className={styles.logoutBtn}>
          <LogOut size={16} style={{ marginRight: 8, display: 'inline', verticalAlign: 'middle' }} />
          Sign out of Session
        </button>
      </div>
    </div>
  );
};
export default Onboarding;
