import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
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

// Spinner component matching the theme
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
    <Loader2 size={48} color="#6366f1" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
    <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', letterSpacing: '0.05em' }}>
      Configuring Workspace...
    </span>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Helper component to check authentication and tenant membership
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user, activeRestaurant } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Superadmins can bypass standard tenant onboarding to manage the platform
  if (user?.role === 'SUPERADMIN') {
    return <>{children}</>;
  }

  // If standard user has no restaurant assigned, force onboarding page
  if (!activeRestaurant) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

// Main Layout Shell including Sidebar and Top Context Header
const AppLayout: React.FC = () => {
  const { user, restaurants, activeRestaurant, switchRestaurant, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={layoutStyles.appShell}>
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className={`${layoutStyles.mobileToggle} mobile-toggle-btn`}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop when sidebar is open on mobile */}
      {mobileMenuOpen && (
        <div
          className={layoutStyles.sidebarOverlay}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Navigation Sidebar */}
      <aside 
        className={`glass-panel ${layoutStyles.sidebar} ${mobileMenuOpen ? layoutStyles.sidebarOpen : layoutStyles.sidebarClosed}`}
      >
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, paddingLeft: 8 }}>
          <ChefHat size={32} color="#6366f1" style={{ filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))' }} />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #f3f4f6, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              RestoFlow
            </h1>
            <span style={{ fontSize: '0.65rem', color: '#6366f1', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Inventory & Cash Flow
            </span>
          </div>
        </div>

        {/* Restaurant Context Switcher (if assigned to multiple or if user is superadmin) */}
        {restaurants.length > 0 && (
          <div style={{ marginBottom: 24, padding: '0 8px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em' }}>
              Active Restaurant
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-sm)', padding: '6px 12px' }}>
              <Building size={16} color="var(--text-secondary)" />
              <select 
                value={activeRestaurant?.id || ''} 
                onChange={(e) => switchRestaurant(e.target.value)}
                className="glow-select"
                style={{ 
                  flex: 1, 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {restaurants.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Navigation Routes */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {user?.role === 'SUPERADMIN' && (
            <Link 
              to="/superadmin" 
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 'var(--border-radius-sm)',
                color: isActive('/superadmin') ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive('/superadmin') ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                border: isActive('/superadmin') ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              className="glass-card-hover"
            >
              <ShieldCheck size={18} color={isActive('/superadmin') ? '#6366f1' : 'var(--text-secondary)'} />
              <span>Superadmin Control</span>
            </Link>
          )}

          {/* Standard Operational Modules (hidden if superadmin has not selected/assigned to a restaurant) */}
          {(activeRestaurant || user?.role !== 'SUPERADMIN') && (
            <>
              <div style={{ height: 1, background: 'var(--glass-border)', margin: '12px 0' }} />
              
              <Link 
                to="/" 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius-sm)',
                  color: isActive('/') ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive('/') ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  border: isActive('/') ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                className="glass-card-hover"
              >
                <LayoutDashboard size={18} color={isActive('/') ? '#6366f1' : 'var(--text-secondary)'} />
                <span>Dashboard</span>
              </Link>

              <Link 
                to="/billings" 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius-sm)',
                  color: isActive('/billings') ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive('/billings') ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  border: isActive('/billings') ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                className="glass-card-hover"
              >
                <Receipt size={18} color={isActive('/billings') ? '#6366f1' : 'var(--text-secondary)'} />
                <span>Billings & Payments</span>
              </Link>

              <Link 
                to="/inventory" 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius-sm)',
                  color: isActive('/inventory') ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive('/inventory') ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  border: isActive('/inventory') ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                className="glass-card-hover"
              >
                <Boxes size={18} color={isActive('/inventory') ? '#6366f1' : 'var(--text-secondary)'} />
                <span>Inventory stock</span>
              </Link>

              <Link 
                to="/exchange-rates" 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius-sm)',
                  color: isActive('/exchange-rates') ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive('/exchange-rates') ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  border: isActive('/exchange-rates') ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                className="glass-card-hover"
              >
                <Coins size={18} color={isActive('/exchange-rates') ? '#6366f1' : 'var(--text-secondary)'} />
                <span>USD exchange Rates</span>
              </Link>
            </>
          )}
        </nav>

        {/* User Card & Logout */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '0 8px' }}>
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: '50%', 
              backgroundColor: user?.role === 'SUPERADMIN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              border: `1px solid ${user?.role === 'SUPERADMIN' ? '#10b981' : '#6366f1'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: user?.role === 'SUPERADMIN' ? '#10b981' : '#6366f1'
            }}>
              {user?.name?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.name}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {activeRestaurant ? `${activeRestaurant.role} • ` : ''}{user?.role.toLowerCase()}
              </p>
            </div>
          </div>
          
          <button 
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              borderRadius: 'var(--border-radius-sm)',
              color: '#ef4444',
              background: 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500,
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={layoutStyles.mainContent}>
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
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            } />

            {/* Authenticated Application routes */}
            <Route path="/*" element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
};
