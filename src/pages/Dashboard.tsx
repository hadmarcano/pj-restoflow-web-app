import React, { useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Coins,
  Calendar,
  Plus,
  ArrowRightLeft,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  Search,
  Download,
  Pencil,
  Trash2,
  BarChart3
} from 'lucide-react';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton, KpiSkeleton } from '../components/Skeleton';
import { Pagination, usePagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import { txTypeLabels, cashCategoryLabels, label } from '../i18n/es';
import styles from './Dashboard.module.css';

interface CashFlowSummary {
  totalInflowLocal: number;
  totalInflowUsd: number;
  totalOutflowLocal: number;
  totalOutflowUsd: number;
  netCashFlowLocal: number;
  netCashFlowUsd: number;
  transactions: any[];
}

const INFLOW_CATEGORIES = ['SALES_REVENUE', 'INVESTMENT', 'MANUAL_INFLOW'];
const OUTFLOW_CATEGORIES = ['UTILITIES', 'RENT', 'SALARIES', 'INGREDIENTS', 'MARKETING', 'TAXES', 'OTHER_EXPENSE'];

const fmt = (n: number | null | undefined) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Variación porcentual entre período actual y anterior. */
const percentDelta = (current: number, previous: number): string | null => {
  if (!previous) return null;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
};

export const Dashboard: React.FC = () => {
  const { activeRestaurant } = useAuth();
  const { showToast } = useToast();

  // Rango de fechas (últimos 7 días por defecto)
  const [startDate, setStartDate] = useState(() =>
    DateTime.now().minus({ days: 7 }).toFormat('yyyy-LL-dd')
  );
  const [endDate, setEndDate] = useState(() => DateTime.now().toFormat('yyyy-LL-dd'));

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<CashFlowSummary | null>(null);
  const [todayRate, setTodayRate] = useState<number | null>(null);
  const [todayRateDate, setTodayRateDate] = useState<string | null>(null);

  // Widget de tasa diaria
  const [rateDate, setRateDate] = useState(DateTime.now().toFormat('yyyy-LL-dd'));
  const [newRate, setNewRate] = useState('');
  const [rateActionLoading, setRateActionLoading] = useState(false);

  // Registro manual de transacción
  const [txType, setTxType] = useState<'INFLOW' | 'OUTFLOW'>('INFLOW');
  const [txDate, setTxDate] = useState(DateTime.now().toFormat('yyyy-LL-dd'));
  const [txCategory, setTxCategory] = useState('SALES_REVENUE');
  const [txLocalAmount, setTxLocalAmount] = useState('');
  const [txUsdAmount, setTxUsdAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txActionLoading, setTxActionLoading] = useState(false);

  // Edición de transacción (en modal)
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editType, setEditType] = useState<'INFLOW' | 'OUTFLOW'>('INFLOW');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLocalAmount, setEditLocalAmount] = useState('');
  const [editUsdAmount, setEditUsdAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editActionLoading, setEditActionLoading] = useState(false);

  // Eliminación con confirmación
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Tasa para la fecha seleccionada en el formulario manual
  const [selectedDateRate, setSelectedDateRate] = useState<number | null>(null);
  const [fetchingDateRate, setFetchingDateRate] = useState(false);

  // Búsqueda y filtro del ledger
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const localCode = activeRestaurant?.localCurrencyCode || 'VES';
  const localSymbol = activeRestaurant?.localCurrencySymbol || 'Bs';

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Período anterior de la misma duración, para comparativa de KPIs
      const start = DateTime.fromISO(startDate);
      const end = DateTime.fromISO(endDate);
      const days = Math.max(1, Math.round(end.diff(start, 'days').days));
      const prevEnd = start.minus({ days: 1 });
      const prevStart = prevEnd.minus({ days: days });

      const [sumRes, prevRes, ratesList] = await Promise.all([
        api.getCashFlowSummary(startDate, endDate),
        api.getCashFlowSummary(prevStart.toFormat('yyyy-LL-dd'), prevEnd.toFormat('yyyy-LL-dd')).catch(() => null),
        api.getExchangeRates()
      ]);

      setSummary(sumRes);
      setPrevSummary(prevRes);

      // Priorizar la tasa de hoy; si no existe, usar la más reciente
      const todayIso = DateTime.now().toFormat('yyyy-LL-dd');
      const foundToday = ratesList.find((r: any) => r.date === todayIso);

      const latestRate = [...ratesList]
        .filter((r: any) => r?.date && r?.rateUsdToLocal != null)
        .sort(
          (a: any, b: any) =>
            DateTime.fromISO(b.date).toMillis() - DateTime.fromISO(a.date).toMillis()
        )[0];

      const rateToUse = foundToday ?? latestRate;
      setTodayRate(rateToUse?.rateUsdToLocal != null ? Number(rateToUse.rateUsdToLocal) : null);
      setTodayRateDate(rateToUse?.date ?? null);
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo cargar el resumen de caja.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRestaurant) {
      loadDashboardData();
    }
  }, [activeRestaurant, startDate, endDate]);

  // Consultar tasa al cambiar la fecha del formulario manual
  useEffect(() => {
    const checkDateRate = async () => {
      if (!txDate) return;
      try {
        setFetchingDateRate(true);
        const res = await api.getRateByDate(txDate);
        setSelectedDateRate(res?.rateUsdToLocal ? Number(res.rateUsdToLocal) : null);
      } catch {
        setSelectedDateRate(null);
      } finally {
        setFetchingDateRate(false);
      }
    };
    checkDateRate();
  }, [txDate]);

  // Conversión en tiempo real
  const handleUsdChange = (val: string) => {
    setTxUsdAmount(val);
    if (!val || isNaN(Number(val))) {
      setTxLocalAmount('');
      return;
    }
    const activeRate = selectedDateRate || todayRate;
    if (activeRate) {
      setTxLocalAmount((Number(val) * activeRate).toFixed(2));
    }
  };

  const handleLocalChange = (val: string) => {
    setTxLocalAmount(val);
    if (!val || isNaN(Number(val))) {
      setTxUsdAmount('');
      return;
    }
    const activeRate = selectedDateRate || todayRate;
    if (activeRate && activeRate > 0) {
      setTxUsdAmount((Number(val) / activeRate).toFixed(2));
    }
  };

  const handleSetRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRate || isNaN(Number(newRate))) {
      setAlert({ type: 'error', message: 'Ingresa un valor de tasa válido.' });
      return;
    }

    try {
      setRateActionLoading(true);
      setAlert(null);
      await api.setExchangeRate(rateDate, Number(newRate));
      showToast(`Tasa registrada: 1 USD = ${newRate} ${localSymbol} para el ${DateTime.fromISO(rateDate).toFormat('dd/LL/yyyy')}`);
      setNewRate('');
      loadDashboardData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo registrar la tasa de cambio.' });
    } finally {
      setRateActionLoading(false);
    }
  };

  const scrollToRateEditor = () => {
    setRateDate(DateTime.now().toFormat('yyyy-LL-dd'));
    document.querySelector('#rate-editor-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRecordManualTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const localVal = txLocalAmount ? Number(txLocalAmount) : null;
    const usdVal = txUsdAmount ? Number(txUsdAmount) : null;

    if (localVal === null && usdVal === null) {
      setAlert({ type: 'error', message: `Debes indicar al menos un monto (${localCode} o USD).` });
      return;
    }

    try {
      setTxActionLoading(true);
      setAlert(null);

      await api.recordManualCashFlow({
        type: txType,
        date: txDate,
        category: txCategory,
        currencyLocalAmount: localVal,
        currencyUsdAmount: usdVal,
        description: txDescription.trim() || undefined
      });

      showToast('Movimiento de caja registrado correctamente.');
      setTxLocalAmount('');
      setTxUsdAmount('');
      setTxDescription('');
      loadDashboardData();
    } catch (err: any) {
      if (err?.error === 'EXCHANGE_RATE_REQUIRED') {
        setAlert({
          type: 'error',
          message: `Para registrar un solo monto se necesita la tasa de cambio del ${DateTime.fromISO(txDate).toFormat('dd/LL/yyyy')}, y no hay ninguna registrada.`
        });
      } else {
        setAlert({ type: 'error', message: err?.message || 'No se pudo registrar el movimiento.' });
      }
    } finally {
      setTxActionLoading(false);
    }
  };

  const getCashFlowId = (tx: any) => (tx?.referenceId || tx?.id) as string;

  const startEditTransaction = (tx: any) => {
    setEditingTx(tx);
    setEditType(tx.type);
    setEditDate(tx.date);
    setEditCategory(tx.category);
    setEditLocalAmount(tx.currencyLocalAmount != null ? String(tx.currencyLocalAmount) : '');
    setEditUsdAmount(tx.currencyUsdAmount != null ? String(tx.currencyUsdAmount) : '');
    setEditDescription(tx.description || '');
  };

  const cancelEditTransaction = () => {
    setEditingTx(null);
    setEditActionLoading(false);
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    const localVal = editLocalAmount !== '' && !isNaN(Number(editLocalAmount)) ? Number(editLocalAmount) : null;
    const usdVal = editUsdAmount !== '' && !isNaN(Number(editUsdAmount)) ? Number(editUsdAmount) : null;

    if (localVal === null && usdVal === null) {
      setAlert({ type: 'error', message: `Debes indicar al menos un monto (${localCode} o USD).` });
      return;
    }

    try {
      setEditActionLoading(true);
      setAlert(null);
      await api.updateCashFlowTransaction(getCashFlowId(editingTx), {
        type: editType,
        date: editDate,
        category: editCategory,
        currencyLocalAmount: localVal,
        currencyUsdAmount: usdVal,
        description: editDescription.trim() || undefined,
      });
      showToast('Transacción actualizada correctamente.');
      cancelEditTransaction();
      loadDashboardData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo actualizar la transacción.' });
    } finally {
      setEditActionLoading(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      setAlert(null);
      await api.deleteCashFlowTransaction(getCashFlowId(deleteTarget));
      showToast('Transacción eliminada.');
      setDeleteTarget(null);
      loadDashboardData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo eliminar la transacción.' });
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Ledger: filtro + búsqueda + paginado
  // ---------------------------------------------------------------------------
  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (summary?.transactions || []).filter((tx: any) => {
      if (filterType !== 'ALL' && tx.type !== filterType) return false;
      if (!term) return true;
      const haystack = [
        tx.description,
        tx.category,
        label(cashCategoryLabels, tx.category),
        tx.date,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [summary, searchTerm, filterType]);

  const pagination = usePagination(filteredTransactions, 10);

  useEffect(() => {
    pagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterType]);

  // Serie diaria en USD para el gráfico (ingresos vs egresos)
  const chartData = useMemo(() => {
    const byDate: Record<string, { inflow: number; outflow: number }> = {};
    (summary?.transactions || []).forEach((tx: any) => {
      if (!byDate[tx.date]) byDate[tx.date] = { inflow: 0, outflow: 0 };
      const usd = Number(tx.currencyUsdAmount) || 0;
      if (tx.type === 'INFLOW') byDate[tx.date].inflow += usd;
      else byDate[tx.date].outflow += usd;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, v]) => ({ date, ...v }));
  }, [summary]);

  const chartMax = Math.max(1, ...chartData.flatMap(d => [d.inflow, d.outflow]));

  // Export CSV del ledger filtrado
  const handleExportCsv = () => {
    const rows = [
      ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto USD', `Monto ${localCode}`, 'Tasa'],
      ...filteredTransactions.map((tx: any) => [
        tx.date,
        label(txTypeLabels, tx.type),
        label(cashCategoryLabels, tx.category),
        (tx.description || '').replace(/"/g, '""'),
        Number(tx.currencyUsdAmount).toFixed(2),
        Number(tx.currencyLocalAmount).toFixed(2),
        Number(tx.exchangeRateValue).toFixed(2),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `flujo-caja_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const editCategories = editType === 'INFLOW' ? INFLOW_CATEGORIES : OUTFLOW_CATEGORIES;

  if (!activeRestaurant) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Cargando el perfil del restaurante...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Encabezado */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{activeRestaurant.name}</h1>
          <p className={styles.subtitle}>Libro diario de caja y flujo multi-moneda</p>
        </div>

        {/* Filtro de fechas */}
        <div className={styles.dateFilter}>
          <Calendar size={16} color="var(--text-secondary)" />
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className={styles.dateInput}
            aria-label="Fecha inicial"
          />
          <span style={{ color: 'var(--glass-border)' }}>|</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className={styles.dateInput}
            aria-label="Fecha final"
          />
          <button
            onClick={loadDashboardData}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Actualizar datos"
            aria-label="Actualizar datos"
          >
            <RefreshCw size={14} style={{ marginLeft: 6 }} />
          </button>
        </div>
      </header>

      {/* Aviso de tasa del día */}
      <div
        className={`glass-panel ${styles.exchangeBanner} ${todayRate ? styles.exchangeBannerOk : styles.exchangeBannerWarn}`}
      >
        <div className={styles.exchangeBannerContent}>
          <Coins size={18} color={todayRate ? 'var(--color-usd)' : 'var(--color-danger)'} style={{ flexShrink: 0 }} />
          <span>
            {todayRate ? (
              <>Tasa USD del {todayRateDate ? DateTime.fromISO(todayRateDate).toFormat('dd/LL/yyyy') : DateTime.now().toFormat('dd/LL/yyyy')}: <strong>1,00 USD = {todayRate.toFixed(2)} {localSymbol} ({localCode})</strong></>
            ) : (
              <span style={{ color: 'var(--color-danger)' }}>
                No hay tasa de cambio registrada para hoy ({DateTime.now().toFormat('dd/LL/yyyy')}). Los registros de una sola moneda quedarán bloqueados.
              </span>
            )}
          </span>
        </div>
        {!todayRate && (
          <Button variant="danger" size="sm" onClick={scrollToRateEditor}>
            Registrar tasa de hoy
          </Button>
        )}
      </div>

      {/* Avisos */}
      {alert && (
        <Alert type={alert.type} onDismiss={() => setAlert(null)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {alert.message}
            {alert.type === 'error' && alert.message.includes('tasa de cambio') && (
              <Button variant="secondary" size="sm" onClick={scrollToRateEditor}>
                Ir a registrar tasa
              </Button>
            )}
          </span>
        </Alert>
      )}

      {/* Tarjetas KPI */}
      <section className={styles.kpiGrid}>
        {/* KPI 1: Ingresos */}
        <div className={`${styles.kpiCard} glass-panel`}>
          {loading ? <KpiSkeleton /> : (
            <>
              <div className={styles.kpiLabel}>
                <ArrowUpRight size={16} color="var(--color-usd)" />
                <span>Ingresos totales</span>
              </div>
              <div className={styles.kpiValueRow}>
                <span className={`${styles.currencyVal} ${styles.currencyValUsd}`}>
                  ${fmt(summary?.totalInflowUsd)}
                  <span className={styles.currencyUnit}>USD</span>
                </span>
                <span className={`${styles.currencyVal} ${styles.currencyValVes}`} style={{ fontSize: '1.25rem' }}>
                  {fmt(summary?.totalInflowLocal)}
                  <span className={styles.currencyUnitSm}>{localSymbol}</span>
                </span>
                {(() => {
                  const delta = percentDelta(summary?.totalInflowUsd || 0, prevSummary?.totalInflowUsd || 0);
                  return delta ? (
                    <span className={styles.kpiDelta} style={{ color: delta.startsWith('+') ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {delta} vs. período anterior
                    </span>
                  ) : (
                    <span className={styles.currencySubtext}>Ventas y depósitos recibidos</span>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {/* KPI 2: Egresos */}
        <div className={`${styles.kpiCard} glass-panel`}>
          {loading ? <KpiSkeleton /> : (
            <>
              <div className={styles.kpiLabel}>
                <ArrowDownLeft size={16} color="var(--color-danger)" />
                <span>Egresos totales</span>
              </div>
              <div className={styles.kpiValueRow}>
                <span className={styles.currencyVal} style={{ color: 'var(--color-danger)' }}>
                  ${fmt(summary?.totalOutflowUsd)}
                  <span className={styles.currencyUnit}>USD</span>
                </span>
                <span className={`${styles.currencyVal} ${styles.currencyValVes}`} style={{ fontSize: '1.25rem' }}>
                  {fmt(summary?.totalOutflowLocal)}
                  <span className={styles.currencyUnitSm}>{localSymbol}</span>
                </span>
                {(() => {
                  const delta = percentDelta(summary?.totalOutflowUsd || 0, prevSummary?.totalOutflowUsd || 0);
                  return delta ? (
                    <span className={styles.kpiDelta} style={{ color: delta.startsWith('+') ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {delta} vs. período anterior
                    </span>
                  ) : (
                    <span className={styles.currencySubtext}>Pagos y retiros manuales</span>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {/* KPI 3: Balance neto */}
        <div className={`${styles.kpiCard} glass-panel`}>
          {loading ? <KpiSkeleton /> : (
            <>
              <div className={styles.kpiLabel}>
                <TrendingUp size={16} color="var(--color-primary)" />
                <span>Balance neto</span>
              </div>
              <div className={styles.kpiValueRow}>
                <span
                  className={`${styles.currencyVal} ${summary && summary.netCashFlowUsd >= 0 ? styles.currencyValUsd : ''}`}
                  style={{ color: summary && summary.netCashFlowUsd < 0 ? 'var(--color-danger)' : undefined }}
                >
                  {summary && summary.netCashFlowUsd < 0 ? '-' : ''}${fmt(Math.abs(summary?.netCashFlowUsd || 0))}
                  <span className={styles.currencyUnit}>USD</span>
                </span>
                <span className={`${styles.currencyVal} ${styles.currencyValVes}`} style={{ fontSize: '1.25rem' }}>
                  {summary && summary.netCashFlowLocal < 0 ? '-' : ''}{fmt(Math.abs(summary?.netCashFlowLocal || 0))}
                  <span className={styles.currencyUnitSm}>{localSymbol}</span>
                </span>
                <span className={styles.currencySubtext}>Resultado neto del período</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Gráfico de flujo diario */}
      {!loading && chartData.length > 1 && (
        <section className={`glass-panel ${styles.chartPanel}`}>
          <h2 className={styles.sectionTitle}>
            <BarChart3 size={18} color="var(--color-secondary)" />
            <span>Flujo diario (USD)</span>
          </h2>
          <div className={styles.chartArea} role="img" aria-label="Gráfico de barras de ingresos y egresos diarios en dólares">
            {chartData.map(d => (
              <div key={d.date} className={styles.chartCol} title={`${DateTime.fromISO(d.date).toFormat('dd/LL')}: +$${fmt(d.inflow)} / -$${fmt(d.outflow)}`}>
                <div className={styles.chartBars}>
                  <div
                    className={styles.chartBarIn}
                    style={{ height: `${Math.max(2, (d.inflow / chartMax) * 100)}%` }}
                  />
                  <div
                    className={styles.chartBarOut}
                    style={{ height: `${Math.max(2, (d.outflow / chartMax) * 100)}%` }}
                  />
                </div>
                <span className={styles.chartLabel}>{DateTime.fromISO(d.date).toFormat('dd/LL')}</span>
              </div>
            ))}
          </div>
          <div className={styles.chartLegend}>
            <span><span className={styles.legendDotIn} /> Ingresos</span>
            <span><span className={styles.legendDotOut} /> Egresos</span>
          </div>
        </section>
      )}

      {/* Área de trabajo dividida */}
      <div className={styles.dashboardSplit}>
        {/* Izquierda: libro de transacciones */}
        <section className={`glass-panel ${styles.ledgerPanel}`}>
          <div className={styles.sectionHeader}>
            <h2 className={`${styles.sectionTitle} ${styles.sectionHeaderTitle}`}>
              <FileSpreadsheet size={20} color="var(--color-primary)" />
              <span>Movimientos de caja ({filteredTransactions.length})</span>
            </h2>
            <Button variant="secondary" size="sm" onClick={handleExportCsv} disabled={filteredTransactions.length === 0}>
              <Download size={14} />
              Exportar CSV
            </Button>
          </div>

          {/* Barra de búsqueda y filtros */}
          <div className={styles.ledgerToolbar}>
            <div className={styles.searchBox}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="search"
                placeholder="Buscar por descripción o categoría..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                aria-label="Buscar movimientos"
              />
            </div>
            <div className={styles.filterChips} role="group" aria-label="Filtrar por tipo">
              {([['ALL', 'Todos'], ['INFLOW', 'Ingresos'], ['OUTFLOW', 'Egresos']] as const).map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.chip} ${filterType === value ? styles.chipActive : ''}`}
                  onClick={() => setFilterType(value)}
                  aria-pressed={filterType === value}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={6} />
          ) : filteredTransactions.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet size={36} />}
              message={
                searchTerm || filterType !== 'ALL'
                  ? 'Ningún movimiento coincide con la búsqueda o el filtro aplicado.'
                  : 'No hay movimientos de caja registrados en el rango de fechas seleccionado.'
              }
            />
          ) : (
            <>
              <div className={`${styles.tableWrapper} table-scroll`}>
                <table className={`${styles.table} responsive-table`}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Categoría</th>
                      <th>Descripción</th>
                      <th style={{ textAlign: 'right' }}>Monto (USD)</th>
                      <th style={{ textAlign: 'right' }}>Monto ({localCode})</th>
                      <th style={{ textAlign: 'center' }}>Tasa</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.pageItems.map((tx: any) => (
                      <tr key={tx.id}>
                        <td data-label="Fecha" style={{ fontWeight: 600 }}>{tx.date}</td>
                        <td data-label="Tipo">
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 600,
                            color: tx.type === 'INFLOW' ? 'var(--color-usd)' : 'var(--color-danger)'
                          }}>
                            {tx.type === 'INFLOW' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                            {label(txTypeLabels, tx.type)}
                          </span>
                        </td>
                        <td data-label="Categoría">
                          <span className={styles.categoryBadge}>{label(cashCategoryLabels, tx.category)}</span>
                        </td>
                        <td data-label="Descripción" style={{ color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.description || <em style={{ color: 'var(--text-muted)' }}>Sin descripción</em>}
                        </td>
                        <td data-label="Monto (USD)" style={{ textAlign: 'right', fontWeight: 600 }} className={tx.type === 'INFLOW' ? styles.inflowVal : styles.outflowVal}>
                          {tx.type === 'INFLOW' ? '+' : '-'}${Number(tx.currencyUsdAmount).toFixed(2)}
                        </td>
                        <td data-label={`Monto (${localCode})`} style={{ textAlign: 'right', fontWeight: 600 }} className={tx.type === 'INFLOW' ? styles.inflowVal : styles.outflowVal}>
                          {tx.type === 'INFLOW' ? '+' : '-'}{fmt(tx.currencyLocalAmount)}
                        </td>
                        <td data-label="Tasa" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          {Number(tx.exchangeRateValue).toFixed(2)} {localSymbol}
                        </td>
                        <td data-label="" style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                            <Button variant="secondary" size="sm" onClick={() => startEditTransaction(tx)} title="Editar transacción">
                              <Pencil size={12} />
                              Editar
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => setDeleteTarget(tx)} title="Eliminar transacción">
                              <Trash2 size={12} />
                              Eliminar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                itemsLabel="movimientos"
              />
            </>
          )}
        </section>

        {/* Derecha: widgets de acción rápida */}
        <div className={styles.quickActions}>

          {/* Widget 1: tasa de cambio del día */}
          <section id="rate-editor-section" className="glass-panel panel-section">
            <h2 className={styles.sectionTitle}>
              <Coins size={18} color="var(--color-ves)" />
              <span>Tasa de cambio USD</span>
            </h2>
            <form onSubmit={handleSetRate} className={styles.form}>
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
                <label htmlFor="rate-value" className={styles.label}>Tasa (1 USD en {localCode})</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    id="rate-value"
                    type="number"
                    step="0.01"
                    placeholder="ej. 40,50"
                    value={newRate}
                    onChange={e => setNewRate(e.target.value)}
                    className="glow-input"
                    style={{ flex: 1 }}
                    required
                  />
                  <span style={{ fontWeight: 600 }}>{localSymbol}</span>
                </div>
              </div>
              <Button type="submit" variant="amber" fullWidth loading={rateActionLoading}>
                {rateActionLoading ? 'Guardando...' : 'Fijar tasa del día'}
              </Button>
            </form>
          </section>

          {/* Widget 2: registro manual de caja */}
          <section className="glass-panel panel-section">
            <h2 className={styles.sectionTitle}>
              <Plus size={18} color="var(--color-primary)" />
              <span>Registrar movimiento</span>
            </h2>
            <form onSubmit={handleRecordManualTx} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tipo de movimiento</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} role="group" aria-label="Tipo de movimiento">
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('INFLOW');
                      setTxCategory('SALES_REVENUE');
                    }}
                    className="badge"
                    aria-pressed={txType === 'INFLOW'}
                    style={{
                      justifyContent: 'center',
                      padding: 10,
                      cursor: 'pointer',
                      background: txType === 'INFLOW' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                      borderColor: txType === 'INFLOW' ? 'var(--color-usd)' : 'var(--glass-border)',
                      color: txType === 'INFLOW' ? 'var(--color-usd)' : 'var(--text-secondary)',
                      border: '1px solid',
                      fontFamily: 'inherit'
                    }}
                  >
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('OUTFLOW');
                      setTxCategory('UTILITIES');
                    }}
                    className="badge"
                    aria-pressed={txType === 'OUTFLOW'}
                    style={{
                      justifyContent: 'center',
                      padding: 10,
                      cursor: 'pointer',
                      background: txType === 'OUTFLOW' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.02)',
                      borderColor: txType === 'OUTFLOW' ? 'var(--color-danger)' : 'var(--glass-border)',
                      color: txType === 'OUTFLOW' ? 'var(--color-danger)' : 'var(--text-secondary)',
                      border: '1px solid',
                      fontFamily: 'inherit'
                    }}
                  >
                    Egreso
                  </button>
                </div>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="tx-date" className={styles.label}>Fecha</label>
                  <input
                    id="tx-date"
                    type="date"
                    value={txDate}
                    onChange={e => setTxDate(e.target.value)}
                    className="glow-input"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="tx-category" className={styles.label}>Categoría</label>
                  <select
                    id="tx-category"
                    value={txCategory}
                    onChange={e => setTxCategory(e.target.value)}
                    className="glow-select"
                  >
                    {(txType === 'INFLOW' ? INFLOW_CATEGORIES : OUTFLOW_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cashCategoryLabels[cat]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Montos con conversión dual */}
              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="tx-usd" className={styles.label} style={{ color: 'var(--color-usd)' }}>Monto USD ($)</label>
                  <input
                    id="tx-usd"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={txUsdAmount}
                    onChange={e => handleUsdChange(e.target.value)}
                    className="glow-input"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="tx-local" className={styles.label} style={{ color: 'var(--color-ves)' }}>Monto {localCode} ({localSymbol})</label>
                  <input
                    id="tx-local"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={txLocalAmount}
                    onChange={e => handleLocalChange(e.target.value)}
                    className="glow-input"
                  />
                </div>
              </div>

              {/* Estado de la conversión */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
                {fetchingDateRate ? (
                  <span>Consultando historial de tasas...</span>
                ) : selectedDateRate ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowRightLeft size={10} color="var(--color-primary)" />
                    Conversión con la tasa del {txDate}: <strong>1 USD = {selectedDateRate.toFixed(2)} {localSymbol}</strong>
                  </span>
                ) : todayRate ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowRightLeft size={10} color="var(--color-primary)" />
                    Sin tasa para el {txDate}. Se usa la más reciente: <strong>1 USD = {todayRate.toFixed(2)} {localSymbol}</strong>
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                    No existe tasa para el {txDate}. Debes llenar ambos montos manualmente.
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="tx-desc" className={styles.label}>Descripción</label>
                <input
                  id="tx-desc"
                  type="text"
                  placeholder="ej. Pago de luz mayo"
                  value={txDescription}
                  onChange={e => setTxDescription(e.target.value)}
                  className="glow-input"
                />
              </div>

              <Button type="submit" fullWidth loading={txActionLoading}>
                <Plus size={16} />
                {txActionLoading ? 'Registrando...' : 'Registrar movimiento'}
              </Button>
            </form>
          </section>
        </div>
      </div>

      {/* Modal de edición de transacción */}
      {editingTx && (
        <Modal title="Editar transacción" onClose={cancelEditTransaction}>
          <form onSubmit={handleUpdateTransaction} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="edit-type" className={styles.label}>Tipo</label>
                <select
                  id="edit-type"
                  value={editType}
                  onChange={e => setEditType(e.target.value as any)}
                  className="glow-select"
                  required
                >
                  <option value="INFLOW">Ingreso</option>
                  <option value="OUTFLOW">Egreso</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-date" className={styles.label}>Fecha</label>
                <input id="edit-date" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="glow-input" required />
              </div>

              <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                <label htmlFor="edit-category" className={styles.label}>Categoría</label>
                <select
                  id="edit-category"
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="glow-select"
                  required
                >
                  {/* Conservar la categoría actual aunque no esté en el listado estándar */}
                  {!editCategories.includes(editCategory) && editCategory && (
                    <option value={editCategory}>{label(cashCategoryLabels, editCategory)}</option>
                  )}
                  {editCategories.map(cat => (
                    <option key={cat} value={cat}>{cashCategoryLabels[cat]}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-local" className={styles.label}>Monto ({localCode})</label>
                <input id="edit-local" type="number" step="0.01" value={editLocalAmount} onChange={e => setEditLocalAmount(e.target.value)} className="glow-input" />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-usd" className={styles.label}>Monto (USD)</label>
                <input id="edit-usd" type="number" step="0.01" value={editUsdAmount} onChange={e => setEditUsdAmount(e.target.value)} className="glow-input" />
              </div>

              <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                <label htmlFor="edit-desc" className={styles.label}>Descripción</label>
                <input id="edit-desc" value={editDescription} onChange={e => setEditDescription(e.target.value)} className="glow-input" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <Button variant="secondary" onClick={cancelEditTransaction} disabled={editActionLoading}>
                Cancelar
              </Button>
              <Button type="submit" loading={editActionLoading}>
                {editActionLoading ? 'Actualizando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmación de eliminación */}
      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar transacción"
          message={
            <>
              ¿Eliminar el movimiento del <strong>{deleteTarget.date}</strong> por{' '}
              <strong>${Number(deleteTarget.currencyUsdAmount).toFixed(2)} USD</strong>?
              Esta acción no se puede deshacer.
            </>
          }
          confirmLabel="Eliminar"
          loading={deleteLoading}
          onConfirm={handleDeleteTransaction}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
export default Dashboard;
