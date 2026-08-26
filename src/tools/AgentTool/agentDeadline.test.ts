import { afterEach, describe, expect, test } from 'bun:test'
import {
  AGENT_DEADLINE_ABORT,
  DEFAULT_EXPLORE_CLOUD_MAX_TURNS,
  DEFAULT_EXPLORE_LOCAL_MAX_TURNS,
  DEFAULT_LOCAL_AGENT_MAX_TURNS,
  DEFAULT_LOCAL_AGENT_TIMEOUT_MS,
  attachAgentDeadline,
  completeAgentReturnText,
  extractAgentFindings,
  formatAgentDeadlineReport,
  getAgentReturnPrompt,
  getAgentWallClockTimeoutMs,
  isAgentDeadlineAbort,
  isLocalSubagentRuntime,
  looksLikeFinalReport,
  resolveAgentMaxTurns,
  shouldBlockNestedSubagents,
  shouldForceSyncLocalSubagents,
  shouldSkipAgentContinuationNudge,
} from './agentDeadline.js'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key]
  }
  Object.assign(process.env, ORIGINAL_ENV)
})

describe('local research agent watchdog', () => {
  test('detects Ollama loopback as local runtime', () => {
    expect(
      isLocalSubagentRuntime({
        OLLAMA_HOST: '127.0.0.1:11434',
        OPENAI_BASE_URL: 'http://127.0.0.1:11434/v1',
      }),
    ).toBe(true)
    expect(
      isLocalSubagentRuntime({
        OPENAI_BASE_URL: 'https://api.openai.com/v1',
      }),
    ).toBe(false)
  })

  test('caps research agents to a short local turn budget', () => {
    const env = { OLLAMA_HOST: '127.0.0.1:11434' }
    expect(resolveAgentMaxTurns(undefined, 'general-purpose', env)).toBe(
      DEFAULT_EXPLORE_LOCAL_MAX_TURNS,
    )
    expect(resolveAgentMaxTurns(200, 'Explore', env)).toBe(
      DEFAULT_EXPLORE_LOCAL_MAX_TURNS,
    )
    expect(resolveAgentMaxTurns(undefined, 'code-reviewer', env)).toBe(
      DEFAULT_LOCAL_AGENT_MAX_TURNS,
    )
  })

  test('cloud runtime keeps a higher default turn cap', () => {
    const env = { OPENAI_BASE_URL: 'https://api.openai.com/v1' }
    expect(resolveAgentMaxTurns(undefined, 'general-purpose', env)).toBe(
      DEFAULT_EXPLORE_CLOUD_MAX_TURNS,
    )
  })

  test('local runtime forces sync and blocks nested agents', () => {
    const env = { OLLAMA_HOST: '127.0.0.1:11434' }
    expect(shouldForceSyncLocalSubagents(env)).toBe(true)
    expect(shouldBlockNestedSubagents(env)).toBe(true)
    expect(getAgentWallClockTimeoutMs(env)).toBe(DEFAULT_LOCAL_AGENT_TIMEOUT_MS)
  })

  test('OPENCLAUDE_AGENT_TIMEOUT_MS overrides the wall clock', () => {
    expect(
      getAgentWallClockTimeoutMs({
        OLLAMA_HOST: '127.0.0.1:11434',
        OPENCLAUDE_AGENT_TIMEOUT_MS: '90000',
      }),
    ).toBe(90_000)
  })

  test('deadline abort is distinct from user abort', async () => {
    const deadline = attachAgentDeadline(undefined, 20)
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(deadline.controller.signal.aborted).toBe(true)
    expect(isAgentDeadlineAbort(deadline.controller.signal.reason)).toBe(true)
    expect(deadline.controller.signal.reason).toBe(AGENT_DEADLINE_ABORT)
    deadline.cleanup()
  })

  test('report always includes a usable fallback when nothing was found', () => {
    const empty = formatAgentDeadlineReport(undefined, 180_000)
    expect(empty).toContain('Research stopped after 180s')
    expect(empty).toContain('No findings were recorded')
    const withFindings = formatAgentDeadlineReport(
      'NVIDIA Game Ready uses PCI DeviceID matching.',
      60_000,
    )
    expect(withFindings).toContain('Findings so far')
    expect(withFindings).toContain('NVIDIA Game Ready')
  })

  test('return prompt forbids nested agents and silent waits', () => {
    const prompt = getAgentReturnPrompt(8, 180_000)
    expect(prompt).toContain('8 tool turns')
    expect(prompt).toContain('Do not spawn other agents')
    expect(prompt).toContain('Never wait in silence')
  })

  test('partial result harvests assistant text and tool results', () => {
    const findings = extractAgentFindings([
      {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Laptop GPUs use different PCI DeviceIDs.' }] },
      },
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: 'NVIDIA Game Ready notebook package is a separate download.',
            },
          ],
        },
      },
    ] as never)
    expect(findings).toContain('PCI DeviceIDs')
    expect(findings).toContain('NVIDIA Game Ready notebook package')
  })

  test('thin assistant chatter is replaced with harvested tool findings', () => {
    expect(looksLikeFinalReport('Let me search NVIDIA next.')).toBe(false)
    const completed = completeAgentReturnText(
      [
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Let me search more.' }] },
        },
        {
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                content:
                  'setup.exe /s installs the NVIDIA package silently. SHA-256 is UNVERIFIED on the public download page.',
              },
            ],
          },
        },
      ] as never,
      'Let me search more.',
    )
    expect(completed).toContain('setup.exe /s')
    expect(completed).toContain('Findings collected during research')
  })

  test('local subagents skip continuation nudges so they can return', () => {
    const env = { OLLAMA_HOST: '127.0.0.1:11434' }
    expect(
      shouldSkipAgentContinuationNudge('agent:builtin:general-purpose', env),
    ).toBe(true)
    expect(shouldSkipAgentContinuationNudge('repl_main_thread', env)).toBe(
      false,
    )
    expect(
      shouldSkipAgentContinuationNudge('agent:builtin:general-purpose', {
        OPENAI_BASE_URL: 'https://api.openai.com/v1',
      }),
    ).toBe(false)
  })
})
