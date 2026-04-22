import type { ReactNode } from 'react';

type InlineBadgeProps = {
  children: ReactNode;
};

export function InlineBadge({ children }: InlineBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid rgba(143, 199, 255, 0.38)',
        borderRadius: 999,
        padding: '0.15rem 0.5rem',
        fontSize: '0.76rem',
        color: '#a8d0ff',
        background: 'rgba(143, 199, 255, 0.12)',
      }}
    >
      {children}
    </span>
  );
}
