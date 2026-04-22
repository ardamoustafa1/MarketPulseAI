import type { ReactNode } from 'react';
import { uiTokens } from '../tokens';

type InlineBadgeProps = {
  children: ReactNode;
};

export function InlineBadge({ children }: InlineBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${uiTokens.accentBlueBorder}`,
        borderRadius: 999,
        padding: '0.15rem 0.5rem',
        fontSize: '0.76rem',
        color: uiTokens.accentBlue,
        background: uiTokens.accentBlueSoft,
      }}
    >
      {children}
    </span>
  );
}
