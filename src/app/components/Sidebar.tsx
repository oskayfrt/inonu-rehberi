import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import {
  BookOpen,
  Calendar,
  ClipboardList,
  GraduationCap,
  Home,
  LogOut,
  Megaphone,
  Menu,
  MessagesSquare,
  Package,
  PlusCircle,
  Shield,
  User,
  X,
} from 'lucide-react';
import { getCurrentUser, signOut } from '../lib/auth';

export function Sidebar() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Ana Sayfa' },
    ...(!isAdmin ? [{ path: '/department', icon: BookOpen, label: 'Bölümüm' }] : []),
    { path: '/events', icon: Calendar, label: 'Etkinlikler' },
    { path: '/announcements', icon: Megaphone, label: 'Duyurular' },
    { path: '/campus-board', icon: MessagesSquare, label: 'Kampüs Panosu' },
    ...(!isAdmin ? [{ path: '/experiences', icon: ClipboardList, label: 'Deneyim Gönder' }] : []),
    { path: '/freshman-guide', icon: GraduationCap, label: 'Yeni Öğrenci Rehberi' },
    { path: '/lost-found', icon: Package, label: 'Kayıp Eşya' },
    ...(!isAdmin ? [{ path: '/share', icon: PlusCircle, label: 'Bilgi Paylaş' }] : []),
    { path: '/profile', icon: User, label: isAdmin ? 'Yönetici Profili' : 'Profilim' },
    ...(isAdmin ? [{ path: '/admin', icon: Shield, label: 'Admin Paneli' }] : []),
  ];

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 p-4 z-50">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center justify-center">
            <img src="/inonu-logo.png" alt="İnönü Üniversitesi" className="h-11 w-40 object-contain" />
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 lg:w-20 lg:hover:w-64
        bg-white border-r border-gray-200 flex flex-col
        transform transition-all duration-300 lg:transform-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        mt-[73px] lg:mt-0 group
      `}>
        <div className="hidden lg:flex h-28 items-center justify-center border-b border-gray-200 px-4">
          <div className="flex w-full items-center justify-center overflow-hidden">
            <img src="/inonu-logo.png" alt="İnönü Üniversitesi" className="h-14 w-14 object-contain transition-all duration-300 lg:group-hover:h-16 lg:group-hover:w-44" />
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                      isActive
                        ? 'bg-[#1e3a8a] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap overflow-hidden lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">Çıkış Yap</span>
          </button>
        </div>
      </aside>
    </>
  );
}
