import { useMemo } from 'react';
import type { PresenceSnapshot } from '../bus/types';
import { PHASE_LABELS } from '../bus/types';
import { blobatar } from './blobatar/blobatar';
import type { Expression } from './blobatar/expression';
import { toIdentityExpression } from './map';

export interface IdentityPresenceProps {
  /** Who this figure stands for. Same name → same body. */
  name: string;
  snapshot?: PresenceSnapshot;
  /** Catalog override. Wins over snapshot mapping when set. */
  expression?: Expression;
  size?: number;
  title?: string;
}

export function IdentityPresence({
  name,
  snapshot,
  expression,
  size = 96,
  title
}: IdentityPresenceProps) {
  const pose = expression ?? (snapshot ? toIdentityExpression(snapshot.phase) : undefined);
  const svg = useMemo(
    () =>
      blobatar(name, {
        size,
        expression: pose,
        title: title ?? (snapshot ? `${name} — ${PHASE_LABELS[snapshot.phase]}` : name),
        background: false
      }),
    [name, pose, size, title, snapshot]
  );

  return (
    <span
      role="img"
      aria-label={title ?? (snapshot ? `${name} — ${PHASE_LABELS[snapshot.phase]}` : name)}
      style={{ display: 'inline-flex', width: size, height: size, lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
