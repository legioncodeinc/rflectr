// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Legion Code Inc. (Mario Aldayuz)
/** When true, rflectr must not write UI to stdout (child owns NDJSON/JSONL). */

let agentStdoutMode = false;

export function setAgentStdoutMode(enabled: boolean): void {
  agentStdoutMode = enabled;
}

export function isAgentStdoutMode(): boolean {
  return agentStdoutMode;
}
