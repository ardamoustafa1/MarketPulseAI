import * as Haptics from 'expo-haptics';
import type { HeroClass } from './AssetHero3D';

/**
 * Class-specific micro-haptic mapping. We use the subtle variants so the
 * "sound/feel" is a soft brand signature, not a jarring interruption.
 * Sound cues can later ride on top by playing class-specific .caf/.mp3 bundles.
 */
export async function playClassHaptic(klass: HeroClass): Promise<void> {
  try {
    switch (klass) {
      case 'metal':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        return;
      case 'crypto_major':
      case 'crypto_alt':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return;
      case 'fx':
        await Haptics.selectionAsync();
        return;
      case 'equity':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      case 'commodity':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        return;
      default:
        await Haptics.selectionAsync();
    }
  } catch {
    // Haptics may not be available on web / emulator — fail silently.
  }
}
