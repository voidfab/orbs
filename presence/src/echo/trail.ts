import { IDLE_SNAPSHOT, type PresencePhase, type PresenceSnapshot } from '../bus/types';

/**
 * Afterimage of the last named phase. Same verb as Conversation Seam's
 * fainter overlay knot: a body that lags the live one.
 */

export interface EchoFrame {
  live: PresenceSnapshot;
  echo: PresenceSnapshot;
  /** 0–1 visibility of the echo. */
  amount: number;
}

export function echoTau(phase: PresencePhase): number {
  if (phase === 'asleep') return 1.45;
  if (phase === 'done') return 0.95;
  if (phase === 'err') return 0.85;
  return 0.52;
}

export class EchoTrail {
  live: PresenceSnapshot = { ...IDLE_SNAPSHOT, duplex: { ...IDLE_SNAPSHOT.duplex } };
  echo: PresenceSnapshot = { ...IDLE_SNAPSHOT, duplex: { ...IDLE_SNAPSHOT.duplex } };
  amount = 0;

  adopt(next: PresenceSnapshot): EchoFrame {
    if (next.phase !== this.live.phase) {
      this.echo = cloneSnapshot(this.live);
      this.amount = 1;
    }
    this.live = cloneSnapshot(next);
    return this.frame();
  }

  step(dt: number): EchoFrame {
    const tau = Math.max(echoTau(this.echo.phase), echoTau(this.live.phase));
    this.amount *= Math.exp(-Math.max(0, dt) / tau);
    if (this.amount < 0.02) this.amount = 0;
    return this.frame();
  }

  frame(): EchoFrame {
    return { live: this.live, echo: this.echo, amount: this.amount };
  }
}

function cloneSnapshot(snapshot: PresenceSnapshot): PresenceSnapshot {
  return {
    phase: snapshot.phase,
    duplex: { input: snapshot.duplex.input, output: snapshot.duplex.output },
    tool: snapshot.tool ? { ...snapshot.tool } : null,
    error: snapshot.error,
    session: snapshot.session
  };
}
