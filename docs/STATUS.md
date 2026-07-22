# Status

Current milestone: first real PBIR generation spike accepted for this stage after independent Windows testing confirmed project opening and recognition of the generated page, visuals, and semantic model without corruption or repair.

Implemented: secure Electron shell, React status UI, strict workspace configuration, runtime-validated domain seed, automated quality workflow, and truthful documentation baseline.

Spike-only implementation: immutable known-valid fixture, minimum TMDL inventory, disposable copy, verified backup, PBIR page/card/chart/slicer authoring, reference checks, official CLI validation, and evidence manifests.

Windows limitation for PBIR: fixture-wide data retrieval failed on both the generated page and original Page 1, so populated rendering, interactive filtering, and visual quality remain unverified.

Current RDL result: **FAILED**. Although `Regional Sales Detail.rdl` passed XML well-formedness and the existing XSD validation, independent Windows testing produced an `ArgumentOutOfRangeException` while Report Builder attempted to open it. Design and Preview were not reached; embedded data execution and PDF/Excel export were not tested. The generation mechanism is not proven, and the spike must not merge.

Candidates 01, 02, and 03b are functionally accepted; Candidates 03 and 04 are rejected and preserved. Candidate 04 passed XML, XSD, static validation, and the post-policy artifact checksum but failed during Report Builder open before Design view, so subtotal execution was not tested. Three-way evidence now distinguishes its merged body subtotal row from Report Builder's unmerged cells and row-hierarchy subtotal header without claiming a root cause. The next subtotal control must be byte-identical to `KnownGoodRegionSubtotal.rdl`. The branch remains unmerged and untagged.
