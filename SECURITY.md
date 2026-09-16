# Security Policy

Polyhedraverse is a small, single-developer project. There is no bug
bounty and no dedicated security team — reports are handled directly
by the maintainer.

## Reporting a vulnerability

Please report security issues privately, not as a public GitHub issue:

- **Email:** jamesbaker08@gmail.com
- **Or:** open a [GitHub private security advisory](https://github.com/DICTOR-Master/polyhedraverse/security/advisories/new) on this repo.

Include what you found, how to reproduce it, and its impact if you can.
You should get an acknowledgment within a few days.

## Scope

Polyhedraverse has no accounts, no analytics, and no server-side
backend at all as of 2026-09-16 — a prior local-JSON-file API route
(`/api/assemblies`) was removed after it turned out to 500 on Vercel's
read-only production filesystem; save/load now persists entirely to
the browser's own localStorage (see `app/lib/assembly.ts`'s
`ASSEMBLY_STORAGE_KEY`). Real server-side, cross-device sync (Vercel
KV/Postgres, per `docs/vercel-deployment-plan.md`) remains a possible
future direction, not yet built. Reports touching the localStorage
data's own validation on load (`app/lib/assembly.ts`'s
`isValidAssembly`, which guards against corrupted or hand-edited
browser storage) are in scope, as is anything client-side — this is a
WebGL/Three.js app rendering user-driven state, so raycasting or
scene-construction bugs matter even without an obvious "security" label.

## Supported versions

Only the latest commit on `main` is supported. There are no maintained
release branches yet.
