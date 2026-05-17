import { useEffect, useState } from 'react';
import { BookOpen, FileText, Lightbulb, MapPin, Package, Send, Shield, Star, Trash2 } from 'lucide-react';
import { api, type ApiPost } from '../lib/api';
import { getCurrentUser } from '../lib/auth';

const categories = [
  { value: 'course-tip', label: 'Ders Tavsiyesi', icon: BookOpen },
  { value: 'elective-review', label: 'Seçmeli Ders Yorumu', icon: Star },
  { value: 'academic-tip', label: 'Akademik Tavsiye', icon: Lightbulb },
  { value: 'campus-tip', label: 'Kampüs Önerisi', icon: MapPin },
  { value: 'student-affairs', label: 'Öğrenci İşleri Süreci', icon: FileText },
  { value: 'general', label: 'Genel Bilgi', icon: Package },
];

const categoryLabels = Object.fromEntries(categories.map((category) => [category.value, category.label]));

export function Share() {
  const user = getCurrentUser();
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success'>('idle');
  const [error, setError] = useState('');
  const [myPosts, setMyPosts] = useState<ApiPost[]>([]);
  const [formData, setFormData] = useState({
    departmentId: user?.departmentId ? String(user.departmentId) : '',
    category: '',
    title: '',
    description: '',
    course: '',
  });
  const userDepartmentLabel = user?.department || 'Bölüm bilgisi bulunamadı';
  const requiresCourseName = formData.category === 'course-tip' || formData.category === 'elective-review';

  const loadMyPosts = () => {
    if (!user?.id || user.role === 'admin') return;

    api.posts({ userId: user.id, limit: 100 })
      .then((posts) => setMyPosts(posts))
      .catch(() => undefined);
  };

  useEffect(() => {
    loadMyPosts();
  }, []);

  if (user?.role === 'admin') {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <Shield className="mb-4 h-10 w-10 text-[#1e3a8a]" />
          <h1 className="text-3xl mb-3">Admin Hesabı</h1>
          <p className="text-gray-600">
            Bilgi paylaşma alanı öğrencilere aittir. Admin hesabı öğrenci bölümü taşımadığı için paylaşım yapmaz; paylaşımları admin panelinden yönetir.
          </p>
        </div>
      </div>
    );
  }

  const deleteOwnPost = async (postId: number) => {
    if (!user?.id) return;
    if (!window.confirm('Bu paylaşımı silmek istediğine emin misin?')) return;

    try {
      await api.deletePost(user.id, postId);
      setMyPosts((current) => current.filter((post) => post.id !== postId));
      setError('');
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Paylaşım silinemedi.');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!user?.id) {
      setError('Paylaşım yapmak için giriş yapmalısın.');
      return;
    }

    if (!user.departmentId) {
      setError('Paylaşım yapabilmek için profilinde bölüm bilgisi olmalı.');
      return;
    }

    if (requiresCourseName && !formData.course.trim()) {
      setError('Ders tavsiyesi veya seçmeli ders yorumu için ders adı zorunludur.');
      return;
    }

    try {
      await api.createPost({
        userId: user.id,
        departmentId: user.departmentId,
        category: formData.category,
        title: formData.title,
        content: formData.description,
        courseName: formData.course.trim() || undefined,
      });

      setSubmitStatus('success');
      setFormData({
        departmentId: user.departmentId ? String(user.departmentId) : '',
        category: '',
        title: '',
        description: '',
        course: '',
      });
      loadMyPosts();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Paylaşım kaydedilemedi.');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Bilgi Paylaş</h1>
        <p className="text-gray-600">
          Ders, seçmeli ders ve akademik tavsiyeler kendi bölümünde; kampüs önerisi, öğrenci işleri ve genel bilgiler Kampüs Panosu'nda yayınlanır.
        </p>
      </div>

      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white p-6 rounded-2xl mb-8">
        <h2 className="mb-3">Topluluğa Katkı Ver</h2>
        <p className="text-blue-100">
          Ders deneyimini, kampüs önerini veya öğrenci işleri sürecini paylaş. Saygı kurallarına uymayan,
          küfür, hakaret, ayrımcılık veya spam içeren paylaşımlar kaldırılır.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
        {submitStatus === 'success' && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            Paylaşımın yayınlandı. Kategoriye göre bölümünde veya Kampüs Panosu'nda görünecek.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Kategori Seç</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, category: cat.value });
                    setSubmitStatus('idle');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.category === cat.value
                      ? 'border-[#1e3a8a] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <cat.icon className={`w-6 h-6 ${formData.category === cat.value ? 'text-[#1e3a8a]' : 'text-gray-600'}`} />
                  <span className="text-sm text-center">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Bölüm</label>
            <div className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-[#1e3a8a]">
              {userDepartmentLabel}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Bölüm bilgisi kimlik gibi kalır; bölüm kategorileri sadece kendi bölümünde, genel kategoriler herkesin Kampüs Panosu'nda görünür.
            </p>
          </div>

          {requiresCourseName && (
            <div>
              <label className="block text-sm mb-2">Ders Adı</label>
              <input
                type="text"
                value={formData.course}
                onChange={(event) => setFormData({ ...formData, course: event.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                placeholder="Örn: Veri Yapıları ve Algoritmalar"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm mb-2">Başlık</label>
            <input
              type="text"
              value={formData.title}
              onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              placeholder="Kısa ve açıklayıcı bir başlık yaz"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Açıklama</label>
            <textarea
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] min-h-[200px]"
              placeholder="Deneyimini veya tavsiyeni detaylı şekilde yaz."
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={!formData.category || !user?.departmentId || !formData.title || !formData.description || (requiresCourseName && !formData.course.trim())}
              className="flex-1 bg-[#1e3a8a] text-white py-3 rounded-lg hover:bg-[#1e40af] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              Yayınla
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({ departmentId: user?.departmentId ? String(user.departmentId) : '', category: '', title: '', description: '', course: '' });
                setSubmitStatus('idle');
                setError('');
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Temizle
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-md">
        <h2 className="mb-4">Paylaşımlarım</h2>
        {myPosts.length > 0 ? (
          <div className="space-y-3">
            {myPosts.map((post) => (
              <div key={post.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4>{post.title}</h4>
                    <p className="mt-1 text-sm text-gray-600">{categoryLabels[post.category] || post.category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteOwnPost(post.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-red-600 transition-colors hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Sil
                  </button>
                </div>
                <p className="mt-3 text-gray-700">{post.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Henüz paylaşımın yok.</p>
        )}
      </div>
    </div>
  );
}
