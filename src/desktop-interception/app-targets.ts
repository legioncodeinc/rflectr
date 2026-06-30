export interface DesktopAppVersionTuple {
  readonly appName: string;
  readonly appVersion: string;
  readonly osName: string;
  readonly osVersion: string;
  readonly supportHosts?: readonly string[];
  readonly trustMechanism?: string;
  readonly proxyMechanism?: string;
}

export interface DesktopAppTarget {
  readonly appName: string;
  readonly supportedHosts: readonly string[];
}

export function isVerificationStale(
  recorded: DesktopAppVersionTuple | undefined,
  current: DesktopAppVersionTuple,
): boolean {
  if (!recorded) return true;
  return recorded.appName !== current.appName
    || recorded.appVersion !== current.appVersion
    || recorded.osName !== current.osName
    || recorded.osVersion !== current.osVersion
    || normalizeList(recorded.supportHosts).join('\0') !== normalizeList(current.supportHosts).join('\0')
    || normalizeString(recorded.trustMechanism) !== normalizeString(current.trustMechanism)
    || normalizeString(recorded.proxyMechanism) !== normalizeString(current.proxyMechanism);
}

function normalizeList(values: readonly string[] | undefined): string[] {
  return [...(values ?? [])].map(value => value.trim().toLowerCase()).filter(Boolean).sort();
}

function normalizeString(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

// --- PRD-023e: app-scoped isolated lanes ------------------------------------

/**
 * Identity of an app-scoped desktop interception lane. Each lane is an
 * isolated bundle of hosts, runtime state, and lifecycle controls so that a
 * Claude lane can provably exclude rival-app hosts (e.g. `api.openai.com`).
 */
export type LaneId = 'claude-native' | 'claude-legacy-gateway' | 'codex-desktop';

/**
 * How a lane attaches to its target desktop app.
 * - `native-interception`: in-process/MITM interception of the app's egress.
 * - `config-profile`: writes a profile into the app's config (no interception).
 */
export type AttachMechanism = 'native-interception' | 'config-profile';

/**
 * Isolation contract for a lane.
 * - `app-scoped-proxy`: the lane owns an app-scoped proxy surface; its hosts
 *   MUST be provably exclusive to this lane.
 * - `config-only`: the lane only writes config and makes no egress claims.
 */
export type LaneIsolation = 'app-scoped-proxy' | 'config-only';

/**
 * A single app-scoped interception lane. `supportedHosts` is the upper bound
 * of hosts this lane MAY intercept; `ownedState` is the runtime/state field
 * prefixes this lane owns (so lanes cannot trample each other's state).
 */
export interface DesktopAppLane {
  readonly laneId: LaneId;
  readonly appName: 'Claude Desktop' | 'Codex Desktop';
  readonly attachMechanism: AttachMechanism;
  readonly isolation: LaneIsolation;
  readonly supportedHosts: readonly string[];   // upper bound of hosts this lane may intercept
  readonly ownedState: readonly string[];       // runtime/state field prefixes this lane owns
  readonly controls: readonly ('start' | 'stop' | 'uninstall' | 'revert' | 'verify' | 'kill')[];
  readonly preferred: boolean;
}

/**
 * The three app-scoped lanes. Order is significant: it is the resolution
 * preference when multiple lanes could claim an app (preferred lanes first).
 */
export const DESKTOP_APP_LANES: readonly DesktopAppLane[] = [
  {
    laneId: 'claude-native',
    appName: 'Claude Desktop',
    attachMechanism: 'native-interception',
    isolation: 'app-scoped-proxy',
    supportedHosts: ['api.anthropic.com', 'claude.ai'],
    ownedState: ['claudeNative'],
    controls: ['verify', 'start', 'stop', 'uninstall'],
    preferred: true,
  },
  {
    laneId: 'claude-legacy-gateway',
    appName: 'Claude Desktop',
    attachMechanism: 'config-profile',
    isolation: 'config-only',
    supportedHosts: ['api.anthropic.com', 'claude.ai'],
    ownedState: ['claudeDesktop'],
    controls: ['revert'],
    preferred: false,
  },
  {
    laneId: 'codex-desktop',
    appName: 'Codex Desktop',
    attachMechanism: 'config-profile',
    isolation: 'config-only',
    supportedHosts: ['api.openai.com'],
    ownedState: ['codexProxy'],
    controls: ['start', 'stop', 'revert'],
    preferred: false,
  },
];

/**
 * Resolve a lane by id.
 * @returns the lane, or `undefined` if `laneId` is unknown.
 */
export function getLaneById(laneId: LaneId): DesktopAppLane | undefined {
  return DESKTOP_APP_LANES.find(lane => lane.laneId === laneId);
}

/** Canonicalize a host for lane matching: trim, lowercase, strip trailing dot. */
function canonicalizeLaneHost(host: string): string {
  return host.trim().replace(/\.$/, '').toLowerCase();
}

/**
 * Single host-match predicate shared by `laneOwnsHost` and `lanesForHost`,
 * mirroring the subdomain rule in `claude-target.ts`
 * (`host === required || host.endsWith('.' + required)`).
 */
function laneHostMatches(canonicalHost: string, requiredHost: string): boolean {
  return canonicalHost === requiredHost || canonicalHost.endsWith(`.${requiredHost}`);
}

/**
 * Whether a lane owns `host` (exact or subdomain of a supportedHost).
 * This is the egress-exclusivity check at the single-lane granularity: a
 * `claude-native` host like `api.anthropic.com` MUST NOT be owned by a rival
 * lane (e.g. `codex-desktop`).
 */
export function laneOwnsHost(laneId: LaneId, host: string): boolean {
  const lane = getLaneById(laneId);
  if (!lane) return false;
  const canonical = canonicalizeLaneHost(host);
  return lane.supportedHosts.some(required => laneHostMatches(canonical, required));
}

/** All lanes targeting the given app name. */
export function laneForApp(appName: string): DesktopAppLane[] {
  return DESKTOP_APP_LANES.filter(lane => lane.appName === appName);
}

/**
 * Every lane whose supportedHosts include `host`. This is the
 * egress-exclusivity check across the whole table: a rival-app host should
 * resolve to only its own lane, never the claude lane.
 */
export function lanesForHost(host: string): LaneId[] {
  const canonical = canonicalizeLaneHost(host);
  return DESKTOP_APP_LANES
    .filter(lane => lane.supportedHosts.some(required => laneHostMatches(canonical, required)))
    .map(lane => lane.laneId);
}
