import { isEnvTruthy } from '../../utils/envUtils.js'

export const AGENT_DEADLINE_ABORT = 'agent-deadline'

export const DEFAULT_LOCAL_AGENT_TIMEOUT_MS = 3 * 60 * 1000
export const DEFAULT_CLOUD_AGENT_TIMEOUT_MS = 8 * 60 * 1000
export const DEFAULT_LOCAL_AGENT_MAX_TURNS = 8
export const DEFAULT_CLOUD_AGENT_MAX_TURNS = 20
export const DEFAULT_EXPLORE_LOCAL_MAX_TURNS = 8
export const DEFAULT_EXPLORE_CLOUD_MAX_TURNS = 12

const RESEARCH_AGENT_TYPES = new Set([
  'general-purpose',
  'Explore',
  'Plan',
])

type EnvLike = Record<string, string | undefined>

function parsePositiveInt(raw: string | undefined): number | undefined {
  const trimmed = raw?.trim()
  if (!trimmed || !/^\d+$/.test(trimmed)) return undefined
  const parsed = Number(trimmed)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return undefined
  return parsed
}

function isLoopbackUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1' ||
      parsed.port === '11434' ||
      parsed.port === '1234'
    )
  } catch {
    return /localhost|127\.0\.0\.1|:11434|:1234/i.test(url)
  }
}

export function isLocalSubagentRuntime(
  env: EnvLike = process.env,
): boolean {
  if (isEnvTruthy(env.OPENCLAUDE_FORCE_CLOUD_AGENTS)) return false
  if (isEnvTruthy(env.OPENCLAUDE_LOCAL_AGENT_WATCHDOG)) return true
  if (env.OLLAMA_HOST || env.OLLAMA_BASE_URL) return true
  return (
    isLoopbackUrl(env.OPENAI_BASE_URL) || isLoopbackUrl(env.ANTHROPIC_BASE_URL)
  )
}

export function shouldForceSyncLocalSubagents(
  env: EnvLike = process.env,
): boolean {
  if (isEnvTruthy(env.OPENCLAUDE_ALLOW_BACKGROUND_LOCAL_AGENTS)) return false
  return isLocalSubagentRuntime(env)
}

export function shouldBlockNestedSubagents(
  env: EnvLike = process.env,
): boolean {
  if (isEnvTruthy(env.OPENCLAUDE_ALLOW_NESTED_AGENTS)) return false
  return isLocalSubagentRuntime(env)
}

export function getAgentWallClockTimeoutMs(
  env: EnvLike = process.env,
): number {
  const override = parsePositiveInt(env.OPENCLAUDE_AGENT_TIMEOUT_MS)
  if (override !== undefined) return override
  return isLocalSubagentRuntime(env)
    ? DEFAULT_LOCAL_AGENT_TIMEOUT_MS
    : DEFAULT_CLOUD_AGENT_TIMEOUT_MS
}

export function resolveAgentMaxTurns(
  configured: number | undefined,
  agentType?: string,
  env: EnvLike = process.env,
): number {
  const envCap = parsePositiveInt(env.OPENCLAUDE_AGENT_MAX_TURNS)
  const local = isLocalSubagentRuntime(env)
  const research = agentType !== undefined && RESEARCH_AGENT_TYPES.has(agentType)
  const fallback =
    envCap ??
    (research
      ? local
        ? DEFAULT_EXPLORE_LOCAL_MAX_TURNS
        : DEFAULT_EXPLORE_CLOUD_MAX_TURNS
      : local
        ? DEFAULT_LOCAL_AGENT_MAX_TURNS
        : DEFAULT_CLOUD_AGENT_MAX_TURNS)
  if (configured === undefined) return fallback
  return Math.min(configured, fallback)
}

export function getAgentReturnPrompt(
  maxTurns: number,
  timeoutMs: number,
): string {
  const seconds = Math.max(1, Math.round(timeoutMs / 1000))
  return `You are on a hard deadline. Finish and return a final report in at most ${maxTurns} tool turns or ${seconds} seconds, whichever comes first. Stay on the original question — do not expand into unrelated OEMs, vendors, or crates. After at most 3 searches or fetches, stop looking and write the report with source URLs. Do not spawn other agents. If a search or fetch fails, stop retrying and report what you already have, marking unknowns as UNVERIFIED. Never wait in silence — always return a useful answer.`
}

export function shouldSkipAgentContinuationNudge(
  querySource: string | undefined,
  env: EnvLike = process.env,
): boolean {
  if (!querySource?.startsWith('agent:')) return false
  return isLocalSubagentRuntime(env)
}

const MIN_FINAL_REPORT_CHARS = 400

export function looksLikeFinalReport(text: string | undefined): boolean {
  const trimmed = text?.trim() ?? ''
  if (trimmed.length < MIN_FINAL_REPORT_CHARS) return false
  const opening = trimmed.slice(0, 160)
  if (
    /^(i(?:'ll| will)|let me|searching|looking up|i am (?:going to |now )?search)/i.test(
      opening,
    )
  ) {
    return false
  }
  return true
}

export function completeAgentReturnText(
  messages: Array<{
    type?: string
    message?: { content?: unknown }
  }>,
  existingText: string | undefined,
): string {
  const existing = existingText?.trim() ?? ''
  if (looksLikeFinalReport(existing)) return existing
  const harvested = extractAgentFindings(messages, { toolsOnly: true })
  if (!harvested) {
    return (
      existing ||
      'No findings were recorded. The agent stopped before writing a report.'
    )
  }
  if (!existing) {
    return `Job finished. Findings from research:\n${harvested}`
  }
  return `${existing}\n\nFindings collected during research:\n${harvested}`
}

export function attachAgentDeadline(
  parent: AbortSignal | undefined,
  timeoutMs: number,
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController()
  const onParent = () => {
    if (!controller.signal.aborted) {
      controller.abort(parent?.reason ?? 'user-abort')
    }
  }
  parent?.addEventListener('abort', onParent, { once: true })
  if (parent?.aborted) onParent()
  const timer = setTimeout(() => {
    if (!controller.signal.aborted) controller.abort(AGENT_DEADLINE_ABORT)
  }, timeoutMs)
  timer.unref?.()
  return {
    controller,
    cleanup() {
      clearTimeout(timer)
      parent?.removeEventListener('abort', onParent)
    },
  }
}

export function isAgentDeadlineAbort(reason: unknown): boolean {
  return reason === AGENT_DEADLINE_ABORT
}

function toolResultSnippet(block: unknown): string | undefined {
  if (!block || typeof block !== 'object') return undefined
  const candidate = block as { type?: unknown; content?: unknown }
  if (candidate.type !== 'tool_result') return undefined
  if (typeof candidate.content === 'string') {
    return candidate.content.replace(/\s+/g, ' ').trim()
  }
  if (!Array.isArray(candidate.content)) return undefined
  const text = candidate.content
    .map(part => {
      if (typeof part === 'string') return part
      if (part && typeof part === 'object' && 'text' in part) {
        return String((part as { text: unknown }).text ?? '')
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim()
  return text || undefined
}

function assistantText(content: unknown): string | undefined {
  if (typeof content === 'string') {
    const trimmed = content.trim()
    return trimmed || undefined
  }
  if (!Array.isArray(content)) return undefined
  const text = content
    .map(part => {
      if (typeof part === 'string') return part
      if (part && typeof part === 'object' && 'text' in part) {
        return String((part as { text: unknown }).text ?? '')
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
    .trim()
  return text || undefined
}

export function extractAgentFindings(
  messages: Array<{
    type?: string
    message?: { content?: unknown }
  }>,
  options: { toolsOnly?: boolean } = {},
): string | undefined {
  const snippets: string[] = []
  for (const message of messages) {
    if (message.type === 'assistant') {
      if (options.toolsOnly) continue
      const text = assistantText(message.message?.content)
      if (text) snippets.push(text)
      continue
    }
    if (message.type !== 'user') continue
    const content = message.message?.content
    if (!Array.isArray(content)) continue
    for (const block of content) {
      const snippet = toolResultSnippet(block)
      if (snippet) snippets.push(snippet.slice(0, 1500))
    }
  }
  if (snippets.length === 0) return undefined
  return snippets.slice(-8).join('\n\n').slice(0, 8000)
}

export function formatAgentDeadlineReport(
  partial: string | undefined,
  timeoutMs: number,
): string {
  const seconds = Math.max(1, Math.round(timeoutMs / 1000))
  const header = `Research stopped after ${seconds}s so you get an answer instead of waiting forever.`
  const body = partial?.trim()
  if (!body) {
    return `${header}\n\nNo findings were recorded before the deadline. Search may have hung or DNS failed. Retry with a narrower question, or do the lookup in this thread without Agent.`
  }
  return `${header}\n\nFindings so far:\n${body}`
}

let localAgentQueue: Promise<void> = Promise.resolve()

export async function acquireLocalAgentSlot(
  env: EnvLike = process.env,
): Promise<() => void> {
  if (!isLocalSubagentRuntime(env)) return () => {}
  let release!: () => void
  const prev = localAgentQueue
  localAgentQueue = new Promise<void>(resolve => {
    release = resolve
  })
  await prev
  return () => release()
}

export async function withLocalAgentSlot<T>(
  fn: () => Promise<T>,
  env: EnvLike = process.env,
): Promise<T> {
  const release = await acquireLocalAgentSlot(env)
  try {
    return await fn()
  } finally {
    release()
  }
}
