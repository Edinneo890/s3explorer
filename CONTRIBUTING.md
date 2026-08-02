# Contributing

Thank you for considering a contribution to S3 Explorer!

## Development Setup

```bash
git clone https://github.com/astrixgame/s3explorer.git
cd s3explorer
npm install
npm run dev
```

After editing any file under `electron/`, recompile before restarting Electron:

```bash
npx tsc -p tsconfig.node.json
```

## Branch Naming

| Type | Pattern |
|------|---------|
| Feature | `feat/short-description` |
| Bug fix | `fix/short-description` |
| Docs | `docs/short-description` |
| Refactor | `refactor/short-description` |

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add drag-and-drop upload
fix: unwrap SolidJS proxy before passing to IPC
docs: update keyboard shortcut table
refactor: extract MonacoEditor into separate file
```

## Before Opening a PR

1. Run both type-checks — both must pass with zero errors:
   ```bash
   npx tsc --noEmit -p tsconfig.json
   npx tsc --noEmit -p tsconfig.node.json
   ```
2. Test your change on the target platform(s).
3. If you changed the renderer or Electron main, confirm the app starts with
   `npm run dev`.

## Code Style

- TypeScript strict mode — no `any` unless absolutely necessary
- No comments in source files (self-documenting code)
- Prefer editing existing files over creating new ones
- Keep components focused — one concern per file

## Reporting Bugs

Open an issue using the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).
Include console output from DevTools (`Ctrl+Shift+I`).

## License

By contributing you agree that your code will be released under the [MIT License](LICENSE).
