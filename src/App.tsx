import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { DateTime } from 'luxon';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { api } from './services/api';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { Superadmin } from './pages/Superadmin';
import { Dashboard } from './pages/Dashboard';
import { Billings } from './pages/Billings';
import { Inventory } from './pages/Inventory';
import { ExchangeRates } from './pages/ExchangeRates';
import {
  ChefHat,
  LayoutDashboard,
  Receipt,
  Boxes,
  Coins,
  ShieldCheck,
  LogOut,
  Building,
  Loader2,
  Menu,
  X
} from 'lucide-react';
import layoutStyles from './App.module.css';

// Pantalla de carga inicial acorde al tema
const LoadingScreen: React.FC = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#0b0f19',
    gap: 16
  }}>
    <Loader2 size={48} color="#6366f1" className="animate-spin" />
    <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', letterSpacing: '0.05em' }}>
      Preparando tu espacio de trabajo...
    </span>
  </div>
);

// Guard: exige autenticación y pertenencia a un restaurante
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user, activeRestaurant } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Los superadmins pueden saltarse el onboarding para administrar la plataforma
  if (user?.role === 'SUPERADMIN') {
    return <>{children}</>;
  }

  // Usuario estándar sin restaurante asignado: forzar onboarding
  if (!activeRestaurant) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onNavigate: () => void;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, active, onNavigate, badge }) => (
  <Link
    to={to}
    onClick={onNavigate}
    className={`${layoutStyles.navItem} ${active ? layoutStyles.navItemActive : ''}`}
    aria-current={active ? 'page' : undefined}
  >
    {icon}
    <span>{label}</span>
    {badge != null && badge > 0 && (
      <span className={layoutStyles.navBadge} title={`${badge} factura(s) vencida(s)`}>
        {badge}
      </span>
    )}
  </Link>
);

// Shell principal: sidebar de navegación + área de contenido
const AppLayout: React.FC = () => {
  const { user, restaurants, activeRestaurant, switchRestaurant, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [switchingTenant, setSwitchingTenant] = React.useState(false);
  const [overdueCount, setOverdueCount] = React.useState(0);

  const isActive = (path: string) => location.pathname === path;
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Señal operativa: facturas vencidas sin pagar (badge en navegación)
  React.useEffect(() => {
    let cancelled = false;
    const loadOverdue = async () => {
      if (!activeRestaurant) return;
      try {
        const bills = await api.getBillings();
        const today = DateTime.now().toFormat('yyyy-LL-dd');
        const overdue = bills.filter(
          (b: any) => (b.status === 'PENDING' || b.status === 'PARTIALLY_PAID') && b.dueDate < today
        ).length;
        if (!cancelled) setOverdueCount(overdue);
      } catch {
        // Silencioso: el badge es informativo, no bloquea la navegación
      }
    };
    loadOverdue();
    return () => { cancelled = true; };
  }, [activeRestaurant, location.pathname]);

  const handleSwitchRestaurant = (id: string) => {
    if (id === activeRestaurant?.id) return;
    setSwitchingTenant(true);
    switchRestaurant(id); // recarga la página con el nuevo contexto
  };

  const iconColor = (path: string) => (isActive(path) ? '#6366f1' : 'var(--text-secondary)');
  const isSuperadmin = user?.role === 'SUPERADMIN';

  return (
    <div className={layoutStyles.appShell}>
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>

      {switchingTenant && (
        <div className={layoutStyles.switchingOverlay} role="status">
          <Loader2 size={40} color="#6366f1" className="animate-spin" />
          <span>Cambiando de restaurante...</span>
        </div>
      )}

      {/* Botón de menú móvil */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className={`${layoutStyles.mobileToggle} mobile-toggle-btn`}
        aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Fondo oscurecido cuando el sidebar está abierto en móvil */}
      {mobileMenuOpen && (
        <div
          className={layoutStyles.sidebarOverlay}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Barra lateral de navegación */}
      <aside
        className={`glass-panel ${layoutStyles.sidebar} ${mobileMenuOpen ? layoutStyles.sidebarOpen : layoutStyles.sidebarClosed}`}
      >
        {/* Marca */}
        <div className={layoutStyles.brand}>
          <ChefHat size={32} color="#6366f1" style={{ filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))' }} />
          <div>
            <h1 className={layoutStyles.brandName}>RestoFlow</h1>
            <span className={layoutStyles.brandTagline}>Inventario y Flujo de Caja</span>
          </div>
        </div>

        {/* Selector de restaurante activo */}
        {restaurants.length > 0 && (
          <div className={layoutStyles.tenantSwitcher}>
            <label htmlFor="tenant-select" className={layoutStyles.tenantLabel}>
              Restaurante activo
            </label>
            <div className={layoutStyles.tenantSelectWrap}>
              <Building size={16} color="var(--text-secondary)" />
              <select
                id="tenant-select"
                value={activeRestaurant?.id || ''}
                onChange={(e) => handleSwitchRestaurant(e.target.value)}
                className={layoutStyles.tenantSelect}
                disabled={switchingTenant}
              >
                {restaurants.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Rutas de navegación */}
        <nav className={layoutStyles.nav} aria-label="Navegación principal">
          {isSuperadmin && (
            <NavItem
              to="/superadmin"
              icon={<ShieldCheck size={18} color={iconColor('/superadmin')} />}
              label="Panel Superadmin"
              active={isActive('/superadmin')}
              onNavigate={closeMobileMenu}
            />
          )}

          {/* Módulos operativos (ocultos si el superadmin no tiene restaurante seleccionado) */}
          {(activeRestaurant || !isSuperadmin) && (
            <>
              {isSuperadmin && <div className={layoutStyles.navDivider} aria-hidden="true" />}

              <NavItem
                to="/"
                icon={<LayoutDashboard size={18} color={iconColor('/')} />}
                label="Caja"
                active={isActive('/')}
                onNavigate={closeMobileMenu}
              />
              <NavItem
                to="/billings"
                icon={<Receipt size={18} color={iconColor('/billings')} />}
                label="Facturas y Pagos"
                active={isActive('/billings')}
                onNavigate={closeMobileMenu}
                badge={overdueCount}
              />
              <NavItem
                to="/inventory"
                icon={<Boxes size={18} color={iconColor('/inventory')} />}
                label="Inventario"
                active={isActive('/inventory')}
                onNavigate={closeMobileMenu}
              />
              <NavItem
                to="/exchange-rates"
                icon={<Coins size={18} color={iconColor('/exchange-rates')} />}
                label="Tasas de Cambio"
                active={isActive('/exchange-rates')}
                onNavigate={closeMobileMenu}
              />
            </>
          )}
        </nav>

        {/* Tarjeta de usuario y cierre de sesión */}
        <div className={layoutStyles.userSection}>
          <div className={layoutStyles.userCard}>
            <div
              className={layoutStyles.userAvatar}
              style={{
                backgroundColor: isSuperadmin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                border: `1px solid ${isSuperadmin ? '#10b981' : '#6366f1'}`,
                color: isSuperadmin ? '#10b981' : '#6366f1'
              }}
            >
              {user?.name?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div className={layoutStyles.userInfo}>
              <p className={layoutStyles.userName}>{user?.name}</p>
              <p className={layoutStyles.userRole}>
                {activeRestaurant
                  ? `${activeRestaurant.role === 'ADMIN' ? 'Administrador' : 'Personal'} • `
                  : ''}
                {isSuperadmin ? 'Superadmin' : 'Usuario'}
              </p>
            </div>
          </div>

          <button onClick={logout} className={layoutStyles.logoutBtn}>
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Área principal de contenido */}
      <main id="main-content" className={layoutStyles.mainContent}>
        {activeRestaurant && (
          <div className={layoutStyles.contextBar}>
            <Building size={14} />
            <span>Operando en</span>
            <span className={layoutStyles.contextBarName}>{activeRestaurant.name}</span>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/billings" element={<Billings />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/exchange-rates" element={<ExchangeRates />} />
          <Route path="/superadmin" element={<Superadmin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={
                <RequireAuth>
                  <Onboarding />
                </RequireAuth>
              } />

              {/* Rutas autenticadas de la aplicación */}
              <Route path="/*" element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              } />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
};
