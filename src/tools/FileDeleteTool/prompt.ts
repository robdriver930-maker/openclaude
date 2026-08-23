import { FILE_DELETE_TOOL_NAME } from './constants.js'

export { FILE_DELETE_TOOL_NAME } from './constants.js'

export const DESCRIPTION =
  'Delete a file or folder from the local filesystem.'

export function getDeleteToolDescription(): string {
  return `Deletes a file or folder at an absolute path.

Usage:
- Use this tool when Robert asks to remove files or folders. Prefer ${FILE_DELETE_TOOL_NAME} over shell rm / Remove-Item so the path is explicit and the result can be verified.
- path must be an absolute path.
- Directories are removed recursively.
- Never claim a delete succeeded unless this tool (or a shell command) returned success.
- Do not delete the Desktop folder itself, the user profile, or a drive root. Deleting items that sit on the Desktop is allowed when Robert asks.
- Do not delete files he did not name. Follow his latest instruction exactly.`
}
