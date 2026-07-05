import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Receipt,
  Users,
  Search,
  PlusCircle,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
  AlertTriangle
} from 'lucide-react';
import { DateTime } from 'luxon';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import { Pagination, usePagination } from '../components/Pagination';
import { ActionsMenu } from '../components/ActionsMenu';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { billingStatusLabels, paymentMethodLabels, label } from '../i18n/es';
import styles from './Billings.module.css';

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

type StatusFilter = 'ALL' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'VOID' | 'OVERDUE';

const statusBadgeClass = (status: Billing['status']) =>
  status === 'PAID' ? 'badge-paid' :
  status === 'PARTIALLY_PAID' ? 'badge-partial' :
  status === 'PENDING' ? 'badge-pending' : 'badge-void';

const isOverdue = (bill: Billing) =>
  (bill.status === 'PENDING' || bill.status === 'PARTIALLY_PAID') &&
  bill.dueDate < DateTime.now().toFormat('yyyy-LL-dd');

export const Billings: React.FC = () => {
  const { activeRestaurant } = useAuth();
  const { showToast } = useToast();

  // Pestañas: 'billings' | 'providers'
  const [activeTab, setActiveTab] = useState<'billings' | 'providers'>('billings');

  // Listados
  const [billings, setBillings] = useState<Billing[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  // Facturas expandidas (para ver pagos)
  const [expandedBillingId, setExpandedBillingId] = useState<string | null>(null);
  const [billingPayments, setBillingPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Modales
  const [showBillModal, setShowBillModal] = useState(false);
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  // Confirmaciones destructivas
  const [deleteBillTarget, setDeleteBillTarget] = useState<Billing | null>(null);
  const [deleteBillLoading, setDeleteBillLoading] = useState(false);
  const [deleteProvTarget, setDeleteProvTarget] = useState<Provider | null>(null);
  const [deleteProvLoading, setDeleteProvLoading] = useState(false);

  // Avisos
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [providerSearch, setProviderSearch] = useState('');

  // ---------------------------------------------------------------------------
  // ESTADOS DE FORMULARIOS
  // ---------------------------------------------------------------------------
  // 1. Nueva factura
  const [billProviderId, setBillProviderId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billIssueDate, setBillIssueDate] = useState(DateTime.now().toFormat('yyyy-LL-dd'));
  const [billDueDate, setBillDueDate] = useState(DateTime.now().plus({ days: 30 }).toFormat('yyyy-LL-dd'));
  const [billLocalAmount, setBillLocalAmount] = useState('');
  const [billUsdAmount, setBillUsdAmount] = useState('');
  const [billDesc, setBillDesc] = useState('');
  const [billSubmitLoading, setBillSubmitLoading] = useState(false);
  const [billDateRate, setBillDateRate] = useState<number | null>(null);

  // 1b. Edición de factura
  const [editTargetBill, setEditTargetBill] = useState<Billing | null>(null);
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editLocalAmount, setEditLocalAmount] = useState('');
  const [editUsdAmount, setEditUsdAmount] = useState('');
  const [editStatus, setEditStatus] = useState<Billing['status']>('PENDING');
  const [editDesc, setEditDesc] = useState('');
  const [editSubmitLoading, setEditSubmitLoading] = useState(false);
  const [editDateRate, setEditDateRate] = useState<number | null>(null);

  // 2. Registro de pago
  const [payTargetBill, setPayTargetBill] = useState<Billing | null>(null);
  const [payDate, setPayDate] = useState(DateTime.now().toFormat('yyyy-LL-dd'));
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payLocalAmount, setPayLocalAmount] = useState('');
  const [payUsdAmount, setPayUsdAmount] = useState('');
  const [paySubmitLoading, setPaySubmitLoading] = useState(false);
  const [payDateRate, setPayDateRate] = useState<number | null>(null);

  // 3. Alta / edición de proveedor
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
      setAlert({ type: 'error', message: err?.message || 'No se pudieron cargar las facturas del restaurante.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRestaurant) {
      loadData();
    }
  }, [activeRestaurant]);

  // Consultar tasas según la fecha seleccionada en cada formulario
  useEffect(() => {
    const fetchBillDateRate = async () => {
      if (!billIssueDate) return;
      try {
        const res = await api.getRateByDate(billIssueDate);
        setBillDateRate(res?.rateUsdToLocal ? Number(res.rateUsdToLocal) : null);
      } catch {
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
        setEditDateRate(res?.rateUsdToLocal ? Number(res.rateUsdToLocal) : null);
      } catch {
        setEditDateRate(null);
      }
    };
    fetchEditDateRate();
  }, [editIssueDate]);

  useEffect(() => {
    const fetchPayDateRate = async () => {
      if (!payDate) return;
      try {
        const res = await api.getRateByDate(payDate);
        setPayDateRate(res?.rateUsdToLocal ? Number(res.rateUsdToLocal) : null);
      } catch {
        setPayDateRate(null);
      }
    };
    fetchPayDateRate();
  }, [payDate]);

  // Conversión automática en formularios
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

  // Cargar pagos anidados de una factura
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
    } catch {
      setBillingPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ENVÍOS
  // ---------------------------------------------------------------------------
  const handleSubmitBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    const localVal = billLocalAmount ? Number(billLocalAmount) : null;
    const usdVal = billUsdAmount ? Number(billUsdAmount) : null;

    if (!billProviderId) {
      setAlert({ type: 'error', message: 'Selecciona un proveedor. Si no existe, créalo en la pestaña Proveedores.' });
      return;
    }

    if (localVal === null && usdVal === null) {
      setAlert({ type: 'error', message: `Debes indicar al menos un monto (USD o ${localCode}).` });
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

      showToast(`Factura ${billNumber} registrada correctamente.`);
      setShowBillModal(false);

      setBillNumber('');
      setBillLocalAmount('');
      setBillUsdAmount('');
      setBillDesc('');

      loadData();
    } catch (err: any) {
      if (err?.error === 'EXCHANGE_RATE_REQUIRED') {
        setAlert({
          type: 'error',
          message: `Registrar un solo monto requiere la tasa de cambio del ${billIssueDate} y no hay ninguna. Ingresa ambos montos o registra primero la tasa.`
        });
      } else {
        setAlert({ type: 'error', message: err?.message || 'No se pudo registrar la factura.' });
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
      setAlert({ type: 'error', message: `Debes indicar al menos un monto (USD o ${localCode}).` });
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

      showToast(`Factura ${editTargetBill.billingNumber} actualizada.`);
      closeEditBilling();
      loadData();
    } catch (err: any) {
      if (err?.error === 'EXCHANGE_RATE_REQUIRED') {
        setAlert({
          type: 'error',
          message: `Actualizar con un solo monto requiere la tasa del ${editIssueDate} y no hay ninguna. Ingresa ambos montos o registra primero la tasa.`,
        });
      } else {
        setAlert({ type: 'error', message: err?.message || 'No se pudo actualizar la factura.' });
      }
    } finally {
      setEditSubmitLoading(false);
    }
  };

  const handleDeleteBilling = async () => {
    if (!deleteBillTarget) return;
    try {
      setDeleteBillLoading(true);
      setAlert(null);
      await api.deleteBilling(deleteBillTarget.id);
      if (expandedBillingId === deleteBillTarget.id) {
        setExpandedBillingId(null);
        setBillingPayments([]);
      }
      showToast(`Factura ${deleteBillTarget.billingNumber} eliminada.`);
      setDeleteBillTarget(null);
      loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo eliminar la factura.' });
      setDeleteBillTarget(null);
    } finally {
      setDeleteBillLoading(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTargetBill) return;

    const localVal = payLocalAmount ? Number(payLocalAmount) : null;
    const usdVal = payUsdAmount ? Number(payUsdAmount) : null;

    if (localVal === null && usdVal === null) {
      setAlert({ type: 'error', message: `Debes ingresar el monto del pago en ${localCode} o USD.` });
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

      showToast('Pago registrado; el saldo de la factura fue actualizado.');
      setShowPayModal(false);

      setPayLocalAmount('');
      setPayUsdAmount('');
      setPayRef('');
      setPayNotes('');
      setPayTargetBill(null);

      loadData();
    } catch (err: any) {
      if (err?.error === 'EXCHANGE_RATE_REQUIRED') {
        setAlert({
          type: 'error',
          message: `Registrar un pago con un solo monto requiere la tasa del ${payDate} y no hay ninguna. Ingresa ambos montos o registra primero la tasa.`
        });
      } else {
        setAlert({ type: 'error', message: err?.message || 'No se pudo registrar el pago.' });
      }
    } finally {
      setPaySubmitLoading(false);
    }
  };

  const openCreateProvider = () => {
    setEditingProvider(null);
    setProvName('');
    setProvTaxId('');
    setProvContact('');
    setProvPhone('');
    setProvEmail('');
    setProvAddr('');
    setShowProviderModal(true);
  };

  const openEditProvider = (p: Provider) => {
    setEditingProvider(p);
    setProvName(p.name);
    setProvTaxId(p.taxId);
    setProvContact(p.contactName || '');
    setProvPhone(p.phone || '');
    setProvEmail(p.email || '');
    setProvAddr(p.address || '');
    setShowProviderModal(true);
  };

  const handleSubmitProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName.trim() || !provTaxId.trim()) {
      setAlert({ type: 'error', message: 'El nombre y el RIF del proveedor son obligatorios (ej. J-30456123-0).' });
      return;
    }

    const payload = {
      name: provName.trim(),
      taxId: provTaxId.trim(),
      contactName: provContact.trim() || undefined,
      phone: provPhone.trim() || undefined,
      email: provEmail.trim() || undefined,
      address: provAddr.trim() || undefined
    };

    try {
      setProvSubmitLoading(true);
      setAlert(null);

      if (editingProvider) {
        await api.updateProvider(editingProvider.id, payload);
        showToast(`Proveedor "${payload.name}" actualizado.`);
      } else {
        await api.createProvider(payload);
        showToast(`Proveedor "${payload.name}" registrado.`);
      }

      setShowProviderModal(false);
      setEditingProvider(null);
      loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo guardar el proveedor.' });
    } finally {
      setProvSubmitLoading(false);
    }
  };

  const handleDeleteProvider = async () => {
    if (!deleteProvTarget) return;
    try {
      setDeleteProvLoading(true);
      setAlert(null);
      await api.deleteProvider(deleteProvTarget.id);
      showToast(`Proveedor "${deleteProvTarget.name}" eliminado.`);
      setDeleteProvTarget(null);
      loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo eliminar el proveedor (puede tener facturas asociadas).' });
      setDeleteProvTarget(null);
    } finally {
      setDeleteProvLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // FILTROS + PAGINADO
  // ---------------------------------------------------------------------------
  const overdueCount = useMemo(() => billings.filter(isOverdue).length, [billings]);

  const filteredBillings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return billings.filter(bill => {
      if (statusFilter === 'OVERDUE') {
        if (!isOverdue(bill)) return false;
      } else if (statusFilter !== 'ALL' && bill.status !== statusFilter) {
        return false;
      }
      if (!term) return true;
      const haystack = [bill.billingNumber, bill.providerName, bill.description]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [billings, searchTerm, statusFilter]);

  const filteredProviders = useMemo(() => {
    const term = providerSearch.trim().toLowerCase();
    if (!term) return providers;
    return providers.filter(p =>
      [p.name, p.taxId, p.contactName, p.email].filter(Boolean).join(' ').toLowerCase().includes(term)
    );
  }, [providers, providerSearch]);

  const billsPagination = usePagination(filteredBillings, 10);

  useEffect(() => {
    billsPagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter]);

  if (!activeRestaurant) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Cargando el perfil del restaurante...</p>
      </div>
    );
  }

  const statusChips: { value: StatusFilter; text: string }[] = [
    { value: 'ALL', text: 'Todas' },
    { value: 'PENDING', text: 'Pendientes' },
    { value: 'PARTIALLY_PAID', text: 'Pago parcial' },
    { value: 'PAID', text: 'Pagadas' },
    { value: 'OVERDUE', text: `Vencidas${overdueCount ? ` (${overdueCount})` : ''}` },
  ];

  return (
    <div className={styles.container}>
      <PageHeader
        title="Facturas y Pagos"
        subtitle="Registra facturas de proveedores, gestiona pagos en dos monedas y administra tu directorio de suministros."
        actions={
          activeTab === 'billings' ? (
            <Button onClick={() => setShowBillModal(true)}>
              <PlusCircle size={18} />
              Registrar factura
            </Button>
          ) : (
            <Button onClick={openCreateProvider}>
              <PlusCircle size={18} />
              Registrar proveedor
            </Button>
          )
        }
      />

      {/* Pestañas */}
      <nav className={styles.tabsRow} aria-label="Secciones de facturación">
        <button
          onClick={() => setActiveTab('billings')}
          className={`${styles.tabBtn} ${activeTab === 'billings' ? styles.tabBtnActive : ''}`}
          aria-current={activeTab === 'billings' ? 'page' : undefined}
        >
          <Receipt size={16} />
          <span>Facturas ({billings.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('providers')}
          className={`${styles.tabBtn} ${activeTab === 'providers' ? styles.tabBtnActive : ''}`}
          aria-current={activeTab === 'providers' ? 'page' : undefined}
        >
          <Users size={16} />
          <span>Proveedores ({providers.length})</span>
        </button>
      </nav>

      {/* Avisos */}
      {alert && (
        <Alert type={alert.type} onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {loading ? (
        <section className="glass-panel panel-section">
          <TableSkeleton rows={6} />
        </section>
      ) : activeTab === 'billings' ? (
        /* PESTAÑA 1: FACTURAS */
        <section className="glass-panel panel-section">
          {/* Barra de búsqueda y filtros por estado */}
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="search"
                placeholder="Buscar por número, proveedor o descripción..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                aria-label="Buscar facturas"
              />
            </div>
            <div className={styles.filterChips} role="group" aria-label="Filtrar por estado">
              {statusChips.map(({ value, text }) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.chip} ${statusFilter === value ? styles.chipActive : ''} ${value === 'OVERDUE' && overdueCount > 0 ? styles.chipDangerHint : ''}`}
                  onClick={() => setStatusFilter(value)}
                  aria-pressed={statusFilter === value}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          {filteredBillings.length === 0 ? (
            <EmptyState
              icon={<Receipt size={36} />}
              message={
                billings.length === 0
                  ? 'Aún no hay facturas de proveedores registradas.'
                  : 'Ninguna factura coincide con la búsqueda o el filtro aplicado.'
              }
              action={
                billings.length === 0 ? (
                  <Button onClick={() => setShowBillModal(true)}>
                    <PlusCircle size={16} />
                    Registrar primera factura
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className={`${styles.tableWrapper} table-scroll`}>
                <table className={`${styles.table} responsive-table`}>
                  <thead>
                    <tr>
                      <th>Factura</th>
                      <th>Proveedor</th>
                      <th>Emisión</th>
                      <th>Vencimiento</th>
                      <th style={{ textAlign: 'right' }}>Monto (USD)</th>
                      <th style={{ textAlign: 'right' }}>Monto ({localCode})</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billsPagination.pageItems.map(bill => {
                      const isExpanded = expandedBillingId === bill.id;
                      const overdue = isOverdue(bill);
                      return (
                        <React.Fragment key={bill.id}>
                          <tr>
                            <td data-label="Factura" style={{ fontWeight: 600 }}>{bill.billingNumber}</td>
                            <td data-label="Proveedor" style={{ fontWeight: 500 }}>{bill.providerName || 'Proveedor sin asignar'}</td>
                            <td data-label="Emisión">{bill.issueDate}</td>
                            <td data-label="Vencimiento">
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: overdue ? 'var(--color-danger)' : undefined, fontWeight: overdue ? 600 : undefined }}>
                                {overdue && <AlertTriangle size={13} />}
                                {bill.dueDate}
                              </span>
                            </td>
                            <td data-label="Monto (USD)" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-usd)' }}>
                              ${Number(bill.currencyUsdAmount).toFixed(2)}
                            </td>
                            <td data-label={`Monto (${localCode})`} style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-ves)' }}>
                              {Number(bill.currencyLocalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {localSymbol}
                            </td>
                            <td data-label="Estado" style={{ textAlign: 'center' }}>
                              <span className={`badge ${statusBadgeClass(bill.status)}`}>
                                {label(billingStatusLabels, bill.status)}
                              </span>
                            </td>
                            <td data-label="" style={{ textAlign: 'center' }}>
                              <div className={styles.actionCell}>
                                {bill.status !== 'PAID' && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setPayTargetBill(bill);
                                      setShowPayModal(true);
                                    }}
                                  >
                                    Registrar pago
                                  </Button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleToggleExpandBilling(bill.id)}
                                  className={styles.cardActionBtn}
                                  title="Ver historial de pagos"
                                  aria-expanded={isExpanded}
                                >
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  <span>Pagos</span>
                                </button>
                                <ActionsMenu
                                  items={[
                                    { label: 'Editar factura', icon: <Pencil size={14} />, onClick: () => openEditBilling(bill) },
                                    { label: 'Eliminar factura', icon: <Trash2 size={14} />, onClick: () => setDeleteBillTarget(bill), danger: true },
                                  ]}
                                />
                              </div>
                            </td>
                          </tr>

                          {/* Historial de pagos (acordeón) */}
                          {isExpanded && (
                            <tr className={styles.nestedPaymentsRow}>
                              <td colSpan={8}>
                                <div className={styles.nestedPaymentsContainer}>
                                  <h3 className={styles.nestedTitle}>Historial de pagos</h3>
                                  {loadingPayments ? (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Cargando pagos...</p>
                                  ) : billingPayments.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                      Esta factura aún no tiene pagos registrados.
                                    </p>
                                  ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                      <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                          <th style={{ padding: '6px 0', textAlign: 'left' }}>Fecha</th>
                                          <th style={{ padding: '6px 0', textAlign: 'left' }}>Método</th>
                                          <th style={{ padding: '6px 0', textAlign: 'left' }}>Referencia</th>
                                          <th style={{ padding: '6px 0', textAlign: 'right' }}>USD pagado</th>
                                          <th style={{ padding: '6px 0', textAlign: 'right' }}>{localCode} pagado</th>
                                          <th style={{ padding: '6px 0', textAlign: 'center' }}>Tasa</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {billingPayments.map((pay: any) => (
                                          <tr key={pay.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '8px 0', fontWeight: 600 }}>{pay.paymentDate}</td>
                                            <td style={{ padding: '8px 0' }}>{label(paymentMethodLabels, pay.paymentMethod)}</td>
                                            <td style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>{pay.referenceNumber || 'N/D'}</td>
                                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: 'var(--color-usd)' }}>
                                              ${Number(pay.currencyUsdAmount).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: 'var(--color-ves)' }}>
                                              {Number(pay.currencyLocalAmount).toFixed(2)} {localSymbol}
                                            </td>
                                            <td style={{ padding: '8px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                                              {Number(pay.exchangeRateValue).toFixed(2)} {localSymbol}
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

              <Pagination
                page={billsPagination.page}
                totalPages={billsPagination.totalPages}
                total={billsPagination.total}
                pageSize={billsPagination.pageSize}
                onPageChange={p => {
                  setExpandedBillingId(null);
                  billsPagination.setPage(p);
                }}
                onPageSizeChange={billsPagination.setPageSize}
                itemsLabel="facturas"
              />
            </>
          )}
        </section>
      ) : (
        /* PESTAÑA 2: PROVEEDORES */
        <>
          <div className={styles.toolbar} style={{ marginBottom: 20 }}>
            <div className={styles.searchBox}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="search"
                placeholder="Buscar por nombre, RIF o contacto..."
                value={providerSearch}
                onChange={e => setProviderSearch(e.target.value)}
                aria-label="Buscar proveedores"
              />
            </div>
          </div>

          <section className={styles.providerGrid}>
            {filteredProviders.length === 0 ? (
              <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
                <EmptyState
                  icon={<Users size={36} />}
                  message={
                    providers.length === 0
                      ? 'No hay proveedores registrados. Registra tus proveedores de alimentos, verduras o carnes.'
                      : 'Ningún proveedor coincide con la búsqueda.'
                  }
                  action={
                    providers.length === 0 ? (
                      <Button onClick={openCreateProvider}>
                        <PlusCircle size={16} />
                        Registrar primer proveedor
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              filteredProviders.map(p => (
                <div key={p.id} className={`${styles.providerCard} glass-panel`}>
                  <header className={styles.providerHeader}>
                    <div>
                      <h3 className={styles.providerName}>{p.name}</h3>
                      <span className={styles.providerTaxId}>RIF: {p.taxId}</span>
                    </div>
                    <span className={`badge ${p.active ? 'badge-paid' : 'badge-void'}`}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </header>

                  <div className={styles.providerBody}>
                    {p.contactName && <span><strong>Contacto:</strong> {p.contactName}</span>}
                    {p.phone && <span><strong>Teléfono:</strong> {p.phone}</span>}
                    {p.email && <span><strong>Correo:</strong> {p.email}</span>}
                    {p.address && <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}><strong>Dirección:</strong> {p.address}</span>}
                  </div>

                  <div className={styles.providerActions}>
                    <button
                      type="button"
                      onClick={() => openEditProvider(p)}
                      className={styles.cardActionBtn}
                    >
                      <Pencil size={12} />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteProvTarget(p)}
                      className={styles.cardActionBtn}
                      style={{ color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.35)', marginLeft: 'auto' }}
                    >
                      <Trash2 size={12} />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}

      {/* -----------------------------------------------------------------------
          MODALES
          ----------------------------------------------------------------------- */}

      {/* 1. Nueva factura */}
      {showBillModal && (
        <Modal title="Registrar factura de proveedor" onClose={() => setShowBillModal(false)}>
          <form onSubmit={handleSubmitBilling} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="bill-provider" className={styles.label}>Proveedor</label>
              <select
                id="bill-provider"
                value={billProviderId}
                onChange={e => setBillProviderId(e.target.value)}
                className="glow-select"
              >
                <option value="">— Selecciona un proveedor —</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (RIF: {p.taxId})</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bill-number" className={styles.label}>Número de factura</label>
              <input
                id="bill-number"
                type="text"
                placeholder="ej. FAC-2026-102"
                value={billNumber}
                onChange={e => setBillNumber(e.target.value)}
                className="glow-input"
                required
              />
            </div>

            <div className={styles.inputRow}>
              <div className={styles.formGroup}>
                <label htmlFor="bill-issue" className={styles.label}>Fecha de emisión</label>
                <input
                  id="bill-issue"
                  type="date"
                  value={billIssueDate}
                  onChange={e => setBillIssueDate(e.target.value)}
                  className="glow-input"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="bill-due" className={styles.label}>Fecha de vencimiento</label>
                <input
                  id="bill-due"
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
                <label htmlFor="bill-usd" className={styles.label} style={{ color: 'var(--color-usd)' }}>Monto USD ($)</label>
                <input
                  id="bill-usd"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={billUsdAmount}
                  onChange={e => handleBillUsdChange(e.target.value)}
                  className="glow-input"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="bill-local" className={styles.label} style={{ color: 'var(--color-ves)' }}>Monto {localCode} ({localSymbol})</label>
                <input
                  id="bill-local"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={billLocalAmount}
                  onChange={e => handleBillLocalChange(e.target.value)}
                  className="glow-input"
                />
              </div>
            </div>

            {/* Estado de la tasa */}
            <div className={styles.rateHint}>
              {billDateRate ? (
                <span>Tasa registrada para el {billIssueDate}: <strong>1 USD = {billDateRate.toFixed(2)} {localSymbol}</strong></span>
              ) : (
                <span style={{ color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  Sin tasa para el {billIssueDate}: debes escribir ambos montos manualmente.
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bill-desc" className={styles.label}>Descripción del suministro</label>
              <input
                id="bill-desc"
                type="text"
                placeholder="ej. Suministro de embutidos e ingredientes"
                value={billDesc}
                onChange={e => setBillDesc(e.target.value)}
                className="glow-input"
              />
            </div>

            <Button type="submit" fullWidth loading={billSubmitLoading}>
              {billSubmitLoading ? 'Guardando factura...' : 'Guardar factura'}
            </Button>
          </form>
        </Modal>
      )}

      {/* 1b. Edición de factura */}
      {showEditBillModal && editTargetBill && (
        <Modal title={`Editar factura ${editTargetBill.billingNumber}`} onClose={closeEditBilling}>
          <form onSubmit={handleSubmitEditBilling} className={styles.form}>
            <div className={styles.infoBox}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Proveedor: <strong>{editTargetBill.providerName || 'Sin asignar'}</strong>
              </p>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.formGroup}>
                <label htmlFor="edit-issue" className={styles.label}>Fecha de emisión</label>
                <input
                  id="edit-issue"
                  type="date"
                  value={editIssueDate}
                  onChange={e => setEditIssueDate(e.target.value)}
                  className="glow-input"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-due" className={styles.label}>Fecha de vencimiento</label>
                <input
                  id="edit-due"
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
                <label htmlFor="edit-usd" className={styles.label} style={{ color: 'var(--color-usd)' }}>Monto USD ($)</label>
                <input
                  id="edit-usd"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editUsdAmount}
                  onChange={e => handleEditUsdChange(e.target.value)}
                  className="glow-input"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-local" className={styles.label} style={{ color: 'var(--color-ves)' }}>Monto {localCode} ({localSymbol})</label>
                <input
                  id="edit-local"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editLocalAmount}
                  onChange={e => handleEditLocalChange(e.target.value)}
                  className="glow-input"
                />
              </div>
            </div>

            <div className={styles.rateHint}>
              {editDateRate ? (
                <span>Tasa registrada para el {editIssueDate}: <strong>1 USD = {editDateRate.toFixed(2)} {localSymbol}</strong></span>
              ) : (
                <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                  Sin tasa para el {editIssueDate}: debes escribir ambos montos manualmente.
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-status" className={styles.label}>Estado</label>
              <select
                id="edit-status"
                value={editStatus}
                onChange={e => setEditStatus(e.target.value as Billing['status'])}
                className="glow-select"
                required
              >
                <option value="PENDING">Pendiente</option>
                <option value="PARTIALLY_PAID">Pago parcial</option>
                <option value="PAID">Pagada</option>
                <option value="VOID">Anulada</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-bill-desc" className={styles.label}>Descripción</label>
              <input
                id="edit-bill-desc"
                type="text"
                placeholder="Descripción de la factura"
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                className="glow-input"
              />
            </div>

            <Button type="submit" fullWidth loading={editSubmitLoading}>
              {editSubmitLoading ? 'Actualizando...' : 'Guardar cambios'}
            </Button>
          </form>
        </Modal>
      )}

      {/* 2. Registro de pago */}
      {showPayModal && payTargetBill && (
        <Modal
          title={`Registrar pago — ${payTargetBill.billingNumber}`}
          onClose={() => {
            setShowPayModal(false);
            setPayTargetBill(null);
          }}
        >
          <form onSubmit={handleSubmitPayment} className={styles.form}>
            <div className={styles.infoBox}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total de la factura:</p>
              <p style={{ fontSize: '1rem', fontWeight: 700, margin: '4px 0 0 0' }}>
                <span style={{ color: 'var(--color-usd)', marginRight: 12 }}>${Number(payTargetBill.currencyUsdAmount).toFixed(2)} USD</span>
                <span style={{ color: 'var(--color-ves)' }}>{Number(payTargetBill.currencyLocalAmount).toLocaleString()} {localSymbol}</span>
              </p>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.formGroup}>
                <label htmlFor="pay-date" className={styles.label}>Fecha del pago</label>
                <input
                  id="pay-date"
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="glow-input"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="pay-method" className={styles.label}>Método</label>
                <select
                  id="pay-method"
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="glow-select"
                >
                  <option value="BANK_TRANSFER">Transferencia bancaria</option>
                  <option value="CASH">Efectivo (USD/{localSymbol})</option>
                  <option value="PAGO_MOVIL">Pago móvil</option>
                  <option value="CARD">Tarjeta de débito/crédito</option>
                </select>
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.formGroup}>
                <label htmlFor="pay-usd" className={styles.label} style={{ color: 'var(--color-usd)' }}>Monto USD ($)</label>
                <input
                  id="pay-usd"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={payUsdAmount}
                  onChange={e => handlePayUsdChange(e.target.value)}
                  className="glow-input"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="pay-local" className={styles.label} style={{ color: 'var(--color-ves)' }}>Monto {localCode} ({localSymbol})</label>
                <input
                  id="pay-local"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={payLocalAmount}
                  onChange={e => handlePayLocalChange(e.target.value)}
                  className="glow-input"
                />
              </div>
            </div>

            <div className={styles.rateHint}>
              {payDateRate ? (
                <span>Tasa para el {payDate}: <strong>1 USD = {payDateRate.toFixed(2)} {localSymbol}</strong></span>
              ) : (
                <span style={{ color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  Sin tasa para el {payDate}: debes escribir ambos montos manualmente.
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="pay-ref" className={styles.label}>Número de referencia</label>
              <input
                id="pay-ref"
                type="text"
                placeholder="ej. Referencia de transferencia o recibo"
                value={payRef}
                onChange={e => setPayRef(e.target.value)}
                className="glow-input"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="pay-notes" className={styles.label}>Notas</label>
              <input
                id="pay-notes"
                type="text"
                placeholder="ej. Pago parcial, saldo restante el próximo viernes"
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
                className="glow-input"
              />
            </div>

            <Button type="submit" fullWidth loading={paySubmitLoading}>
              {paySubmitLoading ? 'Guardando pago...' : 'Registrar pago'}
            </Button>
          </form>
        </Modal>
      )}

      {/* 3. Alta / edición de proveedor */}
      {showProviderModal && (
        <Modal
          title={editingProvider ? `Editar proveedor: ${editingProvider.name}` : 'Registrar nuevo proveedor'}
          onClose={() => {
            setShowProviderModal(false);
            setEditingProvider(null);
          }}
        >
          <form onSubmit={handleSubmitProvider} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="prov-name" className={styles.label}>Nombre de la empresa</label>
              <input
                id="prov-name"
                type="text"
                placeholder="ej. Distribuidora de Carnes El Toro C.A."
                value={provName}
                onChange={e => setProvName(e.target.value)}
                className="glow-input"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="prov-taxid" className={styles.label}>RIF / NIT</label>
              <input
                id="prov-taxid"
                type="text"
                placeholder="ej. J-30456123-0"
                value={provTaxId}
                onChange={e => setProvTaxId(e.target.value)}
                className="glow-input"
                required
              />
            </div>

            <div className={styles.inputRow}>
              <div className={styles.formGroup}>
                <label htmlFor="prov-contact" className={styles.label}>Persona de contacto</label>
                <input
                  id="prov-contact"
                  type="text"
                  placeholder="ej. Carlos Gómez"
                  value={provContact}
                  onChange={e => setProvContact(e.target.value)}
                  className="glow-input"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="prov-phone" className={styles.label}>Teléfono</label>
                <input
                  id="prov-phone"
                  type="text"
                  placeholder="ej. +58-412-5550102"
                  value={provPhone}
                  onChange={e => setProvPhone(e.target.value)}
                  className="glow-input"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="prov-email" className={styles.label}>Correo electrónico</label>
              <input
                id="prov-email"
                type="email"
                placeholder="ej. ventas@eltoro.com"
                value={provEmail}
                onChange={e => setProvEmail(e.target.value)}
                className="glow-input"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="prov-addr" className={styles.label}>Dirección</label>
              <textarea
                id="prov-addr"
                placeholder="ej. Calle Principal, Zona Industrial I, Valencia"
                value={provAddr}
                onChange={e => setProvAddr(e.target.value)}
                className="glow-input"
                style={{ resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }}
              />
            </div>

            <Button type="submit" fullWidth loading={provSubmitLoading}>
              {provSubmitLoading
                ? 'Guardando...'
                : editingProvider ? 'Guardar cambios' : 'Registrar proveedor'}
            </Button>
          </form>
        </Modal>
      )}

      {/* Confirmación: eliminar factura */}
      {deleteBillTarget && (
        <ConfirmDialog
          title="Eliminar factura"
          message={
            <>
              ¿Eliminar la factura <strong>{deleteBillTarget.billingNumber}</strong> de{' '}
              <strong>{deleteBillTarget.providerName || 'proveedor sin asignar'}</strong>?
              También se eliminarán los pagos vinculados. Esta acción no se puede deshacer.
            </>
          }
          loading={deleteBillLoading}
          onConfirm={handleDeleteBilling}
          onCancel={() => setDeleteBillTarget(null)}
        />
      )}

      {/* Confirmación: eliminar proveedor */}
      {deleteProvTarget && (
        <ConfirmDialog
          title="Eliminar proveedor"
          message={
            <>
              ¿Eliminar al proveedor <strong>{deleteProvTarget.name}</strong> (RIF: {deleteProvTarget.taxId})?
              Si tiene facturas asociadas, la eliminación será bloqueada por el sistema.
            </>
          }
          loading={deleteProvLoading}
          onConfirm={handleDeleteProvider}
          onCancel={() => setDeleteProvTarget(null)}
        />
      )}
    </div>
  );
};
export default Billings;
