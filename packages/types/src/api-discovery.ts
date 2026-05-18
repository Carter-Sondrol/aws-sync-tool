/**
 * Progress state during discovery traversal.
 * Shared between backend (DiscoveryEngine) and frontend (app store).
 */
export interface DiscoveryProgress {
  /** Current phase of discovery */
  phase: 'idle' | 'running' | 'complete' | 'error';
  /** Number of seed ARNs provided */
  seedCount: number;
  /** Number of nodes successfully resolved */
  resolved: number;
  /** Total number of unique ARNs found (resolved + pending) */
  totalFound: number;
  /** ARN currently being processed */
  currentArn?: string;
  /** Current traversal depth */
  currentDepth?: number;
  /** Error message if discovery failed */
  error?: string;
}
