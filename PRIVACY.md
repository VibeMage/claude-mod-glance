# Privacy

glance collects nothing, stores nothing beyond the running session, and sends nothing anywhere.

- **What it reads.** Through Claude Code's mod API, on your machine only: the session's model, context fill, rate-limit windows and cost; the names and inputs of tool calls in the session's transcript, to count tools, MCP servers, skills and todos and to show a short label (a file name, a command's first words); your Claude Code `theme` setting. It also runs `git status` in the session's working directory.
- **What it keeps.** These figures live in the session's mod state while Claude Code runs. glance writes no files and keeps nothing across sessions.
- **What it sends.** Nothing. glance makes no network requests and has no server. Its author receives no data from it.
- **Personal data.** A tool call's input can contain personal data (an email address in a search, a name in a file path). glance reads such inputs only to draw a short label on your own screen, and does not keep or transmit them.

Questions: open an issue at https://github.com/VibeMage/claude-mod-glance/issues.
