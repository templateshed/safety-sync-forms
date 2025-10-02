import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from '@/contexts/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';

// Lazy load pages for better performance
const LandingPage = lazy(() => import('@/pages/Index'));
const DashboardLayout = lazy(() => import('@/components/DashboardLayout'));
const Overview = lazy(() => import('@/pages/dashboard/Overview'));
const MyForms = lazy(() => import('@/pages/dashboard/MyForms'));
const Responses = lazy(() => import('@/pages/dashboard/Responses'));
const Documentation = lazy(() => import('@/pages/dashboard/Documentation'));
const Settings = lazy(() => import('@/pages/dashboard/Settings'));
const CreateForm = lazy(() => import('@/pages/dashboard/CreateForm'));
const FormBuilder = lazy(() => import('@/pages/FormBuilder'));
const FormFiller = lazy(() => import('@/pages/FormFiller'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-950">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <p className="text-gray-400">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <LandingPage />
                  </ProtectedRoute>
                }
              />

              {/* Form filling (public or authenticated) */}
              <Route path="/form/:formId" element={<FormFiller />} />
              <Route path="/f/:shortCode" element={<FormFiller />} />

              {/* Protected dashboard routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard/overview" replace />} />
                <Route path="overview" element={<Overview />} />
                <Route path="forms" element={<MyForms />} />
                <Route path="responses" element={<Responses />} />
                <Route path="documentation" element={<Documentation />} />
                <Route path="settings" element={<Settings />} />
                <Route path="create" element={<CreateForm />} />
              </Route>

              {/* Form builder */}
              <Route
                path="/builder/:formId"
                element={
                  <ProtectedRoute>
                    <FormBuilder />
                  </ProtectedRoute>
                }
              />

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
