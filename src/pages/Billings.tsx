import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Receipt, 
  Users, 
  Plus, 
  Search, 
  PlusCircle, 
  Trash2, 
  Calendar, 
  Check, 
  AlertCircle,
  Eye,
  Loader2,
  DollarSign,
  Briefcase,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Pencil
} from 'lucide-react';

import styles from './Billings.module.css';
import { DateTime } from 'luxon';

interface Provider {
  id: string;
  name: string;
  taxId: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
}

interface Billing {
  id: string;
  providerId: string;
  providerName: string;
  billingNumber: string;
  issueDate: string;
  dueDate: string;
  currencyLocalAmount: number | null;
  currencyUsdAmount: number | null;
  exchangeRateValue: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';
  description?: string;
  provider?: Provider;
  createdAt: string;
}

export const Billings: React.FC = () => {
  const { activeRestaurant } = useAuth();
  
  // Tabs: 'billings' | 'providers'
  const [activeTab, setActiveTab] = useState<'billings' | 'providers'>('billings');

  // Lists
  const [billings, setBillings] = useState<Billing[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded Billings (to view payments)
  const [expandedBillingId, setExpandedBillingId] = useState<string | null>(null);
  const [billingPayments, setBillingPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Modals States
  const [showBillModal, setShowBillModal] = useState(false);
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);

  // Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ---------------------------------------------------------------------------
  // FORM STATES
  // ---------------------------------------------------------------------------
  // 1. Add Billing Form
  const [billProviderId, setBillProviderId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billIssueDate, setBillIssueDate] = useState(DateTime.now().toFormat('yyyy-LL-dd'))
  const [billDueDate, setBillDueDate] = useState(DateTime.now().plus({ days: 30 }).toFormat('yyyy-LL-dd'));
  const [billLocalAmount, setBillLocalAmount] = useState('');
  const [billUsdAmount, setBillUsdAmount] = useState('');
  const [billDesc, setBillDesc] = useState('');
  const [billSubmitLoading, setBillSubmitLoading] = useState(false);
  const [billDateRate, setBillDateRate] = useState<number | null>(null);

  // 1b. Edit Billing Form
  const [editTargetBill, setEditTargetBill] = useState<Billing | null>(null);
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editLocalAmount, setEditLocalAmount] = useState('');
  const [editUsdAmount, setEditUsdAmount] = useState('');
  const [editStatus, setEditStatus] = useState<Billing['status']>('PENDING');
  const [editDesc, setEditDesc] = useState('');
  const [editSubmitLoading, setEditSubmitLoading] = useState(false);
  const [editDateRate, setEditDateRate] = useState<number | null>(null);

  // 2. Add Payment Form
  const [payTargetBill, setPayTargetBill] = useState<Billing | null>(null);
  const [payDate, setPayDate] = useState(DateTime.now().toFormat('yyyy-LL-dd'));
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payLocalAmount, setPayLocalAmount] = useState('');
  const [payUsdAmount, setPayUsdAmount] = useState('');
  const [paySubmitLoading, setPaySubmitLoading] = useState(false);
  const [payDateRate, setPayDateRate] = useState<number | null>(null);

  // 3. Register Provider Form
  const [provName, setProvName] = useState('');
  const [provTaxId, setProvTaxId] = useState('');
  const [provContact, setProvContact] = useState('');
  const [provPhone, setProvPhone] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provAddr, setProvAddr] = useState('');
  const [provSubmitLoading, setProvSubmitLoading] = useState(false);

  const localCode = activeRestaurant?.localCurrencyCode || 'VES';
  const localSymbol = activeRestaurant?.localCurrencySymbol || 'Bs';

  const loadData = async () => {
    try {
      setLoading(true);
      const [billList, provList] = await Promise.all([
        api.getBillings(),
        api.getProviders()
      ]);
      setBillings(billList);
      setProviders(provList);
      
      if (provList.length > 0) {
        setBillProviderId(provList[0].id);
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to load restaurant billings directory.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRestaurant) {
      loadData();
    }
  }, [activeRestaurant]);

  // Track exchange rates on-the-fly for invoice generation
  useEffect(() => {
    const fetchBillDateRate = async () => {
      if (!billIssueDate) return;
      try {
        const res = await api.getRateByDate(billIssueDate);
        if (res && res.rateUsdToLocal) {
          setBillDateRate(Number(res.rateUsdToLocal));
        } else {
          setBillDateRate(null);
        }
      } catch (e) {
        setBillDateRate(null);
      }
    };
    fetchBillDateRate();
  }, [billIssueDate]);

  useEffect(() => {
    const fetchEditDateRate = async () => {
      if (!editIssueDate) return;
      try {
        const res = await api.getRateByDate(editIssueDate);
        if (res && res.rateUsdToLocal) {
          setEditDateRate(Number(res.rateUsdToLocal));
        } else {
          setEditDateRate(null);
        }
      } catch (e) {
        setEditDateRate(null);
      }
    };
    fetchEditDateRate();
  }, [editIssueDate]);

  // Track exchange rates on-the-fly for payments
  useEffect(() => {
    const fetchPayDateRate = async () => {
      if (!payDate) return;
      try {
        const res = await api.getRateByDate(payDate);
        if (res && res.rateUsdToLocal) {
          setPayDateRate(Number(res.rateUsdToLocal));
        } else {
          setPayDateRate(null);
        }
      } catch (e) {
        setPayDateRate(null);
      }
    };
    fetchPayDateRate();
  }, [payDate]);

  // Auto-fill conversions for Billing entry
  const handleBillUsdChange = (val: string) => {
    setBillUsdAmount(val);
    if (!val || isNaN(Number(val)) || !billDateRate) {
      setBillLocalAmount('');
      return;
    }
    setBillLocalAmount((Number(val) * billDateRate).toFixed(2));
  };

  const handleBillLocalChange = (val: string) => {
    setBillLocalAmount(val);
    if (!val || isNaN(Number(val)) || !billDateRate) {
      setBillUsdAmount('');
      return;
    }
    setBillUsdAmount((Number(val) / billDateRate).toFixed(2));
  };

  const handleEditUsdChange = (val: string) => {
    setEditUsdAmount(val);
    if (!val || isNaN(Number(val)) || !editDateRate) {
      setEditLocalAmount('');
      return;
    }
    setEditLocalAmount((Number(val) * editDateRate).toFixed(2));
  };

  const handleEditLocalChange = (val: string) => {
    setEditLocalAmount(val);
    if (!val || isNaN(Number(val)) || !editDateRate) {
      setEditUsdAmount('');
      return;
    }
    setEditUsdAmount((Number(val) / editDateRate).toFixed(2));
  };

  // Auto-fill conversions for Payment entry
  const handlePayUsdChange = (val: string) => {
    setPayUsdAmount(val);
    if (!val || isNaN(Number(val)) || !payDateRate) {
      setPayLocalAmount('');
      return;
    }
    setPayLocalAmount((Number(val) * payDateRate).toFixed(2));
  };

  const handlePayLocalChange = (val: string) => {
    setPayLocalAmount(val);
    if (!val || isNaN(Number(val)) || !payDateRate) {
      setPayUsdAmount('');
      return;
    }
    setPayUsdAmount((Number(val) / payDateRate).toFixed(2));
  };

  // Lazy-load nested payments list for a billing
  const handleToggleExpandBilling = async (billingId: string) => {
    if (expandedBillingId === billingId) {
      setExpandedBillingId(null);
      setBillingPayments([]);
      return;
    }

    try {
      setExpandedBillingId(billingId);
      setLoadingPayments(true);
      const payments = await api.getPaymentsByBilling(billingId);
      setBillingPayments(payments);
    } catch (e) {
      setBillingPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SUBMISSIONS
  // ---------------------------------------------------------------------------
  const handleSubmitBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    const localVal = billLocalAmount ? Number(billLocalAmount) : null;
    const usdVal = billUsdAmount ? Number(billUsdAmount) : null;

    if (!billProviderId) {
      setAlert({ type: 'error', message: 'Please select a provider first. Create one in the Providers Tab if missing!' });
      return;
    }

    if (localVal === null && usdVal === null) {
      setAlert({ type: 'error', message: 'At least one currency amount (USD or local VES) is required' });
      return;
    }

    try {
      setBillSubmitLoading(true);
      setAlert(null);

      await api.createBilling({
        providerId: billProviderId,
        billingNumber: billNumber.trim(),
        issueDate: billIssueDate,
        dueDate: billDueDate,
        currencyLocalAmount: localVal,
        currencyUsdAmount: usdVal,
        description: billDesc.trim() || undefined
      });

      setAlert({ type: 'success', message: `Invoice ${billNumber} registered successfully!` });
      setShowBillModal(false);
      
      // Clear Form
      setBillNumber('');
      setBillLocalAmount('');
      setBillUsdAmount('');
      setBillDesc('');

      loadData();
    } catch (err: any) {
      if (err?.error === 'EXCHANGE_RATE_REQUIRED') {
        setAlert({ 
          type: 'error', 
          message: `Single-currency invoice inputs strictly require an exchange rate on that date. No rate found for ${billIssueDate}. Enter both values or set exchange rate first!` 
        });
      } else {
        setAlert({ type: 'error', message: err?.message || 'Failed to register invoice' });
      }
    } finally {
      setBillSubmitLoading(false);
    }
  };

  const openEditBilling = (bill: Billing) => {
    setEditTargetBill(bill);
    setEditIssueDate(bill.issueDate);
    setEditDueDate(bill.dueDate);
    setEditLocalAmount(bill.currencyLocalAmount != null ? String(bill.currencyLocalAmount) : '');
    setEditUsdAmount(bill.currencyUsdAmount != null ? String(bill.currencyUsdAmount) : '');
    setEditStatus(bill.status);
    setEditDesc(bill.description || '');
    setShowEditBillModal(true);
  };

  const closeEditBilling = () => {
    setShowEditBillModal(false);
    setEditTargetBill(null);
    setEditSubmitLoading(false);
  };

  const handleSubmitEditBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetBill) return;

    const localVal = editLocalAmount ? Number(editLocalAmount) : null;
    const usdVal = editUsdAmount ? Number(editUsdAmount) : null;

    if (localVal === null && usdVal === null) {
      setAlert({ type: 'error', message: 'At least one currency amount (USD or local) is required' });
      return;
    }

    try {
      setEditSubmitLoading(true);
      setAlert(null);

      await api.updateBilling(editTargetBill.id, {
        issueDate: editIssueDate,
        dueDate: editDueDate,
        currencyLocalAmount: localVal,
        currencyUsdAmount: usdVal,
        status: editStatus,
        description: editDesc.trim() || undefined,
      });

      setAlert({ type: 'success', message: `Invoice ${editTargetBill.billingNumber} updated successfully.` });
      closeEditBilling();
      loadData();
    } catch (err: any) {
      if (err?.error === 'EXCHANGE_RATE_REQUIRED') {
        setAlert({
          type: 'error',
          message: `Single-currency updates require an exchange rate on that date. No rate found for ${editIssueDate}. Enter both values or set exchange rate first!`,
        });
      } else {
        setAlert({ type: 'error', message: err?.message || 'Failed to update invoice.' });
      }
    } finally {
      setEditSubmitLoading(false);
    }
  };

  const handleDeleteBilling = async (bill: Billing) => {
    if (!window.confirm(`Delete invoice "${bill.billingNumber}"? This will also remove linked payments.`)) return;

    try {
      setAlert(null);
      await api.deleteBilling(bill.id);
      if (expandedBillingId === bill.id) {
        setExpandedBillingId(null);
        setBillingPayments([]);
      }
      setAlert({ type: 'success', message: `Invoice ${bill.billingNumber} deleted.` });
      loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to delete invoice.' });
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTargetBill) return;

    const localVal = payLocalAmount ? Number(payLocalAmount) : null;
    const usdVal = payUsdAmount ? Number(payUsdAmount) : null;

    if (localVal === null && usdVal === null) {
      setAlert({ type: 'error', message: 'You must enter a payment amount in local currency or USD' });
      return;
    }

    try {
      setPaySubmitLoading(true);
      setAlert(null);

      await api.createPayment({
        billingId: payTargetBill.id,
        paymentDate: payDate,
        currencyLocalAmount: localVal,
        currencyUsdAmount: usdVal,
        paymentMethod: payMethod,
        referenceNumber: payRef.trim() || undefined,
        notes: payNotes.trim() || undefined
      });

      setAlert({ type: 'success', message: 'Payment recorded successfully, adjusting billing balances.' });
      setShowPayModal(false);

      // Clear Form
      setPayLocalAmount('');
      setPayUsdAmount('');
      setPayRef('');
      setPayNotes('');
      setPayTargetBill(null);

      // Reload
      loadData();
    } catch (err: any) {
      if (err?.error === 'EXCHANGE_RATE_REQUIRED') {
        setAlert({ 
          type: 'error', 
          message: `Single-currency payment inputs strictly require an exchange rate on that date. No rate found for ${payDate}. Enter both values or set exchange rate first!` 
        });
      } else {
        setAlert({ type: 'error', message: err?.message || 'Failed to record payment.' });
      }
    } finally {
      setPaySubmitLoading(false);
    }
  };

  const handleSubmitProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName.trim() || !provTaxId.trim()) {
      setAlert({ type: 'error', message: 'Provider name and Tax ID (e.g. J-30456123-0) are required' });
      return;
    }

    try {
      setProvSubmitLoading(true);
      setAlert(null);

      await api.createProvider({
        name: provName.trim(),
        taxId: provTaxId.trim(),
        contactName: provContact.trim() || undefined,
        phone: provPhone.trim() || undefined,
        email: provEmail.trim() || undefined,
        address: provAddr.trim() || undefined
      });

      setAlert({ type: 'success', message: `Provider "${provName}" added to catalog.` });
      setShowProviderModal(false);
      
      // Clear Form
      setProvName('');
      setProvTaxId('');
      setProvContact('');
      setProvPhone('');
      setProvEmail('');
      setProvAddr('');

      loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to register provider.' });
    } finally {
      setProvSubmitLoading(false);
    }
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete provider "${name}"? Billings bound to this provider will block deletions.`)) return;

    try {
      setAlert(null);
      await api.deleteProvider(id);
      setAlert({ type: 'success', message: `Provider "${name}" removed.` });
      loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to delete provider (it may have active billings).' });
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
      {/* Title Bar */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Provider Billings & Bills</h1>
          <p className={styles.subtitle}>Track incoming supply invoices, pay balances in dual-currency, and manage provider profiles.</p>
        </div>

        <div className={styles.headerActions}>
          {activeTab === 'billings' ? (
            <button onClick={() => setShowBillModal(true)} className={styles.headerBtn}>
              <PlusCircle size={18} />
              <span>Record supply invoice</span>
            </button>
          ) : (
            <button onClick={() => setShowProviderModal(true)} className={`${styles.headerBtn} ${styles.headerBtnSecondary}`}>
              <PlusCircle size={18} />
              <span>Enroll Provider</span>
            </button>
          )}
        </div>
      </header>

      {/* Tabs Menu */}
      <nav className={styles.tabsRow}>
        <button 
          onClick={() => setActiveTab('billings')} 
          className={`${styles.tabBtn} ${activeTab === 'billings' ? styles.tabBtnActive : ''}`}
        >
          <Receipt size={16} />
          <span>Invoices & Bills Ledger ({billings.length})</span>
        </button>
        <button 
          onClick={() => setActiveTab('providers')} 
          className={`${styles.tabBtn} ${activeTab === 'providers' ? styles.tabBtnActive : ''}`}
        >
          <Users size={16} />
          <span>Provider Directory ({providers.length})</span>
        </button>
      </nav>

      {/* Success/Error notifications */}
      {alert && (
        <div className={alert.type === 'success' ? styles.alertSuccess : styles.alertError}>
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} className={styles.alertDismiss} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : activeTab === 'billings' ? (
        /* TAB 1: BILLINGS LISTING */
        <section className="glass-panel panel-section">
          {billings.length === 0 ? (
            <div className={styles.emptyState}>
              No provider bills recorded yet. Click "Record supply invoice" above to register your first supply invoice!
            </div>
          ) : (
            <>
            <p className={styles.tableScrollHint}>Desliza horizontalmente para ver todas las columnas</p>
            <div className={`${styles.tableWrapper} table-scroll`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Provider</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th style={{ textAlign: 'right' }}>Amount (USD)</th>
                    <th style={{ textAlign: 'right' }}>Amount ({localCode})</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {billings.map(bill => {
                    const isExpanded = expandedBillingId === bill.id;
                    return (
                      <React.Fragment key={bill.id}>
                        <tr>
                          <td style={{ fontWeight: 600 }}>{bill.billingNumber}</td>
                          <td style={{ fontWeight: 500 }}>{bill.providerName || 'Unmapped Provider'}</td>
                          <td>{bill.issueDate}</td>
                          <td>{bill.dueDate}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-usd)' }}>
                            ${Number(bill.currencyUsdAmount).toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-ves)' }}>
                            {Number(bill.currencyLocalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${
                              bill.status === 'PAID' ? 'badge-paid' :
                              bill.status === 'PARTIALLY_PAID' ? 'badge-partial' :
                              bill.status === 'PENDING' ? 'badge-pending' : 'badge-void'
                            }`}>
                              {bill.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className={styles.actionCell}>
                              <button 
                                onClick={() => handleToggleExpandBilling(bill.id)}
                                className={styles.cardActionBtn}
                                title="View Payments History"
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                <span>Payments</span>
                              </button>
                              
                              {bill.status !== 'PAID' && (
                                <button 
                                  onClick={() => {
                                    setPayTargetBill(bill);
                                    setShowPayModal(true);
                                  }}
                                  className="badge badge-paid"
                                  style={{ border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                                >
                                  Record Payment
                                </button>
                              )}

                              <button
                                onClick={() => openEditBilling(bill)}
                                className={styles.cardActionBtn}
                                title="Edit invoice"
                              >
                                <Pencil size={14} />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => handleDeleteBilling(bill)}
                                className={styles.cardActionBtn}
                                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.35)' }}
                                title="Delete invoice"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Nested Payments List (displays inside row accordion) */}
                        {isExpanded && (
                          <tr className={styles.nestedPaymentsRow}>
                            <td colSpan={8}>
                              <div className={styles.nestedPaymentsContainer}>
                                <h3 className={styles.nestedTitle}>Payment Tranches History</h3>
                                {loadingPayments ? (
                                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Loading payments...</p>
                                ) : billingPayments.length === 0 ? (
                                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                    No payments registered for this invoice yet.
                                  </p>
                                ) : (
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <th style={{ padding: '6px 0', textAlign: 'left' }}>Date</th>
                                        <th style={{ padding: '6px 0', textAlign: 'left' }}>Method</th>
                                        <th style={{ padding: '6px 0', textAlign: 'left' }}>Reference</th>
                                        <th style={{ padding: '6px 0', textAlign: 'right' }}>USD Paid</th>
                                        <th style={{ padding: '6px 0', textAlign: 'right' }}>Local {localCode} Paid</th>
                                        <th style={{ padding: '6px 0', textAlign: 'center' }}>Rate</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {billingPayments.map((pay: any) => (
                                        <tr key={pay.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                          <td style={{ padding: '8px 0', fontWeight: 600 }}>{pay.paymentDate}</td>
                                          <td style={{ padding: '8px 0', textTransform: 'capitalize' }}>{pay.paymentMethod.replace('_', ' ').toLowerCase()}</td>
                                          <td style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>{pay.referenceNumber || 'N/A'}</td>
                                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: 'var(--color-usd)' }}>
                                            ${Number(pay.currencyUsdAmount).toFixed(2)}
                                          </td>
                                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: 'var(--color-ves)' }}>
                                            {Number(pay.currencyLocalAmount).toFixed(2)} Bs
                                          </td>
                                          <td style={{ padding: '8px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            {Number(pay.exchangeRateValue).toFixed(2)} Bs
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      ) : (
        /* TAB 2: PROVIDERS LISTING */
        <section className={styles.providerGrid}>
          {providers.length === 0 ? (
            <div className={`${styles.emptyState} glass-panel`} style={{ gridColumn: 'span 3' }}>
              No suppliers cataloged. Enroll your food, vegetable, or meat providers by clicking "Enroll Provider"!
            </div>
          ) : (
            providers.map(p => (
              <div key={p.id} className={`${styles.providerCard} glass-panel`}>
                <header className={styles.providerHeader}>
                  <div>
                    <h3 className={styles.providerName}>{p.name}</h3>
                    <span className={styles.providerTaxId}>RIF: {p.taxId}</span>
                  </div>
                  <span className={`badge ${p.active ? 'badge-paid' : 'badge-void'}`}>
                    {p.active ? 'Active Partner' : 'Inactive'}
                  </span>
                </header>

                <div className={styles.providerBody}>
                  {p.contactName && <span><strong>Contact:</strong> {p.contactName}</span>}
                  {p.phone && <span><strong>Phone:</strong> {p.phone}</span>}
                  {p.email && <span><strong>Email:</strong> {p.email}</span>}
                  {p.address && <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}><strong>Addr:</strong> {p.address}</span>}
                </div>

                <div className={styles.providerActions}>
                  <button 
                    onClick={() => handleDeleteProvider(p.id, p.name)}
                    className={styles.actionBtn}
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    <Trash2 size={12} />
                    <span>Delete supplies account</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* -----------------------------------------------------------------------
          MODALS SECTION
          ----------------------------------------------------------------------- */}
      
      {/* 1. Add Billing Invoice Modal */}
      {showBillModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass-panel`}>
            <header className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Record supply invoice</h2>
              <button onClick={() => setShowBillModal(false)} className={styles.modalClose}>×</button>
            </header>

            <form onSubmit={handleSubmitBilling} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Supplier Account</label>
                <select 
                  value={billProviderId} 
                  onChange={e => setBillProviderId(e.target.value)}
                  className="glow-select"
                  // required
                >
                  <option value="" 
                  // disabled
                  >-- Select supplies partner --</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (RIF: {p.taxId})</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Invoice Number (ID)</label>
                <input 
                  type="text" 
                  placeholder="e.g. FAC-2026-102"
                  value={billNumber} 
                  onChange={e => setBillNumber(e.target.value)} 
                  className="glow-input"
                  required
                />
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Issue Date</label>
                  <input 
                    type="date" 
                    value={billIssueDate} 
                    onChange={e => setBillIssueDate(e.target.value)} 
                    className="glow-input"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Due Date</label>
                  <input 
                    type="date" 
                    value={billDueDate} 
                    onChange={e => setBillDueDate(e.target.value)} 
                    className="glow-input"
                    required
                  />
                </div>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ color: 'var(--color-usd)' }}>USD Value ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={billUsdAmount} 
                    onChange={e => handleBillUsdChange(e.target.value)} 
                    className="glow-input"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ color: 'var(--color-ves)' }}>Local Value ({localCode})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={billLocalAmount} 
                    onChange={e => handleBillLocalChange(e.target.value)} 
                    className="glow-input"
                  />
                </div>
              </div>

              {/* Exchange rate display alert */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '6px 10px', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
                {billDateRate ? (
                  <span>Locked rate for invoice date {billIssueDate}: <strong>1 USD = {billDateRate.toFixed(2)} {localSymbol}</strong></span>
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ No rate registered for {billIssueDate}. Dual currencies must be typed manually!</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description / Suministro Details</label>
                <input 
                  type="text" 
                  placeholder="e.g. Suministro de embutidos e ingredientes"
                  value={billDesc} 
                  onChange={e => setBillDesc(e.target.value)} 
                  className="glow-input"
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={billSubmitLoading}>
                {billSubmitLoading ? 'Saving Invoice...' : 'Save Supply Invoice'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 1b. Edit Billing Invoice Modal */}
      {showEditBillModal && editTargetBill && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass-panel`}>
            <header className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Invoice: {editTargetBill.billingNumber}</h2>
              <button onClick={closeEditBilling} className={styles.modalClose}>×</button>
            </header>

            <form onSubmit={handleSubmitEditBilling} className={styles.form}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Provider: <strong>{editTargetBill.providerName || 'Unmapped Provider'}</strong>
                </p>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Issue Date</label>
                  <input
                    type="date"
                    value={editIssueDate}
                    onChange={e => setEditIssueDate(e.target.value)}
                    className="glow-input"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    className="glow-input"
                    required
                  />
                </div>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ color: 'var(--color-usd)' }}>USD Value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editUsdAmount}
                    onChange={e => handleEditUsdChange(e.target.value)}
                    className="glow-input"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ color: 'var(--color-ves)' }}>Local Value ({localCode})</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editLocalAmount}
                    onChange={e => handleEditLocalChange(e.target.value)}
                    className="glow-input"
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '6px 10px', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
                {editDateRate ? (
                  <span>Locked rate for issue date {editIssueDate}: <strong>1 USD = {editDateRate.toFixed(2)} {localSymbol}</strong></span>
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>No rate registered for {editIssueDate}. Dual currencies must be typed manually!</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as Billing['status'])}
                  className="glow-select"
                  required
                >
                  <option value="PENDING">Pending</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="PAID">Paid</option>
                  <option value="VOID">Void</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <input
                  type="text"
                  placeholder="Invoice description"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="glow-input"
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={editSubmitLoading}>
                {editSubmitLoading ? 'Updating Invoice...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Record Payment Modal */}
      {showPayModal && payTargetBill && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass-panel`}>
            <header className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Record Payment: {payTargetBill.billingNumber}</h2>
              <button onClick={() => {
                setShowPayModal(false);
                setPayTargetBill(null);
              }} className={styles.modalClose}>×</button>
            </header>

            <form onSubmit={handleSubmitPayment} className={styles.form}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Outstanding invoice total:</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, margin: '4px 0 0 0' }}>
                  <span style={{ color: 'var(--color-usd)', marginRight: 12 }}>${Number(payTargetBill.currencyUsdAmount).toFixed(2)} USD</span>
                  <span style={{ color: 'var(--color-ves)' }}>{Number(payTargetBill.currencyLocalAmount).toLocaleString()} Bs</span>
                </p>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Payment Date</label>
                  <input 
                    type="date" 
                    value={payDate} 
                    onChange={e => setPayDate(e.target.value)} 
                    className="glow-input"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Method</label>
                  <select 
                    value={payMethod} 
                    onChange={e => setPayMethod(e.target.value)}
                    className="glow-select"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (Mercantil/Banesco)</option>
                    <option value="CASH">Cash Drawer (USD/Bs)</option>
                    <option value="PAGO_MOVIL">Mobile Payment (Pago Móvil)</option>
                    <option value="CARD">Debit/Credit Card</option>
                  </select>
                </div>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ color: 'var(--color-usd)' }}>Amount USD ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={payUsdAmount} 
                    onChange={e => handlePayUsdChange(e.target.value)} 
                    className="glow-input"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ color: 'var(--color-ves)' }}>Amount Local (Bs)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={payLocalAmount} 
                    onChange={e => handlePayLocalChange(e.target.value)} 
                    className="glow-input"
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '6px 10px', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
                {payDateRate ? (
                  <span>Rate for payment date {payDate}: <strong>1 USD = {payDateRate.toFixed(2)} {localSymbol}</strong></span>
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ No rate registered for {payDate}. Tranche amounts must be entered manually!</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Reference Number (TX hash)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Reference P2P hash or cash receipt"
                  value={payRef} 
                  onChange={e => setPayRef(e.target.value)} 
                  className="glow-input"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Notes</label>
                <input 
                  type="text" 
                  placeholder="e.g. Pago parcial, saldo restante el proximo viernes"
                  value={payNotes} 
                  onChange={e => setPayNotes(e.target.value)} 
                  className="glow-input"
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={paySubmitLoading}>
                {paySubmitLoading ? 'Saving Payment...' : 'Record Payment Tranche'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Enroll Provider Modal */}
      {showProviderModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass-panel`}>
            <header className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Enroll New Provider</h2>
              <button onClick={() => setShowProviderModal(false)} className={styles.modalClose}>×</button>
            </header>

            <form onSubmit={handleSubmitProvider} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Company/Supplier Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Distribuidora de Carnes El Toro C.A."
                  value={provName} 
                  onChange={e => setProvName(e.target.value)} 
                  className="glow-input"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Tax Registry ID (RIF / NIT)</label>
                <input 
                  type="text" 
                  placeholder="e.g. J-30456123-0"
                  value={provTaxId} 
                  onChange={e => setProvTaxId(e.target.value)} 
                  className="glow-input"
                  required
                />
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Contact Representative</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Carlos Gomez"
                    value={provContact} 
                    onChange={e => setProvContact(e.target.value)} 
                    className="glow-input"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. +58-412-5550102"
                    value={provPhone} 
                    onChange={e => setProvPhone(e.target.value)} 
                    className="glow-input"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <input 
                  type="email" 
                  placeholder="e.g. ventas@eltoro.com"
                  value={provEmail} 
                  onChange={e => setProvEmail(e.target.value)} 
                  className="glow-input"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Warehouse / Office Address</label>
                <textarea 
                  placeholder="e.g. Calle Principal, Zona Industrial I, Valencia"
                  value={provAddr} 
                  onChange={e => setProvAddr(e.target.value)} 
                  className="glow-input"
                  style={{ resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }}
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={provSubmitLoading}>
                {provSubmitLoading ? 'Saving Supplier...' : 'Enroll Supply Provider'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Billings;
