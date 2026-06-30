// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Legion Code Inc. (Mario Aldayuz)
import { execSync } from 'node:child_process';

export const RIVAL_APP_NAMES = ['ChatGPT', 'Codex'] as const;

export interface RivalAppDetection {
  readonly running: readonly string[];
  readonly anyRunning: boolean;
  readonly platform: 'win32' | 'darwin' | 'other';
}

function run(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function runPowerShell(script: string): string {
  return run(`powershell.exe -NoProfile -Command ${JSON.stringify(script)}`);
}

function detectPlatform(): RivalAppDetection['platform'] {
  if (process.platform === 'win32') return 'win32';
  if (process.platform === 'darwin') return 'darwin';
  return 'other';
}

export function detectRunningRivalApps(): RivalAppDetection {
  const platform = detectPlatform();

  if (platform === 'other') {
    return { running: [], anyRunning: false, platform };
  }

  const running: string[] = [];
  for (const name of RIVAL_APP_NAMES) {
    try {
      if (platform === 'win32') {
        const count = runPowerShell(
          `(Get-CimInstance Win32_Process -Filter "Name = '${name}.exe' OR Name = '${name.toLowerCase()}.exe'" | Measure-Object).Count`,
        );
        if (Number.parseInt(count, 10) > 0) running.push(name);
      } else {
        const out = run(
          `osascript -e 'tell application "System Events" to exists process "${name}"'`,
        );
        if (out.toLowerCase() === 'true') running.push(name);
      }
    } catch {
      // A failed query for this app is treated as "not running".
    }
  }

  return { running, anyRunning: running.length > 0, platform };
}

export function formatRivalAppWarning(detection: RivalAppDetection): string {
  if (!detection.anyRunning) return '';
  const running = detection.running;
  return (
    'Global proxy is blocked while ' +
    running.map(n => n + ' Desktop').join(', ') +
    ' ' +
    (running.length > 1 ? 'are' : 'is') +
    " running. Use app-scoped routing instead, or pass an explicit override to accept the risk to other apps' traffic."
  );
}

export function assertNoRivalAppsRunning(override?: boolean): void {
  const d = detectRunningRivalApps();
  if (d.anyRunning && !override) {
    throw new Error(formatRivalAppWarning(d));
  }
}
