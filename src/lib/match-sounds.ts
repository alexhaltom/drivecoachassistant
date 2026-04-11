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

export type MatchSoundId = keyof typeof MATCH_SOUND_FILES;

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

// --- Web Audio (reliable on iOS when HTMLAudioElement breaks after first play) ---

let audioCtx: AudioContext | null = null;
const decodedBuffers = new Map<MatchSoundId, AudioBuffer>();
let decodePromise: Promise<void> | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

/**
 * Call synchronously from a click/touch handler so iOS resumes the AudioContext
 * in the same user-gesture stack as the tap.
 */
export function resumeMatchAudioFromUserGesture(): void {
  const ctx = getAudioContext();
  if (ctx?.state === 'suspended') {
    void ctx.resume();
  }
}

async function decodeFirstUrl(
  ctx: AudioContext,
  urls: readonly string[]
): Promise<AudioBuffer | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const ab = await res.arrayBuffer();
      return await ctx.decodeAudioData(ab.slice(0));
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Resume context (if needed) and decode all match SFX into memory.
 * Safe to call multiple times; decodes once.
 */
export async function unlockMatchAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  await ctx.resume();
  if (decodedBuffers.size > 0) return;
  if (decodePromise) {
    await decodePromise;
    return;
  }
  const run = async () => {
    const ids = Object.keys(MATCH_SOUND_FILES) as MatchSoundId[];
    for (const id of ids) {
      const urls =
        id === 'powerUpLinearPopping'
          ? POWER_UP_SOUND_SOURCES
          : [MATCH_SOUND_FILES[id]];
      const buf = await decodeFirstUrl(ctx, urls);
      if (buf) decodedBuffers.set(id, buf);
    }
  };
  const p = run();
  decodePromise = p;
  try {
    await p;
  } finally {
    decodePromise = null;
  }
}

function playDecoded(id: MatchSoundId): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;
  const buffer = decodedBuffers.get(id);
  if (!buffer) return false;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
    return true;
  } catch {
    return false;
  }
}

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

function urlsForId(id: MatchSoundId): readonly string[] {
  return id === 'powerUpLinearPopping'
    ? POWER_UP_SOUND_SOURCES
    : [MATCH_SOUND_FILES[id]];
}

/**
 * Prefer Web Audio (works from timers on iOS); fall back to HTMLAudioElement.
 */
export function playMatchSoundId(id: MatchSoundId): void {
  if (playDecoded(id)) return;
  playMatchSoundFromSources(urlsForId(id));
}

/** @deprecated Prefer playMatchSoundId — kept for call sites that pass a URL string */
export function playMatchSound(src: string): void {
  playMatchSoundFromSources([src]);
}

export function playTeleopTransitionCue(includeAutoPeriod: boolean): void {
  if (includeAutoPeriod) {
    playMatchSoundId('buzzer');
    window.setTimeout(() => {
      playMatchSoundId('threeBells');
    }, 400);
  } else {
    playMatchSoundId('threeBells');
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
    playMatchSoundId('powerUpLinearPopping');
    return;
  }

  if (next === ENDGAME_START_SEC) {
    playMatchSoundId('steamWhistle');
    return;
  }

  if (next === 0 && prev > 0) {
    playMatchSoundId('buzzer');
  }
}
