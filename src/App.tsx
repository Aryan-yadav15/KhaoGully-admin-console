import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import OrdersPage from '@/pages/OrdersPage';
import DriversPage from '@/pages/DriversPage';
import PoolsPageNew from '@/pages/PoolsPageNew';
// import EarningsPage from '@/pages/EarningsPage';
import EarningsPageEnhanced from '@/pages/EarningsPageEnhanced';
import RestaurantPaymentsPage from '@/pages/RestaurantPaymentsPage';
import CommissionSettingsPage from '@/pages/CommissionSettingsPage';
import WebSocketTest from '@/pages/WebSocketTest';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <OrdersPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/drivers"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DriversPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pools"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <PoolsPageNew />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/earnings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <EarningsPageEnhanced />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/restaurant-payments"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RestaurantPaymentsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CommissionSettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ws-test"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <WebSocketTest />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
