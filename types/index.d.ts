export type HudLimit = { kind: string; percentUsed: number; resetsAt?: string }

export type HudUsage = {
  startedAt: number
  tokens?: number
  window: number
  percent?: number
  limits: HudLimit[]
  costUsd?: number
}

export type HudGit = { branch: string; ahead: number; behind: number; dirty: number }

export type HudRun = { id: string; tool: string; label: string; kind: 'tool' | 'agent' | 'mcp' }

export type HudActivity = {
  running: HudRun[]
  counts: Record<string, number>
  mcpCounts: Record<string, number>
  agentsDone: number
}

export type HudTodo = {
  id: string
  text: string
  active: string
  status: 'pending' | 'in_progress' | 'completed'
}

declare module 'claude-code' {
  interface PluginState {
    'glance': {
      usage: HudUsage | null
      git: HudGit | null
      activity: HudActivity
      todos: HudTodo[]
      skills: string[]
      model: string
      now: number
    }
  }
}
