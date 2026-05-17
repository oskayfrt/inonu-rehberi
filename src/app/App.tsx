import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Department } from './components/Department';
import { Events } from './components/Events';
import { Announcements } from './components/Announcements';
import { CampusBoard } from './components/CampusBoard';
import { ExperienceSubmit } from './components/ExperienceSubmit';
import { FreshmanGuide } from './components/FreshmanGuide';
import { LostFound } from './components/LostFound';
import { Share } from './components/Share';
import { Profile } from './components/Profile';
import { Admin } from './components/Admin';
import { Sidebar } from './components/Sidebar';
import { NotFound } from './components/NotFound';
import { getCurrentUser, signOut } from './lib/auth';

function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto pt-[73px] lg:pt-0 lg:ml-0">
        {children}
      </main>
    </div>
  );
}

function PublicOnly({ children }: { children: ReactNode }) {
  return getCurrentUser() ? <Navigate to="/dashboard" replace /> : children;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-md text-center">
          <h1 className="text-2xl mb-3">Admin Girişi Gerekli</h1>
          <p className="text-gray-600 mb-6">
            Bu sayfa yalnızca admin hesabıyla açılır. Şu an öğrenci hesabıyla giriş yapılmış.
          </p>
          <button
            onClick={() => {
              signOut();
              window.location.href = '/login';
            }}
            className="w-full rounded-lg bg-[#1e3a8a] px-4 py-3 text-white hover:bg-[#1e40af]"
          >
            Admin hesabıyla giriş yap
          </button>
        </div>
      </div>
    );
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={getCurrentUser() ? '/dashboard' : '/login'} replace />} />
        <Route path="/login" element={<PublicOnly><Login mode="login" /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Login mode="register" /></PublicOnly>} />
        <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/department" element={<ProtectedLayout><Department /></ProtectedLayout>} />
        <Route path="/events" element={<ProtectedLayout><Events /></ProtectedLayout>} />
        <Route path="/announcements" element={<ProtectedLayout><Announcements /></ProtectedLayout>} />
        <Route path="/campus-board" element={<ProtectedLayout><CampusBoard /></ProtectedLayout>} />
        <Route path="/experiences" element={<ProtectedLayout><ExperienceSubmit /></ProtectedLayout>} />
        <Route path="/freshman-guide" element={<ProtectedLayout><FreshmanGuide /></ProtectedLayout>} />
        <Route path="/lost-found" element={<ProtectedLayout><LostFound /></ProtectedLayout>} />
        <Route path="/share" element={<ProtectedLayout><Share /></ProtectedLayout>} />
        <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
        <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
