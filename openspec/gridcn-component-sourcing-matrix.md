# GridCN Component Sourcing Matrix

## Batch A (Primitives)

## `Button`
- Local file: `src/components/ui/button.tsx`
- Source reference: `thegridcn-ui/src/components/ui/button.tsx`
- Status: adapted from source pattern
- Notes:
  - Kept `Slot`, `cva`, `VariantProps`, `size` and `variant` API shape.
  - Replaced semantic color classes with explicit classes compatible with current token baseline.

## `Card`
- Local file: `src/components/ui/card.tsx`
- Source reference: `thegridcn-ui/src/components/ui/card.tsx`
- Status: adapted from source pattern
- Notes:
  - Added GridCN/shadcn slot structure: `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`.
  - Kept class structure close to source, with minor color adjustments.

## `Input`
- Local file: `src/components/ui/input.tsx`
- Source reference: `thegridcn-ui/src/components/ui/input.tsx`
- Status: adapted from source pattern
- Notes:
  - Kept source API and data-slot shape.
  - Preserved focus/invalid-state behavior pattern.

## `Badge`
- Local file: `src/components/ui/badge.tsx`
- Source reference: `thegridcn-ui/src/components/ui/badge.tsx`
- Status: adapted from source pattern
- Notes:
  - Kept `Slot`, `cva`, `VariantProps`, variant model, and slot contract.
  - Replaced semantic palette classes with explicit compatible classes.

## Non-functional compatibility fix
- Local file: `server.js`
- Change: added `/ui-lab` to Next route proxy list.
- Reason: route was not forwarded to Next handler in custom server mode.

## Batch B (Primitives)

## `Table`
- Local file: `src/components/ui/table.tsx`
- Source reference: `thegridcn-ui/src/components/ui/table.tsx`
- Status: adapted from source pattern
- Notes:
  - Preserved slot-level API (`TableHeader`, `TableBody`, `TableRow`, etc.).
  - Adapted visual classes to current token baseline.

## `Dropdown Menu`
- Local file: `src/components/ui/dropdown-menu.tsx`
- Source reference: `thegridcn-ui/src/components/ui/dropdown-menu.tsx`
- Status: adapted from source pattern
- Notes:
  - Preserved Radix structure and item variants.
  - Retained keyboard/accessibility behavior from Radix primitives.

## `Dialog`
- Local file: `src/components/ui/dialog.tsx`
- Source reference: `thegridcn-ui/src/components/ui/dialog.tsx`
- Status: adapted from source pattern
- Notes:
  - Preserved `DialogTrigger`, `DialogContent`, `DialogHeader/Footer`, and close behavior.
  - Adapted visual classes to current dark baseline.

## `Toast`
- Local file: `src/components/ui/toast.tsx`
- Source reference: `thegridcn-ui/src/components/thegridcn/toast.tsx`
- Status: adapted from source pattern
- Notes:
  - Preserved provider/hook model (`ToastProvider`, `useToast`).
  - Kept lightweight in-app stack (no external toaster dependency).

## UI Lab runtime stabilization (2026-04-28)
- Local file: `server.js`
- Source reference: N/A (custom Express + Next bridge)
- Status: compatibility fix
- Notes:
  - Added `/static` passthrough to Next request handler when `useNextFrontend` is enabled.
  - Fixes missing dev chunks/CSS that prevented `/ui-lab` from rendering styled output.

- Local file: `next.config.js`
- Source reference: N/A (Next runtime hardening)
- Status: compatibility fix
- Notes:
  - Restored dev webpack cache disable (`config.cache = false`) to reduce recurring Windows dev chunk/cache corruption.

- Local files: `src/app/ui-lab/page.tsx`, `public/ui-lab.css`
- Source reference: GridCN primitives remain sourced in component files listed above.
- Status: compatibility fallback
- Notes:
  - Added a direct stylesheet link (`/ui-lab.css`) on the `/ui-lab` page to avoid dependence on failing dev CSS chunk resolution.
  - Added a CSS sentinel badge so style pipeline success/failure is immediately visible.

## Rollback reimplementation note
- If styles disappear again after rollback, reapply these three items together:
  - `server.js`: keep `/static` proxied to Next request handler in Next frontend mode.
  - `next.config.js`: keep dev webpack cache disabled (`config.cache = false`).
  - `src/app/ui-lab/page.tsx` + `public/ui-lab.css`: keep explicit `/ui-lab.css` link fallback and sentinel badge.

## UI Lab direct GridCN sourcing pass (2026-04-28)
- Source repo: `https://github.com/educlopez/thegridcn-ui` (branch `main`)
- Scope: UI Lab primitives only (no page migrations outside `/ui-lab`).
- Registry namespace configured in `components.json` as `@thegridcn`.
- Direct CLI sourcing executed successfully after environment patch:
  - `npx shadcn@latest add @thegridcn/button @thegridcn/card @thegridcn/input @thegridcn/badge @thegridcn/table @thegridcn/dropdown-menu @thegridcn/dialog @thegridcn/toast -y`
- CLI generated canonical component files under `src/components/*`.
- `/ui-lab` now imports directly from those generated files (not local re-skins).
- Added Tron-flavored validation component via CLI:
  - `npx shadcn@latest add @thegridcn/data-card -y`
- Anti-drift alignment:
  - `src/components/ui/*` primitive files are now thin re-export shims to `src/components/*` CLI-generated sources.
  - Prevents accidental divergence between legacy import paths and GridCN-generated files.

### `Button`
- Local file: `src/components/button.tsx`
- Source reference: `@thegridcn/button` registry item
- Status: CLI-generated verbatim.

### `Card`
- Local file: `src/components/card.tsx`
- Source reference: `@thegridcn/card` registry item
- Status: CLI-generated verbatim.

### `Input`
- Local file: `src/components/input.tsx`
- Source reference: `@thegridcn/input` registry item
- Status: CLI-generated verbatim.

### `Badge`
- Local file: `src/components/badge.tsx`
- Source reference: `@thegridcn/badge` registry item
- Status: CLI-generated verbatim.

### `Table`
- Local file: `src/components/table.tsx`
- Source reference: `@thegridcn/table` registry item
- Status: CLI-generated verbatim.

### `Dropdown Menu`
- Local file: `src/components/dropdown-menu.tsx`
- Source reference: `@thegridcn/dropdown-menu` registry item
- Status: CLI-generated verbatim.

### `Dialog`
- Local file: `src/components/dialog.tsx`
- Source reference: `@thegridcn/dialog` registry item
- Status: CLI-generated verbatim.

### `Toast`
- Local file: `src/components/toast.tsx`
- Source reference: `@thegridcn/toast` registry item
- Status: CLI-generated verbatim.
- Compatibility note: `src/components/ui/toast.tsx` remains a thin re-export shim for backward compatibility, but `/ui-lab` imports from `src/components/toast.tsx` directly.

### `Data Card` (Tron-flavored)
- Local file: `src/components/data-card.tsx`
- Source reference: `@thegridcn/data-card` registry item
- Status: CLI-generated verbatim.
- Usage: rendered on `/ui-lab` to validate non-base GridCN visual language.
