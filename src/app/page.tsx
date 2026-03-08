'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MATCH_DURATION_SEC,
  formatTime,
  getPhaseInfo,
} from '@/lib/match-timer';

export default function MatchTimerPage() {
  const [secondsRemaining, setSecondsRemaining] = useState(MATCH_DURATION_SEC);
  const [isRunning, setIsRunning] = useState(false);
  const [redWonAuto, setRedWonAuto] = useState(true); // slider: 0 = Red, 1 = Blue -> redWonAuto = sliderValue === 0
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phaseInfo = getPhaseInfo(secondsRemaining, redWonAuto);

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

  const handleReset = () => {
    setIsRunning(false);
    setSecondsRemaining(MATCH_DURATION_SEC);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
            FIRST Match Timer
          </h1>
          <p className="mt-1 text-sm text-zinc-500 font-body">
            Track active and inactive goals by timeframe
          </p>
        </header>

        {/* AUTO Result slider */}
        <section className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-body mb-3">
            AUTO result
          </p>
          <p className="text-sm text-zinc-400 font-body mb-4">
            Which alliance scored more FUEL during AUTO (or was selected by FMS)?
          </p>
          <div className="flex items-center gap-4">
            <span
              className={`font-display font-semibold text-lg transition-colors ${
                redWonAuto ? 'text-alliance-red' : 'text-zinc-500'
              }`}
            >
              Red
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={1}
              value={redWonAuto ? 0 : 1}
              onChange={(e) => setRedWonAuto(e.target.value === '0')}
              className="flex-1 h-3 accent-zinc-500"
              aria-label="Select which alliance won autonomous"
            />
            <span
              className={`font-display font-semibold text-lg transition-colors ${
                !redWonAuto ? 'text-alliance-blue' : 'text-zinc-500'
              }`}
            >
              Blue
            </span>
          </div>
        </section>

        {/* Timer */}
        <section className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-8 flex flex-col items-center">
          <div className="font-display text-6xl md:text-7xl font-bold tabular-nums text-zinc-100 tracking-tight">
            {formatTime(secondsRemaining)}
          </div>
          <p className="mt-2 text-sm text-zinc-500 font-body">
            {phaseInfo.label} <span className="text-zinc-600">({phaseInfo.timeRange})</span>
          </p>
          <div className="mt-6 flex gap-4">
            <button
              type="button"
              onClick={() => setIsRunning((r) => !r)}
              className="px-6 py-2.5 rounded-xl font-display font-semibold text-sm uppercase tracking-wider bg-zinc-100 text-zinc-900 hover:bg-white transition-colors"
            >
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl font-display font-semibold text-sm uppercase tracking-wider border border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Reset
            </button>
          </div>
        </section>

        {/* Hub status */}
        <section className="grid grid-cols-2 gap-4">
          <div
            className={`rounded-2xl border-2 p-6 transition-all ${
              phaseInfo.redHubActive
                ? 'bg-alliance-red/15 border-alliance-red text-alliance-red'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
            }`}
          >
            <p className="text-xs uppercase tracking-wider font-body mb-1 opacity-80">
              Red Alliance Hub
            </p>
            <p className="font-display text-xl font-bold">
              {phaseInfo.redHubActive ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div
            className={`rounded-2xl border-2 p-6 transition-all ${
              phaseInfo.blueHubActive
                ? 'bg-alliance-blue/15 border-alliance-blue text-alliance-blue'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
            }`}
          >
            <p className="text-xs uppercase tracking-wider font-body mb-1 opacity-80">
              Blue Alliance Hub
            </p>
            <p className="font-display text-xl font-bold">
              {phaseInfo.blueHubActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
