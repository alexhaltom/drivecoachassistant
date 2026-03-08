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

export default function MatchTimerPage() {
  const [guided, setGuided] = useState(true);
  const [includeAutoPeriod, setIncludeAutoPeriod] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    getMatchDurationSec(false)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [redWonAuto, setRedWonAuto] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    <main className="min-h-screen flex flex-col">
      {/* Top bar: title left, Auto winner + Include Auto period right */}
      <div className="flex items-center justify-between shrink-0 px-4 py-3 md:px-6 md:py-4 gap-3 flex-wrap">
        <h1 className="font-display text-lg md:text-xl font-bold tracking-tight text-zinc-100">
          FIRST Match Timer
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setGuided((g) => !g)}
            className={`px-3 py-1.5 rounded-lg font-display text-sm font-semibold transition-colors border-2 ${
              guided
                ? 'bg-zinc-100 text-zinc-900 border-zinc-100'
                : 'border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
            }`}
            aria-label="Toggle guided mode"
          >
            Guided
          </button>
          <button
            type="button"
            onClick={() => setRedWonAuto((r) => !r)}
            className={`px-3 py-1.5 rounded-lg font-display text-sm font-semibold transition-colors border-2 ${
              redWonAuto
                ? 'bg-alliance-red/20 border-alliance-red text-alliance-red'
                : 'bg-alliance-blue/20 border-alliance-blue text-alliance-blue'
            }`}
            aria-label="Toggle auto winner"
          >
            Auto: {redWonAuto ? 'Red' : 'Blue'}
          </button>
          <button
            type="button"
            onClick={toggleAutoPeriod}
            className={`px-3 py-1.5 rounded-lg font-display text-sm font-semibold transition-colors border-2 ${
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

      {/* Main content: Guided (full UI) or Unguided (time + letter + period time only) */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pb-4">
        {guided ? (
          <>
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
          </>
        ) : (
          <>
            <div
              className="font-display font-bold tabular-nums text-zinc-100 tracking-tight w-full text-center"
              style={{ fontSize: 'clamp(4rem, 18vw, 14rem)' }}
            >
              {formatTime(secondsRemaining)}
            </div>
            <p className="mt-4 text-zinc-500 font-body text-sm">
              Time remaining in match
            </p>
            <div
              className="font-display font-bold text-zinc-100 mt-8 text-center"
              style={{
                fontSize: 'clamp(3rem, 12vw, 8rem)',
                lineHeight: 1,
              }}
            >
              {hubLetter}
            </div>
            <p className="mt-2 text-sm text-zinc-500 font-body">
              Current period · {formatTime(Math.max(0, secondsInPeriod))} left
            </p>
            <div className="mt-6 flex gap-3">
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
          </>
        )}
      </section>
    </main>
  );
}
