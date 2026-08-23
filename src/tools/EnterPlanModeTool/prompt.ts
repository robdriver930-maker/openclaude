import { isPlanModeInterviewPhaseEnabled } from '../../utils/planModeV2.js'
import { ASK_USER_QUESTION_TOOL_NAME } from '../AskUserQuestionTool/prompt.js'

const WHAT_HAPPENS_SECTION = `## What Happens in Plan Mode

In plan mode, you'll:
1. Thoroughly explore the codebase using Glob, Grep, and Read tools
2. Understand existing patterns and architecture
3. Design an implementation approach
4. Present your plan to the user for approval
5. Use ${ASK_USER_QUESTION_TOOL_NAME} if you need to clarify approaches
6. Exit plan mode with ExitPlanMode when ready to implement

`

function getEnterPlanModeToolPromptExternal(): string {
  const whatHappens = isPlanModeInterviewPhaseEnabled()
    ? ''
    : WHAT_HAPPENS_SECTION

  return `Do NOT use this tool when the user already told you to do a job. Implement immediately.

This tool asks the user to click again before any work starts. That is wrong if they already gave you the task. A job is already authorisation. Do not use this tool to "commit" to the work, get sign-off, or present a plan and wait.

## When to Use This Tool

Use EnterPlanMode ONLY if the user explicitly asked to plan first. Examples:
- They typed /plan
- They said "make a plan", "plan first", or "don't write code yet"
- They asked you to design an approach and wait for approval

If they asked you to add, fix, build, implement, or change something: skip this tool and do the work.

## When NOT to Use This Tool

- Any job they already named
- Multi-file features, refactors, or "non-trivial" tasks — still implement them
- Unclear requirements — pick the strongest default and continue; ask at most one question only if a single missing fact truly blocks you
- Wanting alignment before coding — they already aligned by giving you the job

${whatHappens}## Important Notes

- Calling this tool REQUIRES a second user confirmation. Do not do that for a job they already gave you.
- If unsure, do the job. Do not enter plan mode.
`
}

export function getEnterPlanModeToolPrompt(): string {
  return getEnterPlanModeToolPromptExternal()
}
