import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { Illustration, type IllustrationName } from './Illustration';

export function EmptyState({ icon = 'search', illustration, title, hint, action }: { icon?: IconName; illustration?: IllustrationName; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      {illustration
        ? <Illustration name={illustration} className="empty-state__art" />
        : <div className="empty-state__icon"><Icon name={icon} size={24} /></div>}
      <h2 style={{ fontSize: 'var(--text-xl)' }}>{title}</h2>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}
