[English](README.md) | 简体中文

# glance

一个显示在 Claude Code 输入框下方的 HUD，用 [Claude Code mod](https://claude.com/blog/claude-code-mods) 写成。扫一眼就能知道：当前模型、git 分支、会话花了多少钱、上下文用了多少、5 小时和 7 天限额还剩多少，以及 Claude 此刻在跑什么。

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

> **需要 Claude Code 2.1.289 或更新版本。** mod 是抢先体验的 API，不同版本之间可能会变。如果升级后 glance 不显示了，欢迎提 issue。

## 安装

在 Claude Code 里输入：

```
/plugin marketplace add VibeMage/claude-mod-glance
/plugin install glance@claude-mod-glance
```

或者在终端里运行：

```sh
claude plugin marketplace add VibeMage/claude-mod-glance
claude plugin install glance@claude-mod-glance
```

装好后新开一个会话（或者运行 `/reload-plugins`），glance 就会出现在输入框下方。

glance 可以和 claude-hud 这类 `statusLine` 同时使用。如果你打算换掉原来的状态栏，删掉 `~/.claude/settings.json` 里的 `statusLine`，免得同样的数字显示两遍。

## 显示内容

| 行 | 内容 | 数据来源 |
| --- | --- | --- |
| 标题行 | 模型（`claude-opus-5-5` 显示为 `Opus 5.5`）、git 分支、领先 ↑ / 落后 ↓ 提交数、改动文件数 ●、会话费用、会话时长 | `$.session.model()`、`git status --porcelain=v2`、`$.session.usage()` |
| 进度条 | 上下文用量和已用 token 数，以及每个限额窗口（5h、7d）和距离重置的时间。每条有自己的颜色，到告警阈值变红 | `$.session.usage()`，在 `session.measure` 时刷新 |
| 工具 | 正在运行的工具（◐）和本会话调用最多的工具 | `tool.call` |
| Skill 和 MCP | 本会话加载过的 skill，最近的排第一（✦）；正在进行的 MCP 调用（◐）和每个服务器的调用次数（⧉） | `skill.prompt`、`tool.call` |
| Agent | 正在运行的子 agent（⚙）和本会话启动过的数量 | `Agent` 的 `tool.call` |
| 待办 | TodoWrite 或 Task 工具的进度，以及正在做的那一项 | `tool.call` |

glance 加载时（新会话、`--resume`、或者在会话中途安装）会先读一遍会话记录，所以它加载之前用过的工具、MCP 服务器、skill 和待办也会算进去。

费用就是 `/cost` 显示的数字，按 API 标价估算。如果你用的是 Pro 或 Max 订阅，这不是你实际被扣的钱。

## 配置

运行 `/plugin configure glance@claude-mod-glance`，或者打开 `/config` 找到 glance 的那几行。改完立即生效。

| 选项 | 默认值 | 作用 |
| --- | --- | --- |
| `palette` | `auto` | `auto`：Cupertino 配色（iOS 系统色），跟随 Claude Code 主题切换浅色/深色。`catppuccin`：同样跟随主题，在 Latte 和 Mocha 之间切换。`mocha`、`macchiato`、`frappe`、`latte`：固定使用某个 Catppuccin 配色 |
| `barWidth` | `10` | 每条进度条的格数（4–30） |
| `warnAt` | `85` | 进度条和数字变红的百分比 |
| `showGit` | `true` | 分支、领先/落后、改动文件 |
| `showCost` | `true` | 会话费用 |
| `showDuration` | `true` | 会话时长 |
| `showTools` | `true` | 工具行 |
| `showSkills` | `true` | Skill 和 MCP 行 |
| `showAgents` | `true` | Agent 行 |
| `showTodos` | `true` | 待办行 |
| `keepHint` | `true` | 在 HUD 下方保留 Claude Code 自己的提示行（`? for shortcuts`、`esc to interrupt`） |

## 已知限制

- glance 占用的是输入框下方提示行的位置，原来的提示会作为灰色纯文字画在 HUD 下面，提示自带的颜色（比如 `auto mode on` 标签）会丢失。不需要这一行可以设 `keepHint: false`。
- 用 `/名字` 调用的 skill 不在会话记录的工具调用里，只有在 glance 已经加载的情况下调用才会被记录。
- 限额进度条只在订阅账号下出现，而且要等会话的第一次响应返回后才有数据。

## 开发

```sh
git clone https://github.com/VibeMage/claude-mod-glance
cd claude-mod-glance
claude --plugin-dir .          # 在这一次会话里加载，保存文件会自动重载
claude plugin validate .       # 检查引擎会拒绝什么
claude plugin test .           # 用引擎跑 tests/*.test.ts
```

引擎第一次加载这个 mod 时，会把 API 的类型定义写到 `.claude-plugin/types/`，同时生成一个 `tsconfig.json`，所以可以直接用 `tsc -p .` 做类型检查。这两样都和具体版本绑定，已经加进 `.gitignore`。

## 许可证

[MIT](LICENSE)
