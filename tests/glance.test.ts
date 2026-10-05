import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { mcpToolLabel, prettyModel, readConfig, replayTodo } from '../hooks/register'

const HINT = {
  component: 'PromptHint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
} as const

const mountHint = ($: Engine) =>
  $.ui.mount({ plugin: 'glance', surface: 'terminal', component: HINT.component, props: HINT.props })

test('draws the tool counts and the todo progress on terminal and desktop', async ($, on) => {
  on('tool.call', () => ({ result: { ok: true } }) as never)
  await $.tool.call({ tool: 'Read', file_path: '/tmp/a.ts' } as never)
  await $.tool.call({ tool: 'Read', file_path: '/tmp/b.ts' } as never)
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [
      { content: 'write mod', status: 'completed', activeForm: 'Writing mod' },
      { content: 'test mod', status: 'in_progress', activeForm: 'Testing mod' },
    ],
  } as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'glance', surface, component: HINT.component, props: HINT.props })
    expect(await ui.find({ type: 'Text', text: /Read/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /×2/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1\/2/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Testing mod/ })).toBeDefined()
    await ui.unmount()
  }
})

test('MCP calls are counted per server, apart from the built-in tools', async ($, on) => {
  on('tool.call', () => ({ result: { ok: true } }) as never)
  await $.tool.call({ tool: 'mcp__claude_ai_Notion__notion-search', query: 'x' } as never)
  await $.tool.call({ tool: 'mcp__claude_ai_Notion__notion-fetch', id: 'y' } as never)
  const ui = await mountHint($)
  expect(await ui.find({ type: 'Text', text: 'Notion' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '×2' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /mcp__/ })).toBeUndefined()
  await ui.unmount()
})

test('keeps the engine hint under the HUD', async $ => {
  const ui = await mountHint($)
  expect(await ui.find({ type: 'Text', text: '? for shortcuts' })).toBeDefined()
  await ui.unmount()
})

test('hides what the config turns off', { options: { showTools: false, keepHint: false } }, async ($, on) => {
  on('tool.call', () => ({ result: { ok: true } }) as never)
  await $.tool.call({ tool: 'Read', file_path: '/tmp/a.ts' } as never)
  const ui = await mountHint($)
  expect(await ui.find({ type: 'Text', text: /Read/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '? for shortcuts' })).toBeUndefined()
  await ui.unmount()
})

test('auto with no settings to read draws Cupertino dark', async $ => {
  const ui = await mountHint($)
  const diamonds = await ui.findAll({ type: 'Text', text: /◆/ })
  expect(diamonds.map(d => d.props.color)).toContain('#6d7cff')
  await ui.unmount()
})

test('a named palette draws its own colours', { options: { palette: 'latte' } }, async $ => {
  const ui = await mountHint($)
  const diamonds = await ui.findAll({ type: 'Text', text: /◆/ })
  expect(diamonds.map(d => d.props.color)).toContain('#8839ef')
  await ui.unmount()
})

test('readConfig fills defaults and clamps numbers', () => {
  const cfg = readConfig({ barWidth: 99, warnAt: 'x', showGit: false })
  expect(cfg.palette).toBe('auto')
  expect(cfg.barWidth).toBe(30)
  expect(cfg.warnAt).toBe(85)
  expect(cfg.show.git).toBe(false)
  expect(cfg.show.todos).toBe(true)
})

test('model ids are shortened for people', () => {
  expect(prettyModel('claude-opus-5-5')).toBe('Opus 5.5')
  expect(prettyModel('claude-sonnet-4-5-20250929')).toBe('Sonnet 4.5')
  expect(prettyModel('claude-opus-5-5[1m]')).toBe('Opus 5.5 1M')
  expect(prettyModel('Opus 5.5 (1M context)')).toBe('Opus 5.5 (1M context)')
})

test('an MCP tool drops only its own server prefix', () => {
  expect(mcpToolLabel('Notion', 'notion-search')).toBe('search')
  expect(mcpToolLabel('Gmail', 'search_threads')).toBe('search_threads')
  expect(mcpToolLabel('Google Drive', 'google-drive_list')).toBe('list')
})

test('todos replay from the transcript', () => {
  let list = replayTodo([], 'TaskCreate', { subject: 'Ship it', activeForm: 'Shipping' }, { task: { id: '1' } })
  list = replayTodo(list, 'TaskUpdate', { taskId: '1', status: 'in_progress' }, undefined)
  expect(list).toEqual([{ id: '1', text: 'Ship it', active: 'Shipping', status: 'in_progress' }])
  list = replayTodo(list, 'TaskUpdate', { taskId: '1', status: 'deleted' }, undefined)
  expect(list).toEqual([])
})
