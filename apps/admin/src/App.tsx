import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layout/AdminLayout';
import { AuthProvider } from './components/AuthProvider';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { adminChildRoutes } from './config/routes';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {adminChildRoutes.map((route, index) => (
            <Route
              key={route.path ?? `index-${index}`}
              path={route.path}
              index={route.index}
              element={route.element}
            />
          ))}
        </Route>
      </Routes>
    </AuthProvider>
  );
}
