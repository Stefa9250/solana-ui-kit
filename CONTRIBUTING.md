# Contributing

Thanks for your interest! This is an early-stage project — expect this guide
to grow.

## Adding a component

1. Create `components/kit/<slug>/<slug>.tsx`. It must be **self-contained**:
   the only allowed dependencies are React, Tailwind CSS, and lucide-react.
   Inject keyframes once via the `useKitStyles` pattern (see any existing
   component). Colors are `--sk-*` CSS variables with the kit's hex defaults
   inlined as fallbacks — e.g. `bg-[var(--sk-surface,#161b26)]` — so files
   stay portable *and* themeable. Reuse the existing token names.
2. Add a `demo.tsx` next to it that cycles every state with buttons.
3. Register it: one entry in `lib/registry.ts` (name, slug, description, path,
   props) and one line in `components/docs/demos.tsx`.

## Ground rules

- Dark-mode first.
- Every state change announced via `aria-live`; keyboard and focus behavior
  are not optional.
- `prefers-reduced-motion` must disable all animation.
- Never show a raw error code without a plain-language translation.
- Motion: 200–400ms, purposeful, calm. No confetti.

## Development

```bash
npm install
npm run dev     # docs site at localhost:3000
npm run lint
npx tsc --noEmit
```

Before opening a PR, make sure lint and typecheck pass and every state of your
component is reachable in its demo.
