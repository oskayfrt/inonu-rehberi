import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, FileText, Flag, Lightbulb, Shield, Star, Trash2, X } from 'lucide-react';
import { api, type ApiPost } from '../lib/api';
import { getCurrentUser, type AuthUser } from '../lib/auth';
import { EmptyState, LoadingPanel } from './DesignStates';
import { ReportPostModal } from './ReportPostModal';

function formatDate(dateString: string) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const categoryLabels: Record<string, string> = {
  'course-tip': 'Ders Tavsiyesi',
  'elective-review': 'Seçmeli Ders Yorumu',
  'academic-tip': 'Akademik Tavsiye',
  'campus-tip': 'Kampüs Önerisi',
  'student-affairs': 'Öğrenci İşleri',
  general: 'Genel Bilgi',
};

const categoryVisuals: Record<string, { accent: string; panel: string }> = {
  'course-tip': {
    accent: 'from-[#1e3a8a] to-[#3b82f6]',
    panel: 'bg-blue-50 text-[#1e3a8a]',
  },
  'elective-review': {
    accent: 'from-amber-500 to-orange-500',
    panel: 'bg-amber-50 text-amber-700',
  },
  'academic-tip': {
    accent: 'from-emerald-500 to-teal-500',
    panel: 'bg-emerald-50 text-emerald-700',
  },
};

function getCategoryVisual(category: string) {
  return categoryVisuals[category] || categoryVisuals['course-tip'];
}

export function Department() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ApiPost | null>(null);
  const [reportingPost, setReportingPost] = useState<ApiPost | null>(null);
  const [reportMessage, setReportMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      navigate('/login');
      return;
    }

    setUser(currentUser);

    if (currentUser.role === 'admin') {
      setIsLoading(false);
      return;
    }

    api.posts({ departmentId: currentUser.departmentId, limit: 50 })
      .then((loadedPosts) => {
        setPosts(loadedPosts);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Bölüm bilgileri yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, [navigate]);

  const deleteOwnPost = async (postId: number) => {
    if (!user?.id) return;
    if (!window.confirm('Bu paylaşımı silmek istediğine emin misin?')) return;

    try {
      await api.deletePost(user.id, postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
      setLoadError('');
    } catch (apiError) {
      setLoadError(apiError instanceof Error ? apiError.message : 'Paylaşım silinemedi.');
    }
  };

  if (!user) return null;

  if (user.role === 'admin') {
    return (
      <div className="p-4 md:p-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <Shield className="mb-4 h-10 w-10 text-[#1e3a8a]" />
          <h1 className="text-3xl mb-3">Admin Hesabı</h1>
          <p className="text-gray-600">
            Admin kullanıcı öğrenci olmadığı için kişisel bölüm sayfası yoktur. Bölüm içerikleri öğrencinin kayıtlı bölümüne göre gösterilir.
          </p>
        </div>
      </div>
    );
  }

  const courseTips = posts.filter((post) => post.category === 'course-tip');
  const electiveReviews = posts.filter((post) => post.category === 'elective-review');
  const academicTips = posts.filter((post) => post.category === 'academic-tip');

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">{user.department}</h1>
        <p className="text-gray-600">Bu bölümdeki onaylanmış öğrenci paylaşımları veritabanından gelir.</p>
        {loadError && <p className="text-red-600 mt-3">{loadError}</p>}
        {reportMessage && <p className="text-green-700 mt-3">{reportMessage}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <BookOpen className="w-7 h-7 text-[#1e3a8a] mb-3" />
          <p className="text-gray-600 text-sm">Ders Tavsiyesi</p>
          <h2>{courseTips.length}</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <Star className="w-7 h-7 text-amber-500 mb-3" />
          <p className="text-gray-600 text-sm">Seçmeli Ders Yorumu</p>
          <h2>{electiveReviews.length}</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <Lightbulb className="w-7 h-7 text-green-600 mb-3" />
          <p className="text-gray-600 text-sm">Akademik Tavsiye</p>
          <h2>{academicTips.length}</h2>
        </div>
      </div>

      {isLoading ? (
        <LoadingPanel label="Paylaşımlar yükleniyor..." />
      ) : posts.length > 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2>Onaylanmış Paylaşımlar</h2>
              <p className="mt-1 text-sm text-gray-500">Kartlara tıklayarak paylaşımın tamamını okuyabilirsin.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-[#1e3a8a]">{posts.length} paylaşım</span>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => {
              const visual = getCategoryVisual(post.category);

              return (
              <article
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`relative min-h-[132px] bg-gradient-to-br ${visual.accent} p-5 text-white`}>
                  <div className="absolute right-4 top-4 opacity-20 transition-transform group-hover:scale-110">
                    <FileText className="h-16 w-16" />
                  </div>
                  <span className="inline-flex rounded-full bg-white/18 px-3 py-1 text-sm backdrop-blur">
                    {categoryLabels[post.category] || post.category}
                  </span>
                  <h3 className="relative mt-5 line-clamp-2 pr-10 text-xl leading-snug">{post.title}</h3>
                </div>

                <div className="p-5">
                  <p className="mb-5 line-clamp-3 min-h-[72px] text-sm leading-6 text-gray-700">{post.content}</p>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500">
                    <div className="min-w-0">
                      <p className="truncate text-gray-700">{post.userName}</p>
                      <p>{formatDate(post.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs ${visual.panel}`}>Detay</span>
                  </div>
                </div>

                {post.userId !== user.id && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setReportingPost(post);
                      setReportMessage('');
                    }}
                    className="absolute right-4 bottom-4 rounded-lg bg-white/90 p-2 text-gray-500 shadow-sm transition-colors hover:bg-amber-50 hover:text-amber-700"
                    title="Paylaşımı raporla"
                    aria-label="Paylaşımı raporla"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                )}
                {post.userId === user.id && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteOwnPost(post.id);
                    }}
                    className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-red-600 shadow-sm transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Sil
                  </button>
                )}
              </article>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Henüz paylaşım yok"
          description="Bu bölüm için ders tavsiyesi, seçmeli ders yorumu veya akademik tavsiye paylaşıldığında burada görünecek."
        />
      )}

      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedPost(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className={`bg-gradient-to-br ${getCategoryVisual(selectedPost.category).accent} p-6 text-white`}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <span className="rounded-full bg-white/18 px-3 py-1 text-sm backdrop-blur">
                  {categoryLabels[selectedPost.category] || selectedPost.category}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="rounded-lg bg-white/15 p-2 transition-colors hover:bg-white/25"
                  aria-label="Detayı kapat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <h2 className="text-2xl leading-tight">{selectedPost.title}</h2>
            </div>
            <div className="space-y-5 overflow-y-auto p-6">
              <p className="whitespace-pre-wrap leading-7 text-gray-800">{selectedPost.content}</p>
              <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500">
                <span>{selectedPost.userName}</span>
                <span>{user.department}</span>
                <span>{formatDate(selectedPost.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportingPost && (
        <ReportPostModal
          post={reportingPost}
          onClose={() => setReportingPost(null)}
          onReported={() => setReportMessage('Raporunuz gönderildi. En kısa sürede inceleme başlatılacaktır.')}
        />
      )}
    </div>
  );
}
