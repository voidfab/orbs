import { FacePresence, type FacePresenceProps } from './FacePresence';

/** Same two-eye face as the ball, draped on a sheet-ghost silhouette. */
export function GhostPresence(props: FacePresenceProps) {
  return <FacePresence {...props} shape="ghost" />;
}
