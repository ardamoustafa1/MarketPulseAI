import { colors } from './tokens';

/**
 * Maps a change percent (-Infinity..Infinity) to a 3-tier tonal gradient.
 * The further away from zero, the more saturated the tint.
 *
 *  | magnitude        | tier    |
 *  | ---------------- | ------- |
 *  | < 0.25%          | subtle  |
 *  | 0.25% - 3%       | standard|
 *  | > 3%             | strong  |
 *
 * Gradients return a pair we can feed directly into LinearGradient.
 */
export type SentimentTier = 'subtle' | 'standard' | 'strong';

export interface SentimentPalette {
  text: string;
  fill: string;
  fillStrong: string;
  border: string;
  gradient: [string, string];
  tier: SentimentTier;
  isPositive: boolean;
}

const BULL = colors.sentiment.bull_green;
const BEAR = colors.sentiment.bear_red;
const NEUTRAL = 'rgba(255,255,255,0.08)';

function classify(magnitude: number): SentimentTier {
  if (magnitude < 0.25) return 'subtle';
  if (magnitude < 3) return 'standard';
  return 'strong';
}

export function sentimentPalette(changePercent: number): SentimentPalette {
  const isPositive = changePercent >= 0;
  const magnitude = Math.abs(changePercent);
  const tier = classify(magnitude);

  if (magnitude < 0.01) {
    return {
      text: colors.text.secondary,
      fill: NEUTRAL,
      fillStrong: 'rgba(255,255,255,0.12)',
      border: 'rgba(255,255,255,0.12)',
      gradient: [NEUTRAL, 'rgba(255,255,255,0.03)'],
      tier: 'subtle',
      isPositive,
    };
  }

  const base = isPositive ? BULL : BEAR;

  if (tier === 'subtle') {
    return {
      text: base,
      fill: isPositive ? 'rgba(59,217,132,0.08)' : 'rgba(255,92,92,0.08)',
      fillStrong: isPositive ? 'rgba(59,217,132,0.14)' : 'rgba(255,92,92,0.14)',
      border: isPositive ? 'rgba(59,217,132,0.18)' : 'rgba(255,92,92,0.18)',
      gradient: isPositive
        ? ['rgba(59,217,132,0.14)', 'rgba(59,217,132,0.02)']
        : ['rgba(255,92,92,0.14)', 'rgba(255,92,92,0.02)'],
      tier,
      isPositive,
    };
  }

  if (tier === 'standard') {
    return {
      text: base,
      fill: isPositive ? 'rgba(59,217,132,0.14)' : 'rgba(255,92,92,0.14)',
      fillStrong: isPositive ? 'rgba(59,217,132,0.22)' : 'rgba(255,92,92,0.22)',
      border: isPositive ? 'rgba(59,217,132,0.32)' : 'rgba(255,92,92,0.32)',
      gradient: isPositive
        ? ['rgba(59,217,132,0.28)', 'rgba(59,217,132,0.06)']
        : ['rgba(255,92,92,0.28)', 'rgba(255,92,92,0.06)'],
      tier,
      isPositive,
    };
  }

  return {
    text: base,
    fill: isPositive ? 'rgba(59,217,132,0.22)' : 'rgba(255,92,92,0.22)',
    fillStrong: isPositive ? 'rgba(59,217,132,0.35)' : 'rgba(255,92,92,0.35)',
    border: isPositive ? 'rgba(59,217,132,0.55)' : 'rgba(255,92,92,0.55)',
    gradient: isPositive
      ? ['rgba(59,217,132,0.45)', 'rgba(59,217,132,0.1)']
      : ['rgba(255,92,92,0.45)', 'rgba(255,92,92,0.1)'],
    tier,
    isPositive,
  };
}
