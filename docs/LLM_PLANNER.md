# Optional LLM planner v0.4 beta

The v0.4 beta adds a provider-neutral `LlmPlannerProvider` before the existing
v0.3 resolution, review, and mutation pipeline. `AnthropicPlannerProvider` is
the first adapter and uses the official `@anthropic-ai/sdk` version `0.115.0`
with the Messages API.

## Model and provider

The default model is `claude-sonnet-5`. Anthropic documents it as the current
Sonnet API model and a pinned model ID rather than an evergreen alias. Users
may override it in application settings or with `ANTHROPIC_MODEL`. Model
identity is never mutation authority and is not written into manifests.

## Planning contract

Claude must call exactly one client tool, `submit_planning_result`. Its strict
input is `planned` with the existing `EditPlan`, `unsupported` with a stable
reason and fragments, or `clarificationRequired` with one concise question.
Text-only, missing, multiple, unknown, malformed, extra-property, unknown
operation, invalid format, conflict, and truncated results fail closed. One
schema-correction retry may use validation feedback; no result is repaired by
guessing.

## Sanitized context and privacy

The provider receives only the typed request, operation contract, field names
with dataset-ambiguity flags, title capability, explicit/omitted page
capability, normalized orientation, format codes, and contract version.
Report-derived strings are delimited as untrusted data.

Raw XML, paths, rows/values, query text, connection strings, credentials,
images, candidate/diagnostic IDs, structural paths, writable targets, and
manifests are prohibited. Prompt/model bodies are not logged and there is no
telemetry. Before provider use, the UI requires acknowledgement that the typed
request and limited metadata go to Anthropic while prohibited content does not.

## API keys

`ANTHROPIC_API_KEY` is supported. A UI-submitted key stays in the main process;
the renderer receives only status. Optional persistence uses Electron
`safeStorage`; without encryption the key is session-only and plaintext
persistence is forbidden. Keys are excluded from logs, errors, manifests, and
evidence and can be updated, tested, and cleared.

## Routing and mutation boundary

Smart mode runs `LocalSentenceEditPlanner` first and calls Claude only when
local parsing cannot form a complete plan. Deterministic-only mode never calls
a provider.

```text
validated EditPlan
→ existing title/field resolution
→ operation-level review
→ exact user confirmation
→ single-use review-bound authorization
→ deterministic mutation
→ XML/XSD and structural validation
→ duplicate-safe copy and manifest
```

Claude receives no writable target and never confirms candidates.

## Errors, retry, timeout, and cancellation

Provider-neutral codes cover configuration, authentication, rate limit,
timeout, network/provider failure, invalid/multiple tool results, schema
failure, cancellation, unsupported work, and clarification. Failures retain the
request and create no partial review or output. Requests have a 30-second
timeout, bounded SDK retry, at most one schema correction, and explicit
cancellation.

Normal tests use fake providers/transports and make no live calls. The opt-in
sanitized smoke test is:

```sh
ANTHROPIC_API_KEY=... pnpm llm:smoke:anthropic
```

It exercises planned, unsupported, and clarification outcomes without printing
the key or report content. It is never part of the normal suite.

## Known beta limitations

Only v0.3 operations are available. There are no new fields, tablixes, charts,
parameters, groups, sorting, filters, dataset/query changes, arbitrary
expressions, code execution, Report Builder automation, cloud storage, or
telemetry. Orientation remains blocked for omitted dimensions. The Windows
beta executable is unsigned.

See `artifacts/windows-v0.4-beta1-validation/VALIDATION.md` for Windows testing.
