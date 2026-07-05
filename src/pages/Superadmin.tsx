import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import {
  Building,
  UserPlus,
  Users,
  Plus,
  Trash2,
  Search
} from 'lucide-react';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import { Pagination, usePagination } from '../components/Pagination';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
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

type Tab = 'restaurants' | 'users' | 'assignments';

export const Superadmin: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('restaurants');
  const [users, setUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  // Formulario de restaurante
  const [restName, setRestName] = useState('');
  const [restSlug, setRestSlug] = useState('');
  const [currencyCode, setCurrencyCode] = useState('VES');
  const [currencySymbol, setCurrencySymbol] = useState('Bs');

  // Formulario de asignación
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRestId, setSelectedRestId] = useState('');
  const [assignmentRole, setAssignmentRole] = useState<'ADMIN' | 'STAFF'>('ADMIN');

  // Estado
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // Revocación de acceso con confirmación
  const [revokeTarget, setRevokeTarget] = useState<{ user: User; restaurant: Restaurant } | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setAlert(null);
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
      setAlert({ type: 'error', message: err?.message || 'No se pudo cargar la información de administración.' });
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
      setAlert({ type: 'error', message: 'El nombre y el slug de URL son obligatorios.' });
      return;
    }

    try {
      setActionLoading(true);
      setAlert(null);

      const newRest = await api.createRestaurant(
        restName.trim(),
        restSlug.trim().toLowerCase().replace(/\s+/g, '-'),
        currencyCode.trim(),
        currencySymbol.trim()
      );

      showToast(`Restaurante "${newRest.name}" registrado correctamente.`);
      setRestName('');
      setRestSlug('');

      const fetchedRests = await api.getSuperadminRestaurants();
      setRestaurants(fetchedRests);
      if (fetchedRests.length > 0 && !selectedRestId) {
        setSelectedRestId(fetchedRests[0].id);
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo crear el restaurante.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedRestId) {
      setAlert({ type: 'error', message: 'Selecciona un usuario y un restaurante.' });
      return;
    }

    try {
      setActionLoading(true);
      setAlert(null);

      await api.assignUser(selectedUserId, selectedRestId, assignmentRole);

      const targetUser = users.find(u => u.id === selectedUserId);
      const targetRest = restaurants.find(r => r.id === selectedRestId);

      showToast(
        `${targetUser?.name} asignado a "${targetRest?.name}" como ${assignmentRole === 'ADMIN' ? 'Administrador' : 'Personal'}.`
      );
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo asignar el usuario al restaurante.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAssignment = async () => {
    if (!revokeTarget) return;
    try {
      setRevokeLoading(true);
      setAlert(null);
      await api.removeAssignment(revokeTarget.user.id, revokeTarget.restaurant.id);
      showToast(`Acceso de ${revokeTarget.user.name} a "${revokeTarget.restaurant.name}" revocado.`);
      setRevokeTarget(null);
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'No se pudo revocar la asignación.' });
      setRevokeTarget(null);
    } finally {
      setRevokeLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u => [u.name, u.email].join(' ').toLowerCase().includes(term));
  }, [users, userSearch]);

  const usersPagination = usePagination(filteredUsers, 10);
  const restsPagination = usePagination(restaurants, 10);

  useEffect(() => {
    usersPagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch]);

  const tabs: { id: Tab; text: string; icon: React.ReactNode }[] = [
    { id: 'restaurants', text: `Restaurantes (${restaurants.length})`, icon: <Building size={16} /> },
    { id: 'users', text: `Usuarios (${users.length})`, icon: <Users size={16} /> },
    { id: 'assignments', text: 'Asignaciones', icon: <UserPlus size={16} /> },
  ];

  return (
    <div className={styles.container}>
      <PageHeader
        title="Administración de la plataforma"
        subtitle="Registro de restaurantes, cuentas de usuario y asignación de permisos multi-tenant."
      />

      {/* Pestañas */}
      <nav className={styles.tabsRow} aria-label="Secciones de administración">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabBtnActive : ''}`}
            aria-current={activeTab === t.id ? 'page' : undefined}
          >
            {t.icon}
            <span>{t.text}</span>
          </button>
        ))}
      </nav>

      {alert && (
        <Alert type={alert.type} onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {loading ? (
        <section className="glass-panel panel-section">
          <TableSkeleton rows={5} />
        </section>
      ) : activeTab === 'restaurants' ? (
        /* PESTAÑA: RESTAURANTES */
        <div className={styles.grid}>
          <section className="glass-panel panel-section">
            <h2 className={styles.panelTitle}>
              <Building size={20} color="var(--color-primary)" />
              <span>Registrar restaurante</span>
            </h2>
            <form onSubmit={handleCreateRestaurant} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="rest-name" className={styles.label}>Nombre del restaurante</label>
                <input
                  id="rest-name"
                  type="text"
                  placeholder="ej. La Bella Piazza"
                  value={restName}
                  onChange={e => {
                    setRestName(e.target.value);
                    setRestSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }}
                  className="glow-input"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="rest-slug" className={styles.label}>Slug de URL (único)</label>
                <input
                  id="rest-slug"
                  type="text"
                  placeholder="ej. la-bella-piazza"
                  value={restSlug}
                  onChange={e => setRestSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                  className="glow-input"
                  required
                />
              </div>

              <div className={styles.currencyRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="rest-currency" className={styles.label}>Código de moneda local</label>
                  <input
                    id="rest-currency"
                    type="text"
                    value={currencyCode}
                    onChange={e => setCurrencyCode(e.target.value.toUpperCase())}
                    className="glow-input"
                    maxLength={3}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="rest-symbol" className={styles.label}>Símbolo</label>
                  <input
                    id="rest-symbol"
                    type="text"
                    value={currencySymbol}
                    onChange={e => setCurrencySymbol(e.target.value)}
                    className="glow-input"
                    required
                  />
                </div>
              </div>

              <Button type="submit" fullWidth loading={actionLoading}>
                <Plus size={16} />
                {actionLoading ? 'Guardando...' : 'Crear restaurante'}
              </Button>
            </form>
          </section>

          <section className="glass-panel panel-section">
            <h2 className={styles.panelTitle}>
              <Building size={20} color="var(--text-primary)" />
              <span>Restaurantes activos</span>
            </h2>
            {restaurants.length === 0 ? (
              <EmptyState
                icon={<Building size={32} />}
                message="No hay restaurantes registrados todavía."
              />
            ) : (
              <>
                <div className={`${styles.tableWrapper} table-scroll`}>
                  <table className={`${styles.table} responsive-table`}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Slug</th>
                        <th>Moneda local</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restsPagination.pageItems.map(r => (
                        <tr key={r.id}>
                          <td data-label="Nombre" style={{ fontWeight: 600 }}>{r.name}</td>
                          <td data-label="Slug" style={{ color: 'var(--text-secondary)' }}>/{r.slug}</td>
                          <td data-label="Moneda">
                            <span style={{ color: 'var(--color-ves)', fontWeight: 600 }}>
                              {r.localCurrencyCode} ({r.localCurrencySymbol})
                            </span>
                          </td>
                          <td data-label="Estado">
                            <span className="badge badge-paid">Activo</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={restsPagination.page}
                  totalPages={restsPagination.totalPages}
                  total={restsPagination.total}
                  pageSize={restsPagination.pageSize}
                  onPageChange={restsPagination.setPage}
                  itemsLabel="restaurantes"
                />
              </>
            )}
          </section>
        </div>
      ) : activeTab === 'users' ? (
        /* PESTAÑA: USUARIOS */
        <section className="glass-panel panel-section">
          <div className={styles.usersToolbar}>
            <h2 className={styles.panelTitle} style={{ margin: 0, border: 'none', padding: 0 }}>
              <Users size={20} color="var(--text-primary)" />
              <span>Cuentas de usuario</span>
            </h2>
            <div className={styles.searchBox}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="search"
                placeholder="Buscar por nombre o correo..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                aria-label="Buscar usuarios"
              />
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={<Users size={32} />}
              message={users.length === 0 ? 'No hay usuarios registrados en el sistema.' : 'Ningún usuario coincide con la búsqueda.'}
            />
          ) : (
            <>
              <div className={`${styles.tableWrapper} table-scroll`}>
                <table className={`${styles.table} responsive-table`}>
                  <thead>
                    <tr>
                      <th>Nombre completo</th>
                      <th>Correo electrónico</th>
                      <th>Rol de plataforma</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersPagination.pageItems.map(u => (
                      <tr key={u.id}>
                        <td data-label="Nombre" style={{ fontWeight: 600 }}>{u.name}</td>
                        <td data-label="Correo">{u.email}</td>
                        <td data-label="Rol">
                          <span className={u.role === 'SUPERADMIN' ? styles.pillAdmin : styles.pillStaff}>
                            {u.role === 'SUPERADMIN' ? 'Superadmin' : 'Usuario'}
                          </span>
                        </td>
                        <td data-label="">
                          {u.role === 'SUPERADMIN' ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Admin de plataforma</span>
                          ) : (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSelectedUserId(u.id);
                                  setActiveTab('assignments');
                                }}
                              >
                                <UserPlus size={13} />
                                Asignar restaurante
                              </Button>
                              {restaurants.length > 0 && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => setRevokeTarget({ user: u, restaurant: restaurants[0] })}
                                  title={`Revocar acceso a ${restaurants[0].name}`}
                                >
                                  <Trash2 size={13} />
                                  Revocar
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={usersPagination.page}
                totalPages={usersPagination.totalPages}
                total={usersPagination.total}
                pageSize={usersPagination.pageSize}
                onPageChange={usersPagination.setPage}
                onPageSizeChange={usersPagination.setPageSize}
                itemsLabel="usuarios"
              />
            </>
          )}
        </section>
      ) : (
        /* PESTAÑA: ASIGNACIONES */
        <div className={styles.grid}>
          <section className="glass-panel panel-section">
            <h2 className={styles.panelTitle}>
              <UserPlus size={20} color="var(--color-secondary)" />
              <span>Vincular usuario a restaurante</span>
            </h2>
            <form onSubmit={handleAssignUser} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="assign-user" className={styles.label}>Usuario</label>
                <select
                  id="assign-user"
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="glow-select"
                  style={{ width: '100%' }}
                  required
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="assign-rest" className={styles.label}>Restaurante</label>
                <select
                  id="assign-rest"
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
                <span className={styles.label}>Rol operativo</span>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="assignRole"
                      checked={assignmentRole === 'ADMIN'}
                      onChange={() => setAssignmentRole('ADMIN')}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span>Dueño / Administrador</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="assignRole"
                      checked={assignmentRole === 'STAFF'}
                      onChange={() => setAssignmentRole('STAFF')}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span>Personal operativo</span>
                  </label>
                </div>
              </div>

              <Button type="submit" fullWidth loading={actionLoading}>
                <UserPlus size={16} />
                {actionLoading ? 'Asignando...' : 'Asignar usuario'}
              </Button>
            </form>
          </section>

          <section className="glass-panel panel-section">
            <h2 className={styles.panelTitle}>
              <Users size={20} color="var(--text-primary)" />
              <span>Cómo funcionan los roles</span>
            </h2>
            <ul className={styles.rolesHelp}>
              <li>
                <strong>Dueño / Administrador:</strong> acceso completo al restaurante — caja,
                facturas, pagos, inventario y tasas de cambio.
              </li>
              <li>
                <strong>Personal operativo:</strong> acceso operativo del día a día en el
                restaurante asignado.
              </li>
              <li>
                Un mismo usuario puede pertenecer a varios restaurantes; desde la barra lateral
                podrá alternar entre ellos.
              </li>
            </ul>
          </section>
        </div>
      )}

      {/* Confirmación: revocar asignación */}
      {revokeTarget && (
        <ConfirmDialog
          title="Revocar acceso"
          message={
            <>
              ¿Revocar el acceso de <strong>{revokeTarget.user.name}</strong> al restaurante{' '}
              <strong>{revokeTarget.restaurant.name}</strong>? El usuario dejará de ver los datos
              de ese restaurante de inmediato.
            </>
          }
          confirmLabel="Revocar acceso"
          loading={revokeLoading}
          onConfirm={handleRevokeAssignment}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
};
export default Superadmin;
