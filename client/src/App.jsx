import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AppLayout from './layouts/AppLayout';
import Home from './pages/Home';
import AddExpense from './pages/AddExpense';
import AddIncome from './pages/AddIncome';
import Transfer from './pages/Transfer';
import History from './pages/History';
import Wallets from './pages/Wallets';
import Categories from './pages/Categories';
import Recurring from './pages/Recurring';
import Reports from './pages/Reports';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="boot-screen">
        <div className="glass boot-card">Loading Expense_Tracker…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <Register />
          </PublicOnly>
        }
      />
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="expense" element={<AddExpense />} />
        <Route path="income" element={<AddIncome />} />
        <Route path="transfer" element={<Transfer />} />
        <Route path="history" element={<History />} />
        <Route path="wallets" element={<Wallets />} />
        <Route path="categories" element={<Categories />} />
        <Route path="recurring" element={<Recurring />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
