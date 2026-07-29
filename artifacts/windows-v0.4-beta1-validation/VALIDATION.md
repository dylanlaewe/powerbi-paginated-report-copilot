# Power BI RDL Copilot v0.4.0-beta.1 Windows validation

This is an unsigned beta for Dylan's personally controlled Windows 11 VM. Do
not bypass managed-device security policy. Use a personal Anthropic API key and
only the bundled synthetic/public fixtures.

## Setup and integrity

1. Extract the ZIP into a Windows-local folder.
2. Verify every entry in `SHA256SUMS.txt` with `Get-FileHash -Algorithm SHA256`.
3. Launch `Power-BI-RDL-Copilot-0.4.0-beta.1-windows-x64-portable.exe`.
4. In AI settings, confirm the model is `claude-sonnet-5`.
5. Read and acknowledge the privacy disclosure. Only the typed request and
   limited field/title/page-capability metadata are sent to Anthropic. Raw RDL
   XML, rows, queries, connection strings, credentials, paths, candidate IDs,
   and mutation targets are not sent.
6. Enter the API key. If secure persistence is available, the app may encrypt
   it with Windows secure storage; otherwise it must remain session-only.
7. Click **Test connection** and record the result. Clear and re-enter the key
   once to verify both controls.

## Planner routing

1. In **Deterministic only**, use a canonical v0.3 sentence and confirm the
   plan source is Deterministic and no Anthropic request is required.
2. In **Smart**, repeat that canonical sentence and confirm deterministic
   parsing still wins.
3. Use each paraphrased request below in Smart mode. Confirm the plan source is
   Claude when the deterministic parser cannot completely handle it.
4. Confirm operation review still appears and no output exists until every
   exact candidate decision is confirmed.

## Corpus scenarios

### Simple table

Input: `inputs\synthetic-inventory-detail.rdl`

Request:

```text
Rename this report to Quarterly Inventory Detail, make the heading 20-point bold, and show UnitCost as whole-dollar currency.
```

Confirm the existing title ambiguity and unique UnitCost resolution remain,
select the intended title candidate, confirm all operations, create a reviewed
copy, then open/Preview/export PDF and Excel in Report Builder.

### Grouped report

Input: `inputs\synthetic-department-sales.rdl`

Request:

```text
Call this Quarterly Department Sales and show Revenue as currency without cents.
```

Confirm the title resolution and three-way Revenue detail/subtotal/Grand Total
choice remain. Select all three Revenue candidates, create the reviewed copy,
and validate Preview/PDF/Excel.

### Microsoft Invoice

Input: `inputs\Invoice.rdl`

Request:

```text
Show Quantity as a whole number.
```

Confirm the unique Quantity candidate, create the reviewed copy, and validate
Preview/PDF/Excel using only embedded sample data. Do not connect externally or
provide credentials.

### Microsoft Transcript

Input: `inputs\Transcript.rdl`

Request:

```text
Rename this Professional Certification Transcript and make the title 20-point bold.
```

Confirm the page-header title candidate, create the reviewed copy, and validate
Preview/PDF/Excel using only embedded sample data.

## Non-executable outcomes

With Invoice selected, submit:

```text
Add a chart to Invoice
```

Expected: **Unsupported request**, no review draft, no output.

Then submit:

```text
Make this report better
```

Expected: **Clarification needed** with one concise question, no review draft,
no output.

Disconnect networking and submit an LLM-only paraphrase. Expected: structured
Provider unavailable state, request text preserved, retry available, no review
or output. Deterministic-only planning must remain usable.

## Return

For every scenario record app result, plan source, review behavior, original
hash, manifest, Report Builder open/Preview, PDF, Excel, exact page/worksheet
counts, and every warning/error. Manual results are intentionally absent from
this package.
