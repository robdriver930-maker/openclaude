import { z } from 'zod/v4'
import type { ToolUseContext } from '../../Tool.js'
import { buildTool } from '../../Tool.js'
import {
  desktopRemovalDenyMessage,
  isDesktopDirectory,
} from '../../utils/desktopDumpGuard.js'
import { isENOENT } from '../../utils/errors.js'
import { FILE_NOT_FOUND_CWD_NOTE } from '../../utils/file.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { expandPath } from '../../utils/path.js'
import {
  checkWritePermissionForTool,
  matchingRuleForInput,
} from '../../utils/permissions/filesystem.js'
import { isDangerousRemovalPath } from '../../utils/permissions/pathValidation.js'
import type { PermissionDecision } from '../../utils/permissions/PermissionResult.js'
import { matchWildcardPattern } from '../../utils/permissions/shellRuleMatching.js'
import {
  FILE_DELETE_TOOL_NAME,
  getDeleteToolDescription,
} from './prompt.js'
import {
  getToolUseSummary,
  renderToolResultMessage,
  renderToolUseErrorMessage,
  renderToolUseMessage,
  userFacingName,
} from './UI.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    path: z
      .string()
      .describe(
        'The absolute path of the file or folder to delete (must be absolute, not relative)',
      ),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    path: z.string().describe('The path that was deleted'),
    kind: z.enum(['file', 'directory']).describe('Whether a file or folder was removed'),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

function denyDeletePath(fullPath: string): string | null {
  const desktopMsg = desktopRemovalDenyMessage(fullPath)
  if (desktopMsg) {
    return desktopMsg
  }
  if (isDangerousRemovalPath(fullPath) || isDesktopDirectory(fullPath)) {
    return `Deleting '${fullPath}' is blocked. That path is a protected system location.`
  }
  return null
}

export const FileDeleteTool = buildTool({
  name: FILE_DELETE_TOOL_NAME,
  searchHint: 'delete files and folders',
  maxResultSizeChars: 10_000,
  strict: true,
  isConcurrencySafe() {
    return false
  },
  async description() {
    return 'Delete a file or folder from the local filesystem.'
  },
  userFacingName,
  getToolUseSummary,
  getActivityDescription(input) {
    const summary = getToolUseSummary(input)
    return summary ? `Deleting ${summary}` : 'Deleting path'
  },
  async prompt() {
    return getDeleteToolDescription()
  },
  renderToolUseMessage,
  renderToolUseErrorMessage,
  renderToolResultMessage,
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  toAutoClassifierInput(input) {
    return input.path
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    const kindLabel = output.kind === 'directory' ? 'folder' : 'file'
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: `Deleted ${kindLabel}: ${output.path}`,
    }
  },
  getPath(input): string {
    return input.path
  },
  backfillObservableInput(input) {
    if (typeof input.path === 'string') {
      input.path = expandPath(input.path)
    }
  },
  async preparePermissionMatcher({ path }) {
    return pattern => matchWildcardPattern(pattern, path)
  },
  async checkPermissions(input, context): Promise<PermissionDecision> {
    const fullPath = expandPath(input.path)
    const blocked = denyDeletePath(fullPath)
    if (blocked) {
      return {
        behavior: 'deny',
        message: blocked,
        decisionReason: {
          type: 'other',
          reason: blocked,
        },
      }
    }
    const appState = context.getAppState()
    return checkWritePermissionForTool(
      FileDeleteTool,
      input,
      appState.toolPermissionContext,
    )
  },
  extractSearchText() {
    return ''
  },
  async validateInput({ path }, toolUseContext: ToolUseContext) {
    const fullPath = expandPath(path)
    const blocked = denyDeletePath(fullPath)
    if (blocked) {
      return { result: false, message: blocked, errorCode: 0 }
    }

    const appState = toolUseContext.getAppState()
    const denyRule = matchingRuleForInput(
      fullPath,
      appState.toolPermissionContext,
      'edit',
      'deny',
    )
    if (denyRule !== null) {
      return {
        result: false,
        message:
          'Path is in a directory that is denied by your permission settings.',
        errorCode: 1,
      }
    }

    if (fullPath.startsWith('\\\\') || fullPath.startsWith('//')) {
      return { result: true }
    }

    const fs = getFsImplementation()
    try {
      await fs.lstat(fullPath)
    } catch (e) {
      if (isENOENT(e)) {
        return {
          result: false,
          message: `Path does not exist: ${path}. ${FILE_NOT_FOUND_CWD_NOTE}`,
          errorCode: 2,
        }
      }
      throw e
    }

    return { result: true }
  },
  async call({ path }, { readFileState }) {
    const fullPath = expandPath(path)
    const blocked = denyDeletePath(fullPath)
    if (blocked) {
      throw new Error(blocked)
    }

    const fs = getFsImplementation()
    const stats = await fs.lstat(fullPath)
    const kind = stats.isDirectory() ? 'directory' : 'file'
    if (kind === 'directory') {
      await fs.rm(fullPath, { recursive: true, force: true })
    } else {
      await fs.unlink(fullPath)
    }
    readFileState.delete(fullPath)

    return {
      data: {
        path: fullPath,
        kind,
      },
    }
  },
})
