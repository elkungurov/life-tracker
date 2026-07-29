import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SobrietyPage from './pages/SobrietyPage';
import FinancePage from './pages/FinancePage';

function ProtectedRoute({ children }) {
  const { isAuth, loading } = useAuth();
  if (loading) return null;
  if (!isAuth) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuth, loading } = useAuth();
  if (loading) return null;
  if (isAuth) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/sobriety" element={<ProtectedRoute><SobrietyPage /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute><FinancePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
