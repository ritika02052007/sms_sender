import { Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Footer from './components/Footer.jsx';
import Navbar from './components/Navbar.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import Sidebar from './components/Sidebar.jsx';
import ToastProvider from './components/ToastProvider.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NotFound from './pages/NotFound.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import SessionWaitlist from './pages/SessionWaitlist.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  return (
    <ToastProvider>
      <div className="app">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <Navbar />
        <OfflineBanner />
        <div className="app__body">
          <Sidebar />
          <main id="main-content" className="app__main" tabIndex={-1}>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/sessions/:id/waitlist" element={<SessionWaitlist />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
        <Footer />
      </div>
    </ToastProvider>
  );
}
