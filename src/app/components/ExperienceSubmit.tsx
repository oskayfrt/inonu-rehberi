import { useState } from 'react';
import { ClipboardList, Send, Shield } from 'lucide-react';
import { api } from '../lib/api';
import { getCurrentUser } from '../lib/auth';

const experienceCategories = [
  'Ders Deneyimi',
  'Bölüm Deneyimi',
  'Kampüs Yaşamı',
  'Öğrenci İşleri',
  'Ulaşım ve Konum',
  'Yemekhane / Kütüphane',
  'Diğer',
];

export function ExperienceSubmit() {
  const user = getCurrentUser();
  const [formData, setFormData] = useState({
    title: '',
    category: experienceCategories[0],
    content: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (user?.role === 'admin') {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <Shield className="mb-4 h-10 w-10 text-[#1e3a8a]" />
          <h1 className="text-3xl mb-3">Yönetici Hesabı</h1>
          <p className="text-gray-600">
            Deneyim gönderme alanı öğrenciler içindir. Öğrencilerden gelen deneyimler yönetim ekranındaki
            Deneyim Bildirimleri bölümünde incelenir.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!user?.id) {
      setError('Deneyim göndermek için giriş yapmalısın.');
      return;
    }

    try {
      await api.createExperience({
        userId: user.id,
        title: formData.title,
        category: formData.category,
        content: formData.content,
      });

      setFormData({ title: '', category: experienceCategories[0], content: '' });
      setMessage('Deneyiminiz gönderildi. En kısa sürede inceleme başlatılacaktır.');
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Deneyim gönderilemedi.');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-[#1e3a8a]" />
          <h1 className="text-3xl">Deneyim Gönder</h1>
        </div>
        <p className="mt-2 text-gray-600">
          Ders, bölüm, kampüs veya öğrenci işleriyle ilgili yaşadığın deneyimi inceleme ekibine ilet.
        </p>
      </div>

      <div className="mb-8 rounded-2xl bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] p-6 text-white">
        <h2 className="mb-3">Sesini Düzenli Bir Kanaldan Duyur</h2>
        <p className="text-blue-100">
          Bu form herkese açık paylaşım değildir. Gönderdiğin deneyim inceleme sürecine alınır ve gerektiğinde
          sistemin geliştirilmesi için değerlendirilir.
        </p>
      </div>

      {message && <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">{message}</div>}
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 md:p-8 shadow-md space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm">Başlık</span>
          <input
            value={formData.title}
            onChange={(event) => setFormData({ ...formData, title: event.target.value })}
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            placeholder="Örn: Ders kayıt sürecinde yaşadığım sorun"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm">Kategori</span>
          <select
            value={formData.category}
            onChange={(event) => setFormData({ ...formData, category: event.target.value })}
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          >
            {experienceCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm">Deneyim Açıklaması</span>
          <textarea
            value={formData.content}
            onChange={(event) => setFormData({ ...formData, content: event.target.value })}
            className="min-h-[220px] w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            placeholder="Yaşadığın durumu, nerede olduğunu ve hangi konunun incelenmesini istediğini açıkça yaz."
            required
          />
        </label>

        <button
          type="submit"
          disabled={!formData.title.trim() || !formData.content.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a8a] px-5 py-3 text-white transition-colors hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
          Deneyimi Gönder
        </button>
      </form>
    </div>
  );
}
