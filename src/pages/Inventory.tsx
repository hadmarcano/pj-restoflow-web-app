import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  Trash2,
  Edit3,
  AlertTriangle,
  PlusCircle,
  Search,
  LayoutGrid,
  List,
  ArrowDownToLine,
  ArrowUpFromLine
} from 'lucide-react';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import { Pagination, usePagination } from '../components/Pagination';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import styles from './Inventory.module.css';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  unitOfMeasure: string;
  unitCostLocal: number;
  unitCostUsd: number;
  reorderLevel: number;
  description?: string;
  category?: string;
}

const CATEGORIES = [
  { value: 'Secos', text: 'Secos' },
  { value: 'Lácteos', text: 'Lácteos' },
  { value: 'Carnes', text: 'Carnes' },
  { value: 'Verduras', text: 'Verduras y frutas' },
  { value: 'Líquidos', text: 'Líquidos' },
  { value: 'Panadería', text: 'Panadería' },
  { value: 'Otros', text: 'Otros' },
];

export const Inventory: React.FC = () => {
  const { activeRestaurant } = useAuth();
  const { showToast } = useToast();

  // Listado
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Ajuste de stock (modal Entrada / Salida)
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [adjustDirection, setAdjustDirection] = useState<'IN' | 'OUT'>('IN');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Búsqueda, filtros y vista
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ---------------------------------------------------------------------------
  // FORMULARIO DE CATÁLOGO
  // ---------------------------------------------------------------------------
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Secos');
  const [unitOfMeasure, setUnitOfMeasure] = useState('KG');
  const [unitCostLocal, setUnitCostLocal] = useState('');
  const [unitCostUsd, setUnitCostUsd] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [description, setDescription] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const localCode = activeRestaurant?.localCurrencyCode || 'VES';
  const localSymbol = activeRestaurant?.localCurrencySymbol || 'Bs';

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await api.getInventoryItems();
      setItems(data);
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo cargar el inventario.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRestaurant) {
      loadInventory();
    }
  }, [activeRestaurant]);

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setSku(item.sku);
    setCategory(item.category || 'Secos');
    setUnitOfMeasure(item.unitOfMeasure);
    setUnitCostLocal(item.unitCostLocal.toString());
    setUnitCostUsd(item.unitCostUsd.toString());
    setReorderLevel(item.reorderLevel.toString());
    setDescription(item.description || '');
    setShowItemModal(true);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName('');
    setSku('');
    setCategory('Secos');
    setUnitOfMeasure('KG');
    setUnitCostLocal('');
    setUnitCostUsd('');
    setReorderLevel('');
    setDescription('');
    setShowItemModal(true);
  };

  // ---------------------------------------------------------------------------
  // ACCIONES
  // ---------------------------------------------------------------------------
  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || !unitOfMeasure.trim()) {
      setAlert({ type: 'error', message: 'El nombre, el SKU y la unidad de medida son obligatorios.' });
      return;
    }

    const payload = {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      unitOfMeasure: unitOfMeasure.trim(),
      unitCostLocal: unitCostLocal ? Number(unitCostLocal) : 0,
      unitCostUsd: unitCostUsd ? Number(unitCostUsd) : 0,
      reorderLevel: reorderLevel ? Number(reorderLevel) : 0,
      description: description.trim() || undefined,
      category: category.trim() || undefined
    };

    try {
      setSubmitLoading(true);
      setAlert(null);

      if (editingItem) {
        await api.updateInventoryItem(editingItem.id, payload);
        showToast(`Ingrediente "${payload.name}" actualizado.`);
      } else {
        await api.createInventoryItem(payload);
        showToast(`Ingrediente "${payload.name}" agregado al catálogo.`);
      }

      setShowItemModal(false);
      loadInventory();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo guardar el ingrediente.' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const openAdjustModal = (item: InventoryItem, direction: 'IN' | 'OUT') => {
    setAdjustTarget(item);
    setAdjustDirection(direction);
    setAdjustQty('');
  };

  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;

    const qty = Number(adjustQty);
    if (!adjustQty || isNaN(qty) || qty <= 0) {
      setAlert({ type: 'error', message: 'Ingresa una cantidad válida mayor que cero.' });
      return;
    }

    const signed = adjustDirection === 'IN' ? qty : -qty;

    try {
      setAdjustLoading(true);
      setAlert(null);
      await api.adjustStock(adjustTarget.id, signed);

      showToast(
        `${adjustDirection === 'IN' ? 'Entrada' : 'Salida'} de ${qty} ${adjustTarget.unitOfMeasure} registrada para "${adjustTarget.name}".`
      );
      setAdjustTarget(null);
      setAdjustQty('');
      loadInventory();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo ajustar el stock.' });
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      setAlert(null);
      await api.deleteInventoryItem(deleteTarget.id);
      showToast(`Ingrediente "${deleteTarget.name}" eliminado.`);
      setDeleteTarget(null);
      loadInventory();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo eliminar el ingrediente.' });
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // DERIVADOS: filtros, indicadores y paginado
  // ---------------------------------------------------------------------------
  const lowStockItems = items.filter(i => Number(i.currentStock) <= Number(i.reorderLevel));

  const totalValueUsd = useMemo(
    () => items.reduce((acc, i) => acc + Number(i.currentStock) * Number(i.unitCostUsd), 0),
    [items]
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter(item => {
      if (categoryFilter !== 'ALL' && (item.category || 'Otros') !== categoryFilter) return false;
      if (!term) return true;
      return [item.name, item.sku, item.description]
        .filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  }, [items, searchTerm, categoryFilter]);

  const pagination = usePagination(filteredItems, 12);

  useEffect(() => {
    pagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, categoryFilter]);

  const stockPercent = (item: InventoryItem) => {
    const reorder = Number(item.reorderLevel);
    if (reorder <= 0) return 100;
    // 100% = doble del nivel de seguridad (referencia visual)
    return Math.min(100, (Number(item.currentStock) / (reorder * 2)) * 100);
  };

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
        title="Inventario"
        subtitle="Supervisa el stock de ingredientes, controla los costos unitarios y anticipa las reposiciones."
        actions={
          <Button onClick={handleOpenCreate}>
            <PlusCircle size={18} />
            Agregar ingrediente
          </Button>
        }
      />

      {/* Indicadores del inventario */}
      {!loading && items.length > 0 && (
        <div className={styles.statsRow}>
          <div className={`glass-panel ${styles.statCard}`}>
            <span className={styles.statLabel}>Artículos en catálogo</span>
            <span className={styles.statValue}>{items.length}</span>
          </div>
          <div className={`glass-panel ${styles.statCard}`}>
            <span className={styles.statLabel}>Valor total (USD)</span>
            <span className={styles.statValue} style={{ color: 'var(--color-usd)' }}>
              ${totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className={`glass-panel ${styles.statCard}`}>
            <span className={styles.statLabel}>Bajo nivel de seguridad</span>
            <span className={styles.statValue} style={{ color: lowStockItems.length > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {lowStockItems.length}
            </span>
          </div>
        </div>
      )}

      {/* Aviso crítico de stock bajo */}
      {lowStockItems.length > 0 && (
        <div className={styles.lowStockBanner} role="alert">
          <AlertTriangle size={24} />
          <div>
            <div className={styles.lowStockTitle}>Reposición urgente ({lowStockItems.length})</div>
            <div className={styles.lowStockText}>
              Estos ingredientes están por debajo de su nivel de seguridad:{' '}
              <strong>{lowStockItems.map(i => i.name).join(', ')}</strong>. Considera registrar una factura de compra a tus proveedores.
            </div>
          </div>
        </div>
      )}

      {/* Avisos */}
      {alert && (
        <Alert type={alert.type} onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Búsqueda, filtros por categoría y selector de vista */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="search"
            placeholder="Buscar por nombre, SKU o descripción..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Buscar ingredientes"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="glow-select"
          aria-label="Filtrar por categoría"
        >
          <option value="ALL">Todas las categorías</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.text}</option>
          ))}
        </select>

        <div className={styles.viewToggle} role="group" aria-label="Modo de vista">
          <button
            type="button"
            className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.viewToggleBtnActive : ''}`}
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
            title="Vista de tarjetas"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.viewToggleBtnActive : ''}`}
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            title="Vista de tabla"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel">
          <EmptyState
            icon={<Boxes size={36} />}
            message={
              items.length === 0
                ? 'El catálogo de inventario está vacío. Agrega tu primer ingrediente para comenzar a controlar el stock.'
                : 'Ningún ingrediente coincide con la búsqueda o el filtro aplicado.'
            }
            action={
              items.length === 0 ? (
                <Button onClick={handleOpenCreate}>
                  <PlusCircle size={16} />
                  Agregar primer ingrediente
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : viewMode === 'grid' ? (
        /* Vista de tarjetas */
        <>
          <div className={styles.grid}>
            {pagination.pageItems.map(item => {
              const isLow = Number(item.currentStock) <= Number(item.reorderLevel);
              return (
                <div key={item.id} className={`${styles.card} glass-panel ${isLow ? styles.cardWarning : ''} glass-card-hover`}>
                  {item.category && <span className={styles.cardCategory}>{item.category}</span>}

                  <h3 className={styles.itemName}>{item.name}</h3>
                  <span className={styles.itemSku}>SKU: {item.sku}</span>

                  {/* Nivel de stock */}
                  <div className={styles.stockPanel}>
                    <span className={styles.stockLabel}>Stock actual</span>
                    <span className={styles.stockVal} style={{ color: isLow ? 'var(--color-danger)' : 'var(--color-usd)' }}>
                      {Number(item.currentStock).toFixed(2)}
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {item.unitOfMeasure}
                      </span>
                    </span>
                  </div>

                  {/* Barra visual stock vs nivel de seguridad */}
                  <div className={styles.stockBar} aria-hidden="true">
                    <div
                      className={styles.stockBarFill}
                      style={{
                        width: `${stockPercent(item)}%`,
                        background: isLow ? 'var(--color-danger)' : 'var(--color-usd)'
                      }}
                    />
                  </div>

                  {/* Costos */}
                  <div className={styles.costPanel}>
                    <div>
                      <div className={styles.stockLabel} style={{ fontSize: '0.65rem', marginBottom: 2 }}>Costo unitario USD</div>
                      <span className={styles.costVal}>${Number(item.unitCostUsd).toFixed(2)}</span>
                    </div>
                    <div>
                      <div className={styles.stockLabel} style={{ fontSize: '0.65rem', marginBottom: 2 }}>Costo unitario {localCode}</div>
                      <span className={styles.costVal}>{Number(item.unitCostLocal).toFixed(2)} {localSymbol}</span>
                    </div>
                  </div>

                  {item.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.4 }}>
                      {item.description}
                    </p>
                  )}

                  <div className={styles.reorderText}>
                    <span>Nivel de seguridad:</span>
                    <span style={{ fontWeight: 600, color: isLow ? 'var(--color-danger)' : undefined }}>
                      {Number(item.reorderLevel).toFixed(2)} {item.unitOfMeasure}
                    </span>
                  </div>

                  {/* Entrada / Salida de stock */}
                  <div className={styles.adjustRow}>
                    <Button variant="secondary" size="sm" onClick={() => openAdjustModal(item, 'IN')} style={{ flex: 1 }}>
                      <ArrowDownToLine size={13} />
                      Entrada
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openAdjustModal(item, 'OUT')} style={{ flex: 1 }}>
                      <ArrowUpFromLine size={13} />
                      Salida
                    </Button>
                  </div>

                  {/* Acciones */}
                  <footer className={styles.cardActions}>
                    <button onClick={() => handleOpenEdit(item)} className={styles.actionBtn}>
                      <Edit3 size={12} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                      style={{ marginLeft: 'auto' }}
                    >
                      <Trash2 size={12} />
                      <span>Eliminar</span>
                    </button>
                  </footer>
                </div>
              );
            })}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            itemsLabel="ingredientes"
          />
        </>
      ) : (
        /* Vista de tabla */
        <section className="glass-panel panel-section">
          <div className="table-scroll">
            <table className={`${styles.table} responsive-table`}>
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>SKU</th>
                  <th>Categoría</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Nivel seguridad</th>
                  <th style={{ textAlign: 'right' }}>Costo USD</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map(item => {
                  const isLow = Number(item.currentStock) <= Number(item.reorderLevel);
                  return (
                    <tr key={item.id}>
                      <td data-label="Ingrediente" style={{ fontWeight: 600 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {isLow && <AlertTriangle size={13} color="var(--color-danger)" />}
                          {item.name}
                        </span>
                      </td>
                      <td data-label="SKU" style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.sku}</td>
                      <td data-label="Categoría">{item.category || '—'}</td>
                      <td data-label="Stock" style={{ textAlign: 'right', fontWeight: 600, color: isLow ? 'var(--color-danger)' : 'var(--color-usd)' }}>
                        {Number(item.currentStock).toFixed(2)} {item.unitOfMeasure}
                      </td>
                      <td data-label="Nivel seguridad" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {Number(item.reorderLevel).toFixed(2)} {item.unitOfMeasure}
                      </td>
                      <td data-label="Costo USD" style={{ textAlign: 'right', fontWeight: 600 }}>
                        ${Number(item.unitCostUsd).toFixed(2)}
                      </td>
                      <td data-label="" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Button variant="secondary" size="sm" onClick={() => openAdjustModal(item, 'IN')}>
                            <ArrowDownToLine size={12} />
                            Entrada
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => openAdjustModal(item, 'OUT')}>
                            <ArrowUpFromLine size={12} />
                            Salida
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(item)}>
                            <Edit3 size={12} />
                            Editar
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(item)}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
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
            itemsLabel="ingredientes"
          />
        </section>
      )}

      {/* Modal: crear / editar ingrediente */}
      {showItemModal && (
        <Modal
          title={editingItem ? `Editar: ${editingItem.name}` : 'Agregar ingrediente'}
          onClose={() => setShowItemModal(false)}
        >
          <form onSubmit={handleSubmitItem} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="item-name" className={styles.label}>Nombre del ingrediente</label>
              <input
                id="item-name"
                type="text"
                placeholder="ej. Queso mozzarella"
                value={name}
                onChange={e => setName(e.target.value)}
                className="glow-input"
                required
              />
            </div>

            <div className={styles.inputRow}>
              <div className={styles.formGroup}>
                <label htmlFor="item-sku" className={styles.label}>SKU / Código</label>
                <input
                  id="item-sku"
                  type="text"
                  placeholder="ej. QSO-MOZ-01"
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  className="glow-input"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="item-category" className={styles.label}>Categoría</label>
                <select
                  id="item-category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="glow-select"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.text}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.formGroup}>
                <label htmlFor="item-uom" className={styles.label}>Unidad de medida</label>
                <input
                  id="item-uom"
                  type="text"
                  placeholder="ej. KG, Litros, Unidades"
                  value={unitOfMeasure}
                  onChange={e => setUnitOfMeasure(e.target.value)}
                  className="glow-input"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="item-reorder" className={styles.label}>Nivel de seguridad (reposición)</label>
                <input
                  id="item-reorder"
                  type="number"
                  step="0.0001"
                  placeholder="ej. 10.0"
                  value={reorderLevel}
                  onChange={e => setReorderLevel(e.target.value)}
                  className="glow-input"
                  required
                />
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.formGroup}>
                <label htmlFor="item-cost-usd" className={styles.label}>Costo unitario USD ($)</label>
                <input
                  id="item-cost-usd"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={unitCostUsd}
                  onChange={e => setUnitCostUsd(e.target.value)}
                  className="glow-input"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="item-cost-local" className={styles.label}>Costo unitario {localCode} ({localSymbol})</label>
                <input
                  id="item-cost-local"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={unitCostLocal}
                  onChange={e => setUnitCostLocal(e.target.value)}
                  className="glow-input"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="item-desc" className={styles.label}>Descripción</label>
              <input
                id="item-desc"
                type="text"
                placeholder="ej. Queso mozzarella premium local para pizzas"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="glow-input"
              />
            </div>

            <Button type="submit" fullWidth loading={submitLoading}>
              {submitLoading ? 'Guardando...' : editingItem ? 'Guardar cambios' : 'Agregar al catálogo'}
            </Button>
          </form>
        </Modal>
      )}

      {/* Modal: ajuste de stock (Entrada / Salida) */}
      {adjustTarget && (
        <Modal
          title={`${adjustDirection === 'IN' ? 'Entrada' : 'Salida'} de stock — ${adjustTarget.name}`}
          onClose={() => setAdjustTarget(null)}
          maxWidth={440}
        >
          <form onSubmit={handleStockAdjust} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tipo de movimiento</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} role="group" aria-label="Tipo de movimiento de stock">
                <button
                  type="button"
                  onClick={() => setAdjustDirection('IN')}
                  className="badge"
                  aria-pressed={adjustDirection === 'IN'}
                  style={{
                    justifyContent: 'center',
                    padding: 10,
                    cursor: 'pointer',
                    background: adjustDirection === 'IN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${adjustDirection === 'IN' ? 'var(--color-usd)' : 'var(--glass-border)'}`,
                    color: adjustDirection === 'IN' ? 'var(--color-usd)' : 'var(--text-secondary)',
                    fontFamily: 'inherit'
                  }}
                >
                  Entrada (compra)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustDirection('OUT')}
                  className="badge"
                  aria-pressed={adjustDirection === 'OUT'}
                  style={{
                    justifyContent: 'center',
                    padding: 10,
                    cursor: 'pointer',
                    background: adjustDirection === 'OUT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${adjustDirection === 'OUT' ? 'var(--color-danger)' : 'var(--glass-border)'}`,
                    color: adjustDirection === 'OUT' ? 'var(--color-danger)' : 'var(--text-secondary)',
                    fontFamily: 'inherit'
                  }}
                >
                  Salida (consumo)
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="adjust-qty" className={styles.label}>
                Cantidad ({adjustTarget.unitOfMeasure})
              </label>
              <input
                id="adjust-qty"
                type="number"
                step="0.0001"
                min="0"
                placeholder="ej. 10"
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
                className="glow-input"
                required
              />
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Stock actual: <strong>{Number(adjustTarget.currentStock).toFixed(2)} {adjustTarget.unitOfMeasure}</strong>
              {adjustQty && !isNaN(Number(adjustQty)) && Number(adjustQty) > 0 && (
                <>
                  {' '}→ Nuevo stock:{' '}
                  <strong style={{ color: adjustDirection === 'IN' ? 'var(--color-usd)' : 'var(--color-danger)' }}>
                    {(Number(adjustTarget.currentStock) + (adjustDirection === 'IN' ? 1 : -1) * Number(adjustQty)).toFixed(2)}{' '}
                    {adjustTarget.unitOfMeasure}
                  </strong>
                </>
              )}
            </p>

            <Button type="submit" fullWidth loading={adjustLoading}>
              {adjustLoading ? 'Registrando...' : `Registrar ${adjustDirection === 'IN' ? 'entrada' : 'salida'}`}
            </Button>
          </form>
        </Modal>
      )}

      {/* Confirmación: eliminar ingrediente */}
      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar ingrediente"
          message={
            <>
              ¿Eliminar de forma permanente el ingrediente <strong>{deleteTarget.name}</strong> (SKU: {deleteTarget.sku})
              del catálogo? Esta acción no se puede deshacer.
            </>
          }
          loading={deleteLoading}
          onConfirm={handleDeleteItem}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
export default Inventory;
