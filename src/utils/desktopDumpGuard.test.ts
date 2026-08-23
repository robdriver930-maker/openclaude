import { expect, test } from 'bun:test'
import { homedir } from 'os'
import { join, resolve } from 'path'
import {
  desktopDumpDenyMessage,
  desktopDumpFromShellCommand,
  desktopRemovalDenyMessage,
  intentForWriteCommand,
  isDesktopDirectory,
  isDirectDesktopChild,
  looksLikeLooseDesktopFile,
} from './desktopDumpGuard.js'

const desktop = resolve(homedir(), 'Desktop')

test('Desktop directory is recognised with trailing separators', () => {
  expect(isDesktopDirectory(desktop)).toBe(true)
  expect(isDesktopDirectory(desktop + '\\')).toBe(true)
  expect(isDesktopDirectory(join(desktop, 'Espeak'))).toBe(false)
})

test('direct Desktop children vs nested project files', () => {
  expect(isDirectDesktopChild(join(desktop, 'index.html'))).toBe(true)
  expect(isDirectDesktopChild(join(desktop, 'Espeak', 'index.html'))).toBe(
    false,
  )
})

test('loose file names vs named folders', () => {
  expect(looksLikeLooseDesktopFile(join(desktop, 'index.html'))).toBe(true)
  expect(looksLikeLooseDesktopFile(join(desktop, 'package.json'))).toBe(true)
  expect(looksLikeLooseDesktopFile(join(desktop, '.gitignore'))).toBe(true)
  expect(looksLikeLooseDesktopFile(join(desktop, 'Espeak'))).toBe(false)
  expect(looksLikeLooseDesktopFile(join(desktop, 'eSpeak-fixed'))).toBe(false)
})

test('unzip -d Desktop is denied; named folder is allowed', () => {
  expect(desktopDumpDenyMessage(desktop, 'folder')).toMatch(/named folder/)
  expect(
    desktopDumpDenyMessage(join(desktop, 'Espeak'), 'folder'),
  ).toBeNull()
})

test('loose Desktop files are denied; files inside a named folder are not', () => {
  expect(
    desktopDumpDenyMessage(join(desktop, 'index.html'), 'file'),
  ).toMatch(/loose files/)
  expect(
    desktopDumpDenyMessage(join(desktop, 'Espeak', 'index.html'), 'file'),
  ).toBeNull()
})

test('deleting Desktop itself is blocked; deleting a child is not', () => {
  expect(desktopRemovalDenyMessage(desktop)).toMatch(/Desktop folder itself/)
  expect(
    desktopRemovalDenyMessage(join(desktop, 'index.html')),
  ).toBeNull()
})

test('unzip and mkdir count as folder intent', () => {
  expect(intentForWriteCommand('unzip', join(desktop, 'Espeak'))).toBe(
    'folder',
  )
  expect(intentForWriteCommand('mkdir', join(desktop, 'Espeak'))).toBe(
    'folder',
  )
  expect(intentForWriteCommand('touch', join(desktop, 'index.html'))).toBe(
    'file',
  )
})

test('raw unzip -d Desktop is caught even inside powershell wrappers', () => {
  const denied = desktopDumpFromShellCommand(
    `unzip -o "C:\\Users\\GoldenBoy\\Desktop\\Espeak.zip" -d "${desktop}"`,
    join(desktop, 'openclaude', 'openclaude-main'),
  )
  expect(denied).toMatch(/Desktop folder itself/)

  const allowed = desktopDumpFromShellCommand(
    `unzip -o archive.zip -d "${join(desktop, 'Espeak')}"`,
    join(desktop, 'openclaude', 'openclaude-main'),
  )
  expect(allowed).toBeNull()

  const expandDenied = desktopDumpFromShellCommand(
    `Expand-Archive -Path archive.zip -DestinationPath "${desktop}" -Force`,
    join(desktop, 'openclaude', 'openclaude-main'),
  )
  expect(expandDenied).toMatch(/Desktop folder itself/)
})
