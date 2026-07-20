// Event Storming element types (canvas node types) and their sticky-note colors.
// Colors follow the ddd-crew convention; elements are also distinguishable by
// label/icon, not color alone.

export const ELEMENT_TYPES = [
  "domainEvent",
  "command",
  "actor",
  "aggregate",
  "policy",
  "readModel",
  "externalSystem",
  "hotspot",
] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];

export interface ElementDefinition {
  type: ElementType;
  label: string;
  color: string;
}

export const ELEMENT_DEFINITIONS: Record<ElementType, ElementDefinition> = {
  domainEvent: { type: "domainEvent", label: "Domain Event", color: "#F6A623" },
  command: { type: "command", label: "Command", color: "#4A90E2" },
  actor: { type: "actor", label: "Actor", color: "#F8E71C" },
  aggregate: { type: "aggregate", label: "Aggregate", color: "#F5D76E" },
  policy: { type: "policy", label: "Policy", color: "#B39DDB" },
  readModel: { type: "readModel", label: "Read Model", color: "#7ED321" },
  externalSystem: { type: "externalSystem", label: "External System", color: "#F48FB1" },
  hotspot: { type: "hotspot", label: "Hotspot", color: "#FF4081" },
};

// Fixed row-bands, top→bottom. Actors and External Systems share the top band.
export const BAND_ORDER = [
  "actorSystem",
  "command",
  "aggregate",
  "domainEvent",
  "policy",
  "readModel",
  "hotspot",
] as const;

export type Band = (typeof BAND_ORDER)[number];

export const ELEMENT_BAND: Record<ElementType, Band> = {
  actor: "actorSystem",
  externalSystem: "actorSystem",
  command: "command",
  aggregate: "aggregate",
  domainEvent: "domainEvent",
  policy: "policy",
  readModel: "readModel",
  hotspot: "hotspot",
};

export const bandIndex = (type: ElementType): number =>
  BAND_ORDER.indexOf(ELEMENT_BAND[type]);
