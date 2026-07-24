# Target Resolution Design

## v0.3 Gate 1 evidence model

No resolver behavior changes in Gate 1. This document defines evidence to measure before implementation.

### Title evidence

Candidate evidence may include:

- exact descriptive report-item name, when present
- one static text value with no field, parameter, or aggregate expression
- top-level containment or reviewed page-header placement
- position above tablixes
- font-size/weight prominence and report-width placement
- absence from tablix header, group label, parameter prompt, and footer roles
- lack of repetition that indicates a page label rather than report title

The future resolver must return one title only above a documented confidence threshold. Ranked evidence must be visible. Ties, insufficient evidence, and missing candidates reject.

Page-header placement is not automatically a title: Gate 4 must distinguish the alternate-layout title from footer text and ordinary repeated header labels.

### Field-display evidence

Candidate evidence may include:

- exact `Fields!Name.Value` expression
- recognized aggregate expression
- declaring dataset and tablix dataset scope
- tablix membership
- row/group hierarchy position
- detail, group-subtotal, or grand-total scope
- existing format
- exclusion of static labels and unrelated expressions

Target count is fixture-specific. The grouped fixture anticipates three Revenue displays; simple table anticipates one UnitCost display; parameterized anticipates two BudgetAmount displays; alternate layout anticipates two Cost displays across two tablixes.

Duplicate field declarations across datasets are ambiguous unless dataset and tablix evidence uniquely bind the request. Ambiguity must never be resolved by array order.

### Optional profiles

A future profile may be used only if general evidence cannot safely resolve a reviewed structure. It must be strict, declarative, runtime-validated, evidence-based, and reported in validation output. It may name expected report items and structural facts but may not contain XPath or suppress competing candidates.

The parameterized and alternate-layout fixtures are marked `profileReviewPending`; this is not authorization to add profiles before Gate 4.
