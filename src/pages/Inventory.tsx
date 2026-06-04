import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Boxes, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  Sparkles, 
  PlusCircle, 
  Check, 
  Loader2, 
  Scale, 
  HelpCircle,
  TrendingDown,
  ArrowRightLeft
} from 'lucide-react';
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

export const Inventory: React.FC = () => {
  const { activeRestaurant } = useAuth();
  
  // Lists & Loaders
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Inline Adjustments State (keyed by item ID)
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);

  // Success / Error Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ---------------------------------------------------------------------------
  // CATALOG FORM STATES
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
      setAlert({ type: 'error', message: err?.message || 'Failed to retrieve stock list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRestaurant) {
      loadInventory();
    }
  }, [activeRestaurant]);

  // Open modal for editing
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

  // Open modal for creating
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
  // SUBMISSIONS & ACTIONS
  // ---------------------------------------------------------------------------
  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || !unitOfMeasure.trim()) {
      setAlert({ type: 'error', message: 'Name, SKU, and Unit of Measure are required' });
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
        setAlert({ type: 'success', message: `Ingredient "${payload.name}" updated successfully!` });
      } else {
        await api.createInventoryItem(payload);
        setAlert({ type: 'success', message: `Ingredient "${payload.name}" added to pantry catalog.` });
      }

      setShowItemModal(false);
      loadInventory();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to save inventory item.' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStockAdjust = async (id: string) => {
    const val = adjustments[id];
    if (!val || isNaN(Number(val))) {
      setAlert({ type: 'error', message: 'Please enter a valid positive or negative number to adjust stock level.' });
      return;
    }

    try {
      setAdjustingItemId(id);
      setAlert(null);
      await api.adjustStock(id, Number(val));
      
      const targetItem = items.find(i => i.id === id);
      setAlert({ 
        type: 'success', 
        message: `Successfully adjusted stock for "${targetItem?.name}" by ${Number(val) > 0 ? '+' : ''}${val} ${targetItem?.unitOfMeasure}!` 
      });

      // Clear input
      setAdjustments(prev => ({ ...prev, [id]: '' }));
      loadInventory();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to adjust stock level.' });
    } finally {
      setAdjustingItemId(null);
    }
  };

  const handleDeleteItem = async (id: string, itemName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete ingredient "${itemName}" from the database?`)) return;

    try {
      setAlert(null);
      await api.deleteInventoryItem(id);
      setAlert({ type: 'success', message: `Ingredient "${itemName}" deleted.` });
      loadInventory();
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to delete item.' });
    }
  };

  const lowStockItems = items.filter(i => Number(i.currentStock) <= Number(i.reorderLevel));

  if (!activeRestaurant) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading active restaurant profile...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Title Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Restaurant Inventory Pantry</h1>
          <p className={styles.subtitle}>Supervise raw ingredients stock levels, track unit costs, and trigger reorders.</p>
        </div>

        <button onClick={handleOpenCreate} className={styles.headerBtn}>
          <PlusCircle size={18} />
          <span>Add raw ingredient</span>
        </button>
      </header>

      {/* Low stock critical warnings banner */}
      {lowStockItems.length > 0 && (
        <div className={styles.lowStockBanner}>
          <AlertTriangle size={24} />
          <div>
            <div className={styles.lowStockTitle}>Critical: Supplies Reorder Warning ({lowStockItems.length})</div>
            <div className={styles.lowStockText}>
              The following ingredients have fallen below their safety stock thresholds: {' '}
              <strong>{lowStockItems.map(i => i.name).join(', ')}</strong>. Please issue billing statements to suppliers.
            </div>
          </div>
        </div>
      )}

      {/* Success/Error notifications */}
      {alert && (
        <div 
          className={alert.type === 'success' ? styles.alertSuccess : styles.alertError}
          style={{ 
            padding: 16, 
            borderRadius: 'var(--border-radius-sm)', 
            marginBottom: 24, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            background: alert.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${alert.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            color: alert.type === 'success' ? '#10b981' : '#ef4444'
          }}
        >
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{alert.message}</span>
          <button 
            onClick={() => setAlert(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        /* Inventory Grid layout */
        <div className={styles.grid}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              Pantry catalog is currently empty. Click "Add raw ingredient" above to log your first supply item!
            </div>
          ) : (
            items.map(item => {
              const isLow = Number(item.currentStock) <= Number(item.reorderLevel);
              return (
                <div key={item.id} className={`${styles.card} glass-panel ${isLow ? styles.cardWarning : ''} glass-card-hover`}>
                  {item.category && <span className={styles.cardCategory}>{item.category}</span>}
                  
                  <h3 className={styles.itemName}>{item.name}</h3>
                  <span className={styles.itemSku}>SKU: {item.sku}</span>

                  {/* Stock Status */}
                  <div className={styles.stockPanel}>
                    <span className={styles.stockLabel}>Stock Level</span>
                    <span className={styles.stockVal} style={{ color: isLow ? '#ef4444' : 'var(--color-usd)' }}>
                      {Number(item.currentStock).toFixed(2)}
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {item.unitOfMeasure}
                      </span>
                    </span>
                  </div>

                  {/* Pricing and Costs */}
                  <div className={styles.costPanel}>
                    <div>
                      <div className={styles.stockLabel} style={{ fontSize: '0.65rem', marginBottom: 2 }}>Unit Cost USD</div>
                      <span className={styles.costVal}>${Number(item.unitCostUsd).toFixed(2)}</span>
                    </div>
                    <div>
                      <div className={styles.stockLabel} style={{ fontSize: '0.65rem', marginBottom: 2 }}>Unit Cost {localCode}</div>
                      <span className={styles.costVal}>{Number(item.unitCostLocal).toFixed(2)} Bs</span>
                    </div>
                  </div>

                  {/* Description if present */}
                  {item.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.4 }}>
                      {item.description}
                    </p>
                  )}

                  {/* Threshold Indicators */}
                  <div className={styles.reorderText}>
                    <span>Safety Reorder Level:</span>
                    <span style={{ fontWeight: 600, color: isLow ? '#ef4444' : undefined }}>
                      {Number(item.reorderLevel).toFixed(2)} {item.unitOfMeasure}
                    </span>
                  </div>

                  {/* Stock Quick adjustments panel (+/- adjustments) */}
                  <div className={styles.adjustRow}>
                    <input 
                      type="number" 
                      placeholder="e.g. +10 or -5"
                      value={adjustments[item.id] || ''}
                      onChange={e => setAdjustments(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="glow-input"
                      style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
                      disabled={adjustingItemId === item.id}
                    />
                    <button 
                      onClick={() => handleStockAdjust(item.id)}
                      className={styles.adjustBtn}
                      style={{ flex: '0 0 80px', padding: '6px 12px', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)' }}
                      disabled={adjustingItemId === item.id}
                    >
                      {adjustingItemId === item.id ? 'Saving...' : 'Adjust'}
                    </button>
                  </div>

                  {/* Card Actions */}
                  <footer className={styles.cardActions}>
                    <button onClick={() => handleOpenEdit(item)} className={styles.actionBtn}>
                      <Edit3 size={12} />
                      <span>Edit catalog</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(item.id, item.name)} 
                      className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                      style={{ marginLeft: 'auto' }}
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  </footer>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* -----------------------------------------------------------------------
          MODALS SECTION
          ----------------------------------------------------------------------- */}
      {showItemModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass-panel`}>
            <header className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingItem ? `Edit Catalog: ${editingItem.name}` : 'Add Raw supplies Ingredient'}
              </h2>
              <button onClick={() => setShowItemModal(false)} className={styles.modalClose}>×</button>
            </header>

            <form onSubmit={handleSubmitItem} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Ingredient Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Queso Mozzarella"
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="glow-input"
                  required
                />
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>SKU / Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. QSO-MOZ-01"
                    value={sku} 
                    onChange={e => setSku(e.target.value)} 
                    className="glow-input"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Category</label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                    className="glow-select"
                  >
                    <option value="Secos">Dry Goods (Secos)</option>
                    <option value="Lácteos">Dairy (Lácteos)</option>
                    <option value="Carnes">Meats (Carnes)</option>
                    <option value="Verduras">Produce (Verduras/Frutas)</option>
                    <option value="Líquidos">Liquids (Líquidos)</option>
                    <option value="Panadería">Bakery (Panadería)</option>
                    <option value="Otros">Others (Otros)</option>
                  </select>
                </div>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Unit of Measure</label>
                  <input 
                    type="text" 
                    placeholder="e.g. KG, Liters, Units"
                    value={unitOfMeasure} 
                    onChange={e => setUnitOfMeasure(e.target.value)} 
                    className="glow-input"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Reorder Safety stock level</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    placeholder="e.g. 10.0"
                    value={reorderLevel} 
                    onChange={e => setReorderLevel(e.target.value)} 
                    className="glow-input"
                    required
                  />
                </div>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Unit Cost USD ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={unitCostUsd} 
                    onChange={e => setUnitCostUsd(e.target.value)} 
                    className="glow-input"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Unit Cost {localCode} (Bs)</label>
                  <input 
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
                <label className={styles.label}>Ingredient Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Queso Mozzarella premium local para pizzas"
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="glow-input"
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={submitLoading}>
                {submitLoading ? 'Saving...' : 'Save Ingredient Catalog'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Inventory;
