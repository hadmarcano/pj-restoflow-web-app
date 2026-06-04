import React, { useEffect, useState } from 'react';
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
  DollarSign, 
  ArrowRightLeft,
  Loader2,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
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

export const Dashboard: React.FC = () => {
  const { activeRestaurant } = useAuth();
  
  // Date Range (default: past 7 days up to today)
  const [startDate, setStartDate] = useState(() =>
    DateTime.now().minus({ days: 7 }).toFormat('yyyy-LL-dd')
  );
  const [endDate, setEndDate] = useState(() => DateTime.now().toFormat('yyyy-LL-dd'));
  
  // States
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [todayRate, setTodayRate] = useState<number | null>(null);
  const [todayRateDate, setTodayRateDate] = useState<string | null>(null);
  
  // Daily Exchange Rate Widget State
  const [rateDate, setRateDate] = useState(DateTime.now().toFormat('yyyy-LL-dd'));
  const [newRate, setNewRate] = useState('');
  const [rateActionLoading, setRateActionLoading] = useState(false);
  
  // Manual Transaction State
  const [txType, setTxType] = useState<'INFLOW' | 'OUTFLOW'>('INFLOW');
  const [txDate, setTxDate] = useState(DateTime.now().toFormat('yyyy-LL-dd'));
  const [txCategory, setTxCategory] = useState('SALES_REVENUE');
  const [txLocalAmount, setTxLocalAmount] = useState('');
  const [txUsdAmount, setTxUsdAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txActionLoading, setTxActionLoading] = useState(false);

  // Edit Transaction State (table actions)
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editType, setEditType] = useState<'INFLOW' | 'OUTFLOW'>('INFLOW');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLocalAmount, setEditLocalAmount] = useState('');
  const [editUsdAmount, setEditUsdAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editActionLoading, setEditActionLoading] = useState(false);

  // Exchange rate for selected transaction date
  const [selectedDateRate, setSelectedDateRate] = useState<number | null>(null);
  const [fetchingDateRate, setFetchingDateRate] = useState(false);

  // Success / Error Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const localCode = activeRestaurant?.localCurrencyCode || 'VES';
  const localSymbol = activeRestaurant?.localCurrencySymbol || 'Bs';

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, ratesList] = await Promise.all([
        api.getCashFlowSummary(startDate, endDate),
        api.getExchangeRates()
      ]);

      setSummary(sumRes);
      
      // Prefer today's rate; otherwise fall back to latest available.
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
      setAlert({ type: 'error', message: err?.message || 'Failed to load dashboard summaries.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRestaurant) {
      loadDashboardData();
    }
  }, [activeRestaurant, startDate, endDate]);

  // Fetch exchange rate on-the-fly when manual transaction date changes
  useEffect(() => {
    const checkDateRate = async () => {
      if (!txDate) return;
      try {
        setFetchingDateRate(true);
        const res = await api.getRateByDate(txDate);
        if (res && res.rateUsdToLocal) {
          setSelectedDateRate(Number(res.rateUsdToLocal));
        } else {
          setSelectedDateRate(null);
        }
      } catch (e) {
        setSelectedDateRate(null);
      } finally {
        setFetchingDateRate(false);
      }
    };
    checkDateRate();
  }, [txDate]);

  // Real-time calculation conversions
  const handleUsdChange = (val: string) => {
    setTxUsdAmount(val);
    if (!val || isNaN(Number(val))) {
      setTxLocalAmount('');
      return;
    }
    const usd = Number(val);
    const activeRate = selectedDateRate || todayRate;
    if (activeRate) {
      setTxLocalAmount((usd * activeRate).toFixed(2));
    }
  };

  const handleLocalChange = (val: string) => {
    setTxLocalAmount(val);
    if (!val || isNaN(Number(val))) {
      setTxUsdAmount('');
      return;
    }
    const local = Number(val);
    const activeRate = selectedDateRate || todayRate;
    if (activeRate && activeRate > 0) {
      setTxUsdAmount((local / activeRate).toFixed(2));
    }
  };

  const handleSetRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRate || isNaN(Number(newRate))) {
      setAlert({ type: 'error', message: 'Please enter a valid exchange rate' });
      return;
    }

    try {
      setRateActionLoading(true);
      setAlert(null);
      await api.setExchangeRate(rateDate, Number(newRate));
      setAlert({ type: 'success', message: `USD Exchange Rate set to ${newRate} ${localSymbol} for date ${rateDate}!` });
      setNewRate('');
      loadDashboardData(); // Refresh summary and rates
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to register exchange rate.' });
    } finally {
      setRateActionLoading(false);
    }
  };

  const handleRecordManualTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const localVal = txLocalAmount ? Number(txLocalAmount) : null;
    const usdVal = txUsdAmount ? Number(txUsdAmount) : null;

    if (localVal === null && usdVal === null) {
      setAlert({ type: 'error', message: 'You must specify at least one amount (Local VES or USD)' });
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

      setAlert({ type: 'success', message: 'Manual cash flow transaction registered successfully!' });
      
      // Clear forms
      setTxLocalAmount('');
      setTxUsdAmount('');
      setTxDescription('');
      
      // Refresh summary
      loadDashboardData();
    } catch (err: any) {
      if (err?.error === 'EXCHANGE_RATE_REQUIRED') {
        setAlert({ 
          type: 'error', 
          message: `Single-currency inputs strictly require a registered Exchange Rate on that date. No rate found for ${txDate}. Set the Exchange Rate below first!` 
        });
      } else {
        setAlert({ type: 'error', message: err?.message || 'Failed to record manual cash flow' });
      }
    } finally {
      setTxActionLoading(false);
    }
  };

  const getCashFlowId = (tx: any) => (tx?.referenceId || tx?.id) as string;

  const startEditTransaction = (tx: any) => {
    const id = getCashFlowId(tx);
    setEditingTxId(id);
    setEditType(tx.type);
    setEditDate(tx.date);
    setEditCategory(tx.category);
    setEditLocalAmount(tx.currencyLocalAmount != null ? String(tx.currencyLocalAmount) : '');
    setEditUsdAmount(tx.currencyUsdAmount != null ? String(tx.currencyUsdAmount) : '');
    setEditDescription(tx.description || '');
  };

  const cancelEditTransaction = () => {
    setEditingTxId(null);
    setEditActionLoading(false);
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxId) return;

    const localVal = editLocalAmount !== '' && !isNaN(Number(editLocalAmount)) ? Number(editLocalAmount) : null;
    const usdVal = editUsdAmount !== '' && !isNaN(Number(editUsdAmount)) ? Number(editUsdAmount) : null;

    if (localVal === null && usdVal === null) {
      setAlert({ type: 'error', message: 'You must specify at least one amount (Local or USD)' });
      return;
    }

    try {
      setEditActionLoading(true);
      setAlert(null);
      await api.updateCashFlowTransaction(editingTxId, {
        type: editType,
        date: editDate,
        category: editCategory,
        currencyLocalAmount: localVal,
        currencyUsdAmount: usdVal,
        description: editDescription.trim() || undefined,
      });
      setAlert({ type: 'success', message: 'Transaction updated successfully.' });
      cancelEditTransaction();
      loadDashboardData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to update transaction.' });
    } finally {
      setEditActionLoading(false);
    }
  };

  const handleDeleteTransaction = async (tx: any) => {
    const id = getCashFlowId(tx);
    const ok = window.confirm('Delete this transaction? This cannot be undone.');
    if (!ok) return;

    try {
      setAlert(null);
      await api.deleteCashFlowTransaction(id);
      setAlert({ type: 'success', message: 'Transaction deleted successfully.' });
      loadDashboardData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to delete transaction.' });
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
      {/* Top Title Bar */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{activeRestaurant.name}</h1>
          <p className={styles.subtitle}>Daily Cash Ledger & Multi-Currency Flow Management</p>
        </div>

        {/* Date Filters */}
        <div className={styles.dateFilter}>
          <Calendar size={16} color="var(--text-secondary)" />
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            className={styles.dateInput} 
          />
          <span style={{ color: 'var(--glass-border)' }}>|</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            className={styles.dateInput} 
          />
          <button 
            onClick={loadDashboardData}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Refresh Ledger"
          >
            <RefreshCw size={14} style={{ marginLeft: 6 }} />
          </button>
        </div>
      </header>

      {/* Today's Exchange Rate Alert */}
      <div 
        className={`glass-panel ${styles.exchangeBanner} ${todayRate ? styles.exchangeBannerOk : styles.exchangeBannerWarn}`}
      >
        <div className={styles.exchangeBannerContent}>
          <Coins size={18} color={todayRate ? 'var(--color-usd)' : '#ef4444'} style={{ flexShrink: 0 }} />
          <span>
            {todayRate ? (
              <>Today's USD exchange rate ({todayRateDate ? DateTime.fromISO(todayRateDate).toFormat('dd/LL/yyyy') : DateTime.now().toFormat('dd/LL/yyyy')}) is locked at <strong>1.00 USD = {todayRate.toFixed(2)} {localSymbol} ({localCode})</strong></>
            ) : (
              <span style={{ color: '#ef4444' }}>Warning: No exchange rate is configured for today ({DateTime.now().toFormat('dd/LL/yyyy')}). Single-currency entries will be blocked.</span>
            )}
          </span>
        </div>
        {!todayRate && (
          <button 
            onClick={() => {
              setRateDate(DateTime.now().toFormat('yyyy-LL-dd'));
              const rateInput = document.querySelector('#rate-editor-section');
              if (rateInput) rateInput.scrollIntoView({ behavior: 'smooth' });
            }}
            className="badge badge-pending"
            style={{ cursor: 'pointer', border: '1px solid #ef4444', flexShrink: 0 }}
          >
            Set Today's Rate
          </button>
        )}
      </div>

      {/* Success/Error notifications */}
      {alert && (
        <div className={`${styles.alertBanner} ${alert.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} className={styles.alertDismiss} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <section className={styles.kpiGrid}>
        {/* KPI 1: Inflows */}
        <div className={`${styles.kpiCard} glass-panel`}>
          <div className={styles.kpiLabel}>
            <ArrowUpRight size={16} color="var(--color-usd)" />
            <span>Total Inflows</span>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={`${styles.currencyVal} ${styles.currencyValUsd}`}>
              ${summary?.totalInflowUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>USD</span>
            </span>
            <span className={`${styles.currencyVal} ${styles.currencyValVes}`} style={{ fontSize: '1.25rem' }}>
              {summary?.totalInflowLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{localSymbol}</span>
            </span>
            <span className={styles.currencySubtext}>Received revenues and deposits</span>
          </div>
        </div>

        {/* KPI 2: Outflows */}
        <div className={`${styles.kpiCard} glass-panel`}>
          <div className={styles.kpiLabel}>
            <ArrowDownLeft size={16} color="#ef4444" />
            <span>Total Outflows</span>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={`${styles.currencyVal}`} style={{ color: '#ef4444' }}>
              ${summary?.totalOutflowUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>USD</span>
            </span>
            <span className={`${styles.currencyVal} ${styles.currencyValVes}`} style={{ fontSize: '1.25rem' }}>
              {summary?.totalOutflowLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{localSymbol}</span>
            </span>
            <span className={styles.currencySubtext}>Payments & manual withdrawals</span>
          </div>
        </div>

        {/* KPI 3: Net Cash Balance */}
        <div className={`${styles.kpiCard} glass-panel`}>
          <div className={styles.kpiLabel}>
            <TrendingUp size={16} color="var(--color-primary)" />
            <span>Net Balance</span>

          </div>
          <div className={styles.kpiValueRow}>
            <span className={`${styles.currencyVal} ${summary && summary.netCashFlowUsd >= 0 ? styles.currencyValUsd : ''}`} style={{ color: summary && summary.netCashFlowUsd < 0 ? '#ef4444' : undefined }}>
              {summary && summary.netCashFlowUsd < 0 ? '-' : ''}${Math.abs(summary?.netCashFlowUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>USD</span>
            </span>
            <span className={`${styles.currencyVal} ${styles.currencyValVes}`} style={{ fontSize: '1.25rem' }}>
              {summary && summary.netCashFlowLocal < 0 ? '-' : ''}{Math.abs(summary?.netCashFlowLocal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{localSymbol}</span>
            </span>
            <span className={styles.currencySubtext}>Calculated net ledger status</span>
          </div>
        </div>
      </section>

      {/* Main Dashboard Workspace split */}
      <div className={styles.dashboardSplit}>
        {/* Left Side: Recent Transactions Table */}
        <section className={`glass-panel ${styles.ledgerPanel}`}>
          <div className={styles.sectionHeader}>
            <h2 className={`${styles.sectionTitle} ${styles.sectionHeaderTitle}`}>
              <FileSpreadsheet size={20} color="var(--color-primary)" />
              <span>Recent Cash Flow Ledger ({summary?.transactions.length || 0})</span>
            </h2>
            <span className="badge badge-paid" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
              Period Transactions
            </span>
          </div>

          {editingTxId && (
            <form onSubmit={handleUpdateTransaction} className="glass-panel panel-section" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700 }}>Edit transaction</div>
                <button type="button" onClick={cancelEditTransaction} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Type</label>
                  <select value={editType} onChange={e => setEditType(e.target.value as any)} className="glow-select" required>
                    <option value="INFLOW">INFLOW</option>
                    <option value="OUTFLOW">OUTFLOW</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Date</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="glow-input" required />
                </div>

                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.label}>Category</label>
                  <input value={editCategory} onChange={e => setEditCategory(e.target.value)} className="glow-input" required />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Amount ({localCode})</label>
                  <input type="number" step="0.01" value={editLocalAmount} onChange={e => setEditLocalAmount(e.target.value)} className="glow-input" />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Amount (USD)</label>
                  <input type="number" step="0.01" value={editUsdAmount} onChange={e => setEditUsdAmount(e.target.value)} className="glow-input" />
                </div>

                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.label}>Description</label>
                  <input value={editDescription} onChange={e => setEditDescription(e.target.value)} className="glow-input" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="submit" className={styles.btnSubmit} disabled={editActionLoading}>
                  {editActionLoading ? 'Updating...' : 'Update Transaction'}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Loading ledger transactions...</p>
            </div>
          ) : !summary || summary.transactions.length === 0 ? (
            <div className={styles.emptyState}>
              No cash transactions registered within selected dates.
            </div>
          ) : (
            <div className={`${styles.tableWrapper} table-scroll`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount (USD)</th>
                    <th style={{ textAlign: 'right' }}>Amount ({localCode})</th>
                    <th style={{ textAlign: 'center' }}>Rate Used</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.transactions.map((tx: any) => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 600 }}>{tx.date}</td>
                      <td>
                        <span style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 4, 
                          fontWeight: 600, 
                          color: tx.type === 'INFLOW' ? 'var(--color-usd)' : '#ef4444' 
                        }}>
                          {tx.type === 'INFLOW' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                          {tx.type}
                        </span>
                      </td>
                      <td>
                        <span className={styles.categoryBadge}>{tx.category}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.description || <em style={{ color: 'var(--text-muted)' }}>No description</em>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className={tx.type === 'INFLOW' ? styles.inflowVal : styles.outflowVal}>
                        {tx.type === 'INFLOW' ? '+' : '-'}${Number(tx.currencyUsdAmount).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className={tx.type === 'INFLOW' ? styles.inflowVal : styles.outflowVal}>
                        {tx.type === 'INFLOW' ? '+' : '-'}{Number(tx.currencyLocalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {Number(tx.exchangeRateValue).toFixed(2)} Bs
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => startEditTransaction(tx)}
                            className="badge"
                            style={{ cursor: 'pointer', background: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.35)' }}
                            title="Edit transaction"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(tx)}
                            className="badge"
                            style={{ cursor: 'pointer', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' }}
                            title="Delete transaction"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right Side: Quick Action Widgets */}
        <div className={styles.quickActions}>
          
          {/* Widget 1: Daily Exchange Rate Editor */}
          <section id="rate-editor-section" className="glass-panel" style={{ padding: 24 }}>
            <h2 className={styles.sectionTitle}>
              <Coins size={18} color="var(--color-ves)" />
              <span>USD Exchange Rate</span>
            </h2>
            <form onSubmit={handleSetRate} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Rate Date</label>
                <input 
                  type="date" 
                  value={rateDate}
                  onChange={e => setRateDate(e.target.value)}
                  className="glow-input"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Rate (1 USD to {localCode})</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="e.g. 40.50" 
                    value={newRate}
                    onChange={e => setNewRate(e.target.value)}
                    className="glow-input"
                    style={{ flex: 1 }}
                    required
                  />
                  <span style={{ fontWeight: 600 }}>{localSymbol}</span>
                </div>
              </div>
              <button type="submit" className={styles.btnSubmit} style={{ background: 'linear-gradient(135deg, var(--color-ves) 0%, #d97706 100%)' }} disabled={rateActionLoading}>
                {rateActionLoading ? 'Saving Rate...' : 'Lock Exchange Rate'}
              </button>
            </form>
          </section>

          {/* Widget 2: Manual Flow Entry Form */}
          <section className="glass-panel" style={{ padding: 24 }}>
            <h2 className={styles.sectionTitle}>
              <Plus size={18} color="var(--color-primary)" />
              <span>Record Manual Cash</span>
            </h2>
            <form onSubmit={handleRecordManualTx} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Transaction Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      setTxType('INFLOW');
                      setTxCategory('SALES_REVENUE');
                    }}
                    className="badge"
                    style={{ 
                      justifyContent: 'center', 
                      padding: 10,
                      cursor: 'pointer',
                      background: txType === 'INFLOW' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                      borderColor: txType === 'INFLOW' ? 'var(--color-usd)' : 'var(--glass-border)',
                      color: txType === 'INFLOW' ? 'var(--color-usd)' : 'var(--text-secondary)'
                    }}
                  >
                    INFLOW (Revenue)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setTxType('OUTFLOW');
                      setTxCategory('UTILITIES');
                    }}
                    className="badge"
                    style={{ 
                      justifyContent: 'center', 
                      padding: 10,
                      cursor: 'pointer',
                      background: txType === 'OUTFLOW' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.02)',
                      borderColor: txType === 'OUTFLOW' ? '#ef4444' : 'var(--glass-border)',
                      color: txType === 'OUTFLOW' ? '#ef4444' : 'var(--text-secondary)'
                    }}
                  >
                    OUTFLOW (Expense)
                  </button>
                </div>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Date</label>
                  <input 
                    type="date" 
                    value={txDate} 
                    onChange={e => setTxDate(e.target.value)} 
                    className="glow-input"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Category</label>
                  {txType === 'INFLOW' ? (
                    <select 
                      value={txCategory} 
                      onChange={e => setTxCategory(e.target.value)}
                      className="glow-select"
                    >
                      <option value="SALES_REVENUE">Sales Revenue</option>
                      <option value="INVESTMENT">Capital Investment</option>
                      <option value="MANUAL_INFLOW">Other Revenue</option>
                    </select>
                  ) : (
                    <select 
                      value={txCategory} 
                      onChange={e => setTxCategory(e.target.value)}
                      className="glow-select"
                    >
                      <option value="UTILITIES">Utilities (Electricity, Water)</option>
                      <option value="RENT">Rent / Lease</option>
                      <option value="SALARIES">Staff Salaries</option>
                      <option value="INGREDIENTS">Ingredients purchase</option>
                      <option value="MARKETING">Marketing & Promo</option>
                      <option value="TAXES">Taxes</option>
                      <option value="OTHER_EXPENSE">Other Expense</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Amount dual conversion inputs */}
              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ color: 'var(--color-usd)' }}>Amount USD ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    value={txUsdAmount} 
                    onChange={e => handleUsdChange(e.target.value)} 
                    className="glow-input"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ color: 'var(--color-ves)' }}>Amount {localCode} ({localSymbol})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    value={txLocalAmount} 
                    onChange={e => handleLocalChange(e.target.value)} 
                    className="glow-input"
                  />
                </div>
              </div>

              {/* Converter status preview */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
                {fetchingDateRate ? (
                  <span>Checking exchange rate history...</span>
                ) : selectedDateRate ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowRightLeft size={10} color="var(--color-primary)" />
                    Calculated using rate for {txDate}: <strong>1 USD = {selectedDateRate.toFixed(2)} {localSymbol}</strong>
                  </span>
                ) : todayRate ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowRightLeft size={10} color="var(--color-primary)" />
                    No rate found for {txDate}. Using today's rate: <strong>1 USD = {todayRate.toFixed(2)} {localSymbol}</strong>
                  </span>
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>
                    ⚠️ No Exchange Rate exists for {txDate}. Both values MUST be filled manually!
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Pago de luz Mayo" 
                  value={txDescription} 
                  onChange={e => setTxDescription(e.target.value)} 
                  className="glow-input"
                />
              </div>

              <button type="submit" className={styles.btnSubmit} disabled={txActionLoading}>
                <Plus size={16} />
                <span>{txActionLoading ? 'Recording...' : 'Record cash transaction'}</span>
              </button>
            </form>
          </section>

        </div>
      </div>
    </div>
  );
};
export default Dashboard;
