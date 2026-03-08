/**
 * FIRST Robotics match timer logic.
 * Match length: 2:20 (140 seconds). Hub status depends on AUTO result (Red vs Blue).
 */

export const MATCH_DURATION_SEC = 140; // 2:20

export type Alliance = 'red' | 'blue';

export type Phase =
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
  transition: { red: true, blue: true },
  shift1: { red: false, blue: true },
  shift2: { red: true, blue: false },
  shift3: { red: false, blue: true },
  shift4: { red: true, blue: false },
  endgame: { red: true, blue: true },
};

// Blue alliance won AUTO
const BLUE_WON_AUTO: Record<Phase, { red: boolean; blue: boolean }> = {
  transition: { red: true, blue: true },
  shift1: { red: true, blue: false },
  shift2: { red: false, blue: true },
  shift3: { red: true, blue: false },
  shift4: { red: false, blue: true },
  endgame: { red: true, blue: true },
};

const PHASE_LABELS: Record<Phase, string> = {
  transition: 'TRANSITION SHIFT',
  shift1: 'SHIFT 1',
  shift2: 'SHIFT 2',
  shift3: 'SHIFT 3',
  shift4: 'SHIFT 4',
  endgame: 'END GAME',
};

const PHASE_RANGES: Record<Phase, string> = {
  transition: '2:20 – 2:10',
  shift1: '2:10 – 1:45',
  shift2: '1:45 – 1:20',
  shift3: '1:20 – 0:55',
  shift4: '0:55 – 0:30',
  endgame: '0:30 – 0:00',
};

/** Get phase from seconds remaining (140 down to 0). */
export function getPhaseFromSecondsRemaining(secondsRemaining: number): Phase {
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
  redWonAuto: boolean
): PhaseInfo {
  const phase = getPhaseFromSecondsRemaining(secondsRemaining);
  const hub = getHubStatus(phase, redWonAuto);
  return {
    phase,
    label: PHASE_LABELS[phase],
    timeRange: PHASE_RANGES[phase],
    redHubActive: hub.redHubActive,
    blueHubActive: hub.blueHubActive,
  };
}
