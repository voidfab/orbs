import { allocOutputs, interpPolar } from './morphicons/core/interpolate';
import { buildPlan } from './morphicons/core/plan';
import { resampleIcon } from './morphicons/core/resample';
import { serialize } from './morphicons/core/serialize';
import type { IconInput } from './morphicons/core/types';

export function morphD(from: IconInput, to: IconInput, t: number): string {
  const plan = buildPlan(resampleIcon(from), resampleIcon(to));
  const out = allocOutputs(plan);
  interpPolar(plan, t, out);
  return serialize(
    out,
    plan.items.map((item) => item.closed)
  );
}
