# API Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all API routes from flat paths (`/dogs`) to versioned paths (`/api/v1/dogs`) using a central group in `start/routes.ts`.

**Architecture:** Each module renames its `routes.ts` to `routes.v1.ts` and keeps its resource prefix unchanged. `start/routes.ts` wraps all module imports in a `router.group().prefix('/api/v1')` block. Future v2 routes follow the same pattern with a second group.

**Tech Stack:** AdonisJS V7, `@adonisjs/core/services/router`, `adonis-autoswagger`, Japa (test runner)

---

## File Map

| File | Action |
|------|--------|
| `app/modules/auth/infrastructure/http/routes.ts` | Rename → `routes.v1.ts` |
| `app/modules/users/infrastructure/http/routes.ts` | Rename → `routes.v1.ts` |
| `app/modules/dogs/infrastructure/http/routes.ts` | Rename → `routes.v1.ts` |
| `app/modules/missions/infrastructure/http/routes.ts` | Rename → `routes.v1.ts` |
| `app/modules/actions/infrastructure/http/routes.ts` | Rename → `routes.v1.ts` |
| `start/routes.ts` | Replace flat imports with `router.group().prefix('/api/v1')` |
| `config/swagger.ts` | `tagIndex: 2` → `tagIndex: 3` |
| `tests/functional/dogs/infrastructure/http/*.spec.ts` (5 files) | Update URL prefix `/dogs` → `/api/v1/dogs` |
| `tests/functional/users/infrastructure/http/index-user-auth.spec.ts` | Update URL prefix `/users` → `/api/v1/users` |

---

## Task 1: Rename module route files

**Files:**
- Rename: `app/modules/auth/infrastructure/http/routes.ts` → `routes.v1.ts`
- Rename: `app/modules/users/infrastructure/http/routes.ts` → `routes.v1.ts`
- Rename: `app/modules/dogs/infrastructure/http/routes.ts` → `routes.v1.ts`
- Rename: `app/modules/missions/infrastructure/http/routes.ts` → `routes.v1.ts`
- Rename: `app/modules/actions/infrastructure/http/routes.ts` → `routes.v1.ts`

- [ ] **Step 1: Rename all 5 route files**

```bash
mv app/modules/auth/infrastructure/http/routes.ts app/modules/auth/infrastructure/http/routes.v1.ts
mv app/modules/users/infrastructure/http/routes.ts app/modules/users/infrastructure/http/routes.v1.ts
mv app/modules/dogs/infrastructure/http/routes.ts app/modules/dogs/infrastructure/http/routes.v1.ts
mv app/modules/missions/infrastructure/http/routes.ts app/modules/missions/infrastructure/http/routes.v1.ts
mv app/modules/actions/infrastructure/http/routes.ts app/modules/actions/infrastructure/http/routes.v1.ts
```

- [ ] **Step 2: Verify the files exist at their new paths**

```bash
ls app/modules/*/infrastructure/http/routes.v1.ts
```

Expected output:
```
app/modules/actions/infrastructure/http/routes.v1.ts
app/modules/auth/infrastructure/http/routes.v1.ts
app/modules/dogs/infrastructure/http/routes.v1.ts
app/modules/missions/infrastructure/http/routes.v1.ts
app/modules/users/infrastructure/http/routes.v1.ts
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rename routes.ts to routes.v1.ts in all modules"
```

---

## Task 2: Update `start/routes.ts` with central version group

**Files:**
- Modify: `start/routes.ts`

- [ ] **Step 1: Replace the content of `start/routes.ts`**

Replace the entire file with:

```typescript
import transmit from '@adonisjs/transmit/services/main'
import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

transmit.registerRoutes((route) => {
  // EventSource (GET) ne supporte pas les headers custom — pas d'auth ici
  // L'authentification se fait sur les routes POST (subscribe/unsubscribe)
  if (
    route.getPattern() === '__transmit/subscribe' ||
    route.getPattern() === '__transmit/unsubscribe'
  ) {
    route.middleware(middleware.firebaseAuth())
  }
})

import './routes/swagger.js'

router.group(() => {
  import('../app/modules/auth/infrastructure/http/routes.v1.js')
  import('../app/modules/users/infrastructure/http/routes.v1.js')
  import('../app/modules/dogs/infrastructure/http/routes.v1.js')
  import('../app/modules/missions/infrastructure/http/routes.v1.js')
  import('../app/modules/actions/infrastructure/http/routes.v1.js')
}).prefix('/api/v1')
```

- [ ] **Step 2: Verify the server starts without errors**

```bash
node ace serve --hmr
```

Expected: server starts, no import errors. Stop it with Ctrl+C once confirmed.

- [ ] **Step 3: Commit**

```bash
git add start/routes.ts
git commit -m "feat: add central /api/v1 route group"
```

---

## Task 3: Update Swagger `tagIndex`

**Files:**
- Modify: `config/swagger.ts`

`adonis-autoswagger` uses `tagIndex` to pick the URL segment used as a group name in the Swagger UI. Before: routes were `/dogs` so segment 1 was the tag. After: routes are `/api/v1/dogs` so segment 3 is the tag. `tagIndex` counts from 1 (not 0).

- [ ] **Step 1: Change `tagIndex` from `2` to `3` in `config/swagger.ts`**

In `config/swagger.ts`, find and change:

```typescript
tagIndex: 2,
```

to:

```typescript
tagIndex: 3,
```

- [ ] **Step 2: Verify swagger doc loads correctly**

Start the server: `node ace serve --hmr`

Open `http://localhost:3333/docs` in a browser. Verify:
- Routes are grouped by resource name (`dogs`, `users`, etc.) not by `v1`
- All routes show `/api/v1/...` paths

Stop the server.

- [ ] **Step 3: Commit**

```bash
git add config/swagger.ts
git commit -m "fix: update swagger tagIndex to 3 for /api/v1 prefix"
```

---

## Task 4: Update functional tests

**Files:**
- Modify: `tests/functional/dogs/infrastructure/http/create-robot-dog.spec.ts`
- Modify: `tests/functional/dogs/infrastructure/http/destroy-robot-dog.spec.ts`
- Modify: `tests/functional/dogs/infrastructure/http/index-robot-dog.spec.ts`
- Modify: `tests/functional/dogs/infrastructure/http/show-robot-dog.spec.ts`
- Modify: `tests/functional/dogs/infrastructure/http/update-robot-dog.spec.ts`
- Modify: `tests/functional/users/infrastructure/http/index-user-auth.spec.ts`

All functional tests currently call the old paths (`/dogs`, `/users`). They need updating to `/api/v1/dogs`, `/api/v1/users`.

- [ ] **Step 1: Update all `/dogs` paths in functional tests**

```bash
sed -i '' "s|'/dogs|'/api/v1/dogs|g; s|\`/dogs|\`/api/v1/dogs|g" \
  tests/functional/dogs/infrastructure/http/create-robot-dog.spec.ts \
  tests/functional/dogs/infrastructure/http/destroy-robot-dog.spec.ts \
  tests/functional/dogs/infrastructure/http/index-robot-dog.spec.ts \
  tests/functional/dogs/infrastructure/http/show-robot-dog.spec.ts \
  tests/functional/dogs/infrastructure/http/update-robot-dog.spec.ts
```

- [ ] **Step 2: Update all `/users` paths in functional tests**

```bash
sed -i '' "s|'/users|'/api/v1/users|g; s|\`/users|\`/api/v1/users|g" \
  tests/functional/users/infrastructure/http/index-user-auth.spec.ts
```

- [ ] **Step 3: Verify the replacements look correct**

```bash
grep -r "client\.\(get\|post\|put\|patch\|delete\)" tests/functional/
```

Expected: every URL starts with `/api/v1/`.

- [ ] **Step 4: Run the functional tests**

```bash
node ace test --files="tests/functional/**"
```

Expected: all tests pass. If a test fails with 404, the URL was not updated — re-check the file.

- [ ] **Step 5: Run the full test suite**

```bash
node ace test
```

Expected: all tests pass (unit + functional).

- [ ] **Step 6: Commit**

```bash
git add tests/functional/
git commit -m "test: update functional tests to use /api/v1 prefix"
```

---

## Task 5: Regenerate types and final verification

**Files:**
- Auto-generated: `.adonisjs/server/routes.d.ts`

- [ ] **Step 1: Regenerate AdonisJS route types**

```bash
node ace generate:types
```

Expected: `.adonisjs/server/routes.d.ts` updates with the new `/api/v1/...` route names. No errors.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 3: Run full test suite one last time**

```bash
node ace test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add .adonisjs/
git commit -m "chore: regenerate route types after /api/v1 migration"
```

---

## Future convention (reference only — not part of this plan)

When adding a v2 route or module:

1. Create `routes.v2.ts` in the module with only the changed route(s)
2. Add to `start/routes.ts`:

```typescript
router.group(() => {
  // v2 overrides first — AdonisJS matches in registration order
  import('../app/modules/dogs/infrastructure/http/routes.v2.js')
  // v1 fallback for unchanged routes
  import('../app/modules/dogs/infrastructure/http/routes.v1.js')
}).prefix('/api/v2')
```
