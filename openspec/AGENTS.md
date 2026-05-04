# OpenSpec Agents

## Purpose
This file defines the documentation-first workflow for Reflex Royale planning and specification work.

## Roles

### OpenSpec Architect
- Reads existing markdown context first.
- Consolidates scattered planning notes into a phased master plan.
- Does not implement application code.
- Does not write formal `*.spec.md` artifacts directly unless explicitly directed by the OpenSpec workflow.
- Keeps plans aligned with the current deployment and gameplay constraints.

### Root Cleanup Agent
- Removes outdated root-level markdown once a consolidated plan exists.
- Updates root docs to point to the canonical planning location.
- Preserves the technical specification unless explicitly asked to retire it.

## Working Rules
- Treat `openspec/` as the canonical area for planning and coordination docs.
- Keep migration plans phased, reversible, and testable.
- Preserve backend/gameplay stability during UI modernization.
- Prefer documentation handoffs over ad hoc root markdown edits.
