#!/bin/bash
# SessionStart hook for Rota Manager (Claude Code on the web).
# Installs npm dependencies so build, lint and tests work in the session.
set -euo pipefail

# Only run in the remote (web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Idempotent: npm install is safe to re-run and benefits from container caching.
npm install --no-audit --no-fund
