export interface Palette {
  background: {
    base: string;
    surface: string;
    elevated: string;
    glass: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  accent: {
    premium_gold: string;
    primary_blue: string;
  };
  sentiment: {
    bull_green: string;
    bear_red: string;
  };
  border: {
    soft: string;
    stronger: string;
  };
}

export const darkPalette: Palette = {
  background: {
    base: '#0D0E12',
    surface: '#15171C',
    elevated: '#1D1F27',
    glass: 'rgba(21, 23, 28, 0.7)',
  },
  text: {
    primary: '#F5F5F5',
    secondary: '#8E93A4',
    muted: '#5C6070',
  },
  accent: {
    premium_gold: '#C8A97E',
    primary_blue: '#4A5C82',
  },
  sentiment: {
    bull_green: '#3BD984',
    bear_red: '#FF5C5C',
  },
  border: {
    soft: 'rgba(255, 255, 255, 0.05)',
    stronger: 'rgba(255, 255, 255, 0.12)',
  },
};

/**
 * Light palette — a calm warm-paper backdrop with navy text.
 * Keeps sentiment colors close to dark so greens/reds remain expressive.
 */
export const lightPalette: Palette = {
  background: {
    base: '#F5F4EF',
    surface: '#FFFFFF',
    elevated: '#FBFAF6',
    glass: 'rgba(255, 255, 255, 0.75)',
  },
  text: {
    primary: '#141622',
    secondary: '#4E5362',
    muted: '#8E93A4',
  },
  accent: {
    premium_gold: '#A88757',
    primary_blue: '#35507A',
  },
  sentiment: {
    bull_green: '#12A05B',
    bear_red: '#D33B3B',
  },
  border: {
    soft: 'rgba(20, 22, 34, 0.08)',
    stronger: 'rgba(20, 22, 34, 0.16)',
  },
};

/**
 * The colors object is a live reference that downstream code reads on every render.
 * Inline style usages of `colors.*` will react to appearance changes automatically.
 * Only styles captured inside StyleSheet.create snapshots will retain the original
 * value until the next JS reload — those cases use the appropriate palette color
 * inline where dynamism matters.
 */
export const colors: Palette = JSON.parse(JSON.stringify(darkPalette));

export function applyPalette(next: Palette): void {
  Object.assign(colors.background, next.background);
  Object.assign(colors.text, next.text);
  Object.assign(colors.accent, next.accent);
  Object.assign(colors.sentiment, next.sentiment);
  Object.assign(colors.border, next.border);
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 9999,
};

export const IS_DARK_MODE = true;
