'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getMatchDurationSec,
  formatTime,
  getPhaseInfo,
  getHubLetter,
  getPhaseFromSecondsRemaining,
  getSecondsRemainingInPhase,
} from '@/lib/match-timer';
import {
  MATCH_SOUND_FILES,
  handleMatchClockTickSounds,
  playMatchSound,
} from '@/lib/match-sounds';

const DEFAULT_BG = '#09090b';
/** Tailwind zinc-100 — default for timer text */
const DEFAULT_MAIN_TIMER = '#f4f4f5';
const DEFAULT_SUB_TIMER = '#f4f4f5';

const BG_STORAGE_KEY = 'dca-bg';
const MAIN_TIMER_STORAGE_KEY = 'dca-main-timer';
const SUB_TIMER_STORAGE_KEY = 'dca-sub-timer';

function normalizeHex(input: string): string | null {
  const t = input.trim();
  const m = t.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return `#${h.toLowerCase()}`;
}

function ThemeColorRow({
  label,
  value,
  hexDraft,
  fallback,
  onPickColor,
  onHexDraftChange,
  onHexBlur,
}: {
  label: string;
  value: string;
  hexDraft: string;
  fallback: string;
  onPickColor: (hex: string) => void;
  onHexDraftChange: (s: string) => void;
  onHexBlur: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] md:text-xs uppercase tracking-wider text-zinc-500 font-body">
        {label}
      </p>
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : fallback}
          onChange={(e) => onPickColor(e.target.value)}
          className="h-9 w-14 cursor-pointer rounded border border-zinc-600 bg-zinc-800 p-0.5 shrink-0"
          aria-label={`${label} color`}
        />
        <input
          type="text"
          value={hexDraft}
          onChange={(e) => onHexDraftChange(e.target.value)}
          onBlur={onHexBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          placeholder={fallback}
          autoComplete="off"
        />
      </div>
    </div>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9s1.5.67 1.5 1.5S7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5.67 1.5-1.5 1.5z" />
    </svg>
  );
}

export default function MatchTimerPage() {
  const [guided, setGuided] = useState(true);
  const [includeAutoPeriod, setIncludeAutoPeriod] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    getMatchDurationSec(false)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [redWonAuto, setRedWonAuto] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSecondsRef = useRef<number | null>(null);
  const bgPickerRef = useRef<HTMLDivElement>(null);

  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BG);
  const [mainTimerColor, setMainTimerColor] = useState(DEFAULT_MAIN_TIMER);
  const [subTimerColor, setSubTimerColor] = useState(DEFAULT_SUB_TIMER);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [hexInput, setHexInput] = useState(DEFAULT_BG);
  const [hexInputMain, setHexInputMain] = useState(DEFAULT_MAIN_TIMER);
  const [hexInputSub, setHexInputSub] = useState(DEFAULT_SUB_TIMER);

  /** Skip the first persist run: defaults would run before load-from-storage applies and would wipe saved colors. */
  const themeColorsHydratedRef = useRef(false);

  useEffect(() => {
    try {
      const savedBg = localStorage.getItem(BG_STORAGE_KEY);
      const savedMain = localStorage.getItem(MAIN_TIMER_STORAGE_KEY);
      const savedSub = localStorage.getItem(SUB_TIMER_STORAGE_KEY);
      const nb = savedBg ? normalizeHex(savedBg) : null;
      const nm = savedMain ? normalizeHex(savedMain) : null;
      const ns = savedSub ? normalizeHex(savedSub) : null;
      if (nb) {
        setBackgroundColor(nb);
        setHexInput(nb);
      }
      if (nm) {
        setMainTimerColor(nm);
        setHexInputMain(nm);
      }
      if (ns) {
        setSubTimerColor(ns);
        setHexInputSub(ns);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!themeColorsHydratedRef.current) {
      themeColorsHydratedRef.current = true;
      return;
    }
    try {
      localStorage.setItem(BG_STORAGE_KEY, backgroundColor);
      localStorage.setItem(MAIN_TIMER_STORAGE_KEY, mainTimerColor);
      localStorage.setItem(SUB_TIMER_STORAGE_KEY, subTimerColor);
    } catch {
      /* ignore */
    }
  }, [backgroundColor, mainTimerColor, subTimerColor]);

  useEffect(() => {
    if (!bgPickerOpen) return;
    const close = (e: MouseEvent) => {
      if (bgPickerRef.current && !bgPickerRef.current.contains(e.target as Node)) {
        setBgPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [bgPickerOpen]);

  const phaseInfo = getPhaseInfo(secondsRemaining, redWonAuto, includeAutoPeriod);
  const currentPhase = getPhaseFromSecondsRemaining(secondsRemaining, includeAutoPeriod);
  const hubLetter = getHubLetter(
    currentPhase,
    phaseInfo.redHubActive,
    phaseInfo.blueHubActive
  );
  const secondsInPeriod = getSecondsRemainingInPhase(
    secondsRemaining,
    currentPhase,
    includeAutoPeriod
  );
  const periodTimeDisplay = formatTime(Math.max(0, secondsInPeriod));

  const tick = useCallback(() => {
    setSecondsRemaining((prev) => {
      if (prev <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsRunning(false);
        return 0;
      }
      return prev - 1;
    });
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(tick, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, tick]);

  useEffect(() => {
    if (!isRunning) {
      prevSecondsRef.current = secondsRemaining;
      return;
    }
    const prev = prevSecondsRef.current ?? secondsRemaining;
    if (prev > secondsRemaining) {
      handleMatchClockTickSounds(prev, secondsRemaining, includeAutoPeriod);
    }
    prevSecondsRef.current = secondsRemaining;
  }, [secondsRemaining, isRunning, includeAutoPeriod]);

  const handleReset = () => {
    setIsRunning(false);
    setSecondsRemaining(getMatchDurationSec(includeAutoPeriod));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const toggleAutoPeriod = () => {
    setIncludeAutoPeriod((prev) => {
      const next = !prev;
      setSecondsRemaining((s) =>
        next ? Math.min(s + 20, 160) : Math.min(s, 140)
      );
      return next;
    });
  };

  return (
    <main
      className="min-h-screen flex flex-col transition-[background-color] duration-150"
      style={{ backgroundColor }}
    >
      {/* Top bar: logo left, buttons right; shrinks to fit on mobile */}
      <div className="flex items-center justify-between shrink-0 min-h-0 px-2 py-2 md:px-6 md:py-4 gap-1.5 md:gap-3 flex-nowrap">
        <img
          src="/first_age_frc_rebuilt_wordmark_rgb_white.png"
          alt="Rebuilt presented by HAAS Gene Haas Foundation"
          className="h-6 md:h-10 w-auto min-w-0 max-w-[40vw] md:max-w-none object-contain object-left shrink-0"
        />
        <div className="flex items-center gap-1 md:gap-2 flex-shrink min-w-0 flex-nowrap">
          <div className="relative shrink-0" ref={bgPickerRef}>
            <button
              type="button"
              onClick={() => {
                setHexInput(backgroundColor);
                setHexInputMain(mainTimerColor);
                setHexInputSub(subTimerColor);
                setBgPickerOpen((o) => !o);
              }}
              className="p-1.5 md:p-2 rounded-md md:rounded-lg border border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Colors: background and timers"
              aria-expanded={bgPickerOpen}
              aria-haspopup="dialog"
            >
              <PaletteIcon className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            {bgPickerOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-[min(calc(100vw-1rem),18rem)] rounded-lg border border-zinc-600 bg-zinc-900 p-3 shadow-xl flex flex-col gap-3"
                role="dialog"
                aria-label="Choose colors"
              >
                <ThemeColorRow
                  label="Background"
                  value={backgroundColor}
                  hexDraft={hexInput}
                  fallback={DEFAULT_BG}
                  onPickColor={(v) => {
                    setBackgroundColor(v);
                    setHexInput(v);
                  }}
                  onHexDraftChange={setHexInput}
                  onHexBlur={() => {
                    const n = normalizeHex(hexInput);
                    if (n) {
                      setBackgroundColor(n);
                      setHexInput(n);
                    } else {
                      setHexInput(backgroundColor);
                    }
                  }}
                />
                <ThemeColorRow
                  label="Main timer"
                  value={mainTimerColor}
                  hexDraft={hexInputMain}
                  fallback={DEFAULT_MAIN_TIMER}
                  onPickColor={(v) => {
                    setMainTimerColor(v);
                    setHexInputMain(v);
                  }}
                  onHexDraftChange={setHexInputMain}
                  onHexBlur={() => {
                    const n = normalizeHex(hexInputMain);
                    if (n) {
                      setMainTimerColor(n);
                      setHexInputMain(n);
                    } else {
                      setHexInputMain(mainTimerColor);
                    }
                  }}
                />
                <ThemeColorRow
                  label="Sub Timer"
                  value={subTimerColor}
                  hexDraft={hexInputSub}
                  fallback={DEFAULT_SUB_TIMER}
                  onPickColor={(v) => {
                    setSubTimerColor(v);
                    setHexInputSub(v);
                  }}
                  onHexDraftChange={setHexInputSub}
                  onHexBlur={() => {
                    const n = normalizeHex(hexInputSub);
                    if (n) {
                      setSubTimerColor(n);
                      setHexInputSub(n);
                    } else {
                      setHexInputSub(subTimerColor);
                    }
                  }}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setGuided((g) => !g)}
            className={`px-1.5 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg font-display text-[10px] md:text-sm font-semibold transition-colors border shrink-0 whitespace-nowrap ${
              guided
                ? 'bg-zinc-100 text-zinc-900 border-zinc-100'
                : 'border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
            }`}
            aria-label="Toggle guided mode on or off"
          >
            Guided: {guided ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={() => setRedWonAuto((r) => !r)}
            className={`px-1.5 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg font-display text-[10px] md:text-sm font-semibold transition-colors border shrink-0 whitespace-nowrap ${
              redWonAuto
                ? 'bg-alliance-red/20 border-alliance-red text-alliance-red'
                : 'bg-alliance-blue/20 border-alliance-blue text-alliance-blue'
            }`}
            aria-label="Toggle auto winner"
          >
            <span className="sm:hidden">Auto: </span><span className="hidden sm:inline">Auto Winner: </span>{redWonAuto ? 'Red' : 'Blue'}
          </button>
          <button
            type="button"
            onClick={toggleAutoPeriod}
            className={`px-1.5 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg font-display text-[10px] md:text-sm font-semibold transition-colors border shrink-0 whitespace-nowrap ${
              includeAutoPeriod
                ? 'bg-zinc-100 text-zinc-900 border-zinc-100'
                : 'border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
            }`}
            aria-label="Include 20 second auto period"
          >
            +20s Auto
          </button>
        </div>
      </div>

      {/* Main content: same layout for both modes; guided adds labels and prominent hub state */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pb-4">
        {/* Row 1: Match time (same size in both modes) */}
        {guided && (
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-body mb-1">
            Time remaining in match
          </p>
        )}
        <div
          className="timer-text-outline font-display font-bold tabular-nums tracking-tight w-full text-center"
          style={{
            fontSize: 'clamp(5.5rem, 26vw, 14rem)',
            color: mainTimerColor,
          }}
        >
          {formatTime(secondsRemaining)}
        </div>

        {/* Row 2: Period letter + period time (same size, side by side) */}
        {guided && (
          <p className="mt-6 text-xs uppercase tracking-wider text-zinc-500 font-body mb-1">
            Current period (A=Auto, T=Transition, R=Red hub, B=Blue hub, E=End game)
          </p>
        )}
        <div
          className="flex items-center justify-center gap-4 md:gap-6 mt-4 flex-wrap"
          style={{ fontSize: 'clamp(3rem, 12vw, 8rem)', lineHeight: 1 }}
        >
          <span
            className="timer-text-outline font-display font-bold tabular-nums tracking-tight"
            style={{ color: subTimerColor }}
          >
            {hubLetter}
          </span>
          <span
            className="timer-text-outline font-display font-bold tabular-nums tracking-tight"
            style={{ color: subTimerColor }}
          >
            {periodTimeDisplay}
          </span>
        </div>
        {guided && (
          <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500 font-body">
            Time left in period
          </p>
        )}

        {/* Controls */}
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (!isRunning) {
                if (includeAutoPeriod && secondsRemaining === 160) {
                  playMatchSound(MATCH_SOUND_FILES.cavalryCharge);
                } else if (!includeAutoPeriod && secondsRemaining === 140) {
                  playMatchSound(MATCH_SOUND_FILES.threeBells);
                }
              }
              setIsRunning((r) => !r);
            }}
            className="px-5 py-2 rounded-xl font-display font-semibold text-sm uppercase tracking-wider bg-zinc-100 text-zinc-900 hover:bg-white transition-colors"
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2 rounded-xl font-display font-semibold text-sm uppercase tracking-wider border border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Guided only: prominent Red/Blue hub status */}
        {guided && (
          <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-lg">
            <div
              className={`rounded-2xl border-[3px] p-5 transition-all ${
                phaseInfo.redHubActive
                  ? 'bg-alliance-red/25 border-alliance-red text-alliance-red shadow-lg ring-2 ring-alliance-red/50'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
              }`}
            >
              <p className="text-xs uppercase tracking-wider font-body opacity-90 mb-1">
                Red Alliance Hub
              </p>
              <p className="font-display text-2xl font-bold">
                {phaseInfo.redHubActive ? 'ACTIVE' : 'Inactive'}
              </p>
            </div>
            <div
              className={`rounded-2xl border-[3px] p-5 transition-all ${
                phaseInfo.blueHubActive
                  ? 'bg-alliance-blue/25 border-alliance-blue text-alliance-blue shadow-lg ring-2 ring-alliance-blue/50'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
              }`}
            >
              <p className="text-xs uppercase tracking-wider font-body opacity-90 mb-1">
                Blue Alliance Hub
              </p>
              <p className="font-display text-2xl font-bold">
                {phaseInfo.blueHubActive ? 'ACTIVE' : 'Inactive'}
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
