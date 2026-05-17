import { Home, SearchX } from 'lucide-react';
import { useNavigate } from 'react-router';
import { getCurrentUser } from '../lib/auth';

export function NotFound() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-blue-50 text-[#1e3a8a] rounded-2xl flex items-center justify-center mx-auto mb-5">
          <SearchX className="w-8 h-8" />
        </div>
        <h1 className="text-2xl mb-2">Sayfa bulunamadı</h1>
        <p className="text-gray-600 mb-6">
          Aradığın sayfa taşınmış olabilir ya da bu bağlantı artık kullanılmıyor.
        </p>
        <button
          onClick={() => navigate(user ? '/dashboard' : '/login')}
          className="w-full bg-[#1e3a8a] text-white py-3 rounded-lg hover:bg-[#1e40af] transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          Ana sayfaya dön
        </button>
      </div>
    </div>
  );
}
