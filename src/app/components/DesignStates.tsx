import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function LoadingPanel({ label = 'Yükleniyor...' }: { label?: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="h-5 w-40 rounded-full skeleton-block" />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full rounded-full skeleton-block" />
        <div className="h-4 w-5/6 rounded-full skeleton-block" />
        <div className="h-4 w-2/3 rounded-full skeleton-block" />
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-panel rounded-2xl p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#1e3a8a]">
        <Icon className="h-8 w-8" />
      </div>
      <h2 className="mb-2">{title}</h2>
      <p className="mx-auto max-w-lg text-gray-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
