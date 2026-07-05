import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, CheckCircle, RefreshCw, Copy, Check } from 'lucide-react';
import styles from './Onboarding.module.css';

const ADMIN_EMAIL = 'superadmin@restaurant.com';

export const Onboarding: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleVerify = async () => {
    setChecking(true);
    try {
      await refreshUser();
      // Si tras refrescar ya hay restaurante, RequireAuth redirige automáticamente
    } finally {
      setChecking(false);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(ADMIN_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Portapapeles no disponible: sin acción
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.onboardingCard} glass-panel`}>
        <div className={styles.iconWrapper}>
          <ShieldAlert size={36} />
        </div>
        <h1 className={styles.title}>Falta asignarte un restaurante</h1>

        <p className={styles.message}>
          ¡Hola <strong>{user?.name || 'Usuario'}</strong>! Tu cuenta fue autenticada correctamente,
          pero todavía no está vinculada a ningún restaurante. Un administrador de la
          plataforma debe asignarte antes de que puedas operar.
        </p>

        <div className={styles.statusIndicator}>
          <div className={styles.statusRow}>
            <span className={styles.label}>1. Autenticación:</span>
            <span className={styles.value} style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={14} /> Sesión activa
            </span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.label}>Correo:</span>
            <span className={styles.value}>{user?.email}</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.label}>2. Asignación de restaurante:</span>
            <span className={styles.value} style={{ color: '#f59e0b', fontWeight: 600 }}>Pendiente</span>
          </div>
        </div>

        <p className={styles.message} style={{ fontSize: '0.85rem', marginBottom: 20 }}>
          Contacta al administrador de tu espacio de trabajo o al superadmin de la
          plataforma en <strong>{ADMIN_EMAIL}</strong> para vincular tu cuenta.
        </p>

        <div className={styles.actionsRow}>
          <button onClick={handleVerify} className={styles.verifyBtn} disabled={checking}>
            <RefreshCw size={16} className={checking ? 'animate-spin' : undefined} style={{ marginRight: 8, display: 'inline', verticalAlign: 'middle' }} />
            {checking ? 'Verificando...' : 'Verificar asignación'}
          </button>

          <button onClick={handleCopyEmail} className={styles.copyBtn}>
            {copied
              ? <Check size={16} style={{ marginRight: 8, display: 'inline', verticalAlign: 'middle' }} />
              : <Copy size={16} style={{ marginRight: 8, display: 'inline', verticalAlign: 'middle' }} />}
            {copied ? 'Copiado' : 'Copiar correo del admin'}
          </button>
        </div>

        <button onClick={logout} className={styles.logoutBtn}>
          <LogOut size={16} style={{ marginRight: 8, display: 'inline', verticalAlign: 'middle' }} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};
export default Onboarding;
