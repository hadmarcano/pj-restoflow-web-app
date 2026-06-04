import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChefHat, Github, Chrome, ArrowRight, Lock } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import styles from './Login.module.css';

export const Login: React.FC = () => {
  const { loginBypass, loginWithGoogle, error, setError } = useAuth();
  const [emailInput, setEmailInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleBypassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    try {
      setIsSubmitting(true);
      await loginBypass(emailInput.trim());
      navigate('/');
    } catch (err: any) {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    try {
      setIsSubmitting(true);
      setEmailInput(email);
      await loginBypass(email);
      navigate('/');
    } catch (err) {
      // Handled
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
      setError(err?.message || 'Google login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.loginBox} glass-panel`}>
        <div className={styles.logoContainer}>
          <ChefHat size={40} className={styles.logoIcon} />
          <span className={styles.logoText}>RestoFlow</span>
        </div>
        <p className={styles.subtitle}>
          Multi-Tenant Restaurant Inventory, Provider Billings, and VES / USD Cash Flow Ledger
        </p>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_blue"
            size="large"
          />
        </div>

        {/* <div className={styles.divider}>Or Local Dev Bypass</div> */}

        {/* <form onSubmit={handleBypassSubmit} className={styles.bypassSection}>
          <div className={styles.bypassTitle}>
            <Lock size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'text-bottom' }} />
            Developer Sandboxed Access
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Enter email address</label>
            <input
              type="email"
              placeholder="name@restaurant.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="glow-input"
              style={{ width: '100%' }}
              disabled={isSubmitting}
              required
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={isSubmitting || !emailInput.trim()}
          >
            {isSubmitting ? 'Authenticating...' : 'Instant Sandboxed Login'}
            {!isSubmitting && <ArrowRight size={16} style={{ marginLeft: 8, display: 'inline', verticalAlign: 'middle' }} />}
          </button>

          <div style={{ marginTop: 16 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click to auto-fill profiles:</span>
            <div className={styles.quickSelect}>
              <div 
                onClick={() => handleQuickLogin('superadmin@restaurant.com')} 
                className={styles.pill}
              >
                Superadmin
              </div>
              <div 
                onClick={() => handleQuickLogin('owner_italy@restaurant.com')} 
                className={styles.pill}
              >
                Trattoria Owner (VES/USD)
              </div>
              <div 
                onClick={() => handleQuickLogin('owner_taco@restaurant.com')} 
                className={styles.pill}
              >
                Taco Shop Owner (VES/USD)
              </div>
              <div 
                onClick={() => handleQuickLogin('unassigned@restaurant.com')} 
                className={styles.pill}
              >
                New Registered User (Unassigned)
              </div>
            </div>
          </div>
        </form> */}
      </div>
    </div>
  );
};
