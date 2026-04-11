/**
 * WAV assets live on disk under:
 * `drivecoachassistant/public/` (e.g. `...\drivecoachassistant\public\`).
 * Next.js serves that folder at the site root, so use paths like `/cavalry-charge.wav`
 * (not a Windows path). Rename files to match `MATCH_SOUND_FILES` or edit the map below.
 */
export const MATCH_SOUND_FILES = {
  cavalryCharge: '/cavalry-charge.wav',
  buzzer: '/buzzer.wav',
  threeBells: '/3-bells.wav',
  powerUpLinearPopping: '/power-up-linear-popping.wav',
  steamWhistle: '/steam-whistle.wav',
} as const;

/**
 * iOS Safari often fails to decode some WAV variants (e.g. IEEE float / 24-bit).
 * Try compressed formats first; add matching files under /public if needed.
 */
export const POWER_UP_SOUND_SOURCES: readonly string[] = [
  '/power-up-linear-popping.mp3',
  '/power-up-linear-popping.m4a',
  '/power-up-linear-popping.wav',
];

/** Main match clock seconds remaining when each alliance shift begins. */
export const ALLIANCE_SHIFT_TRIGGER_SEC = [130, 105, 80, 55] as const;

const TELEOP_START_SEC = 140;
const ENDGAME_START_SEC = 30;

/**
 * Play first URL that loads and decodes. Helps iOS when .wav fails but .mp3 works.
 */
export function playMatchSoundFromSources(urls: readonly string[]): void {
  if (urls.length === 0) return;
  const [first, ...rest] = urls;
  const audio = new Audio();
  let advanced = false;
  const tryNext = () => {
    if (advanced) return;
    advanced = true;
    if (rest.length > 0) playMatchSoundFromSources(rest);
  };
  audio.preload = 'auto';
  audio.volume = 1;
  audio.addEventListener('error', tryNext, { once: true });
  audio.src = first;
  audio.load();
  void audio.play().catch(tryNext);
}

export function playMatchSound(src: string): void {
  playMatchSoundFromSources([src]);
}

export function playTeleopTransitionCue(includeAutoPeriod: boolean): void {
  if (includeAutoPeriod) {
    playMatchSound(MATCH_SOUND_FILES.buzzer);
    window.setTimeout(() => {
      playMatchSound(MATCH_SOUND_FILES.threeBells);
    }, 400);
  } else {
    playMatchSound(MATCH_SOUND_FILES.threeBells);
  }
}

export function handleMatchClockTickSounds(
  prev: number,
  next: number,
  includeAutoPeriod: boolean
): void {
  if (prev <= next) return;

  if (next === TELEOP_START_SEC && prev > TELEOP_START_SEC) {
    playTeleopTransitionCue(includeAutoPeriod);
    return;
  }

  if ((ALLIANCE_SHIFT_TRIGGER_SEC as readonly number[]).includes(next)) {
    playMatchSoundFromSources(POWER_UP_SOUND_SOURCES);
    return;
  }

  if (next === ENDGAME_START_SEC) {
    playMatchSound(MATCH_SOUND_FILES.steamWhistle);
    return;
  }

  if (next === 0 && prev > 0) {
    playMatchSound(MATCH_SOUND_FILES.buzzer);
  }
}
