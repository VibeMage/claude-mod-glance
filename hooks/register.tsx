import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { HudActivity, HudGit, HudRun, HudTodo, HudUsage } from '../types'

type PaletteKey =
  | 'rosewater'
  | 'pink'
  | 'mauve'
  | 'red'
  | 'peach'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'sky'
  | 'sapphire'
  | 'blue'
  | 'lavender'
  | 'text'
  | 'subtext'
  | 'overlay'
  | 'surface2'
  | 'surface1'
  | 'surface0'
  | 'crust'

// A palette names a colour per role; `meters` gives each bar its own (ctx, 5h, 7d), else blue, mauve, teal
type Palette = Record<PaletteKey, string> & { meters?: Record<string, string> }

// Cupertino: the user's Apple-style design system (iOS system colours, HIG June 2025), text in
// grays, colour kept for state and categories. Accent text uses HIG's increased-contrast values.
const CUPERTINO: Record<'light' | 'dark', Palette> = {
  light: {
    rosewater: '#ac7f5e',
    pink: '#d30f45',
    mauve: '#6155f5',
    red: '#d70015',
    peach: '#c93400',
    yellow: '#c93400',
    green: '#248a3d',
    teal: '#0071a4',
    sky: '#0071a4',
    sapphire: '#0063c7',
    blue: '#0071e3',
    lavender: '#6e6e73',
    text: '#1d1d1f',
    subtext: '#6e6e73',
    overlay: '#8e8e93',
    surface2: '#c7c7cc',
    surface1: '#d1d1d6',
    surface0: '#e5e5ea',
    crust: '#ffffff',
    meters: { ctx: '#0088ff', five_hour: '#6155f5', seven_day: '#00c3d0' },
  },
  dark: {
    rosewater: '#b78a66',
    pink: '#ff375f',
    mauve: '#6d7cff',
    red: '#ff666a',
    peach: '#ffa056',
    yellow: '#ffd600',
    green: '#4ad968',
    teal: '#00d2e0',
    sky: '#3cd3fe',
    sapphire: '#319dff',
    blue: '#0091ff',
    lavender: '#98989f',
    text: '#f5f5f7',
    subtext: '#98989f',
    overlay: '#7c7c80',
    surface2: '#48484a',
    surface1: '#3a3a3c',
    surface0: '#2c2c2e',
    crust: '#000000',
    meters: { ctx: '#0091ff', five_hour: '#6d7cff', seven_day: '#00d2e0' },
  },
}

// Catppuccin palettes, https://catppuccin.com/palette
const FLAVORS: Record<'mocha' | 'macchiato' | 'frappe' | 'latte', Palette> = {
  mocha: {
    rosewater: '#f5e0dc',
    pink: '#f5c2e7',
    mauve: '#cba6f7',
    red: '#f38ba8',
    peach: '#fab387',
    yellow: '#f9e2af',
    green: '#a6e3a1',
    teal: '#94e2d5',
    sky: '#89dceb',
    sapphire: '#74c7ec',
    blue: '#89b4fa',
    lavender: '#b4befe',
    text: '#cdd6f4',
    subtext: '#a6adc8',
    overlay: '#6c7086',
    surface2: '#585b70',
    surface1: '#45475a',
    surface0: '#313244',
    crust: '#11111b',
  },
  macchiato: {
    rosewater: '#f4dbd6',
    pink: '#f5bde6',
    mauve: '#c6a0f6',
    red: '#ed8796',
    peach: '#f5a97f',
    yellow: '#eed49f',
    green: '#a6da95',
    teal: '#8bd5ca',
    sky: '#91d7e3',
    sapphire: '#7dc4e4',
    blue: '#8aadf4',
    lavender: '#b7bdf8',
    text: '#cad3f5',
    subtext: '#a5adcb',
    overlay: '#6e738d',
    surface2: '#5b6078',
    surface1: '#494d64',
    surface0: '#363a4f',
    crust: '#181926',
  },
  frappe: {
    rosewater: '#f2d5cf',
    pink: '#f4b8e4',
    mauve: '#ca9ee6',
    red: '#e78284',
    peach: '#ef9f76',
    yellow: '#e5c890',
    green: '#a6d189',
    teal: '#81c8be',
    sky: '#99d1db',
    sapphire: '#85c1dc',
    blue: '#8caaee',
    lavender: '#babbf1',
    text: '#c6d0f5',
    subtext: '#a5adce',
    overlay: '#737994',
    surface2: '#626880',
    surface1: '#51576d',
    surface0: '#414559',
    crust: '#232634',
  },
  latte: {
    rosewater: '#dc8a78',
    pink: '#ea76cb',
    mauve: '#8839ef',
    red: '#d20f39',
    peach: '#fe640b',
    yellow: '#df8e1d',
    green: '#40a02b',
    teal: '#179299',
    sky: '#04a5e5',
    sapphire: '#209fb5',
    blue: '#1e66f5',
    lavender: '#7287fd',
    text: '#4c4f69',
    subtext: '#6c6f85',
    overlay: '#9ca0b0',
    surface2: '#acb0be',
    surface1: '#bcc0cc',
    surface0: '#ccd0da',
    crust: '#dce0e8',
  },
}

type Flavor = keyof typeof FLAVORS

const usage = atom({ plugin: 'glance', key: 'usage' } as const, null)
const git = atom({ plugin: 'glance', key: 'git' } as const, null)
const activity = atom({ plugin: 'glance', key: 'activity' } as const, {
  running: [],
  counts: {},
  mcpCounts: {},
  agentsDone: 0,
})
const todos = atom({ plugin: 'glance', key: 'todos' } as const, [])
const model = atom({ plugin: 'glance', key: 'model' } as const, '')
const now = atom({ plugin: 'glance', key: 'now' } as const, 0)

const skills = atom({ plugin: 'glance', key: 'skills' } as const, [])

const EMPTY_ACTIVITY: HudActivity = { running: [], counts: {}, mcpCounts: {}, agentsDone: 0 }

// State outlives a reload, so a value an older version wrote may lack the newer fields
function withDefaults(a: Partial<HudActivity> | null | undefined): HudActivity {
  return { ...EMPTY_ACTIVITY, ...a, running: (a?.running ?? []).filter(r => r.kind !== undefined) }
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`

  return String(n)
}

function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h${String(minutes % 60).padStart(2, '0')}m`

  return `${Math.floor(hours / 24)}d${hours % 24}h`
}

// `claude-opus-5-5` → `Opus 5.5`; a name already spelled for people is kept
export function prettyModel(id: string): string {
  const m = id.match(/^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?(\[1m\])?$/)
  if (!m) return id || 'Claude'
  const family = m[1]!.charAt(0).toUpperCase() + m[1]!.slice(1)

  return `${family} ${m[2]}${m[3] ? `.${m[3]}` : ''}${m[4] ? ' 1M' : ''}`
}

// Each bar keeps its own colour, turning red at the warning threshold
function meterColor(p: Palette, kind: string, percent: number, warnAt: number): string {
  if (percent >= warnAt) return p.red
  const fallback: Record<string, string> = { ctx: p.blue, five_hour: p.mauve, seven_day: p.teal }

  return p.meters?.[kind] ?? fallback[kind] ?? p.sapphire
}

function limitLabel(kind: string): string {
  if (kind === 'five_hour') return '5h'
  if (kind === 'seven_day') return '7d'
  if (kind === 'spend_limit') return 'spend'

  return kind.replace(/_/g, ' ')
}

// `claude_ai_Notion` → `Notion`, `claude-in-chrome` kept
function serverName(id: string): string {
  return id.replace(/^claude_ai_/, '').replace(/_/g, ' ')
}

// A tool named after its server drops the repeat: Notion's `notion-search` → `search`
export function mcpToolLabel(server: string, tool: string): string {
  const prefix = server.toLowerCase().replace(/\s+/g, '-')
  for (const sep of ['-', '_']) {
    if (tool.toLowerCase().startsWith(prefix + sep)) return tool.slice(prefix.length + 1)
  }

  return tool
}

function basename(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}

function clip(text: string, max: number): string {
  const line = text.replace(/\s+/g, ' ').trim()

  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}

function labelFor(tool: string, input: Record<string, unknown>): string {
  const str = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : '')
  if (tool === 'Bash') return clip(str('command'), 28)
  if (tool === 'Agent') return clip(str('description'), 28)
  if (str('file_path')) return basename(str('file_path'))
  if (str('notebook_path')) return basename(str('notebook_path'))
  if (str('pattern')) return clip(str('pattern'), 20)
  if (str('url'))
    return (
      str('url')
        .replace(/^https?:\/\//, '')
        .split('/')[0] ?? ''
    )
  if (str('query')) return clip(str('query'), 20)

  return ''
}

async function refreshUsage($: EngineInterface) {
  const plain = await $.session.usage()
  const next: HudUsage = {
    startedAt: plain.startedAt,
    tokens: plain.context.tokens,
    window: plain.context.window,
    percent: plain.context.percent,
    limits: plain.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
    costUsd: plain.cost?.usd,
  }
  await update($, usage, () => next)
}

// A named flavor; `auto` is Cupertino and `catppuccin` latte or mocha, each light or dark with the Claude Code theme
async function palette($: EngineInterface, chosen: string): Promise<Palette> {
  if (chosen in FLAVORS) return FLAVORS[chosen as Flavor]
  let isLight = false
  try {
    isLight = String((await $.settings.read()).theme ?? 'dark').includes('light')
  } catch {
    // No settings to read: dark
  }
  if (chosen === 'catppuccin') return isLight ? FLAVORS.latte : FLAVORS.mocha

  return isLight ? CUPERTINO.light : CUPERTINO.dark
}

// Recounts tools, MCP servers, agents, skills and todos from the transcript, so a fresh load (a new process, a
// --resume, the mod installed mid-session) shows what ran before it; counts the mod kept live are left alone
async function backfill($: EngineInterface) {
  const counts: Record<string, number> = {}
  const mcpCounts: Record<string, number> = {}
  let agentsDone = 0
  const used: string[] = []
  let list: HudTodo[] = []
  for (const message of await $.session.messages()) {
    for (const call of message.toolUses ?? []) {
      const tool = String(call.tool)
      const input = call.input
      const mcp = tool.match(/^mcp__(.+?)__(.+)$/)
      if (tool === 'Skill' && typeof input.skill === 'string') used.unshift(input.skill)
      else if (tool === 'Agent') agentsDone += 1
      else if (mcp) {
        const server = serverName(mcp[1]!)
        mcpCounts[server] = (mcpCounts[server] ?? 0) + 1
      } else counts[tool] = (counts[tool] ?? 0) + 1
      list = replayTodo(list, tool, input, call.result)
    }
  }
  await update($, activity, old => {
    const a = withDefaults(old)
    const isFresh = Object.keys(a.counts).length === 0 && Object.keys(a.mcpCounts).length === 0 && a.agentsDone === 0
    return isFresh ? { ...a, counts, mcpCounts, agentsDone } : a
  })
  await update($, skills, old => [...new Set([...old, ...used])].slice(0, 6))
  await update($, todos, old => (old.length === 0 ? list : old))
}

// Applies one TodoWrite, TaskCreate or TaskUpdate call from the transcript to the todo list
export function replayTodo(list: HudTodo[], tool: string, input: Record<string, unknown>, result: unknown): HudTodo[] {
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  if (tool === 'TodoWrite' && Array.isArray(input.todos)) {
    return input.todos.map((t: Record<string, unknown>, i: number) => ({
      id: String(i),
      text: str(t.content) ?? '',
      active: str(t.activeForm) ?? str(t.content) ?? '',
      status: (t.status as HudTodo['status']) ?? 'pending',
    }))
  }
  if (tool === 'TaskCreate') {
    const id = str((result as { task?: { id?: unknown } } | undefined)?.task?.id)
    const text = str(input.subject) ?? ''
    return id ? [...list, { id, text, active: str(input.activeForm) ?? text, status: 'pending' }] : list
  }
  if (tool === 'TaskUpdate') {
    const id = str(input.taskId)
    const status = str(input.status)
    if (status === 'deleted') return list.filter(t => t.id !== id)
    return list.map(t =>
      t.id === id
        ? {
            ...t,
            text: str(input.subject) ?? t.text,
            active: str(input.activeForm) ?? t.active,
            status: (status as HudTodo['status'] | undefined) ?? t.status,
          }
        : t,
    )
  }

  return list
}

async function tick($: EngineInterface) {
  const t = await $.clock.now()
  await update($, now, () => t)
}

async function refreshGit($: EngineInterface) {
  try {
    const { exitCode, stdout } = await $.process.run(['git', 'status', '--porcelain=v2', '--branch'], {
      timeoutMs: 5000,
    })
    if (exitCode !== 0) {
      await update($, git, () => null)
      return
    }
    const info: HudGit = { branch: '', ahead: 0, behind: 0, dirty: 0 }
    for (const line of stdout.split('\n')) {
      if (line.startsWith('# branch.head ')) info.branch = line.slice(14)
      else if (line.startsWith('# branch.ab ')) {
        const [, a, b] = line.match(/\+(\d+) -(\d+)/) ?? []
        info.ahead = Number(a ?? 0)
        info.behind = Number(b ?? 0)
      } else if (line && !line.startsWith('#')) info.dirty += 1
    }
    await update($, git, () => info)
  } catch {
    await update($, git, () => null)
  }
}

type Config = {
  palette: string
  barWidth: number
  warnAt: number
  show: Record<'git' | 'cost' | 'duration' | 'tools' | 'skills' | 'agents' | 'todos' | 'hint', boolean>
}

// The manifest's userConfig, defaults filled in and numbers held to a sane range
export function readConfig(options: Record<string, unknown>): Config {
  const num = (key: string, fallback: number, min: number, max: number) => {
    const n = Number(options[key])
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback
  }
  const flag = (key: string) => options[key] !== false

  return {
    palette: String(options.palette ?? 'auto'),
    barWidth: num('barWidth', 10, 4, 30),
    warnAt: num('warnAt', 85, 1, 100),
    show: {
      git: flag('showGit'),
      cost: flag('showCost'),
      duration: flag('showDuration'),
      tools: flag('showTools'),
      skills: flag('showSkills'),
      agents: flag('showAgents'),
      todos: flag('showTodos'),
      hint: flag('keepHint'),
    },
  }
}

export const register: Register = (on, options) => {
  const cfg = readConfig(options as Record<string, unknown>)

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    void $.session.model().then(m => update($, model, () => m))
    await tick($)
    void refreshUsage($)
    void refreshGit($)
    void backfill($).catch(() => undefined)
    $.clock.every(30_000, async () => {
      await tick($)
      await refreshGit($)
    })

    return started
  })

  on('session.measure', async ($, e, next) => {
    const ran = await next(e)
    await refreshUsage($)
    const m = await $.session.model()
    await update($, model, () => m)

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)
    // A call abandoned mid-flight (an interrupt) may never reach its finally: nothing runs between turns
    await update($, activity, old => ({ ...withDefaults(old), running: [] }))
    await tick($)
    await refreshGit($)

    return ran
  })

  on('session.end', { reason: 'clear' }, async ($, e, next) => {
    await update($, activity, () => EMPTY_ACTIVITY)
    await update($, todos, () => [])
    await update($, skills, () => [])
    void refreshUsage($)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const tool = String(e.tool)
    const input = e as unknown as Record<string, unknown>
    // Skills are counted by skill.prompt, which also sees /name and preloads
    if (tool === 'Skill') return next(e)
    const mcp = tool.match(/^mcp__(.+?)__(.+)$/)
    const kind = tool === 'Agent' ? 'agent' : mcp ? 'mcp' : 'tool'
    const server = mcp ? serverName(mcp[1]!) : ''
    const run: HudRun = {
      id: e.tool_use_id,
      tool: kind === 'agent' && typeof input.subagent_type === 'string' ? input.subagent_type : mcp ? server : tool,
      label: mcp ? mcpToolLabel(server, mcp[2]!) : labelFor(tool, input),
      kind,
    }
    await update($, activity, old => {
      const a = withDefaults(old)
      return { ...a, running: [...a.running, run] }
    })
    try {
      return await next(e)
    } finally {
      await update($, activity, old => {
        const a = withDefaults(old)
        return {
          running: a.running.filter(r => r.id !== run.id),
          counts: kind === 'tool' ? { ...a.counts, [tool]: (a.counts[tool] ?? 0) + 1 } : a.counts,
          mcpCounts: kind === 'mcp' ? { ...a.mcpCounts, [server]: (a.mcpCounts[server] ?? 0) + 1 } : a.mcpCounts,
          agentsDone: a.agentsDone + (kind === 'agent' ? 1 : 0),
        }
      })
    }
  })

  on('skill.prompt', async ($, e, next) => {
    const ran = await next(e)
    await update($, skills, list => [e.skill, ...list.filter(s => s !== e.skill)].slice(0, 6))

    return ran
  })

  // Todo and task tools update the list as they land, the same way backfill replays them
  on('tool.call', { tool: ['TodoWrite', 'TaskCreate', 'TaskUpdate'] }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && !ran.isError) {
      const input = e as unknown as Record<string, unknown>
      await update($, todos, list => replayTodo(list, String(e.tool), input, ran.result))
    }

    return ran
  })

  // Drawn in place of the hint line under the prompt, the engine's hint kept beneath the box
  on('ui.render', { component: 'PromptHint' }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const p = await palette($, cfg.palette)
    const u = await read($, usage)
    const g = await read($, git)
    const a = withDefaults(await read($, activity))
    const list = await read($, todos)
    const skillList = await read($, skills)
    const modelName = await read($, model)
    const at = await read($, now)

    const dot = <Text color={p.surface2}> · </Text>

    // Every bar is BAR cells, filled █ over a dim ░ track as claude-hud draws them; the three share one row
    const BAR = cfg.barWidth
    const label = (text: string) => <Text color={p.subtext}>{text} </Text>
    const meter = (kind: string, name: string, percent: number, detail?: string) => {
      const filled = Math.min(BAR, Math.round((percent / 100) * BAR))
      const color = meterColor(p, kind, percent, cfg.warnAt)
      return (
        <Text>
          {label(name)}
          <Text color={color}>{'█'.repeat(filled)}</Text>
          <Text color={p.surface2}>{'░'.repeat(BAR - filled)}</Text>
          <Text color={percent >= cfg.warnAt ? p.red : p.text}> {percent}%</Text>
          {detail && <Text color={p.overlay}> · {detail}</Text>}
        </Text>
      )
    }

    // Header: model and git on the left, cost and session time on the right
    const header = (
      <Box columnGap={3}>
        <Text>
          <Text color={p.mauve}>◆ </Text>
          <Text color={p.text} bold>
            {prettyModel(modelName)}
          </Text>
          {cfg.show.git && g && g.branch && (
            <Text>
              {dot}
              <Text color={p.green}> {g.branch}</Text>
              {g.ahead > 0 && <Text color={p.sky}> ↑{g.ahead}</Text>}
              {g.behind > 0 && <Text color={p.peach}> ↓{g.behind}</Text>}
              {g.dirty > 0 && <Text color={p.yellow}> ●{g.dirty}</Text>}
            </Text>
          )}
        </Text>
        <Text>
          {cfg.show.cost && u?.costUsd !== undefined && (
            <Text>
              <Text color={p.yellow}>$</Text>
              <Text color={p.text}>{u.costUsd.toFixed(2)}</Text>
            </Text>
          )}
          {cfg.show.cost && cfg.show.duration && u?.costUsd !== undefined && u && at > 0 && dot}
          {cfg.show.duration && u && at > 0 && (
            <Text>
              <Text color={p.lavender}>⏱ </Text>
              <Text color={p.text}>{formatDuration(at - u.startedAt)}</Text>
            </Text>
          )}
        </Text>
      </Box>
    )

    // Context fill: one colour, the tokens beside it
    const percent = u?.tokens !== undefined ? (u.percent ?? Math.round((u.tokens / u.window) * 100)) : undefined
    const tokensText = u?.tokens !== undefined ? `${formatTokens(u.tokens)}/${formatTokens(u.window)}` : undefined
    const contextRow =
      percent !== undefined ? (
        meter('ctx', 'ctx', percent, tokensText)
      ) : (
        <Text>
          {label('ctx')}
          <Text color={p.overlay}>waiting for the first response</Text>
        </Text>
      )

    // Context, then each rate-limit window with the time to its reset, side by side
    const meters = (
      <Box flexWrap="wrap" columnGap={3}>
        {contextRow}
        {(u?.limits ?? []).map(l => {
          const resetsIn = l.resetsAt && at > 0 ? Date.parse(l.resetsAt) - at : NaN
          return meter(
            l.kind,
            limitLabel(l.kind),
            l.percentUsed,
            Number.isFinite(resetsIn) && resetsIn > 0 ? formatDuration(resetsIn) : undefined,
          )
        })}
      </Box>
    )

    // Activity: what runs now, then what ran this session
    const runningTools = a.running.filter(r => r.kind === 'tool')
    const runningAgents = a.running.filter(r => r.kind === 'agent')
    const runningMcp = a.running.filter(r => r.kind === 'mcp')
    const top = Object.entries(a.counts)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 5)
    const hasActivity = cfg.show.tools && (runningTools.length > 0 || top.length > 0)
    const activityRow = hasActivity ? (
      <Box flexWrap="wrap" columnGap={2}>
        {runningTools.slice(0, 2).map(r => (
          <Text>
            <Text color={p.yellow}>◐ </Text>
            <Text color={p.text}>{r.tool}</Text>
            {r.label && <Text color={p.overlay}> {r.label}</Text>}
          </Text>
        ))}
        {top.length > 0 && (
          <Text>
            <Text color={p.green}>✓ </Text>
            {top.map(([tool, n], i) => (
              <Text>
                {i > 0 && <Text color={p.surface2}> </Text>}
                <Text color={p.subtext}>{tool}</Text>
                <Text color={p.overlay}>×{n}</Text>
              </Text>
            ))}
          </Text>
        )}
      </Box>
    ) : null

    // Skills loaded this session (latest first) and MCP servers called
    const mcpUsed = Object.entries(a.mcpCounts).sort((x, y) => y[1] - x[1])
    const skillRow =
      cfg.show.skills && (skillList.length > 0 || runningMcp.length > 0 || mcpUsed.length > 0) ? (
        <Box flexWrap="wrap" columnGap={3}>
          {skillList.length > 0 && (
            <Text>
              <Text color={p.pink}>✦ </Text>
              <Text color={p.text} bold>
                {skillList[0]}
              </Text>
              {skillList.slice(1, 4).map(name => (
                <Text>
                  {dot}
                  <Text color={p.subtext}>{name}</Text>
                </Text>
              ))}
            </Text>
          )}
          {runningMcp.slice(0, 2).map(r => (
            <Text>
              <Text color={p.yellow}>◐ </Text>
              <Text color={p.sapphire}>{r.tool}</Text>
              <Text color={p.overlay}> {r.label}</Text>
            </Text>
          ))}
          {mcpUsed.length > 0 && (
            <Text>
              <Text color={p.sapphire}>⧉ </Text>
              {mcpUsed.slice(0, 4).map(([server, n], i) => (
                <Text>
                  {i > 0 && <Text> </Text>}
                  <Text color={p.subtext}>{server}</Text>
                  <Text color={p.overlay}>×{n}</Text>
                </Text>
              ))}
            </Text>
          )}
        </Box>
      ) : null

    const agentRow =
      cfg.show.agents && (runningAgents.length > 0 || a.agentsDone > 0) ? (
        <Box flexWrap="wrap" columnGap={2}>
          {runningAgents.slice(0, 3).map(r => (
            <Text>
              <Text color={p.mauve}>⚙ </Text>
              <Text color={p.text}>{r.tool}</Text>
              {r.label && <Text color={p.overlay}> {r.label}</Text>}
            </Text>
          ))}
          {runningAgents.length > 3 && <Text color={p.overlay}>+{runningAgents.length - 3} more</Text>}
          {a.agentsDone > 0 && <Text color={p.overlay}>{a.agentsDone} agents</Text>}
        </Box>
      ) : null

    const done = list.filter(t => t.status === 'completed').length
    const current = list.find(t => t.status === 'in_progress')
    const todoRow =
      cfg.show.todos && list.length > 0 ? (
        <Text wrap="truncate-end">
          <Text color={done === list.length ? p.green : p.blue}>{done === list.length ? '✔ ' : '▸ '}</Text>
          <Text color={p.text} bold>
            {done}/{list.length}
          </Text>
          <Text color={p.subtext}>
            {' '}
            {current ? current.active || current.text : done === list.length ? 'all done' : 'todos'}
          </Text>
        </Text>
      ) : null

    const hud = (
      <Box flexDirection="column" alignSelf="flex-start">
        {header}
        {meters}
        {activityRow}
        {skillRow}
        {agentRow}
        {todoRow}
      </Box>
    )
    const hint = e.props.tail ? `${e.props.hint} ${e.props.tail}` : e.props.hint

    return (
      <Box flexDirection="column">
        {hud}
        {cfg.show.hint && hint && <Text dimColor>{hint}</Text>}
      </Box>
    )
  })
}
