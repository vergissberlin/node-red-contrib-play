# Agent Notes

Guidance for AI coding agents (and contributors) working in this repository.

## Keep Node.js version references in sync

`engines.node` in `package.json` is the source of truth for the minimum supported Node.js version. When it changes — for example after bumping `pnpm` to a major version that raises its own Node.js requirement — update every other place that states a Node.js version **in the same PR**:

- `README.md` — the Requirements and Deployment Dependencies sections
- `CONTRIBUTING.md` — the Prerequisites section
- CI workflow files under `.github/workflows/` — `node-version` / matrix values

This drifted out of sync after the pnpm v11 bump (`engines.node` went to `>=22.13`, but `README.md` and `CONTRIBUTING.md` still said `>= 18`), which needed a separate follow-up PR to fix.
