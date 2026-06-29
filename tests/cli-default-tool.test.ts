import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  defaultTool: undefined as undefined | 'claude' | 'codex' | 'gemini' | 'cursor',
  codex: vi.fn(async () => 42),
  gemini: vi.fn(async () => 43),
}));

vi.mock('../src/config.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/config.js')>();
  return {
    ...actual,
    loadPreferences: () => ({ defaultTool: state.defaultTool }),
  };
});

vi.mock('../src/codex.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/codex.js')>();
  return {
    ...actual,
    runCodexCommand: state.codex,
  };
});

vi.mock('../src/gemini.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/gemini.js')>();
  return {
    ...actual,
    runGeminiCommand: state.gemini,
  };
});

describe('root default tool routing', () => {
  beforeEach(() => {
    state.defaultTool = undefined;
    state.codex.mockClear();
    state.gemini.mockClear();
  });

  it('launches the persisted Codex default for bare rflectr', async () => {
    state.defaultTool = 'codex';
    const { main } = await import('../src/cli.js');

    await expect(main([])).resolves.toBe(42);
    expect(state.codex).toHaveBeenCalledOnce();
  });

  it('launches the persisted Gemini default for bare rflectr', async () => {
    state.defaultTool = 'gemini';
    const { main } = await import('../src/cli.js');

    await expect(main([])).resolves.toBe(43);
    expect(state.gemini).toHaveBeenCalledOnce();
  });
});
