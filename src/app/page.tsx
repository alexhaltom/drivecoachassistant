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
    <main className="min-h-screen flex flex-col">
      {/* Top bar: title left, slider right */}
      <div className="flex items-center justify-between shrink-0 px-4 py-3 md:px-6 md:py-4">
        <h1 className="font-display text-lg md:text-xl font-bold tracking-tight text-zinc-100">
          FIRST Match Timer
        </h1>
        <div className="flex items-center gap-2 md:gap-3 w-32 md:w-40">
          <span
            className={`font-display text-xs md:text-sm font-semibold transition-colors ${
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
            className="flex-1 h-2 accent-zinc-500"
            aria-label="Auto result: Red or Blue"
          />
          <span
            className={`font-display text-xs md:text-sm font-semibold transition-colors ${
              !redWonAuto ? 'text-alliance-blue' : 'text-zinc-500'
            }`}
          >
            Blue
          </span>
        </div>
      </div>

      {/* Timer: fills remaining space */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pb-4">
        <div
          className="font-display font-bold tabular-nums text-zinc-100 tracking-tight w-full text-center"
          style={{ fontSize: 'clamp(4rem, 18vw, 14rem)' }}
        >
          {formatTime(secondsRemaining)}
        </div>
        <p className="mt-2 text-sm text-zinc-500 font-body">
          {phaseInfo.label} <span className="text-zinc-600">({phaseInfo.timeRange})</span>
        </p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => setIsRunning((r) => !r)}
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
        <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-md">
          <div
            className={`rounded-xl border-2 p-4 transition-all ${
              phaseInfo.redHubActive
                ? 'bg-alliance-red/15 border-alliance-red text-alliance-red'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
            }`}
          >
            <p className="text-xs uppercase tracking-wider font-body opacity-80">Red Hub</p>
            <p className="font-display text-lg font-bold">
              {phaseInfo.redHubActive ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div
            className={`rounded-xl border-2 p-4 transition-all ${
              phaseInfo.blueHubActive
                ? 'bg-alliance-blue/15 border-alliance-blue text-alliance-blue'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
            }`}
          >
            <p className="text-xs uppercase tracking-wider font-body opacity-80">Blue Hub</p>
            <p className="font-display text-lg font-bold">
              {phaseInfo.blueHubActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
