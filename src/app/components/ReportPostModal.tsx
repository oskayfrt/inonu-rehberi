import { useState } from 'react';
import { AlertTriangle, Flag, X } from 'lucide-react';
import { api, type ApiPost } from '../lib/api';
import { getCurrentUser } from '../lib/auth';

const reportReasons = [
  'Nefret söylemi veya ırkçılık',
  'Küfür veya hakaret',
  'Taciz veya rahatsız edici davranış',
  'Yanıltıcı veya yanlış bilgi',
  'Spam içerik',
  'Kişisel bilgi paylaşımı',
  'Toplum huzurunu bozabilecek içerik',
  'Diğer',
];

export function ReportPostModal({
  post,
  onClose,
  onReported,
}: {
  post: ApiPost;
  onClose: () => void;
  onReported?: () => void;
}) {
  const user = getCurrentUser();
  const [reason, setReason] = useState(reportReasons[0]);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReport = async () => {
    if (!user?.id) {
      setError('Raporlamak için giriş yapmalısın.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.reportPost({
        reporterUserId: user.id,
        postId: post.id,
        reason,
        details,
      });
      onReported?.();
      onClose();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Rapor gönderilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#1e3a8a]">
              <Flag className="h-5 w-5" />
              <h2>Paylaşımı Raporla</h2>
            </div>
            <p className="text-sm text-gray-600">
              Raporunuz inceleme sürecine alınır. Gerekli görülürse paylaşım kaldırılır veya hesap hakkında işlem yapılır.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Raporlanan paylaşım</p>
          <h3 className="mt-1">{post.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm text-gray-700">{post.content}</p>
        </div>

        {error && (
          <div className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <label className="mb-4 block">
          <span className="mb-2 block text-sm">Neden raporluyorsun?</span>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          >
            {reportReasons.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm">Açıklama</span>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            className="min-h-[120px] w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            placeholder="İstersen inceleme ekibinin daha iyi anlaması için kısa açıklama yaz."
          />
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={submitReport}
            disabled={isSubmitting}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            <Flag className="h-4 w-4" />
            {isSubmitting ? 'Gönderiliyor...' : 'Raporu Gönder'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gray-100 px-5 py-3 text-gray-700 transition-colors hover:bg-gray-200"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
