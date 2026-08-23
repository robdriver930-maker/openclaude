import { isEnvTruthy } from './envUtils.js'

const DEFAULT_AUTO_RESUME_MAX = 8
const DEFAULT_AUTO_RESUME_DELAY_MS = 10_000
const MAX_AUTO_RESUME = 25

function parseBoundedInt(
  envVarName: string,
  raw: string | undefined,
  fallback: number,
  max: number,
): number {
  if (!raw) {
    return fallback
  }
  const parsed = parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback
  }
  return Math.min(parsed, max)
}

/** When unset, auto-resume is ON (Robert's local Ollama setup). Set to 0/false to disable. */
export function isOpenClaudeAutoResumeEnabled(): boolean {
  const raw = process.env.OPENCLAUDE_AUTO_RESUME
  if (raw === undefined || raw === '') {
    return true
  }
  return isEnvTruthy(raw)
}

export function getOpenClaudeMaxAutoResume(): number {
  return parseBoundedInt(
    'OPENCLAUDE_AUTO_RESUME_MAX',
    process.env.OPENCLAUDE_AUTO_RESUME_MAX,
    DEFAULT_AUTO_RESUME_MAX,
    MAX_AUTO_RESUME,
  )
}

export function getOpenClaudeAutoResumeDelayMs(): number {
  return parseBoundedInt(
    'OPENCLAUDE_AUTO_RESUME_DELAY_MS',
    process.env.OPENCLAUDE_AUTO_RESUME_DELAY_MS,
    DEFAULT_AUTO_RESUME_DELAY_MS,
    120_000,
  )
}

export const OPENCLAUDE_AUTO_RESUME_PROMPT =
  'Continue from where you left off. If a build or tool step was interrupted by an API error, retry it now and keep going until the job is done.'
