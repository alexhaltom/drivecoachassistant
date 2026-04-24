/**
 * FIRST Robotics match timer logic.
 * Match length: 2:20 (140 seconds), or 2:40 (160 seconds) with Auto period.
 * Hub status depends on AUTO result (Red vs Blue).
 */

export const MATCH_DURATION_SEC = 140; // 2:20
export const AUTO_PERIOD_SEC = 20;     // optional 20s at start
export const MATCH_WITH_AUTO_SEC = MATCH_DURATION_SEC + AUTO_PERIOD_SEC; // 2:40
export const DEFAULT_AUTO_TELEOP_DELAY_SEC = 3;
export const MAX_AUTO_TELEOP_DELAY_SEC = 60;

export type Alliance = 'red' | 'blue';

export type Phase =
  | 'auto'         // 2:40 – 2:20 (first 20s when Include Auto is on)
  | 'delay'        // configurable delay between AUTO and teleop
  | 'transition'   // 2:20 - 2:10
  | 'shift1'       // 2:10 - 1:45
  | 'shift2'       // 1:45 - 1:20
  | 'shift3'       // 1:20 - 0:55
  | 'shift4'       // 0:55 - 0:30
  | 'endgame';     // 0:30 - 0:00

export interface PhaseInfo {
  phase: Phase;
  label: string;
  timeRange: string;
  redHubActive: boolean;
  blueHubActive: boolean;
}

// Red alliance won AUTO (scored more FUEL or selected by FMS)
const RED_WON_AUTO: Record<Phase, { red: boolean; blue: boolean }> = {
  auto: { red: true, blue: true },
  delay: { red: true, blue: true },
  transition: { red: true, blue: true },
  shift1: { red: false, blue: true },
  shift2: { red: true, blue: false },
  shift3: { red: false, blue: true },
  shift4: { red: true, blue: false },
  endgame: { red: true, blue: true },
};

// Blue alliance won AUTO
const BLUE_WON_AUTO: Record<Phase, { red: boolean; blue: boolean }> = {
  auto: { red: true, blue: true },
  delay: { red: true, blue: true },
  transition: { red: true, blue: true },
  shift1: { red: true, blue: false },
  shift2: { red: false, blue: true },
  shift3: { red: true, blue: false },
  shift4: { red: false, blue: true },
  endgame: { red: true, blue: true },
};

const PHASE_LABELS: Record<Phase, string> = {
  auto: 'AUTO',
  delay: 'AUTO / TELEOP DELAY',
  transition: 'TRANSITION SHIFT',
  shift1: 'SHIFT 1',
  shift2: 'SHIFT 2',
  shift3: 'SHIFT 3',
  shift4: 'SHIFT 4',
  endgame: 'END GAME',
};

const PHASE_RANGES: Record<Phase, string> = {
  auto: 'AUTO period',
  delay: 'Auto-to-teleop delay',
  transition: '2:20 – 2:10',
  shift1: '2:10 – 1:45',
  shift2: '1:45 – 1:20',
  shift3: '1:20 – 0:55',
  shift4: '0:55 – 0:30',
  endgame: '0:30 – 0:00',
};

export function clampAutoTeleopDelaySec(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_AUTO_TELEOP_DELAY_SEC;
  return Math.max(0, Math.min(MAX_AUTO_TELEOP_DELAY_SEC, Math.round(seconds)));
}

/** Get phase from seconds remaining. Delay is handled separately because the match clock pauses at 2:20. */
export function getPhaseFromSecondsRemaining(
  secondsRemaining: number,
  includeAutoPeriod: boolean,
  autoTeleopDelaySec: number = DEFAULT_AUTO_TELEOP_DELAY_SEC
): Phase {
  void autoTeleopDelaySec;
  if (includeAutoPeriod && secondsRemaining > MATCH_DURATION_SEC) {
    return 'auto';
  }
  if (secondsRemaining > 130) return 'transition';
  if (secondsRemaining > 105) return 'shift1';
  if (secondsRemaining > 80) return 'shift2';
  if (secondsRemaining > 55) return 'shift3';
  if (secondsRemaining > 30) return 'shift4';
  return 'endgame';
}

/** Get hub status for current phase and AUTO winner. */
export function getHubStatus(
  phase: Phase,
  redWonAuto: boolean
): { redHubActive: boolean; blueHubActive: boolean } {
  const map = redWonAuto ? RED_WON_AUTO : BLUE_WON_AUTO;
  const { red, blue } = map[phase];
  return { redHubActive: red, blueHubActive: blue };
}

/** Format seconds as M:SS. */
export function formatTime(secondsRemaining: number): string {
  const m = Math.floor(secondsRemaining / 60);
  const s = Math.floor(secondsRemaining % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Full phase info for display. */
export function getPhaseInfo(
  secondsRemaining: number,
  redWonAuto: boolean,
  includeAutoPeriod: boolean = false,
  autoTeleopDelaySec: number = DEFAULT_AUTO_TELEOP_DELAY_SEC
): PhaseInfo {
  const phase = getPhaseFromSecondsRemaining(
    secondsRemaining,
    includeAutoPeriod,
    autoTeleopDelaySec
  );
  const hub = getHubStatus(phase, redWonAuto);
  return {
    phase,
    label: PHASE_LABELS[phase],
    timeRange: PHASE_RANGES[phase],
    redHubActive: hub.redHubActive,
    blueHubActive: hub.blueHubActive,
  };
}

/** Total match duration in seconds. Auto-to-teleop delay pauses the clock and is not included here. */
export function getMatchDurationSec(
  includeAutoPeriod: boolean,
  autoTeleopDelaySec: number = DEFAULT_AUTO_TELEOP_DELAY_SEC
): number {
  void autoTeleopDelaySec;
  return includeAutoPeriod ? MATCH_WITH_AUTO_SEC : MATCH_DURATION_SEC;
}

/** Hub status letter for unguided view: A=Auto, D=Delay, T=Transition, R=Red, B=Blue, E=End game. */
export function getHubLetter(
  phase: Phase,
  redHubActive: boolean,
  blueHubActive: boolean
): 'A' | 'D' | 'T' | 'R' | 'B' | 'E' {
  if (phase === 'auto') return 'A';
  if (phase === 'delay') return 'D';
  if (phase === 'transition') return 'T';
  if (phase === 'endgame') return 'E';
  if (redHubActive && !blueHubActive) return 'R';
  if (!redHubActive && blueHubActive) return 'B';
  return 'E'; // fallback both active
}

/** Seconds remaining in the current phase (phase end is when we hit the next boundary). */
const PHASE_END_SEC: Record<Phase, number> = {
  auto: MATCH_DURATION_SEC,
  delay: MATCH_DURATION_SEC,
  transition: 130,
  shift1: 105,
  shift2: 80,
  shift3: 55,
  shift4: 30,
  endgame: 0,
};

export function getSecondsRemainingInPhase(
  secondsRemaining: number,
  phase: Phase,
  includeAutoPeriod: boolean,
  autoTeleopDelaySec: number = DEFAULT_AUTO_TELEOP_DELAY_SEC
): number {
  void includeAutoPeriod;
  void autoTeleopDelaySec;
  const endSec = phase === 'auto' ? MATCH_DURATION_SEC : PHASE_END_SEC[phase];
  if (phase === 'auto') return secondsRemaining - endSec;
  return secondsRemaining - endSec;
}
