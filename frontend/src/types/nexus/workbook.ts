import type {
  Conformity, NexusAuditRecord, NexusProcessStepAssessment,
  NexusProductScope, NexusQmsAssessment, ProductCategory,
} from './index';

export interface ChapterProgress { done: number; total: number }

export type StepSection = 'process' | 'qualification' | 'product';

export interface WorkbookStepRow extends NexusProcessStepAssessment {
  section: StepSection;
  vendor_compliance?: string;
  vendor_process_spec_ref?: string;
  vendor_control_plan_ref?: string;
  production_equipment?: string;
  test_equipment?: string;
  auditor_notes?: string;
}

export type WorkbookChapter =
  | { key: 'site-profile'; kind: 'site-profile'; title: string; progress: ChapterProgress }
  | { key: 'scope'; kind: 'scope'; title: string; scopes: NexusProductScope[]; progress: ChapterProgress }
  | { key: 'qms'; kind: 'qms'; title: string; rows: NexusQmsAssessment[]; progress: ChapterProgress }
  | { key: string; kind: 'category'; category: ProductCategory; scopeId: number; title: string; rows: WorkbookStepRow[]; progress: ChapterProgress }
  | { key: 'readiness'; kind: 'readiness'; title: string; progress: null };

export interface CapaBadge { id: number; action_id: string; status: string; severity?: string; count?: number }

export interface ScopeCatalogVariant { label: string; primary?: boolean }
export type ScopeCatalog = Record<string, { label: string; variants: ScopeCatalogVariant[] }>;

export interface WorkbookData {
  audit: NexusAuditRecord;
  chapters: WorkbookChapter[];
  capas: Record<string, CapaBadge>;           // "qms:<id>" | "process-step:<id>"
  testEvidenceTags: string[];
  scopeCatalog: ScopeCatalog;
}

export interface ConformitySummary {
  counts: Record<Conformity, number>;
  total: number;
  assessed: number;
  pct: Record<Exclude<Conformity, 'n/a'>, number | null>;
  complete: boolean;
}

export interface GateState { hasPlan: boolean; planId?: number; passed: boolean; conditions: { label: string; passed: boolean; detail: string | null }[] }

export interface ReadinessCategory {
  category: ProductCategory; scopeId: number; label: string;
  currentRank: string | null;
  summary: ConformitySummary; rankSuggestion: 'A' | 'B' | 'C' | 'D' | null;
  gate: GateState;
}

export interface ReadinessBlocker {
  type: 'finding' | 'gate' | 'unassessed';
  chapterKey: string; tag: string | null; title: string; detail: string | null;
}

export interface ReadinessSnapshot {
  qms: { summary: ConformitySummary };
  categories: { category: string; summary: ConformitySummary; rankSuggestion: string | null }[];
  blockerCount: number;
}

export interface ReadinessData {
  qms: { summary: ConformitySummary; rankSuggestion: 'A' | 'B' | 'C' | 'D' | null };
  categories: ReadinessCategory[];
  blockers: ReadinessBlocker[];
  overall: { complete: boolean; worstRank: string | null };
  previous: ReadinessSnapshot | null;
  previousAt: string | null;
}
