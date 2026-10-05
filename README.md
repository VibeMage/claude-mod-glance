English | [简体中文](README.zh-CN.md)

# glance

A HUD under your Claude Code prompt, written as a [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview). One look tells you the model, the branch, what the session has cost, how full the context is, where your 5-hour and 7-day limits stand, and what Claude is running right now.

```
❯ █
◆ Opus 5.5 ·  main ↑1 ●3   $2.63 · ⏱ 16m
ctx █░░░░░░░░░ 14% · 145k/1M   5h █░░░░░░░░░ 8% · 2h21m   7d ░░░░░░░░░░ 2% · 6d21h
◐ Bash npm test   ✓ Read×12 Edit×3 Bash×5
✦ plugin-authoring · simplify   ⧉ Notion×2 Gmail×1
⚙ Explore find the config   2 agents
▸ 3/7 Writing the README
? for shortcuts
```

> **Requires Claude Code 2.1.289 or newer.** Mods are an early-access API that may change between releases. If glance stops drawing after an update, please open an issue.

## Install

In Claude Code:

```
/plugin marketplace add VibeMage/claude-mod-glance
/plugin install glance@claude-mod-glance
```

Or from a shell:

```sh
claude plugin marketplace add VibeMage/claude-mod-glance
claude plugin install glance@claude-mod-glance
```

Start a new session (or run `/reload-plugins`) and glance appears under the prompt.

glance runs alongside a `statusLine` such as claude-hud. If you are switching from one, remove `statusLine` from `~/.claude/settings.json` so you do not see the same figures twice.

## What it shows

| Row | Contents | Source |
| --- | --- | --- |
| Header | Model (`claude-opus-5-5` → `Opus 5.5`), git branch, ahead ↑ / behind ↓, changed files ●, session cost, session duration | `$.session.model()`, `git status --porcelain=v2`, `$.session.usage()` |
| Bars | Context fill with tokens used, then each rate-limit window (5h, 7d) with the time until it resets. Each bar has its own colour and turns red at the warning threshold | `$.session.usage()`, refreshed on `session.measure` |
| Tools | Tools running now (◐) and the session's most-used tools | `tool.call` |
| Skills and MCP | Skills loaded this session, latest first (✦); MCP calls running now (◐) and calls per server (⧉) | `skill.prompt`, `tool.call` |
| Agents | Subagents running (⚙) and how many the session has started | `tool.call` on `Agent` |
| Todos | Progress and the item in progress, from TodoWrite or the Task tools | `tool.call` |

When glance loads (a new session, `--resume`, or installing it mid-session), it reads the transcript, so the tools, MCP servers, skills and todos used before it loaded are counted too.

The cost is what `/cost` reports: an estimate at API list prices. On a Pro or Max subscription it is not what you are billed.

## What glance runs and reads

glance is a single TypeScript module (`hooks/register.tsx`) that Claude Code runs in its mod sandbox. It has no dependencies, downloads nothing and opens no network connections. Everything it reads stays on your machine.

- **Runs** `git status --porcelain=v2 --branch` in the session's working directory, when the session starts, after each turn and every 30 seconds, for the branch, ahead/behind and changed-file count.
- **Reads**, through the mod API: the session's model, context fill, rate-limit windows and cost (`$.session.usage()`), the session's transcript (`$.session.messages()`, only the names and inputs of tool calls, to count tools, MCP servers, skills and todos), and your Claude Code `theme` setting (`$.settings.read()`, to pick light or dark colours).
- **Observes** tool calls and skill loads as they happen, without changing or blocking them.
- **Keeps** its figures in the session's mod state only. It writes no files and stores nothing across sessions.
- **Sends** nothing anywhere.

## Configure

Run `/plugin configure glance@claude-mod-glance`, or open `/config` and find the glance rows. Changes apply immediately.

| Option | Default | What it does |
| --- | --- | --- |
| `palette` | `auto` | `auto`: Cupertino (iOS system colours), light or dark following your Claude Code theme. `catppuccin`: Latte or Mocha, chosen the same way. `mocha`, `macchiato`, `frappe`, `latte`: always that Catppuccin flavor |
| `barWidth` | `10` | Cells in each bar (4–30) |
| `warnAt` | `85` | Percentage at which a bar and its figure turn red |
| `showGit` | `true` | Branch, ahead/behind, changed files |
| `showCost` | `true` | Session cost |
| `showDuration` | `true` | Session duration |
| `showTools` | `true` | Tools row |
| `showSkills` | `true` | Skills and MCP row |
| `showAgents` | `true` | Agents row |
| `showTodos` | `true` | Todos row |
| `keepHint` | `true` | Keep Claude Code's own hint line (`? for shortcuts`, `esc to interrupt`) under the HUD |

## Known limitations

- glance draws in place of the hint line under the prompt and redraws that hint as plain dim text, so the hint's own colours (for example the `auto mode on` pill) are lost. Turn the line off with `keepHint: false`.
- A skill you invoke as `/name` is not in the transcript's tool calls, so it is only counted if glance was already loaded when you ran it.
- Rate-limit bars appear only on a subscription, after the first response of the session reports them.

## Develop

```sh
git clone https://github.com/VibeMage/claude-mod-glance
cd claude-mod-glance
claude --plugin-dir .          # load it for one session; saving a file reloads it
claude plugin validate .       # what the engine would refuse
claude plugin test .           # tests/*.test.ts against the engine
```

The engine writes the API's types to `.claude-plugin/types/` the first time it loads the mod, along with a `tsconfig.json`, so `tsc -p .` type-checks it. Both are build-specific and git-ignored.

## License

[MIT](LICENSE)
