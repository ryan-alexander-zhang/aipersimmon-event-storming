// Turn a value-level ChangedNode (diff.ts) into display-ready strings for the
// compare diff: an inline struck-through old label, compact chips, and a full
// field-level detail string for the hover title (us-00023 FR-8/9 / design-00010).
// Context ids are resolved to names here because it needs both snapshots' contexts.

import type { ChangedNode } from "./diff";
import type { Context } from "./schema";

export interface DiffChange {
  /** Previous label, when the label changed (rendered struck-through). */
  renamedFrom?: string;
  /** Compact inline chips for non-label changes. */
  chips: string[];
  /** Full "field: before → after" lines, one per changed field (hover detail). */
  detail: string;
}

const MAX_CHIPS = 3;

const ctxName = (id: unknown, contexts: Context[]): string =>
  id == null || id === "" ? "Ungrouped" : (contexts.find((c) => c.id === id)?.name ?? String(id));

const val = (v: unknown): string => (v == null || v === "" ? "—" : String(v));

export function describeChange(
  changed: ChangedNode,
  baseContexts: Context[],
  targetContexts: Context[],
): DiffChange {
  const chips: string[] = [];
  const detail: string[] = [];
  let renamedFrom: string | undefined;

  for (const f of changed.fields) {
    switch (f.field) {
      case "label":
        renamedFrom = String(f.before);
        detail.push(`label: ${f.before} → ${f.after}`);
        break;
      case "order": {
        const later = Number(f.after) > Number(f.before);
        chips.push(later ? "➡ later" : "⬅ earlier");
        detail.push(`order: moved ${later ? "later" : "earlier"}`);
        break;
      }
      case "context": {
        chips.push("context ✎");
        detail.push(`context: ${ctxName(f.before, baseContexts)} → ${ctxName(f.after, targetContexts)}`);
        break;
      }
      case "pivotal":
        chips.push(f.after ? "★ set" : "★ cleared");
        detail.push(`pivotal: ${f.before ? "yes" : "no"} → ${f.after ? "yes" : "no"}`);
        break;
      case "description":
        chips.push("description ✎");
        detail.push(`description: ${val(f.before)} → ${val(f.after)}`);
        break;
      default: // state / kind / priority — short enums fit inline
        chips.push(`${f.field}: ${val(f.before)} → ${val(f.after)}`);
        detail.push(`${f.field}: ${val(f.before)} → ${val(f.after)}`);
    }
  }

  const shown = chips.length > MAX_CHIPS ? [...chips.slice(0, MAX_CHIPS), `+${chips.length - MAX_CHIPS}`] : chips;
  return { renamedFrom, chips: shown, detail: detail.join("\n") };
}
