import { describe, expect, it } from 'vitest';
import {
  DESKTOP_APP_LANES,
  getLaneById,
  isVerificationStale,
  laneForApp,
  laneOwnsHost,
  lanesForHost,
  type LaneId,
} from '../src/desktop-interception/app-targets.js';

describe('desktop interception app-scoped lanes', () => {
  it('declares exactly three lanes with the expected ids, isolation, and preferred flags', () => {
    expect(DESKTOP_APP_LANES).toHaveLength(3);

    const byId = new Map(DESKTOP_APP_LANES.map(lane => [lane.laneId, lane]));

    expect([...byId.keys()]).toEqual<LaneId[]>([
      'claude-native',
      'claude-legacy-gateway',
      'codex-desktop',
    ]);

    expect(byId.get('claude-native')?.isolation).toBe('app-scoped-proxy');
    expect(byId.get('claude-native')?.preferred).toBe(true);

    expect(byId.get('claude-legacy-gateway')?.isolation).toBe('config-only');
    expect(byId.get('claude-legacy-gateway')?.preferred).toBe(false);

    expect(byId.get('codex-desktop')?.isolation).toBe('config-only');
    expect(byId.get('codex-desktop')?.preferred).toBe(false);
  });

  it('marks claude-native as the only preferred lane and the only app-scoped-proxy lane', () => {
    const preferred = DESKTOP_APP_LANES.filter(lane => lane.preferred);
    expect(preferred.map(lane => lane.laneId)).toEqual(['claude-native']);

    const proxyIsolated = DESKTOP_APP_LANES.filter(lane => lane.isolation === 'app-scoped-proxy');
    expect(proxyIsolated.map(lane => lane.laneId)).toEqual(['claude-native']);
  });

  it('resolves known lanes and returns undefined for unknown ids', () => {
    expect(getLaneById('claude-native')?.laneId).toBe('claude-native');
    // An unknown lane id is a caller bug and must not resolve to a lane.
    expect(getLaneById('chatgpt-desktop' as LaneId)).toBeUndefined();
  });

  it('guarantees claude-native egress-exclusivity against a rival-app host', () => {
    expect(laneOwnsHost('claude-native', 'api.anthropic.com')).toBe(true);
    // The rival-app host MUST NOT be owned by the claude lane.
    expect(laneOwnsHost('claude-native', 'api.openai.com')).toBe(false);
  });

  it('guarantees codex-desktop egress-exclusivity against a claude host', () => {
    expect(laneOwnsHost('codex-desktop', 'api.openai.com')).toBe(true);
    // The claude host MUST NOT be owned by the codex lane.
    expect(laneOwnsHost('codex-desktop', 'api.anthropic.com')).toBe(false);
  });

  it('treats true subdomains of a supportedHost as owned (host.endsWith(".<required>"))', () => {
    // A real child of api.anthropic.com.
    expect(laneOwnsHost('claude-native', 'v1.api.anthropic.com')).toBe(true);
    // A real child of api.openai.com.
    expect(laneOwnsHost('codex-desktop', 'xyz.api.openai.com')).toBe(true);
  });

  it('does NOT own sibling hosts that share a registrable domain but are not subdomains of a supportedHost', () => {
    // statsig.anthropic.com is a SIBLING of api.anthropic.com, not a child:
    // it ends with '.anthropic.com', not '.api.anthropic.com'. Under the
    // predicate pinned in PRD-023e (mirroring claude-target.ts:48,
    // `host === required || host.endsWith('.' + required)`) it is therefore
    // NOT owned by claude-native. This preserves the egress-exclusivity
    // guarantee (rival-app hosts still resolve exclusively) while refusing to
    // over-claim hosts the lane table does not enumerate. If registrable-domain
    // matching is actually desired, supportedHosts or the predicate must change.
    expect(laneOwnsHost('claude-native', 'statsig.anthropic.com')).toBe(false);
    expect(laneOwnsHost('codex-desktop', 'chat.openai.com')).toBe(false);
  });

  it('normalizes host case, surrounding whitespace, and trailing dots before matching', () => {
    expect(laneOwnsHost('claude-native', '  API.Anthropic.com. ')).toBe(true);
    expect(laneOwnsHost('codex-desktop', 'API.OPENAI.COM')).toBe(true);
  });

  it('resolves api.anthropic.com to both claude lanes and never the codex lane', () => {
    expect(lanesForHost('api.anthropic.com')).toEqual<LaneId[]>([
      'claude-native',
      'claude-legacy-gateway',
    ]);
    expect(lanesForHost('api.anthropic.com')).not.toContain('codex-desktop');
  });

  it('resolves api.openai.com to the codex lane only', () => {
    expect(lanesForHost('api.openai.com')).toEqual<LaneId[]>(['codex-desktop']);
  });

  it('resolves true subdomains to the same lanes as their apex', () => {
    // A real child of api.anthropic.com -> both claude lanes.
    expect(lanesForHost('v1.api.anthropic.com')).toEqual<LaneId[]>([
      'claude-native',
      'claude-legacy-gateway',
    ]);
    // A real child of api.openai.com -> codex lane only.
    expect(lanesForHost('xyz.api.openai.com')).toEqual<LaneId[]>(['codex-desktop']);
    // Sibling hosts (not subdomains of any supportedHost) resolve to nothing.
    expect(lanesForHost('statsig.anthropic.com')).toEqual<LaneId[]>([]);
    expect(lanesForHost('chat.openai.com')).toEqual<LaneId[]>([]);
  });

  it('groups lanes by app name', () => {
    expect(laneForApp('Claude Desktop').map(lane => lane.laneId)).toEqual([
      'claude-native',
      'claude-legacy-gateway',
    ]);
    expect(laneForApp('Codex Desktop').map(lane => lane.laneId)).toEqual(['codex-desktop']);
    expect(laneForApp('Unknown App')).toEqual([]);
  });

  it('still detects stale app/OS tuples via the pre-existing isVerificationStale', () => {
    const recorded = {
      appName: 'Claude Desktop',
      appVersion: '1.0.0',
      osName: 'Windows',
      osVersion: '11',
      supportHosts: ['claude.ai', 'api.anthropic.com'],
      trustMechanism: 'windows-root-ca',
      proxyMechanism: 'winhttp-loopback',
    };
    // No drift -> not stale.
    expect(isVerificationStale(recorded, { ...recorded })).toBe(false);
    // App version drift -> stale.
    expect(isVerificationStale(recorded, { ...recorded, appVersion: '1.0.1' })).toBe(true);
    // Missing recorded tuple -> stale.
    expect(isVerificationStale(undefined, { ...recorded })).toBe(true);
  });
});
