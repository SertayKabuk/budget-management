import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useTranslation } from './contexts/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import GroupPage from './pages/GroupPage';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import UserRoleManagementPage from './pages/UserRoleManagementPage';
import AnalyticsPage from './pages/AnalyticsPage';

const queryClient = new QueryClient();

function AppContent() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4 sm:gap-6">
              <Link to="/" className="flex items-center px-2 py-2 text-gray-700 hover:text-gray-900">
                <span className="text-lg sm:text-xl font-bold">{t.nav.title}</span>
              </Link>
              {/* Desktop Navigation */}
              {isAuthenticated && (
                <div className="hidden md:flex gap-6">
                  <Link 
                    to="/analytics" 
                    className="flex items-center px-2 py-2 text-gray-600 hover:text-gray-900 text-sm"
                  >
                    📊 {t.nav.analytics}
                  </Link>
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="flex items-center px-2 py-2 text-gray-600 hover:text-gray-900 text-sm"
                    >
                      ⚙️ {t.nav.admin}
                    </Link>
                  )}
                </div>
              )}
            </div>
            
            {isAuthenticated && (
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Desktop User Info */}
                <div className="hidden sm:flex items-center gap-3">
                  {user?.picture ? (
                    <img 
                      src={user.picture} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center ring-2 ring-gray-200">
                      <span className="text-white text-sm font-semibold">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm text-gray-700 hidden lg:inline">{user?.name}</span>
                </div>
                
                {/* Desktop Logout Button */}
                <button
                  onClick={logout}
                  className="hidden sm:block px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {t.nav.logout}
                </button>
                
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  aria-label="Toggle menu"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isAuthenticated && mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/analytics"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                📊 {t.nav.analytics}
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ⚙️ {t.nav.admin}
                </Link>
              )}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-5">
                {user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user?.name}</div>
                  <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  {t.nav.logout}
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-0 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <UserRoleManagementPage />
              </AdminRoute>
            }
          />
          <Route
            path="/group/:id"
            element={
              <ProtectedRoute>
                <GroupPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <LanguageProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LanguageProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
