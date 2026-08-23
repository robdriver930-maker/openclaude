import { homedir } from 'os'
import { basename, dirname, resolve } from 'path'

const DESKTOP_ROOT_MESSAGE =
  'Do not extract or write into the Desktop folder itself. Create or use a named folder Robert asked for (for example Desktop\\Espeak), then put files inside that folder.'

const DESKTOP_LOOSE_FILE_MESSAGE =
  'Do not create loose files on the Desktop (index.html, package.json, and similar). Put them in a named folder Robert asked for.'

const DESKTOP_DELETE_SELF_MESSAGE =
  'Deleting the Desktop folder itself is blocked. You may delete files or folders that sit on the Desktop when Robert asks.'

function stripTrailingSeparators(p: string): string {
  return p.replace(/[\\/]+$/, '')
}

function normalizePath(p: string): string {
  return stripTrailingSeparators(resolve(p)).toLowerCase()
}

export function getDesktopDir(): string {
  return resolve(homedir(), 'Desktop')
}

export function isDesktopDirectory(p: string): boolean {
  return normalizePath(p) === normalizePath(getDesktopDir())
}

export function isDirectDesktopChild(p: string): boolean {
  return normalizePath(dirname(resolve(p))) === normalizePath(getDesktopDir())
}

/**
 * Names that look like files dumped at Desktop root (index.html, package.json).
 * Named project folders (Espeak, eSpeak-fixed) have no file extension.
 */
export function looksLikeLooseDesktopFile(p: string): boolean {
  const name = basename(stripTrailingSeparators(p))
  if (!name || name === '.' || name === '..') {
    return false
  }
  if (name.startsWith('.') && name.includes('.', 1)) {
    return true
  }
  if (name.startsWith('.')) {
    return true
  }
  const dot = name.lastIndexOf('.')
  return dot > 0 && dot < name.length - 1
}

export type DesktopDumpIntent = 'file' | 'folder'

export function desktopDumpDenyMessage(
  resolvedPath: string,
  intent: DesktopDumpIntent,
): string | null {
  if (isDesktopDirectory(resolvedPath)) {
    return DESKTOP_ROOT_MESSAGE
  }
  if (intent === 'file' && isDirectDesktopChild(resolvedPath)) {
    return DESKTOP_LOOSE_FILE_MESSAGE
  }
  return null
}

export function intentForWriteCommand(
  command: string,
  resolvedPath: string,
): DesktopDumpIntent {
  const name = basename(command)
    .toLowerCase()
    .replace(/\.exe$/i, '')
  if (
    name === 'mkdir' ||
    name === 'unzip' ||
    name === 'tar' ||
    name === 'bsdtar' ||
    name === 'expand-archive'
  ) {
    return 'folder'
  }
  if (looksLikeLooseDesktopFile(resolvedPath)) {
    return 'file'
  }
  return 'folder'
}

export function desktopRemovalDenyMessage(resolvedPath: string): string | null {
  if (isDesktopDirectory(resolvedPath)) {
    return DESKTOP_DELETE_SELF_MESSAGE
  }
  return null
}

/**
 * Catch unzip/tar/Expand-Archive destinations in a raw shell string
 * (including powershell -Command wrappers).
 */
export function desktopDumpFromShellCommand(
  command: string,
  cwd: string,
): string | null {
  const dests: string[] = []
  const patterns = [
    /(?:^|[\s;|&])(?:unzip(?:\.exe)?)\b[\s\S]*?(?:-d|-od|--exdir)\s+(?:"([^"]+)"|'([^']+)'|(\S+))/gi,
    /(?:^|[\s;|&])(?:tar|bsdtar)(?:\.exe)?\b[\s\S]*?(?:-C|--directory=|--directory\s+)\s*(?:"([^"]+)"|'([^']+)'|(\S+))/gi,
    /Expand-Archive\b[\s\S]*?-DestinationPath\s+(?:"([^"]+)"|'([^']+)'|(\S+))/gi,
  ]

  for (const re of patterns) {
    re.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(command)) !== null) {
      const dest = match[1] ?? match[2] ?? match[3]
      if (dest) {
        dests.push(dest)
      }
    }
  }

  for (const dest of dests) {
    const cleaned = dest.replace(/^['"]|['"]$/g, '')
    const absolute = resolve(cwd, cleaned)
    const message = desktopDumpDenyMessage(absolute, 'folder')
    if (message) {
      return message
    }
  }
  return null
}
