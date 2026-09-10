import { describe, expect, it } from 'vitest';
import { PRESENCE_PHASES } from '../bus/types';
import { blobatar } from '../identity/blobatar/blobatar';
import { thinking as thinkingExpr } from '../identity/blobatar/expression';
import { normalizeSeed } from '../identity/blobatar/hash';
import { IDENTITY_EXPRESSIONS, identityExpressionId, toIdentityExpression } from '../identity/map';

describe('blobatar identity', () => {
  it('is a pure function of the name', () => {
    const a = blobatar('alice', { size: 64, background: false });
    const b = blobatar('alice', { size: 64, background: false });
    const c = blobatar('bob', { size: 64, background: false });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith('<svg')).toBe(true);
    expect(c.startsWith('<svg')).toBe(true);
  });

  it('normalizes names humans treat as equal', () => {
    expect(normalizeSeed('Alain@x.com')).toBe('alain@x.com');
    expect(blobatar('Alain@x.com', { size: 48 })).toBe(blobatar('alain@x.com', { size: 48 }));
  });

  it('avalanches nearby names', () => {
    const a = blobatar('alain', { size: 64, background: false });
    const b = blobatar('alaim', { size: 64, background: false });
    expect(a).not.toBe(b);
  });

  it('bakes expression into geometry without changing who it is', () => {
    const idle = blobatar('presence', { size: 64, background: false });
    const thinking = blobatar('presence', { size: 64, background: false, expression: thinkingExpr });
    expect(idle).not.toBe(thinking);
    expect(idle.includes('viewBox')).toBe(true);
    expect(thinking.includes('viewBox')).toBe(true);
  });
});

describe('identity expression map', () => {
  it('covers every presence phase', () => {
    for (const phase of PRESENCE_PHASES) {
      const expr = toIdentityExpression(phase);
      expect(expr.p).toBeTruthy();
      expect(IDENTITY_EXPRESSIONS[identityExpressionId(phase)]).toBe(expr);
    }
  });

  it('keeps err as mad and waiting as scared', () => {
    expect(identityExpressionId('err')).toBe('mad');
    expect(identityExpressionId('waiting')).toBe('scared');
    expect(identityExpressionId('speaking')).toBe('happy');
    expect(identityExpressionId('asleep')).toBe('sleepy');
  });
});
