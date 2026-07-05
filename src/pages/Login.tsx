import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChefHat, ArrowRight, Lock } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { Alert } from '../components/Alert';
import styles from './Login.module.css';

const IS_DEV = process.env.NODE_ENV !== 'production';

export const Login: React.FC = () => {
  const { loginBypass, loginWithGoogle, error, setError } = useAuth();
  const [emailInput, setEmailInput] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleBypassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Ingresa un correo electrónico válido.');
      return;
    }
    setEmailError(null);

    try {
      setIsSubmitting(true);
      await loginBypass(email);
      navigate('/');
    } catch (err: any) {
      // El error lo gestiona AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      setEmailInput(email);
      await loginBypass(email);
      navigate('/');
    } catch (err) {
      // Gestionado por AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setIsSubmitting(true);
      setError(null);
      await loginWithGoogle(credentialResponse.credential);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar sesión con Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError('No se pudo iniciar sesión con Google. Intenta de nuevo.');
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.loginBox} glass-panel`}>
        <div className={styles.logoContainer}>
          <ChefHat size={40} className={styles.logoIcon} />
          <span className={styles.logoText}>RestoFlow</span>
        </div>
        <p className={styles.subtitle}>
          Gestiona la caja, el inventario y los pagos a proveedores de tu restaurante
          en un solo lugar, con soporte dual USD / moneda local.
        </p>

        {error && (
          <Alert type="error" onDismiss={() => setError(null)}>{error}</Alert>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_black"
            size="large"
          />
        </div>

        {/* {IS_DEV && (
          <>
            <div className={styles.divider}>Acceso de desarrollo</div>

            <form onSubmit={handleBypassSubmit} className={styles.bypassSection}>
              <div className={styles.bypassTitle}>
                <Lock size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'text-bottom' }} />
                Acceso directo (solo entorno local)
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="bypass-email" className={styles.inputLabel}>Correo electrónico</label>
                <input
                  id="bypass-email"
                  type="email"
                  placeholder="nombre@restaurante.com"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  className="glow-input"
                  style={{ width: '100%', borderColor: emailError ? 'var(--color-danger)' : undefined }}
                  disabled={isSubmitting}
                  required
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'bypass-email-error' : undefined}
                />
                {emailError && (
                  <span id="bypass-email-error" className={styles.inputError}>{emailError}</span>
                )}
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting || !emailInput.trim()}
              >
                {isSubmitting ? 'Autenticando...' : 'Entrar en modo desarrollo'}
                {!isSubmitting && <ArrowRight size={16} style={{ marginLeft: 8, display: 'inline', verticalAlign: 'middle' }} />}
              </button>

              <div style={{ marginTop: 16 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Perfiles de prueba:</span>
                <div className={styles.quickSelect}>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('superadmin@restaurant.com')}
                    className={styles.pill}
                    disabled={isSubmitting}
                  >
                    Superadmin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('owner_italy@restaurant.com')}
                    className={styles.pill}
                    disabled={isSubmitting}
                  >
                    Dueño Trattoria (VES/USD)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('owner_taco@restaurant.com')}
                    className={styles.pill}
                    disabled={isSubmitting}
                  >
                    Dueño Taquería (VES/USD)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('unassigned@restaurant.com')}
                    className={styles.pill}
                    disabled={isSubmitting}
                  >
                    Usuario sin asignar
                  </button>
                </div>
              </div>
            </form>
          </>
        )} */}
      </div>
    </div>
  );
};
