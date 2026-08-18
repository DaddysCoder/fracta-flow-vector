import { registry } from "@pbs/registry";
import { describe, expect, it } from "vitest";
import { documentFields, quotedFields, reachability } from "../src/documentForm.js";
import {
  isRrpField,
  NO_RP_BSP_DOCUMENT_ID,
  noRpBspRenderedFields,
  RRP_FIELD_GROUPS,
} from "../src/plan.js";
import { toPathwayPermissions } from "../src/registryAdapter.js";

/**
 * MD-012: a No-RP plan contains no restrictive-practice content at all —
 * not a populated RRP section, not an empty one, not an "N/A" row.
 *
 * This is meant to hold structurally: the registry decides what reaches
 * document 07, via each field's `rendersIn` and `pathways`. These tests
 * fail loudly if that ever stops being true, rather than relying on a UI
 * component to filter RRP content out at render time.
 */
describe("Document 07 (No-RP BSP) contains no RRP content", () => {
  const rendered = noRpBspRenderedFields();

  it("renders at least something — otherwise this test would pass vacuously", () => {
    expect(rendered.length).toBeGreaterThan(0);
  });

  it("asks no field of its own that belongs to an RRP group", () => {
    expect(documentFields(NO_RP_BSP_DOCUMENT_ID).filter(isRrpField)).toEqual([]);
  });

  it("quotes no field that belongs to an RRP group", () => {
    expect(quotedFields(NO_RP_BSP_DOCUMENT_ID).filter(isRrpField).map((f) => f.id)).toEqual([]);
  });

  it("renders no field whose id is namespaced rrp.* or interim.*", () => {
    const leaked = rendered.filter((f) => f.id.startsWith("rrp.") || f.id.startsWith("interim."));
    expect(leaked.map((f) => f.id)).toEqual([]);
  });

  it("renders no field belonging to any RRP field group", () => {
    const leaked = rendered.filter((f) => RRP_FIELD_GROUPS.includes(f.group ?? ""));
    expect(leaked.map((f) => f.id)).toEqual([]);
  });

  it("renders only fields the registry marks as usable on the no_rp pathway", () => {
    const wrongPathway = rendered.filter((f) => !f.pathways.includes("no_rp"));
    expect(wrongPathway.map((f) => f.id)).toEqual([]);
  });

  it("has no section reachable only from RRP-namespaced fields", () => {
    // Every rrp.*/interim.* field in the whole registry: none of them may
    // name a 07.x section anywhere in rendersIn or informs.
    const sections = new Set(registry.documents[NO_RP_BSP_DOCUMENT_ID]!.sections.map((s) => s.id));
    const offenders = registry.fields
      .filter((f) => isRrpField(f))
      .filter((f) => [...f.rendersIn, ...f.informs].some((target) => sections.has(target)));
    expect(offenders.map((f) => f.id)).toEqual([]);
  });
});

describe("pathway reachability comes from the registry, not a three-way switch", () => {
  it("no_rp permits 01-07 and forbids both RRP plans", () => {
    const permissions = { ...toPathwayPermissions("none"), blocks: [] as string[] };
    for (const id of ["01", "02", "03", "04", "05", "06", "07"]) {
      expect(reachability(id, permissions)).toBe("permitted");
    }
    expect(reachability("08", permissions)).toBe("forbidden");
    expect(reachability("09", permissions)).toBe("forbidden");
  });

  it("possible_unclear blocks 06 and 07 pending classification review, and forbids 08", () => {
    const state = toPathwayPermissions("possible_unclear");
    const permissions = { permits: state.permits, forbids: state.forbids, blocks: state.blocks ?? [] };
    expect(reachability("06", permissions)).toBe("blocked");
    expect(reachability("07", permissions)).toBe("blocked");
    expect(reachability("08", permissions)).toBe("forbidden");
    // Not named at all by this classification — withheld, never silently allowed.
    expect(reachability("09", permissions)).toBe("blocked");
  });

  it("confirmed permits 06/08/09 and forbids the No-RP plan outright", () => {
    const state = toPathwayPermissions("confirmed");
    const permissions = { permits: state.permits, forbids: state.forbids, blocks: state.blocks ?? [] };
    expect(reachability("06", permissions)).toBe("permitted");
    expect(reachability("08", permissions)).toBe("permitted");
    expect(reachability("09", permissions)).toBe("permitted");
    expect(reachability("07", permissions)).toBe("forbidden");
  });
});
