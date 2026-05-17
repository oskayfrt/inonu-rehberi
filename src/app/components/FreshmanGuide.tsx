import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  CheckCircle,
  CreditCard,
  Edit3,
  ExternalLink,
  FileText,
  HelpCircle,
  MapPin,
  Plus,
  Save,
  Shield,
  Smartphone,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { api, type FreshmanGuideCard } from '../lib/api';
import { getCurrentUser } from '../lib/auth';
import { EmptyState, LoadingPanel } from './DesignStates';

type GuideDraft = Omit<FreshmanGuideCard, 'id'>;

const CAMPUS_MAP_URL = 'https://harita.inonu.edu.tr';

const iconMap: Record<string, LucideIcon> = {
  check: CheckCircle,
  card: CreditCard,
  book: BookOpen,
  phone: Smartphone,
  food: UtensilsCrossed,
  map: MapPin,
  file: FileText,
  help: HelpCircle,
};

const iconOptions = [
  { value: 'check', label: 'Kontrol' },
  { value: 'card', label: 'Kart' },
  { value: 'book', label: 'Ders' },
  { value: 'phone', label: 'Uygulama' },
  { value: 'food', label: 'Yemekhane' },
  { value: 'map', label: 'Konum' },
  { value: 'file', label: 'Belge' },
  { value: 'help', label: 'Soru' },
];

const colorOptions = [
  { value: 'from-blue-500 to-blue-600', label: 'Mavi' },
  { value: 'from-purple-500 to-purple-600', label: 'Mor' },
  { value: 'from-green-500 to-green-600', label: 'Yeşil' },
  { value: 'from-amber-500 to-amber-600', label: 'Turuncu' },
  { value: 'from-red-500 to-red-600', label: 'Kırmızı' },
  { value: 'from-cyan-500 to-cyan-600', label: 'Camgöbeği' },
  { value: 'from-indigo-500 to-indigo-600', label: 'İndigo' },
  { value: 'from-pink-500 to-pink-600', label: 'Pembe' },
];

const emptyDraft: GuideDraft = {
  title: '',
  description: '',
  items: [''],
  locationLabel: '',
  locationUrl: '',
  icon: 'check',
  color: 'from-blue-500 to-blue-600',
  sortOrder: 0,
};

function toDraft(card: FreshmanGuideCard): GuideDraft {
  return {
    title: card.title,
    description: card.description,
    items: card.items.length ? card.items : [''],
    locationLabel: card.locationLabel,
    locationUrl: card.locationUrl,
    icon: card.icon || 'check',
    color: card.color || 'from-blue-500 to-blue-600',
    sortOrder: card.sortOrder || 0,
  };
}

function normalizeDraft(draft: GuideDraft): GuideDraft {
  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
    items: draft.items.map((item) => item.trim()).filter(Boolean),
    locationLabel: draft.locationLabel.trim(),
    locationUrl: draft.locationUrl.trim(),
    sortOrder: Number(draft.sortOrder || 0),
  };
}

function CardForm({
  draft,
  onChange,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  draft: GuideDraft;
  onChange: (draft: GuideDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const itemsText = useMemo(() => draft.items.join('\n'), [draft.items]);

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="mb-2 block text-sm">Başlık</span>
          <input
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            placeholder="Örn: Öğrenci Kartı"
          />
        </label>

        <label className="md:col-span-2">
          <span className="mb-2 block text-sm">Kısa açıklama</span>
          <textarea
            value={draft.description}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
            className="min-h-[90px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            placeholder="Bu kartın öğrenciye ne anlattığını yaz."
          />
        </label>

        <label className="md:col-span-2">
          <span className="mb-2 block text-sm">Bilgiler</span>
          <textarea
            value={itemsText}
            onChange={(event) => onChange({ ...draft, items: event.target.value.split('\n') })}
            className="min-h-[150px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            placeholder="Her bilgiyi ayrı satıra yaz."
          />
        </label>

        <label>
          <span className="mb-2 block text-sm">Konum butonu yazısı</span>
          <input
            value={draft.locationLabel}
            onChange={(event) => onChange({ ...draft, locationLabel: event.target.value })}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            placeholder="Örn: Konuma git"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm">Konum / kaynak linki</span>
          <input
            value={draft.locationUrl}
            onChange={(event) => onChange({ ...draft, locationUrl: event.target.value })}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            placeholder="https://..."
          />
        </label>

        <label>
          <span className="mb-2 block text-sm">İkon</span>
          <select
            value={draft.icon}
            onChange={(event) => onChange({ ...draft, icon: event.target.value })}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          >
            {iconOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm">Renk</span>
          <select
            value={draft.color}
            onChange={(event) => onChange({ ...draft, color: event.target.value })}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          >
            {colorOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm">Sıra</span>
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(event) => onChange({ ...draft, sortOrder: Number(event.target.value) })}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a8a] px-5 py-3 text-white transition-colors hover:bg-[#1e40af]"
        >
          <Save className="h-4 w-4" />
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
          Vazgeç
        </button>
      </div>
    </div>
  );
}

export function FreshmanGuide() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const [cards, setCards] = useState<FreshmanGuideCard[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<GuideDraft>(emptyDraft);
  const [newDraft, setNewDraft] = useState<GuideDraft>(emptyDraft);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadCards = () => {
    setIsLoading(true);
    api.freshmanGuide()
      .then((rows) => {
        setCards(rows);
        setError('');
      })
      .catch((apiError) => setError(apiError instanceof Error ? apiError.message : 'Rehber bilgileri yüklenemedi.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadCards();
  }, []);

  const startEdit = (card: FreshmanGuideCard) => {
    setEditingId(card.id);
    setEditingDraft(toDraft(card));
    setIsAdding(false);
    setMessage('');
    setError('');
  };

  const createCard = async () => {
    if (!currentUser?.id) return;

    try {
      const normalized = normalizeDraft(newDraft);
      const { card } = await api.adminCreateFreshmanGuideCard(currentUser.id, normalized);
      setCards((current) => [...current, card].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));
      setNewDraft(emptyDraft);
      setIsAdding(false);
      setMessage('Kart eklendi.');
      setError('');
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Kart eklenemedi.');
    }
  };

  const saveCard = async () => {
    if (!currentUser?.id || !editingId) return;

    try {
      const normalized = normalizeDraft(editingDraft);
      const { card } = await api.adminUpdateFreshmanGuideCard(currentUser.id, editingId, normalized);
      setCards((current) => current.map((item) => (item.id === card.id ? card : item)).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));
      setEditingId(null);
      setMessage('Kart güncellendi.');
      setError('');
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Kart güncellenemedi.');
    }
  };

  const deleteCard = async (cardId: number) => {
    if (!currentUser?.id) return;
    if (!window.confirm('Bu rehber kartını silmek istediğine emin misin?')) return;

    try {
      await api.adminDeleteFreshmanGuideCard(currentUser.id, cardId);
      setCards((current) => current.filter((card) => card.id !== cardId));
      setMessage('Kart silindi.');
      setError('');
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Kart silinemedi.');
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl mb-2">Yeni Öğrenci Rehberi</h1>
          <p className="text-gray-600">Kampüs yaşamına hızlı başlangıç için pratik ve güncel bilgiler</p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setNewDraft({ ...emptyDraft, sortOrder: cards.length + 1 });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e3a8a] px-5 py-3 text-white transition-colors hover:bg-[#1e40af]"
          >
            <Plus className="h-5 w-5" />
            Kart Ekle
          </button>
        )}
      </div>

      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
          <div>
        <h2 className="mb-3">Hoş Geldiniz</h2>
        <p className="hidden">
          Bu alan yeni öğrencilerin kampüste neyin nerede olduğunu daha hızlı bulması için düzenlenebilir şekilde hazırlandı.
          Admin gerçek konum linklerini ve güncel bilgileri buradan yönetebilir.
        </p>
          <p className="max-w-4xl text-blue-100">
            Yeni öğrenciler için kampüs içindeki önemli noktalar, birimler ve ulaşım bilgileri resmi İnönü Üniversitesi haritası üzerinden açılabilir.
          </p>
          </div>
          <a
            href={CAMPUS_MAP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#1e3a8a] shadow-sm transition-colors hover:bg-blue-50"
          >
            <MapPin className="h-5 w-5" />
            Kampüs Haritasını Aç
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="mt-1 h-5 w-5 text-[#1e3a8a]" />
            <div>
              <h2 className="mb-1">Admin düzenleme modu</h2>
              <p className="text-gray-600">
                Kartları öğrencilerin göreceği sayfadan düzenleyebilirsin. Konum linki eklenen kartlarda öğrenciler direkt haritaya veya resmi sayfaya gider.
              </p>
            </div>
          </div>
        </div>
      )}

      {message && <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">{message}</div>}
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      {isAdding && (
        <div className="mb-6">
          <CardForm
            draft={newDraft}
            onChange={setNewDraft}
            onCancel={() => setIsAdding(false)}
            onSubmit={createCard}
            submitLabel="Kartı Ekle"
          />
        </div>
      )}

      {isLoading ? (
        <LoadingPanel label="Rehber yükleniyor..." />
      ) : cards.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = iconMap[card.icon] || CheckCircle;

            return (
              <div key={card.id} className="overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-xl">
                {editingId === card.id ? (
                  <div className="p-5">
                    <CardForm
                      draft={editingDraft}
                      onChange={setEditingDraft}
                      onCancel={() => setEditingId(null)}
                      onSubmit={saveCard}
                      submitLabel="Kaydet"
                    />
                  </div>
                ) : (
                  <>
                    <div className={`bg-gradient-to-br ${card.color} p-6 text-white`}>
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <Icon className="h-10 w-10" />
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(card)}
                              className="rounded-lg bg-white/20 p-2 transition-colors hover:bg-white/30"
                              aria-label="Kartı düzenle"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCard(card.id)}
                              className="rounded-lg bg-white/20 p-2 transition-colors hover:bg-white/30"
                              aria-label="Kartı sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <h3>{card.title}</h3>
                      {card.description && <p className="mt-2 text-sm text-white/85">{card.description}</p>}
                    </div>

                    <div className="p-6">
                      <ul className="space-y-3">
                        {card.items.map((item, index) => (
                          <li key={`${card.id}-${index}`} className="flex items-start gap-3">
                            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>

                      {card.locationUrl && (
                        <a
                          href={card.locationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-[#1e3a8a] transition-colors hover:bg-blue-100"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {card.locationLabel || 'Konuma git'}
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={HelpCircle}
          title="Rehber kartı yok"
          description="Yeni öğrenci rehberi kartları eklendiğinde öğrenciler burada görecek."
        />
      )}
    </div>
  );
}
