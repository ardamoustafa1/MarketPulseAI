import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Radio } from 'lucide-react-native';

import { Text } from '../ui/Text';
import { fetchLiveBadge } from '../../api/trust';
import type { DataSourceBadge } from '../../types/trust';
import { colors, radius, spacing } from '../../theme';

const TONE: Record<string, string> = {
  positive: '#3BD984',
  neutral: colors.text.secondary,
  warning: '#FF8A5B',
};

const formatClock = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '—';
  }
};

interface Props {
  symbol: string;
  compact?: boolean;
  prefetched?: DataSourceBadge | null;
}

/**
 * "Canlı Veri" badge — shows source + timestamp so users can see exactly
 * which provider a price came from and when it was last refreshed.
 */
export const LiveDataBadge: React.FC<Props> = ({
  symbol,
  compact = false,
  prefetched = null,
}) => {
  const [badge, setBadge] = useState<DataSourceBadge | null>(prefetched);

  useEffect(() => {
    let active = true;
    if (prefetched) return;
    fetchLiveBadge(symbol)
      .then((v) => {
        if (active) setBadge(v);
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      active = false;
    };
  }, [symbol, prefetched]);

  if (!badge) return null;

  const tone = TONE[badge.badge_tone] ?? colors.text.secondary;
  const stamp = `${badge.source_label} ${formatClock(badge.last_updated_at)}`;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Canlı veri kaynağı: ${stamp}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: compact ? 8 : spacing.sm,
        paddingVertical: compact ? 3 : 6,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: `${tone}44`,
        backgroundColor: `${tone}14`,
        alignSelf: 'flex-start',
      }}
    >
      <Radio size={compact ? 10 : 12} color={tone} />
      <Text
        variant="caption"
        weight="700"
        color={tone}
        style={{ fontSize: compact ? 10 : 11 }}
      >
        {stamp}
      </Text>
    </View>
  );
};
