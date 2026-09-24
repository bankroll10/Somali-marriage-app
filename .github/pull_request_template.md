<!--
  The release-review checklist from docs/RESEARCH.md, in front of every PR so
  it doesn't have to be remembered. Delete a line that genuinely doesn't
  apply; don't check a box you haven't actually verified.
-->

## What this changes, and why

<!-- One or two sentences. If this tests a hypothesis, name it. -->

## Checklist

- [ ] `npm run verify` is green (typecheck, lint, tests)
- [ ] `npm run build` succeeds
- [ ] Any new value the server accepts is a closed id in `netlify/shared/vocab.ts`
      with a `src/` twin, pinned by `tests/vocab-sync.test.ts`
- [ ] A new `netlify/functions/` file is in `tests/deploy-layout.test.ts`'s allowlist
- [ ] Trust screen copy moves in this commit if the payload it describes changed
- [ ] A new closed list or readout field is documented in `docs/PRIVACY.md`
      (the field table and the collected list) — if it applies
- [ ] If this carries a hypothesis bigger than a copy fix, it has an entry in
      `docs/RESEARCH.md` with a decision rule already written

🤖 Generated with [Claude Code](https://claude.com/claude-code)
