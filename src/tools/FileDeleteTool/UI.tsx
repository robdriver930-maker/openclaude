import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import React from 'react'
import { MessageResponse } from 'src/components/MessageResponse.js'
import { extractTag } from 'src/utils/messages.js'
import { FallbackToolUseErrorMessage } from '../../components/FallbackToolUseErrorMessage.js'
import { TOOL_SUMMARY_MAX_LENGTH } from '../../constants/toolLimits.js'
import { Text } from '../../ink.js'
import { getDisplayPath } from '../../utils/file.js'
import { truncate } from '../../utils/format.js'

export function userFacingName(): string {
  return 'Delete'
}

export function renderToolUseMessage(
  { path }: Partial<{ path: string }>,
  { verbose }: { verbose: boolean },
): React.ReactNode {
  if (!path) {
    return null
  }
  return verbose ? path : getDisplayPath(path)
}

export function renderToolUseErrorMessage(
  result: ToolResultBlockParam['content'],
  { verbose }: { verbose: boolean },
): React.ReactNode {
  if (
    !verbose &&
    typeof result === 'string' &&
    extractTag(result, 'tool_use_error')
  ) {
    return (
      <MessageResponse>
        <Text color="error">Delete failed</Text>
      </MessageResponse>
    )
  }
  return <FallbackToolUseErrorMessage result={result} verbose={verbose} />
}

export function renderToolResultMessage(
  output: { path: string; kind: 'file' | 'directory' },
  _progress: unknown,
  { verbose }: { verbose: boolean },
): React.ReactNode {
  const shown = verbose ? output.path : getDisplayPath(output.path)
  return (
    <MessageResponse>
      <Text>
        Deleted {output.kind}: {shown}
      </Text>
    </MessageResponse>
  )
}

export function getToolUseSummary(
  input: Partial<{ path: string }> | undefined,
): string | null {
  if (!input?.path) {
    return null
  }
  return truncate(getDisplayPath(input.path), TOOL_SUMMARY_MAX_LENGTH)
}
