import React, { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Coins, Calendar, Plus, RefreshCw } from 'lucide-react';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import { Pagination, usePagination } from '../components/Pagination';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import styles from './ExchangeRates.module.css';

interface ExchangeRate {
  id: string;
  date: string;
  rateUsdToLocal: number;
  createdAt: string;
}

export const ExchangeRates: React.FC = () => {
  const { activeRestaurant } = useAuth();
  const { showToast } = useToast();
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario
  const [rateDate, setRateDate] = useState(() => DateTime.now().toFormat('yyyy-LL-dd'));
  const [rateValue, setRateValue] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const localCode = activeRestaurant?.localCurrencyCode || 'VES';
  const localSymbol = activeRestaurant?.localCurrencySymbol || 'Bs';

  const todayIso = DateTime.now().toFormat('yyyy-LL-dd');
  const hasTodayRate = rates.some(r => r.date === todayIso);

  const loadRates = async () => {
    try {
      setLoading(true);
      const data = await api.getExchangeRates();
      // Más recientes primero
      const sorted = [...data].sort((a: ExchangeRate, b: ExchangeRate) => (a.date < b.date ? 1 : -1));
      setRates(sorted);
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo cargar el historial de tasas.' });
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
      setAlert({ type: 'error', message: 'Ingresa un valor de tasa válido.' });
      return;
    }

    try {
      setActionLoading(true);
      setAlert(null);
      await api.setExchangeRate(rateDate, Number(rateValue));
      showToast(`Tasa registrada: 1 USD = ${rateValue} ${localSymbol} para el ${DateTime.fromISO(rateDate).toFormat('dd/LL/yyyy')}.`);
      setRateValue('');
      loadRates();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo registrar la tasa.' });
    } finally {
      setActionLoading(false);
    }
  };

  const pagination = usePagination(rates, 10);

  if (!activeRestaurant) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Cargando el perfil del restaurante...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader
        title="Tasas de cambio USD"
        subtitle={`Registra la tasa diaria USD → ${localCode} que se usará para todos los cálculos de facturas y caja.`}
      />

      {alert && (
        <Alert type={alert.type} onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {!loading && !hasTodayRate && (
        <Alert type="warning">
          Aún no registras la tasa de hoy ({DateTime.now().toFormat('dd/LL/yyyy')}). Sin ella, los
          registros de una sola moneda quedarán bloqueados.
        </Alert>
      )}

      <div className={styles.splitGrid}>
        {/* Historial de tasas */}
        <section className="glass-panel panel-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0, border: 'none', padding: 0 }}>
              <Coins size={18} color="var(--color-primary)" />
              <span>Historial de tasas ({rates.length})</span>
            </h2>
            <button
              onClick={loadRates}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Actualizar historial"
              aria-label="Actualizar historial"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <TableSkeleton rows={6} />
          ) : rates.length === 0 ? (
            <EmptyState
              icon={<Coins size={36} />}
              message="No hay tasas registradas todavía. Usa el formulario para fijar la primera tasa diaria."
            />
          ) : (
            <>
              <div className={`${styles.tableWrapper} table-scroll`}>
                <table className={`${styles.table} responsive-table`}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th style={{ textAlign: 'right' }}>Tasa registrada</th>
                      <th>Conversión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.pageItems.map(r => {
                      const isToday = r.date === todayIso;
                      return (
                        <tr key={r.id} className={isToday ? styles.todayRow : undefined}>
                          <td data-label="Fecha" style={{ fontWeight: 600 }}>
                            {r.date}
                            {isToday && <span className={styles.todayBadge}>Hoy</span>}
                          </td>
                          <td data-label="Tasa" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-ves)' }}>
                            {Number(r.rateUsdToLocal).toFixed(4)} {localSymbol}
                          </td>
                          <td data-label="Conversión" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                            USD → {localCode}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                itemsLabel="tasas"
              />
            </>
          )}
        </section>

        {/* Formulario de registro */}
        <section className="glass-panel panel-section">
          <h2 className={styles.sectionTitle}>
            <Calendar size={18} color="var(--color-ves)" />
            <span>Fijar tasa diaria</span>
          </h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="rate-date" className={styles.label}>Fecha de la tasa</label>
              <input
                id="rate-date"
                type="date"
                value={rateDate}
                onChange={e => setRateDate(e.target.value)}
                className="glow-input"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="rate-value" className={styles.label}>Valor (1 USD = ? {localCode})</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  id="rate-value"
                  type="number"
                  step="0.0001"
                  placeholder="ej. 40.5000"
                  value={rateValue}
                  onChange={e => setRateValue(e.target.value)}
                  className="glow-input"
                  style={{ flex: 1 }}
                  required
                />
                <span style={{ fontWeight: 600 }}>{localSymbol}</span>
              </div>
            </div>

            <Button type="submit" variant="amber" fullWidth loading={actionLoading}>
              <Plus size={16} />
              {actionLoading ? 'Registrando...' : 'Fijar tasa'}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
};
export default ExchangeRates;
