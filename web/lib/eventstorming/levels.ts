// The three Event Storming levels. A level is a view filter over the same model:
// switching level shows/hides element types (and their bands), it never deletes
// anything. Types are cumulative Big Picture ⊂ Process ⊂ Design.

import type { ElementType } from "./elements";

export const LEVELS = ["big-picture", "process", "design"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABEL: Record<Level, string> = {
  "big-picture": "Big Picture",
  process: "Process",
  design: "Design",
};

export const LEVEL_TYPES: Record<Level, ElementType[]> = {
  "big-picture": ["actor", "externalSystem", "domainEvent", "hotspot"],
  process: ["actor", "externalSystem", "command", "domainEvent", "policy", "readModel", "hotspot"],
  design: [
    "actor",
    "externalSystem",
    "command",
    "aggregate",
    "domainEvent",
    "policy",
    "readModel",
    "hotspot",
  ],
};

export const isVisibleAt = (level: Level, type: ElementType): boolean =>
  LEVEL_TYPES[level].includes(type);
