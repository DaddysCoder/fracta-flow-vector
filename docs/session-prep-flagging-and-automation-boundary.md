# Session Prep, Flagging, and the Automation Boundary

**Companion to:** `01-evidence-base-review.md`, `02-library-entry-schema.md` (not yet
in this repo — referenced by this document but not supplied).

**Question this answers:** in the 30-minute session-prep loop — review last session,
reported data and incidents, plan the next — what can a tool safely flag automatically,
what can it use to suggest a decision, and where is the line.

**Headline answer:** there is a real, well-evidenced difference between *surfacing a
fact* and *suggesting a response to it*. Everything defensible in this document sits on
the fact side. The Commission's own April 2026 guidance gives an actual list of facts
worth flagging — not invented, not inferred, theirs. Nothing in this research supports
building anything on the suggestion side, and two independent literatures explain why.

This document is about a not-yet-built feature (session preparation / progress review,
downstream of the forms this repo currently builds). It is saved here because it
directly reinforces two standing constraints already in force in this repo: **no AI,
model call, or network request anywhere in the product**, and **no scoring or
interpretation of a respondent's answers**. Treat it as citation-backed justification
for those constraints, not as a spec to implement yet.

## 1. The Commission just published the flag list

NDIS Q&S Commission, *Behaviour Support Assessment, including Functional Behaviour
Assessment: Practice Guide*, Version 1.0, April 2026 (supersedes the May 2025 policy
guidance of the same name; sits alongside *Evidence Matters*; released CC BY 4.0 —
attribution only, commercial use and adaptation both permitted).

Section 18, "Frequency of assessment": assessment should be revisited "every 12
months, or sooner if there is a change in circumstances." Explicit indicators that an
assessment should occur:

- new risks of harm to the person or others are identified and need to be prioritised;
- a change in the person's living arrangements or personal/environmental context that
  requires the behaviour support plan to be reviewed and amended; and
- no change in outcome measures (quality of life, behaviours of concern, goal
  attainment, therapeutic-related measures, reduction/elimination of restrictive
  practices).

That third indicator is followed by a chain of clinical questions the Commission
explicitly does **not** answer for the practitioner (is the function accurately
identified, have needs been understood, were environmental strategies implemented
effectively, is there an error in the replacement behaviour, is the plan being
implemented as described). **The absence of change is a fact a computer can detect.
The reason for the absence of change is a five-way differential a computer must never
answer.**

Two more citable points from the same guide:

- "Behaviour support assessments are dynamic and subject to change over time, as more
  information is obtained to confirm or challenge working hypotheses" — a formulation
  is never locked in and re-applied; it's a candidate for review every time new data
  lands.
- The AI section names "automated decision-making without appropriate human oversight
  or the application of clinical judgement" as a risk — oversight and judgement as two
  separate, both-required things. A flag with no interpretation attached provides
  neither; a flag is not decision-making. A ranked suggestion is.

## 2. A second, harder trigger — a legal duty, not a heuristic

Under the *NDIS (Restrictive Practices and Behaviour Support) Rules 2018*: an
implementing provider must notify the specialist behaviour support provider when
something happens that requires the plan to be reviewed. Separately, unauthorised use
of a restrictive practice is a reportable incident, and the implementing provider must
notify the Commission within 5 business days.

This means: (1) this trigger already exists in the workflow and is owed to the
practitioner by someone else — a tool's job is at most to make sure it's visible, not
to detect it; (2) it sets the tone for what "flagging" should feel like — a
compliance-grade notification, worded as a fact, never as a recommendation.

## 3. What data-based decision-making research says about automating "is this working"

- Visual analysis of session-by-session data has documented interrater agreement of
  roughly 60–75% among trained behaviour analysts (DeProspero & Cohen, 1979; Fisher,
  Kelley & Lomas, 2003; Ninci et al., 2015) — trained professionals often disagree, so
  no automated rule should be positioned as more authoritative than the practitioner's
  own read.
- Structured aids built to improve consistency — split-middle (White & Haring, 1980),
  dual-criteria/conservative dual-criteria (Fisher, Kelley & Lomas, 2003; replicated by
  Falligant et al., 2020 x2) — are consistently framed by their own authors as aids to
  visual inspection, not replacements for it. Kratochwill et al. (2010, What Works
  Clearinghouse) treats visual analysis as a judgement across five dimensions (level,
  trend, variability, overlap, immediacy); structured methods support one or two of
  the five at most.
- Even DC/CDC has a non-trivial false-positive rate on real (non-experimental)
  baseline data (Falligant et al., 2020).

**Verdict:** computing a trend line is defensible arithmetic (public-domain, published
method, a citable "surface the fact" flag). Labelling that trend line's meaning ("this
strategy is/isn't working") is not — that step is exactly what the reliability
literature says trained professionals get wrong a quarter to two-fifths of the time.

## 4. Automation bias — an interface concern, not just a content one

Independent of PBS-specific research: automation bias is the tendency of a competent
professional to defer to a system's output even when it's wrong, and it is worse when
domain knowledge or time is reduced (directly relevant to a practitioner doing 30
minutes of prep at the end of a long day). Design mitigators from the systematic-review
literature:

1. **No ranked lists.** A list sorted by "most concerning" is a recommendation wearing
   a UI costume. Present flags as an unordered checklist, or ordered only by something
   inarguable like chronology.
2. **No verbs that imply the tool has an opinion.** "Declining trend since 12 Feb" —
   yes. "Deteriorating — review recommended" — no.
3. **Every flag requires the practitioner to write a sentence before it disappears**
   from the prep view — not a checkbox. "Reviewed — no change needed because [x]" is a
   valid closure, exactly as easy to select as "actioned." The articulation is the
   intervention that interrupts automatic deference.
4. **No confidence scores, percentages, or severity ratings on flags** — exactly what
   the CDSS literature flags as increasing deference, with no validated basis to
   assign one here (see §3).

## 5. What a session-prep flag list can actually contain

Grounded entirely in things already documented as legitimate review triggers or
already collected in practice — nothing invented:

- **Elapsed-time** (pure arithmetic against dates on file): days since target
  behaviour data last logged; days since this strategy was last reviewed against the
  12-month/sooner-if-changed rule; days until the plan's mandatory annual review.
- **Threshold** (arithmetic against a practitioner-set baseline — the baseline is
  clinical, the comparison is not): no change in a logged outcome measure across a
  practitioner-defined window (the Commission's own indicator); a trend-line
  computation, rendered with its method named.
- **Fact-of-occurrence** (presence/absence, not interpretation): a reportable incident
  or unauthorised RP use logged since last session (surfaced, not detected); a change
  logged to living arrangement, staffing, or environment; early warning signs reported
  at a materially different rate than the logged baseline.

**Explicitly excluded:** any flag naming a candidate cause or candidate action, any
flag that ranks or scores severity, any flag synthesising more than one data source
into a single interpretive statement — synthesis is formulation, and formulation is
the practitioner's act by definition.

## 6. PBSP-QA — a newer instrument, and a licence trap

*Positive Behaviour Support Plan Quality Assessment* (PBSP-QA; Vassos & Nankervis,
2025, University of Queensland, funded by the NDIS Commission) is the instrument the
April 2026 practice guide cites for levels of participant inclusion (informing /
consultation / co-production / co-creation — a useful spectrum for a
`participant_involvement_level` field). **Licence: CC BY-NC-ND 4.0** — non-commercial,
no derivatives, and only UQ may provide training in its use. Do not build a
"score your plan against PBSP-QA" feature, reproduce/adapt its 43 items, or reference
its domain structure as though it were open content. Citing its existence, authors,
purpose, and the *concept* of its domains (in original words) is the full extent of
safe use — the same treatment this repo's schema material already gives BSP-QEII.

## 7. A workflow shape, not a workflow tool

The practice guide's evidence-informed-practice model (adapted from Sackett et al.
1996) frames practice as the intersection of the person's rights/perspective, best
available research, professional expertise, and implementing-context information — four
inputs synthesised by one person. A prep view that surfaces the §5 flags alongside the
person's stated preferences and the implementer's reported context, **without
pre-synthesising them**, does exactly this and nothing more. The 4P formulation model
(Bolton, 2014) is a formulation-level tool for FBA/review time, not a 30-minute prep
checklist — don't shrink it into the session loop.

If this feature is ever built: build the flag surface (§5) with the interaction rules
in §4, and stop. The synthesis stays the practitioner's, every time, by design.

## 8. Reference list

- Bolton, J.W. (2014). Case formulation after Engel — the 4P model. *Philosophy,
  Psychiatry, & Psychology*, 21(3), 179–189.
- DeProspero, A. & Cohen, S. (1979). Inconsistent visual analyses of intrasubject
  data. *Journal of Applied Behavior Analysis*, 12, 573–579.
- Falligant, J.M. et al. (2020). Using dual-criteria methods to supplement visual
  inspection: replication and extension. *Journal of Applied Behavior Analysis*.
- Falligant, J.M. et al. (2020). Evaluating sources of baseline data using
  dual-criteria and conservative dual-criteria methods. *Journal of Applied Behavior
  Analysis*.
- Fisher, W.W., Kelley, M.E. & Lomas, J.E. (2003). Visual aids and structured criteria
  for improving visual inspection and interpretation of single-case designs. *Journal
  of Applied Behavior Analysis*, 36(3), 387–406.
- Kratochwill, T.R. et al. (2010). Single-case designs technical documentation. *What
  Works Clearinghouse*.
- NDIS Quality and Safeguards Commission (2026). *Behaviour Support Assessment,
  including Functional Behaviour Assessment: Practice Guide*, Version 1.0, April 2026.
- Ninci, J., Vannest, K.J., Willson, V. & Zhang, N. (2015). Interrater agreement
  between visual analysts of single-case data: a meta-analysis. *Behavior
  Modification*, 39(4), 510–541.
- Vassos, M. & Nankervis, K. (2025). The Positive Behaviour Support Plan Quality
  Assessment (PBSP-QA). University of Queensland. CC BY-NC-ND 4.0.
- White, O.R. & Haring, N.G. (1980). *Exceptional Teaching* (2nd ed.). Merrill.
- General automation-bias literature synthesised from secondary sources; primary
  citations (Cummings; Lyell & Coiera; Mosier & Manzey; Parasuraman & Mustapha) should
  be chased directly before quoting figures externally.
