import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  Building, 
  UserPlus, 
  Users, 
  Plus, 
  Trash2, 
  Globe, 
  Check, 
  AlertCircle,
  Coins
} from 'lucide-react';
import styles from './Superadmin.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPERADMIN' | 'USER';
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  localCurrencyCode: string;
  localCurrencySymbol: string;
  active: boolean;
}

export const Superadmin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  
  // Restaurant Form State
  const [restName, setRestName] = useState('');
  const [restSlug, setRestSlug] = useState('');
  const [currencyCode, setCurrencyCode] = useState('VES');
  const [currencySymbol, setCurrencySymbol] = useState('Bs');
  
  // Assignment Form State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRestId, setSelectedRestId] = useState('');
  const [assignmentRole, setAssignmentRole] = useState<'ADMIN' | 'STAFF'>('ADMIN');

  // Statuses
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [fetchedUsers, fetchedRests] = await Promise.all([
        api.getSuperadminUsers(),
        api.getSuperadminRestaurants()
      ]);
      setUsers(fetchedUsers);
      setRestaurants(fetchedRests);
      
      if (fetchedUsers.length > 0) {
        setSelectedUserId(fetchedUsers[0].id);
      }
      if (fetchedRests.length > 0) {
        setSelectedRestId(fetchedRests[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load system administration data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restName.trim() || !restSlug.trim()) {
      setErrorMsg('Name and URL slug are required');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      
      const newRest = await api.createRestaurant(
        restName.trim(),
        restSlug.trim().toLowerCase().replace(/\s+/g, '-'),
        currencyCode.trim(),
        currencySymbol.trim()
      );

      setSuccessMsg(`Restaurant "${newRest.name}" registered successfully!`);
      setRestName('');
      setRestSlug('');
      
      // Refresh list
      const fetchedRests = await api.getSuperadminRestaurants();
      setRestaurants(fetchedRests);
      if (fetchedRests.length > 0 && !selectedRestId) {
        setSelectedRestId(fetchedRests[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create restaurant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedRestId) {
      setErrorMsg('Please select both a user and a restaurant');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      await api.assignUser(selectedUserId, selectedRestId, assignmentRole);
      
      const targetUser = users.find(u => u.id === selectedUserId);
      const targetRest = restaurants.find(r => r.id === selectedRestId);
      
      setSuccessMsg(`Successfully assigned ${targetUser?.name} to "${targetRest?.name}" as ${assignmentRole}!`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to assign user to restaurant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAssignment = async (userId: string, restaurantId: string) => {
    if (!window.confirm('Are you sure you want to revoke this user assignment?')) return;

    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      await api.removeAssignment(userId, restaurantId);
      setSuccessMsg('Assignment revoked successfully.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to revoke assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading system catalog...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>System Control Room</h1>
        <p className={styles.subtitle}>Platform-level multi-tenancy operations, restaurant enrollment, and user permissions mapping.</p>
      </div>

      {successMsg && (
        <div className={styles.alertSuccess} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className={styles.alertError} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className={styles.grid}>
        {/* Panel 1: Create Restaurant */}
        <section className="glass-panel" style={{ padding: 24 }}>
          <h2 className={styles.panelTitle}>
            <Building size={20} color="var(--color-primary)" />
            <span>Register New Restaurant</span>
          </h2>
          <form onSubmit={handleCreateRestaurant} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Restaurant Name</label>
              <input 
                type="text" 
                placeholder="e.g. La Bella Piazza" 
                value={restName}
                onChange={e => {
                  setRestName(e.target.value);
                  // Auto-generate slug
                  setRestSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                }}
                className="glow-input"
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>URL Slug (Unique)</label>
              <input 
                type="text" 
                placeholder="e.g. la-bella-piazza" 
                value={restSlug}
                onChange={e => setRestSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                className="glow-input"
                required
              />
            </div>

            <div className={styles.currencyRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Local Currency Code</label>
                <input 
                  type="text" 
                  value={currencyCode}
                  onChange={e => setCurrencyCode(e.target.value.toUpperCase())}
                  className="glow-input"
                  maxLength={3}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Symbol</label>
                <input 
                  type="text" 
                  value={currencySymbol}
                  onChange={e => setCurrencySymbol(e.target.value)}
                  className="glow-input"
                  required
                />
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={actionLoading}>
              <Plus size={16} />
              <span>{actionLoading ? 'Saving...' : 'Create Restaurant'}</span>
            </button>
          </form>
        </section>

        {/* Panel 2: Link User to Restaurant */}
        <section className="glass-panel" style={{ padding: 24 }}>
          <h2 className={styles.panelTitle}>
            <UserPlus size={20} color="var(--color-secondary)" />
            <span>Map User to Restaurant</span>
          </h2>
          <form onSubmit={handleAssignUser} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Select User</label>
              <select 
                value={selectedUserId} 
                onChange={e => setSelectedUserId(e.target.value)}
                className="glow-select"
                style={{ width: '100%' }}
                required
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) [{u.role}]
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Select Restaurant</label>
              <select 
                value={selectedRestId} 
                onChange={e => setSelectedRestId(e.target.value)}
                className="glow-select"
                style={{ width: '100%' }}
                required
              >
                {restaurants.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.localCurrencyCode})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Operational Access Role</label>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="radio" 
                    name="assignRole" 
                    checked={assignmentRole === 'ADMIN'}
                    onChange={() => setAssignmentRole('ADMIN')}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span>Restaurant Owner / Admin</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="radio" 
                    name="assignRole" 
                    checked={assignmentRole === 'STAFF'}
                    onChange={() => setAssignmentRole('STAFF')}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span>Operational Staff</span>
                </label>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} style={{ background: 'linear-gradient(135deg, var(--color-secondary) 0%, #06b6d4 100%)' }} disabled={actionLoading}>
              <UserPlus size={16} />
              <span>{actionLoading ? 'Assigning...' : 'Assign User Role'}</span>
            </button>
          </form>
        </section>

        {/* Panel 3: Restaurants Table */}
        <section className={`${styles.tablePanel} glass-panel`} style={{ padding: 24 }}>
          <h2 className={styles.panelTitle}>
            <Building size={20} color="var(--text-primary)" />
            <span>Active Tenants List ({restaurants.length})</span>
          </h2>
          {restaurants.length === 0 ? (
            <div className={styles.emptyState}>No registered restaurants found.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Restaurant Name</th>
                    <th>URL Slug</th>
                    <th>Local Currency</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>/{r.slug}</td>
                      <td>
                        <span style={{ color: 'var(--color-ves)', fontWeight: 600 }}>
                          {r.localCurrencyCode} ({r.localCurrencySymbol})
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-paid">
                          Active Tenant
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Panel 4: Users Table */}
        <section className={`${styles.tablePanel} glass-panel`} style={{ padding: 24 }}>
          <h2 className={styles.panelTitle}>
            <Users size={20} color="var(--text-primary)" />
            <span>System User Accounts ({users.length})</span>
          </h2>
          {users.length === 0 ? (
            <div className={styles.emptyState}>No users registered in the system.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Platform Role</th>
                    <th>Quick Sandbox Assign</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={u.role === 'SUPERADMIN' ? styles.pillAdmin : styles.pillStaff}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.role === 'SUPERADMIN' ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Platform Admin</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                              onClick={() => {
                                setSelectedUserId(u.id);
                                const assignForm = document.querySelector(`.${styles.form}`);
                                if (assignForm) assignForm.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="badge" 
                              style={{ 
                                background: 'rgba(255,255,255,0.05)', 
                                border: '1px solid var(--glass-border)', 
                                color: 'var(--text-primary)', 
                                cursor: 'pointer' 
                              }}
                            >
                              Assign Tenant
                            </button>
                            {restaurants.length > 0 && (
                              <button 
                                onClick={() => handleRevokeAssignment(u.id, restaurants[0].id)}
                                className={styles.actionBtn}
                                title="Revoke access to first restaurant"
                              >
                                <Trash2 size={12} />
                                <span>Revoke</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
export default Superadmin;
