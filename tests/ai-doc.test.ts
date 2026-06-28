import { describe, it, expect } from 'vitest';
import {
  generateAiDoc,
  parseSkillVersion,
} from '../src/ai-doc.js';
import { parseArgs } from '../src/cli.js';
import { VERSION } from '../src/constants.js';

describe('ai-doc', () => {
  it('includes agent workflow sections', () => {
    const doc = generateAiDoc();
    expect(doc).toContain('rflectr-cli');
    expect(doc).toContain('AGENT PLATFORM PATTERNS');
    expect(doc).toContain('ALEF AGENT INTEGRATION');
    expect(doc).toContain('exec --json');
    expect(doc).toContain('danger-full-access');
    expect(doc).toContain('--provider');
    expect(doc).toContain('-p');
    expect(doc).toContain('providers.json');
    expect(doc).toContain('rflectr codex');
    expect(doc).toContain('CURRENT LOCAL STATE');
    expect(doc).toContain(`version: "${VERSION}"`);
  });

  it('uses the published scoped npm package name', () => {
    const doc = generateAiDoc();
    expect(doc).toContain('npm install -g @legioncodeinc/rflectr');
    expect(doc).not.toContain('npm install -g rflectr');
  });

  it('parseSkillVersion reads YAML frontmatter', () => {
    const doc = generateAiDoc();
    expect(parseSkillVersion(doc)).toBe(VERSION);
  });
});

describe('parseArgs --ai', () => {
  it('parses rflectr --ai', () => {
    expect(parseArgs(['--ai'])).toMatchObject({
      command: 'root',
      showAi: true,
      aiInstall: false,
    });
  });

  it('parses rflectr --ai --install', () => {
    expect(parseArgs(['--ai', '--install'])).toMatchObject({
      showAi: true,
      aiInstall: true,
    });
  });
});
