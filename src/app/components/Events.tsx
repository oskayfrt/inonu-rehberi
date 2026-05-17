import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronRight, Clock, Filter, MapPin, Users } from 'lucide-react';
import { api, type ApiEvent } from '../lib/api';
import { EmptyState, LoadingPanel } from './DesignStates';

function formatDate(dateString: string) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    Akademik: 'bg-blue-100 text-blue-700',
    Kariyer: 'bg-purple-100 text-purple-700',
    Sosyal: 'bg-pink-100 text-pink-700',
    Teknoloji: 'bg-green-100 text-green-700',
    Girişimcilik: 'bg-amber-100 text-amber-700',
    Konser: 'bg-rose-100 text-rose-700',
    Üniversite: 'bg-indigo-100 text-indigo-700',
    Malatya: 'bg-orange-100 text-orange-700',
    'Kültür Sanat': 'bg-teal-100 text-teal-700',
    'Kariyer Fuarı': 'bg-violet-100 text-violet-700',
    'Proje Fırsatı': 'bg-emerald-100 text-emerald-700',
  };

  return colors[category] || 'bg-gray-100 text-gray-700';
}

const categoryImages: Record<string, string> = {
  Konser: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4',
  'Kariyer Fuarı': 'https://images.unsplash.com/photo-1556761175-b413da4baf72',
  'Proje Fırsatı': 'https://images.unsplash.com/photo-1517048676732-d65bc937f952',
  Üniversite: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b',
  'Kültür Sanat': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
  Malatya: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
};

function getEventImage(event: ApiEvent) {
  return event.imageUrl || categoryImages[event.category] || categoryImages.Üniversite;
}

function getFallbackImage(category: string) {
  return categoryImages[category] || categoryImages.Üniversite;
}

export function Events() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.events()
      .then(setEvents)
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Etkinlikler yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, []);

  const categories = useMemo(() => ['all', ...Array.from(new Set(events.map((event) => event.category).filter(Boolean)))], [events]);

  const filteredEvents = filterCategory === 'all'
    ? events
    : events.filter((event) => event.category === filterCategory);

  const featuredEvent = filteredEvents[0];
  const listedEvents = filteredEvents.slice(1);

  const openEventDetail = (event: ApiEvent) => {
    if (event.sourceUrl) {
      window.open(event.sourceUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setSelectedEvent(event);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Kampüs Etkinlikleri</h1>
        <p className="text-gray-600">Veritabanına eklenen üniversite etkinlikleri ve sosyal aktiviteler</p>
        {loadError && <p className="text-red-600 mt-3">{loadError}</p>}
      </div>

      {isLoading && <LoadingPanel label="Etkinlikler yükleniyor..." />}

      {!isLoading && events.length === 0 && (
        <EmptyState
          icon={Calendar}
          title="Henüz etkinlik yok"
          description="Üniversite, Malatya veya proje fırsatı etkinlikleri eklendiğinde burada listelenecek."
        />
      )}

      {featuredEvent && (
        <div className="mb-8 bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="relative h-64 lg:h-auto bg-gradient-to-br from-[#1e3a8a] via-[#3b82f6] to-[#60a5fa] flex items-center justify-center">
                <img
                  src={getEventImage(featuredEvent)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = getFallbackImage(featuredEvent.category);
                  }}
                />
              <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/35 to-black/15" />
              <div className="relative text-white p-8">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
                  <Calendar className="w-4 h-4" />
                  Öne çıkan kampüs etkinliği
                </span>
              </div>
            </div>
            <div className="p-6 lg:p-8 flex flex-col justify-center">
              <span className={`inline-block px-3 py-1 rounded-full text-sm mb-3 w-fit ${getCategoryColor(featuredEvent.category)}`}>
                {featuredEvent.category}
              </span>
              <h2 className="text-2xl mb-3">{featuredEvent.title}</h2>
              <p className="text-gray-700 mb-4">{featuredEvent.description}</p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-5 h-5" />
                  <span>{formatDate(featuredEvent.date)}</span>
                </div>
                {featuredEvent.time && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-5 h-5" />
                    <span>{featuredEvent.time}</span>
                  </div>
                )}
                {featuredEvent.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-5 h-5" />
                    <span>{featuredEvent.location}</span>
                  </div>
                )}
                {featuredEvent.source && featuredEvent.source !== 'local' && (
                  <div className="text-sm text-gray-500">
                    Kaynak:{' '}
                    {featuredEvent.sourceUrl ? (
                      <a href={featuredEvent.sourceUrl} target="_blank" rel="noreferrer" className="text-[#1e3a8a] hover:underline">
                        {featuredEvent.source}
                      </a>
                    ) : (
                      featuredEvent.source
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => openEventDetail(featuredEvent)}
                className="px-6 py-3 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af] transition-colors flex items-center justify-center gap-2 w-full lg:w-auto"
              >
                Katıl
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div className="mb-6 flex items-center gap-3 overflow-x-auto pb-2">
          <Filter className="w-5 h-5 text-gray-600 flex-shrink-0" />
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                filterCategory === category
                  ? 'bg-[#1e3a8a] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category === 'all' ? 'Tümü' : category}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listedEvents.map((event) => (
          <div key={event.id} className="group overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-xl">
            <div
              className="cursor-pointer"
              onClick={() => setSelectedEvent(event)}
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={getEventImage(event)}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(imageEvent) => {
                    imageEvent.currentTarget.src = getFallbackImage(event.category);
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span className="rounded-full bg-white/95 px-3 py-1 text-sm text-gray-900 shadow-sm">
                    {event.category}
                  </span>
                </div>
                <Calendar className="absolute right-4 top-4 w-5 h-5 text-white drop-shadow" />
              </div>

              <div className="p-5">
                <h3 className="mb-3 line-clamp-2 leading-snug">{event.title}</h3>
                <p className="mb-4 line-clamp-3 min-h-[60px] text-sm leading-5 text-gray-700">{event.description}</p>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  {event.time && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>{event.time}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  )}
                  {event.source && event.source !== 'local' && (
                    <div className="text-gray-500">
                      Kaynak: {event.source}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="w-full rounded-lg bg-[#1e3a8a] py-2 text-white transition-colors hover:bg-[#1e40af] flex items-center justify-center gap-2"
                >
                  Detaylar
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] text-white p-6">
              <span className="inline-block px-3 py-1 rounded-full text-sm bg-white/20 mb-3">
                {selectedEvent.category}
              </span>
              <h2>{selectedEvent.title}</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-5">{selectedEvent.description}</p>
              <div className="space-y-3 text-gray-700 mb-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#1e3a8a]" />
                  <span>{formatDate(selectedEvent.date)}</span>
                </div>
                {selectedEvent.time && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#1e3a8a]" />
                    <span>{selectedEvent.time}</span>
                  </div>
                )}
                {selectedEvent.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-[#1e3a8a]" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.organizer && (
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-[#1e3a8a]" />
                    <span>{selectedEvent.organizer}</span>
                  </div>
                )}
                {selectedEvent.source && selectedEvent.source !== 'local' && (
                  <div className="flex items-center gap-3">
                    <ChevronRight className="w-5 h-5 text-[#1e3a8a]" />
                    {selectedEvent.sourceUrl ? (
                      <a href={selectedEvent.sourceUrl} target="_blank" rel="noreferrer" className="text-[#1e3a8a] hover:underline">
                        Kaynak: {selectedEvent.source}
                      </a>
                    ) : (
                      <span>Kaynak: {selectedEvent.source}</span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
