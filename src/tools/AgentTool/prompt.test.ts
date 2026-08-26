import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  acquireSharedMutationLock,
  releaseSharedMutationLock,
} from '../../test/sharedMutationLock.js'
import { getPrompt } from './prompt.js'
import type { AgentDefinition } from './loadAgentsDir.js'

const originalEnv = {
  CLAUDE_CODE_AGENT_LIST_IN_MESSAGES:
    process.env.CLAUDE_CODE_AGENT_LIST_IN_MESSAGES,
  USER_TYPE: process.env.USER_TYPE,
  OLLAMA_HOST: process.env.OLLAMA_HOST,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  OPENCLAUDE_FORCE_CLOUD_AGENTS: process.env.OPENCLAUDE_FORCE_CLOUD_AGENTS,
  OPENCLAUDE_LOCAL_AGENT_WATCHDOG: process.env.OPENCLAUDE_LOCAL_AGENT_WATCHDOG,
}

beforeEach(async () => {
  await acquireSharedMutationLock('tools/AgentTool/prompt.test.ts')
})

afterEach(() => {
  try {
    restoreEnv('CLAUDE_CODE_AGENT_LIST_IN_MESSAGES')
    restoreEnv('USER_TYPE')
    restoreEnv('OLLAMA_HOST')
    restoreEnv('OLLAMA_BASE_URL')
    restoreEnv('OPENCLAUDE_FORCE_CLOUD_AGENTS')
    restoreEnv('OPENCLAUDE_LOCAL_AGENT_WATCHDOG')
  } finally {
    releaseSharedMutationLock()
  }
})

function restoreEnv(key: keyof typeof originalEnv): void {
  const originalValue = originalEnv[key]
  if (originalValue === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = originalValue
  }
}

const agents: AgentDefinition[] = [
  {
    agentType: 'general-purpose',
    whenToUse: 'Use for general tasks',
    source: 'projectSettings',
    getSystemPrompt: () => 'system prompt',
  },
]

describe('AgentTool prompt isolation contract', () => {
  test('advertises worktree isolation but never remote isolation', async () => {
    process.env.USER_TYPE = 'ant'
    process.env.CLAUDE_CODE_AGENT_LIST_IN_MESSAGES = 'false'

    const prompt = await getPrompt(agents)

    expect(prompt).toContain('isolation: "worktree"')
    expect(prompt).not.toContain('isolation: "remote"')
    expect(prompt).toContain('parent folder that contains multiple git repos')
    expect(prompt).toContain('set `cwd` to the absolute path of the target child repository')
    expect(prompt).toContain('the agent still runs with that `cwd` override instead of failing')
    expect(prompt).toContain('tool result notes that worktree isolation was unavailable')
    expect(prompt).toContain('If worktree creation fails only because no git repository is available')
  })

  test('local runtime forbids four-way parallel research agents', async () => {
    process.env.USER_TYPE = 'ant'
    process.env.CLAUDE_CODE_AGENT_LIST_IN_MESSAGES = 'false'
    process.env.OLLAMA_HOST = 'ollama'
    delete process.env.OPENCLAUDE_FORCE_CLOUD_AGENTS
    delete process.env.OPENCLAUDE_LOCAL_AGENT_WATCHDOG

    const prompt = await getPrompt(agents)

    expect(prompt).toContain(
      'Do research in this thread, or launch ONE synchronous general-purpose agent',
    )
    expect(prompt).toContain('Never launch four research agents at once')
    expect(prompt).not.toContain(
      'Launch multiple agents concurrently whenever possible',
    )
    expect(prompt).not.toContain(
      'If the user specifies that they want you to run agents "in parallel"',
    )
    expect(prompt).not.toContain(
      'independent work to do in parallel',
    )
  })

  test('cloud runtime still allows parallel agents', async () => {
    process.env.USER_TYPE = 'ant'
    process.env.CLAUDE_CODE_AGENT_LIST_IN_MESSAGES = 'false'
    process.env.OPENCLAUDE_FORCE_CLOUD_AGENTS = '1'

    const prompt = await getPrompt(agents)

    expect(prompt).toContain(
      'If the user specifies that they want you to run agents "in parallel"',
    )
    expect(prompt).not.toContain('Never launch four research agents at once')
    expect(prompt).not.toContain(
      'Do research in this thread, or launch ONE synchronous general-purpose agent',
    )
  })
})
