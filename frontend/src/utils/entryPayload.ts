import type { CardEntryData, CreateEntryRequest, TestEntryFormData } from '../types/cqm';

/**
 * Building blocks for saving test-entry form state to the server
 * (POST /test-entries/bulk). Shared by the session hub's Save Draft
 * (QualityTestDataEntry) and the per-test save on TestEntryPage so the
 * packing rules — especially which custom per-card fields survive a
 * save/restore cycle via multiValueNotes — live in exactly one place.
 */

export type EntryPayload = Omit<CreateEntryRequest, 'sessionId'> & {
  sampleCardId?: number;
  secondaryMeasurementValue?: number;
};

/** Pack one card row of a per-card test into a bulk-save payload item. */
export function packCardEntry(
  e: TestEntryFormData,
  ce: CardEntryData,
  sampleCardId: number | undefined,
): EntryPayload {
  // Custom per-card fields ride along in multiValueNotes so they survive a
  // save/restore cycle (TestEntryPage restores them from multi_value_notes).
  const custom: Record<string, unknown> = {};
  if (ce.widthMm !== undefined && ce.widthMm !== '') custom.widthMm = ce.widthMm;
  if (ce.heightMm !== undefined && ce.heightMm !== '') custom.heightMm = ce.heightMm;
  if (ce.punchPosition) custom.punchPosition = ce.punchPosition;
  if (ce.cornerA) custom.cornerA = ce.cornerA;
  if (ce.cornerB) custom.cornerB = ce.cornerB;
  if (ce.cornerC) custom.cornerC = ce.cornerC;
  if (ce.cornerD) custom.cornerD = ce.cornerD;
  if (ce.cornerAExtent) custom.cornerAExtent = ce.cornerAExtent;
  if (ce.cornerBExtent) custom.cornerBExtent = ce.cornerBExtent;
  if (ce.cornerCExtent) custom.cornerCExtent = ce.cornerCExtent;
  if (ce.cornerDExtent) custom.cornerDExtent = ce.cornerDExtent;
  if (ce.coreDelamination !== undefined) custom.coreDelamination = ce.coreDelamination;
  if (ce.visualNote) custom.visualNote = ce.visualNote;

  return {
    testDefinitionId: e.testDefinitionId,
    sampleCardId,
    measurementValue: typeof ce.measurementValue === 'number' ? ce.measurementValue : undefined,
    secondaryMeasurementValue: ce.secondaryMeasurementValue ?? undefined,
    assessmentValue: ce.assessmentValue,
    passStatus: ce.passStatus,
    notes: ce.notes,
    retestRequired: ce.retestRequired,
    multiValueNotes: Object.keys(custom).length > 0 ? JSON.stringify(custom) : undefined,
  };
}

/** Pack a session-level (non-per-card) test into a bulk-save payload item. */
export function packSessionEntry(e: TestEntryFormData): EntryPayload {
  return {
    testDefinitionId: e.testDefinitionId,
    sampleCardId: undefined,
    measurementValue: typeof e.measurementValue === 'number' ? e.measurementValue : undefined,
    assessmentValue: e.assessmentValue,
    passStatus: e.passStatus,
    notes: e.notes,
    retestRequired: e.retestRequired,
  };
}

/** Pack a whole form entry (per-card or session-level) given a card_number → id map. */
export function packEntry(
  e: TestEntryFormData,
  cardIdByNumber: Map<number, number>,
): EntryPayload[] {
  if (e.isPerCard && e.cardEntries && e.cardEntries.length > 0) {
    return e.cardEntries.map(ce => packCardEntry(e, ce, cardIdByNumber.get(ce.cardNumber)));
  }
  return [packSessionEntry(e)];
}
