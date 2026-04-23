import { useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { applyPalette, darkPalette, lightPalette, Palette } from './tokens';

/**
 * The user-facing preference. "auto" mirrors the system setting.
 * Default is "dark" because the product is dark-first; "auto" is opt-in.
 */
export type AppearanceMode = 'dark' | 'light' | 'auto';

const STORAGE_KEY = 'appearance_mode_pref';

interface AppearanceState {
  mode: AppearanceMode;
  resolved: 'dark' | 'light';
  setMode: (mode: AppearanceMode) => Promise<void>;
  hydrate: () => Promise<void>;
  applySystem: (scheme: ColorSchemeName) => void;
}

function resolve(mode: AppearanceMode, scheme: ColorSchemeName): 'dark' | 'light' {
  if (mode === 'auto') {
    return scheme === 'light' ? 'light' : 'dark';
  }
  return mode;
}

function paletteFor(resolved: 'dark' | 'light'): Palette {
  return resolved === 'light' ? lightPalette : darkPalette;
}

export const useAppearance = create<AppearanceState>((set, get) => ({
  mode: 'dark',
  resolved: 'dark',

  setMode: async (mode: AppearanceMode) => {
    const scheme = Appearance.getColorScheme();
    const resolved = resolve(mode, scheme);
    applyPalette(paletteFor(resolved));
    set({ mode, resolved });
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, mode);
    } catch {
      // SecureStore not available (e.g. tests) — silently ignore
    }
  },

  hydrate: async () => {
    let stored: AppearanceMode = 'dark';
    try {
      const raw = (await SecureStore.getItemAsync(STORAGE_KEY)) as AppearanceMode | null;
      if (raw === 'dark' || raw === 'light' || raw === 'auto') {
        stored = raw;
      }
    } catch {
      // fall back to default
    }
    const scheme = Appearance.getColorScheme();
    const resolved = resolve(stored, scheme);
    applyPalette(paletteFor(resolved));
    set({ mode: stored, resolved });
  },

  applySystem: (scheme: ColorSchemeName) => {
    const { mode } = get();
    if (mode !== 'auto') return;
    const resolved = resolve(mode, scheme);
    applyPalette(paletteFor(resolved));
    set({ resolved });
  },
}));

/**
 * Hook to keep the app palette in sync with OS color scheme changes.
 * Call once at the app root.
 */
export function useAppearanceSync() {
  const hydrate = useAppearance((s) => s.hydrate);
  const applySystem = useAppearance((s) => s.applySystem);

  useEffect(() => {
    void hydrate();
    const sub = Appearance.addChangeListener(({ colorScheme }) => applySystem(colorScheme));
    return () => sub.remove();
  }, [hydrate, applySystem]);
}
