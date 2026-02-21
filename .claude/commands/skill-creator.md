Help the user create a new Claude Code custom skill (slash command).

Follow these steps:

1. **Ask for skill details**:
   - Skill name (used as the slash command, e.g. `my-skill` → `/my-skill`)
   - What the skill should do (purpose and behavior)

2. **Create the skill file**:
   - Create `.claude/commands/<skill-name>.md` with a clear English prompt describing what the skill should do when invoked.

3. **Confirm creation**:
   - Show the file path and content created.
   - Remind the user to invoke it with `/<skill-name>`.

Rules for writing a good skill prompt:
- Write in clear, imperative English.
- Be specific about what steps to perform.
- Do not include YAML frontmatter — just plain markdown instructions.
