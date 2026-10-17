export const OPENCLAUDE_QUERY_HARD_MAX_MS_ENV =
  'OPENCLAUDE_QUERY_HARD_MAX_MS'
export const OPENCLAUDE_QUERY_IDLE_TIMEOUT_MS_ENV =
  'OPENCLAUDE_QUERY_IDLE_TIMEOUT_MS'

// setTimeout-compatible upper bound; larger values can overflow timer APIs.
export const MAX_CONFIGURABLE_QUERY_HARD_MAX_MS = 0x7fffffff

type EnvLike = Record<string, string | undefined>
type DebugLogger = (
  message: string,
  options?: { level: 'warn' },
) => void

export type QueryGuardResolvedOptions = {
  hardMaxQueryMs?: number
  idleTimeoutMs?: number
}

function warnInvalidQueryHardMax(
  value: string,
  reason: string,
  log: DebugLogger,
): void {
  log(
    `${OPENCLAUDE_QUERY_HARD_MAX_MS_ENV} invalid value "${value}" (${reason}); using default query hard max`,
    { level: 'warn' },
  )
}

function defaultWarnLogger(message: string): void {
  console.warn(`[OpenClaude] ${message}`)
}

export function getQueryGuardOptionsFromEnv(
  env: EnvLike = process.env,
  log: DebugLogger = defaultWarnLogger,
): QueryGuardResolvedOptions {
  const options: QueryGuardResolvedOptions = {}

  const rawHardMax = env[OPENCLAUDE_QUERY_HARD_MAX_MS_ENV]
  const hardMaxValue = rawHardMax?.trim()
  if (hardMaxValue) {
    if (!/^\d+$/.test(hardMaxValue)) {
      warnInvalidQueryHardMax(
        hardMaxValue,
        'expected a positive integer in milliseconds',
        log,
      )
    } else {
      const parsedHardMax = Number(hardMaxValue)
      if (!Number.isSafeInteger(parsedHardMax) || parsedHardMax <= 0) {
        warnInvalidQueryHardMax(hardMaxValue, 'expected a positive finite integer', log)
      } else if (parsedHardMax > MAX_CONFIGURABLE_QUERY_HARD_MAX_MS) {
        warnInvalidQueryHardMax(
          hardMaxValue,
          `maximum is ${MAX_CONFIGURABLE_QUERY_HARD_MAX_MS}`,
          log,
        )
      } else {
        options.hardMaxQueryMs = parsedHardMax
      }
    }
  }

  const rawIdle = env[OPENCLAUDE_QUERY_IDLE_TIMEOUT_MS_ENV]
  const idleValue = rawIdle?.trim()
  if (idleValue) {
    if (!/^\d+$/.test(idleValue)) {
      log(
        `${OPENCLAUDE_QUERY_IDLE_TIMEOUT_MS_ENV} invalid value "${idleValue}" (expected a positive integer in milliseconds); using default idle timeout`,
        { level: 'warn' },
      )
    } else {
      const parsedIdle = Number(idleValue)
      if (Number.isSafeInteger(parsedIdle) && parsedIdle > 0 && parsedIdle <= MAX_CONFIGURABLE_QUERY_HARD_MAX_MS) {
        options.idleTimeoutMs = parsedIdle
      } else {
        log(
          `${OPENCLAUDE_QUERY_IDLE_TIMEOUT_MS_ENV} invalid value "${idleValue}"; using default idle timeout`,
          { level: 'warn' },
        )
      }
    }
  }

  return options
}
