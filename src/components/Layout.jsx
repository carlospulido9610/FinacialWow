import React, { useState } from 'react';
import { LayoutDashboard, Wallet, CreditCard, ReceiptText, Menu, X, Settings, LogOut } from 'lucide-react';

export default function Layout({ children, currentPath, onNavigate }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'payments', icon: Wallet, label: 'Mis Pagos' },
    { id: 'withdrawals', icon: CreditCard, label: 'Retiros' },
    { id: 'expenses', icon: ReceiptText, label: 'Gastos Comunes' },
  ];

  return (
    <div className="layout-wrapper">
      {/* Sidebar — icon-only, inspired by reference */}
      <aside className={`sidebar ${isMobileOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-logo">F</div>
        <nav className="nav-menu">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              title={label}
              onClick={() => { onNavigate(id); setIsMobileOpen(false); }}
              className={`nav-item ${currentPath === id ? 'active' : ''}`}
            >
              <Icon size={20} />
            </button>
          ))}
        </nav>
        <div className="nav-bottom">
          <button className="nav-item" title="Configuración"><Settings size={20} /></button>
          <button className="nav-item" title="Salir"><LogOut size={20} /></button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="top-header">
          <div className="flex items-center gap-4">
            <button className="mobile-menu-btn icon-btn" onClick={() => setIsMobileOpen(!isMobileOpen)}>
              {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {navItems.find(n => n.id === currentPath)?.label ?? 'Dashboard'}
            </h2>
          </div>


        </header>

        <main className="content-area">
          <div className="content-container animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
