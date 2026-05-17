import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, Image, MapPin, Package, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { api, type ApiLostFoundItem } from '../lib/api';
import { getCurrentUser } from '../lib/auth';
import { EmptyState, LoadingPanel } from './DesignStates';

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Lütfen JPG, PNG veya WebP formatında bir görsel seç.'));
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      reject(new Error('Görsel en fazla 4 MB olabilir.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Görsel okunamadı.'));
    reader.readAsDataURL(file);
  });
}

export function LostFound() {
  const user = getCurrentUser();
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'lost' | 'found'>('lost');
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<ApiLostFoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    location: '',
    date: '',
    description: '',
    contact: user?.email || '',
    imageUrl: '',
  });

  const loadItems = () => {
    setIsLoading(true);
    api.lostFound()
      .then(setItems)
      .catch((apiError) => setError(apiError instanceof Error ? apiError.message : 'İlanlar yüklenemedi.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesType = filter === 'all' || item.type === filter;
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('tr-TR');

    if (!normalizedSearch) return matchesType;

    const searchableText = [item.title, item.category, item.location, item.description, item.contact]
      .join(' ')
      .toLocaleLowerCase('tr-TR');

    return matchesType && searchableText.includes(normalizedSearch);
  }), [filter, items, searchTerm]);

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      location: '',
      date: '',
      description: '',
      contact: user?.email || '',
      imageUrl: '',
    });
  };

  const openForm = (type: 'lost' | 'found') => {
    setFormType(type);
    setShowForm(true);
    setError('');
  };

  const handleImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await readImageFile(file);
      setFormData((current) => ({ ...current, imageUrl }));
      setError('');
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Görsel seçilemedi.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      await api.createLostFound({
        userId: user?.id,
        type: formType,
        ...formData,
      });

      setShowForm(false);
      resetForm();
      loadItems();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'İlan kaydedilemedi.');
    }
  };

  const deleteOwnItem = async (itemId: number) => {
    if (!user?.id) return;
    if (!window.confirm('Bu ilanı kaldırmak istediğine emin misin?')) return;

    try {
      await api.deleteLostFound(user.id, itemId);
      setItems((current) => current.filter((item) => item.id !== itemId));
      setError('');
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'İlan silinemedi.');
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div>
          <h1 className="text-3xl mb-2">Kayıp Eşya İlanları</h1>
          <p className="text-gray-600">Kayıp ve bulunan eşya ilanları veritabanından listelenir.</p>
          {error && <p className="text-red-600 mt-3">{error}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => openForm('lost')}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            Kayıp Eşya Bildir
          </button>
          <button
            onClick={() => openForm('found')}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Bulunan Eşya Ekle
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            placeholder="Eşya, konum veya kategori ara"
          />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg transition-colors ${filter === 'all' ? 'bg-[#1e3a8a] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            Tümü ({items.length})
          </button>
          <button
            onClick={() => setFilter('lost')}
            className={`px-6 py-2 rounded-lg transition-colors ${filter === 'lost' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            Kayıp ({items.filter((item) => item.type === 'lost').length})
          </button>
          <button
            onClick={() => setFilter('found')}
            className={`px-6 py-2 rounded-lg transition-colors ${filter === 'found' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            Bulunan ({items.filter((item) => item.type === 'found').length})
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2>{formType === 'lost' ? 'Kayıp Eşya Bildir' : 'Bulunan Eşya Ekle'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-2">Eşya Adı</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Kategori</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Konum</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Tarih</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Görsel</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-gray-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">
                  <Upload className="h-5 w-5" />
                  İsteğe bağlı görsel seç
                  <input type="file" accept="image/*" onChange={handleImageFile} className="sr-only" />
                </label>
                {formData.imageUrl && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Görsel eklendi
                      </span>
                      <button type="button" onClick={() => setFormData({ ...formData, imageUrl: '' })} className="rounded-md p-1 text-gray-500 hover:bg-white hover:text-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <img src={formData.imageUrl} alt="" className="h-48 w-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm mb-2">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] min-h-[100px]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">İletişim (@ogr.inonu.edu.tr)</label>
                <input
                  type="email"
                  value={formData.contact}
                  onChange={(event) => setFormData({ ...formData, contact: event.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className={`flex-1 py-3 rounded-lg text-white transition-colors ${formType === 'lost' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                  İlanı Kaydet
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading && <LoadingPanel label="İlanlar yükleniyor..." />}

      {!isLoading && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden">
            <div className={`p-4 ${item.type === 'lost' ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-3 py-1 rounded-full text-sm ${item.type === 'lost' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                  {item.type === 'lost' ? 'Kayıp' : 'Bulundu'}
                </span>
                <Package className={`w-6 h-6 ${item.type === 'lost' ? 'text-red-500' : 'text-green-500'}`} />
              </div>
              <h3 className="text-gray-900">{item.title}</h3>
            </div>
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                className="h-48 w-full object-cover"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="p-4 space-y-3">
              {item.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {item.location}
                </div>
              )}
              {item.date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {new Date(item.date).toLocaleDateString('tr-TR')}
                </div>
              )}
              <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">{item.description}</p>
              <a href={`mailto:${item.contact}`} className={`block text-center py-2 rounded-lg text-white transition-colors ${item.type === 'lost' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                İletişime Geç
              </a>
              {item.userId === user?.id && (
                <button
                  type="button"
                  onClick={() => deleteOwnItem(item.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 py-2 text-gray-700 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  İlanı Kaldır
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {!isLoading && filteredItems.length === 0 && (
        <EmptyState
          icon={Package}
          title="İlan bulunamadı"
          description="Aktif kayıp veya bulunan eşya ilanı yok. Yeni ilan eklendiğinde burada görünecek."
        />
      )}
    </div>
  );
}
