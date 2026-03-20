import React from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PaymentsView from './components/PaymentsView';
import WithdrawalCalculator from './components/WithdrawalCalculator';
import ExpensesView from './components/ExpensesView';
import MigrateData from './components/MigrateData';
import { usePayments } from './hooks/usePayments';

function App() {
  const [currentPath, setCurrentPath] = React.useState('dashboard');
  const [showMigrate, setShowMigrate] = React.useState(true);
  const { payments, withdrawals, expenses, stats, loading, addPayment, deletePayment, editPayment, addWithdrawal, deleteWithdrawal, editWithdrawal, addExpense, deleteExpense, editExpense, simulateSplit } = usePayments();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleMigrationComplete = () => {
    setShowMigrate(false);
    setRefreshKey(k => k + 1);
    window.location.reload();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid var(--border-color)',
            borderTopColor: 'var(--accent-primary)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando datos...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }

    switch (currentPath) {
      case 'dashboard':
        return <Dashboard stats={stats} payments={payments} withdrawals={withdrawals} />;
      case 'payments':
        return <PaymentsView payments={payments} addPayment={addPayment} deletePayment={deletePayment} editPayment={editPayment} />;
      case 'withdrawals':
        return (
          <WithdrawalCalculator
            stats={stats}
            payments={payments}
            expenses={expenses}
            withdrawals={withdrawals}
            addWithdrawal={addWithdrawal}
            deleteWithdrawal={deleteWithdrawal}
            editWithdrawal={editWithdrawal}
            simulateSplit={simulateSplit}
          />
        );
      case 'expenses':
        return <ExpensesView expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense} editExpense={editExpense} />;
      default:
        return <Dashboard stats={stats} payments={payments} withdrawals={withdrawals} />;
    }
  };

  return (
    <Layout currentPath={currentPath} onNavigate={setCurrentPath}>
      {showMigrate && <MigrateData onComplete={handleMigrationComplete} />}
      {renderContent()}
    </Layout>
  );
}

export default App;
