import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Coins, Calendar, Plus, RefreshCw, Loader2, Check, AlertCircle } from 'lucide-react';
import styles from './ExchangeRates.module.css';

interface ExchangeRate {
  id: string;
  date: string;
  rateUsdToLocal: number;
  createdAt: string;
}

export const ExchangeRates: React.FC = () => {
  const { activeRestaurant } = useAuth();
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [rateDate, setRateDate] = useState('2026-05-20');
  const [rateValue, setRateValue] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Status Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const localCode = activeRestaurant?.localCurrencyCode || 'VES';
  const localSymbol = activeRestaurant?.localCurrencySymbol || 'Bs';

  const loadRates = async () => {
    try {
      setLoading(true);
      const data = await api.getExchangeRates();
      setRates(data);
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to load exchange rates history.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRestaurant) {
      loadRates();
    }
  }, [activeRestaurant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateValue || isNaN(Number(rateValue))) {
      setAlert({ type: 'error', message: 'Please enter a valid exchange rate value.' });
      return;
    }

    try {
      setActionLoading(true);
      setAlert(null);
      await api.setExchangeRate(rateDate, Number(rateValue));
      setAlert({ type: 'success', message: `Successfully registered 1 USD = ${rateValue} ${localSymbol} for date ${rateDate}!` });
      setRateValue('');
      loadRates();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to set exchange rate.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (!activeRestaurant) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading active restaurant profile...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>USD Daily Exchange Rates</h1>
        <p className={styles.subtitle}>Set and manage locked exchange rates per day for exact billing and cash ledger calculations.</p>
      </header>

      {alert && (
        <div className={alert.type === 'success' ? styles.alertSuccess : styles.alertError} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {alert.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{alert.message}</span>
        </div>
      )}

      <div className={styles.splitGrid}>
        {/* Table List of Rates */}
        <section className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0, border: 'none', padding: 0 }}>
              <Coins size={18} color="var(--color-primary)" />
              <span>Historical Daily Rates ({rates.length})</span>
            </h2>
            <button 
              onClick={loadRates}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Refresh Registry"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            </div>
          ) : rates.length === 0 ? (
            <div className={styles.emptyState}>No exchange rates locked. Use the editor on the right to lock a rate!</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lock Date</th>
                    <th style={{ textAlign: 'right' }}>Exchange Rate Value</th>
                    <th>Locked currency</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.date}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-ves)' }}>
                        {Number(r.rateUsdToLocal).toFixed(4)} {localSymbol}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                        USD to {localCode}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Editor Form */}
        <section className="glass-panel" style={{ padding: 24 }}>
          <h2 className={styles.sectionTitle}>
            <Calendar size={18} color="var(--color-ves)" />
            <span>Lock Daily exchange rate</span>
          </h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Rate lock-in Date</label>
              <input 
                type="date" 
                value={rateDate}
                onChange={e => setRateDate(e.target.value)}
                className="glow-input"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Rate Value (1 USD = ? {localCode})</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input 
                  type="number" 
                  step="0.0001"
                  placeholder="e.g. 40.5000"
                  value={rateValue}
                  onChange={e => setRateValue(e.target.value)}
                  className="glow-input"
                  style={{ flex: 1 }}
                  required
                />
                <span style={{ fontWeight: 600 }}>{localSymbol}</span>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={actionLoading}>
              <Plus size={16} />
              <span>{actionLoading ? 'Locking...' : 'Lock exchange Rate'}</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
export default ExchangeRates;
