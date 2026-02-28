import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { isFirebaseMode } from './hooks/useCircle';
import './App.css';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const CirclesList = lazy(() => import('./pages/CirclesList').then(m => ({ default: m.CirclesList })));
const JoinCircle = lazy(() => import('./pages/JoinCircle').then(m => ({ default: m.JoinCircle })));
const CirclePage = lazy(() => import('./pages/CirclePage').then(m => ({ default: m.CirclePage })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

function LoadingFallback() {
  return (
    <div className="page">
      <p className="loading">טוען...</p>
    </div>
  );
}

function AppRoutes() {
  const isDemo = !isFirebaseMode();

  return (
    <>
      <OfflineIndicator />
      {isDemo && (
        <div className="demo-banner" role="status">
          מצב דמו – הנתונים נשמרים במכשיר שלך בלבד
        </div>
      )}
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/circles"
            element={
              <ProtectedRoute>
                <CirclesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/join"
            element={
              <ProtectedRoute>
                <JoinCircle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/circle/:circleId"
            element={
              <ProtectedRoute>
                <CirclePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ThemeProvider>
          <AuthProvider>
            <div className="app" dir="rtl">
              <AppRoutes />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
