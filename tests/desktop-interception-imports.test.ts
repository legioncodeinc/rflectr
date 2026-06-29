import { describe, expect, it } from 'vitest';

describe('desktop interception import boundaries', () => {
  it('imports modules without starting listeners or requiring OS/app state', async () => {
    const modules = await Promise.all([
      import('../src/desktop-interception/config.js'),
      import('../src/desktop-interception/egress.js'),
      import('../src/desktop-interception/hooks.js'),
      import('../src/desktop-interception/redaction.js'),
      import('../src/desktop-interception/state.js'),
      import('../src/desktop-interception/trust.js'),
      import('../src/desktop-interception/verify.js'),
      import('../src/desktop-interception/transport.js'),
    ]);

    expect(modules).toHaveLength(8);
  });
});
