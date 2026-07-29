import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  ApplyEditResult,
  ExistingRdlSelectionResult,
  PlanEditResult,
  ReviewBundleResult,
  LlmSettings,
} from "../shared/desktop-api";
import "./style.css";

type View =
  | "empty"
  | "selecting"
  | "inspected"
  | "planning"
  | "rejected"
  | "ready"
  | "reviewingCandidates"
  | "candidateReview"
  | "applying"
  | "complete"
  | "error";

const canonicalExample =
  'Change the report title to "Weekly Sales Pipeline", make it 18-point bold, switch the page to landscape, and format Revenue as currency with no decimals.';

function App(): React.JSX.Element {
  const [view, setView] = useState<View>("empty");
  const [selection, setSelection] =
    useState<Extract<ExistingRdlSelectionResult, { status: "selected" }>>();
  const [request, setRequest] = useState("");
  const [plan, setPlan] =
    useState<Extract<PlanEditResult, { status: "planned" }>>();
  const [complete, setComplete] =
    useState<Extract<ApplyEditResult, { status: "complete" }>>();
  const [candidateReview, setCandidateReview] =
    useState<Extract<ReviewBundleResult, { status: "review" }>>();
  const [error, setError] = useState<{
    code: string;
    message: string;
    fragments?: string[];
  }>();
  const [plannerMode, setPlannerMode] = useState<"smart" | "deterministicOnly">(
    "smart",
  );
  const [llmSettings, setLlmSettings] = useState<LlmSettings>();
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    void window.powerBiCopilot?.getLlmSettings().then(setLlmSettings);
  }, []);

  const failure = (
    code: string,
    message: string,
    next: View = "error",
    fragments?: string[],
  ) => {
    setError({ code, message, ...(fragments ? { fragments } : {}) });
    setView(next);
  };

  const select = async () => {
    setView("selecting");
    try {
      const api = window.powerBiCopilot;
      if (!api)
        return failure(
          "PRELOAD_BRIDGE_UNAVAILABLE",
          "The desktop sidecar service failed to initialize.",
        );
      const result = await api.selectExistingRdl();
      if (result.status === "cancelled")
        return setView(selection ? "inspected" : "empty");
      if (result.status === "error")
        return failure(result.code, result.message);
      setSelection(result);
      setPlan(undefined);
      setComplete(undefined);
      setRequest("");
      setError(undefined);
      setView("inspected");
    } catch {
      failure("IPC_REJECTED", "The selected report could not be inspected.");
    }
  };

  const review = async () => {
    if (!selection) return;
    setView("planning");
    try {
      const api = window.powerBiCopilot;
      if (!api)
        return failure(
          "PRELOAD_BRIDGE_UNAVAILABLE",
          "The desktop sidecar service failed to initialize.",
          "inspected",
        );
      const result = await api.planExistingRdlEdit({
        reportSessionId: selection.reportSessionId,
        request,
      });
      if (result.status === "error")
        return failure(
          result.code,
          result.message,
          result.code === "PLANNER_REJECTED" ? "rejected" : "error",
          result.unsupportedFragments,
        );
      setPlan(result);
      setError(undefined);
      setView("ready");
    } catch {
      failure(
        "IPC_REJECTED",
        "The proposed edit could not be prepared.",
        "inspected",
      );
    }
  };

  const reviewCandidates = async () => {
    if (!selection) return;
    setView("reviewingCandidates");
    try {
      const result = await window.powerBiCopilot?.createExistingRdlReview({
        reportSessionId: selection.reportSessionId,
        request,
        plannerMode,
      });
      if (!result)
        return failure(
          "PRELOAD_BRIDGE_UNAVAILABLE",
          "The desktop sidecar service failed to initialize.",
          "inspected",
        );
      if (result.status === "error")
        return failure(
          result.code,
          result.message,
          "rejected",
          result.unsupportedFragments,
        );
      setCandidateReview(result);
      setError(undefined);
      setView("candidateReview");
    } catch {
      failure(
        "IPC_REJECTED",
        "The review draft could not be created.",
        "inspected",
      );
    }
  };

  const updateCandidateReview = async (
    action: "select" | "confirm" | "decline" | "reset",
    operationId: string,
    candidateIds: string[] = [],
  ) => {
    if (!candidateReview) return;
    const input = {
      reviewDraftId: candidateReview.bundle.reviewDraftId,
      operationId,
    };
    try {
      const api = window.powerBiCopilot;
      if (!api)
        return failure(
          "PRELOAD_BRIDGE_UNAVAILABLE",
          "The desktop sidecar service failed to initialize.",
          "candidateReview",
        );
      const result =
        action === "select"
          ? await api.selectExistingRdlReviewCandidates({
              ...input,
              candidateIds,
            })
          : action === "confirm"
            ? await api.confirmExistingRdlReviewOperation(input)
            : action === "decline"
              ? await api.declineExistingRdlReviewOperation(input)
              : await api.resetExistingRdlReviewOperation(input);
      if (result.status === "error")
        return failure(result.code, result.message, "candidateReview");
      setCandidateReview(result);
    } catch {
      failure(
        "IPC_REJECTED",
        "The review decision could not be recorded.",
        "candidateReview",
      );
    }
  };

  const createReviewedCopy = async () => {
    if (!candidateReview) return;
    setView("applying");
    try {
      const result = await window.powerBiCopilot?.createExistingRdlReviewedCopy(
        {
          reviewDraftId: candidateReview.bundle.reviewDraftId,
        },
      );
      if (!result)
        return failure(
          "PRELOAD_BRIDGE_UNAVAILABLE",
          "The desktop sidecar service failed to initialize.",
          "candidateReview",
        );
      if (result.status === "error")
        return failure(result.code, result.message, "candidateReview");
      setComplete(result);
      setError(undefined);
      setView("complete");
    } catch {
      failure(
        "IPC_REJECTED",
        "The reviewed copy could not be created.",
        "candidateReview",
      );
    }
  };

  const apply = async () => {
    if (!selection || !plan) return;
    setView("applying");
    try {
      const api = window.powerBiCopilot;
      if (!api)
        return failure(
          "PRELOAD_BRIDGE_UNAVAILABLE",
          "The desktop sidecar service failed to initialize.",
          "ready",
        );
      const result = await api.applyExistingRdlEdit({
        reportSessionId: selection.reportSessionId,
        planSessionId: plan.planSessionId,
      });
      if (result.status === "error")
        return failure(result.code, result.message, "error");
      setComplete(result);
      setError(undefined);
      setView("complete");
    } catch {
      failure("IPC_REJECTED", "The edit could not be applied.", "ready");
    }
  };

  const editRequest = async () => {
    if (plan) {
      await window.powerBiCopilot
        ?.cancelExistingRdlPlan({ planSessionId: plan.planSessionId })
        .catch(() => undefined);
    }
    setPlan(undefined);
    setCandidateReview(undefined);
    setError(undefined);
    setView("inspected");
  };

  const startAnother = async () => {
    if (selection)
      await window.powerBiCopilot
        ?.clearExistingRdlSession({
          reportSessionId: selection.reportSessionId,
        })
        .catch(() => undefined);
    setSelection(undefined);
    setPlan(undefined);
    setCandidateReview(undefined);
    setComplete(undefined);
    setRequest("");
    setError(undefined);
    setView("empty");
  };

  return (
    <main className="sidecar">
      <header>
        <div className="mark">RC</div>
        <div>
          <p className="eyebrow">LOCAL · DETERMINISTIC</p>
          <h1>Report Copilot</h1>
        </div>
        <span className="secure">No network</span>
      </header>

      {(view === "empty" || view === "selecting") && (
        <section className="welcome">
          <h2>Edit an existing paginated report</h2>
          <p>
            Select an existing Power BI Paginated Report to inspect and safely
            edit a copy.
          </p>
          <button
            className="primary"
            disabled={view === "selecting"}
            onClick={() => void select()}
          >
            {view === "selecting" ? "Inspecting…" : "Select Existing RDL"}
          </button>
        </section>
      )}

      {selection && !["empty", "selecting"].includes(view) && (
        <>
          <section className="report-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">INSPECTED REPORT</p>
                <h2>{selection.summary.filename}</h2>
              </div>
              <span className="valid">Validated</span>
            </div>
            <dl>
              <div>
                <dt>SHA-256</dt>
                <dd>
                  <code>{selection.summary.sourceSha256}</code>
                </dd>
              </div>
              <div>
                <dt>Namespace</dt>
                <dd>{selection.summary.namespaceVersion}</dd>
              </div>
              <div>
                <dt>Datasets</dt>
                <dd>{selection.summary.datasetNames.join(", ")}</dd>
              </div>
              <div>
                <dt>Fields</dt>
                <dd>{selection.summary.fieldCount}</dd>
              </div>
              <div>
                <dt>Tablix</dt>
                <dd>{selection.summary.tablixNames.join(", ")}</dd>
              </div>
              <div>
                <dt>Groups</dt>
                <dd>{selection.summary.groupNames.join(" → ")}</dd>
              </div>
              <div>
                <dt>Textboxes</dt>
                <dd>{selection.summary.textboxCount}</dd>
              </div>
              <div>
                <dt>Page</dt>
                <dd>{selection.summary.pageOrientation}</dd>
                <dt>Page size</dt>
                <dd>
                  {selection.summary.pageWidth} × {selection.summary.pageHeight}
                </dd>
              </div>
              {selection.summary.currentTitle && (
                <div className="wide">
                  <dt>Current title</dt>
                  <dd>{selection.summary.currentTitle}</dd>
                </div>
              )}
            </dl>
          </section>

          {(view === "inspected" ||
            view === "planning" ||
            view === "reviewingCandidates" ||
            view === "rejected") && (
            <section className="request-card">
              <div className="planner-settings">
                <label>
                  Planner mode
                  <select
                    value={plannerMode}
                    onChange={(event) =>
                      setPlannerMode(
                        event.target.value as "smart" | "deterministicOnly",
                      )
                    }
                  >
                    <option value="smart">Smart</option>
                    <option value="deterministicOnly">
                      Deterministic only
                    </option>
                  </select>
                </label>
                {plannerMode === "smart" && llmSettings && (
                  <div>
                    <strong>AI settings</strong>
                    <p>API key: {llmSettings.keyStatus}</p>
                    <label>
                      Anthropic model
                      <input
                        value={llmSettings.model}
                        onChange={(event) =>
                          setLlmSettings({
                            ...llmSettings,
                            model: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      API key
                      <input
                        type="password"
                        value={apiKey}
                        autoComplete="off"
                        onChange={(event) => setApiKey(event.target.value)}
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={llmSettings.privacyAcknowledged}
                        onChange={(event) => {
                          void window
                            .powerBiCopilot!.updateLlmSettings({
                              model: llmSettings.model,
                              privacyAcknowledged: event.target.checked,
                            })
                            .then(setLlmSettings);
                        }}
                      />
                      I understand that my typed request and limited report
                      metadata will be sent to Anthropic. Raw RDL XML, report
                      data, queries, credentials, and file paths are not sent.
                    </label>
                    <div className="actions">
                      <button
                        disabled={!apiKey.trim()}
                        onClick={() => {
                          void (async () => {
                            await window.powerBiCopilot!.updateLlmSettings({
                              model: llmSettings.model,
                              privacyAcknowledged:
                                llmSettings.privacyAcknowledged,
                            });
                            setLlmSettings(
                              await window.powerBiCopilot!.setAnthropicApiKey({
                                apiKey,
                                persist: llmSettings.persistenceAvailable,
                              }),
                            );
                            setApiKey("");
                          })();
                        }}
                      >
                        Save key
                      </button>
                      <button
                        onClick={() => {
                          void window
                            .powerBiCopilot!.clearAnthropicApiKey()
                            .then(setLlmSettings);
                        }}
                      >
                        Clear key
                      </button>
                      <button
                        onClick={() => {
                          void window
                            .powerBiCopilot!.testAnthropicConnection()
                            .then(setLlmSettings);
                        }}
                      >
                        Test connection
                      </button>
                    </div>
                    {!llmSettings.persistenceAvailable && (
                      <p>
                        Secure persistence is unavailable; the key is
                        session-only.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <label htmlFor="request">Describe the change</label>
              <textarea
                id="request"
                value={request}
                disabled={view === "planning"}
                onChange={(event) => setRequest(event.target.value)}
                placeholder={canonicalExample}
              />
              {view === "rejected" && error && <ErrorCard error={error} />}
              <div className="actions">
                {view === "reviewingCandidates" && (
                  <button
                    onClick={() => {
                      void window.powerBiCopilot
                        ?.cancelLlmPlanning()
                        .then(() => setView("inspected"));
                    }}
                  >
                    Cancel AI request
                  </button>
                )}
                <button
                  className="primary"
                  disabled={
                    view === "planning" ||
                    view === "reviewingCandidates" ||
                    !request.trim()
                  }
                  onClick={() => void reviewCandidates()}
                >
                  {view === "reviewingCandidates"
                    ? "Understanding request…"
                    : "Review Candidates Only"}
                </button>
                <button
                  disabled={
                    view === "planning" ||
                    view === "reviewingCandidates" ||
                    !request.trim()
                  }
                  onClick={() => void review()}
                >
                  {view === "planning"
                    ? "Planning…"
                    : "Review Changes (Checksum-Reviewed)"}
                </button>
                <button
                  disabled={view === "planning"}
                  onClick={() => void select()}
                >
                  Choose Different Report
                </button>
              </div>
            </section>
          )}

          {view === "candidateReview" && candidateReview && (
            <section className="review-card">
              <p className="eyebrow">OPERATION REVIEW</p>
              <h2>Review only — no RDL file will be changed.</h2>
              <p>
                Plan source: <strong>{candidateReview.planSource}</strong>
              </p>
              <Hash
                label="Source SHA-256"
                value={candidateReview.bundle.sourceSha256}
              />
              <Hash
                label="Plan SHA-256"
                value={candidateReview.bundle.planSha256}
              />
              <p>
                Bundle state: <strong>{candidateReview.bundle.state}</strong>
              </p>
              <div className="targets">
                {candidateReview.bundle.operations.map((operation) => {
                  const candidates =
                    operation.status === "readyForConfirmation"
                      ? [
                          operation.recommendedCandidate,
                          ...operation.alternatives,
                        ]
                      : operation.status === "choiceRequired"
                        ? operation.candidates
                        : [];
                  return (
                    <article key={operation.operationId}>
                      <strong>{operation.requestedChange}</strong>
                      <small>{operation.status}</small>
                      {operation.status === "blocked" && (
                        <p>
                          {operation.reason}: {operation.message}
                        </p>
                      )}
                      {candidates.map((candidate) => (
                        <label key={candidate.candidateId}>
                          {operation.status === "choiceRequired" && (
                            <input
                              type={
                                operation.selectionPolicy === "exactlyOne"
                                  ? "radio"
                                  : "checkbox"
                              }
                              name={operation.operationId}
                              checked={operation.selectedCandidateIds.includes(
                                candidate.candidateId,
                              )}
                              onChange={() => {
                                const selected =
                                  operation.selectionPolicy === "exactlyOne"
                                    ? [candidate.candidateId]
                                    : operation.selectedCandidateIds.includes(
                                          candidate.candidateId,
                                        )
                                      ? operation.selectedCandidateIds.filter(
                                          (id) => id !== candidate.candidateId,
                                        )
                                      : [
                                          ...operation.selectedCandidateIds,
                                          candidate.candidateId,
                                        ];
                                if (selected.length)
                                  void updateCandidateReview(
                                    "select",
                                    operation.operationId,
                                    selected,
                                  );
                              }}
                            />
                          )}
                          <span>
                            {candidate.kind === "title"
                              ? candidate.visibleText
                              : candidate.fieldName}
                            {" · "}
                            {candidate.region}
                            {candidate.kind === "fieldDisplay" && (
                              <>
                                {" · "}
                                {candidate.datasetName ??
                                  (candidate.possibleDatasets.join(" / ") ||
                                    "dataset unknown")}
                                {" · "}
                                {candidate.tablixName ?? "outside tablix"}
                                {" · "}
                                {candidate.structuralRole}
                                {" · "}
                                {candidate.expressionKind}
                                {candidate.currentFormat
                                  ? ` · ${candidate.currentFormat}`
                                  : ""}
                              </>
                            )}
                          </span>
                          <ul>
                            {candidate.evidence.slice(0, 3).map((item) => (
                              <li key={`${candidate.candidateId}-${item.code}`}>
                                {item.message}
                              </li>
                            ))}
                            {candidate.ambiguityEvidence
                              .slice(0, 3)
                              .map((item) => (
                                <li
                                  key={`${candidate.candidateId}-ambiguity-${item.code}`}
                                >
                                  {item.message}
                                </li>
                              ))}
                          </ul>
                        </label>
                      ))}
                      {(operation.status === "readyForConfirmation" ||
                        operation.status === "choiceRequired") && (
                        <div className="actions">
                          <button
                            onClick={() =>
                              void updateCandidateReview(
                                "confirm",
                                operation.operationId,
                              )
                            }
                          >
                            Confirm review
                          </button>
                          <button
                            onClick={() =>
                              void updateCandidateReview(
                                "decline",
                                operation.operationId,
                              )
                            }
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {(operation.status === "confirmed" ||
                        operation.status === "declined") && (
                        <button
                          onClick={() =>
                            void updateCandidateReview(
                              "reset",
                              operation.operationId,
                            )
                          }
                        >
                          Reset review
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
              <p className="assurance">
                Review decisions are session-bound and never authorize mutation.
                The original RDL remains unchanged. A duplicate-safe new RDL
                includes only explicitly confirmed operations.
              </p>
              <div className="actions">
                {(candidateReview.bundle.state === "fullyReviewed" ||
                  candidateReview.bundle.state === "declined") && (
                  <button
                    className="primary"
                    onClick={() => void createReviewedCopy()}
                  >
                    Create reviewed copy
                  </button>
                )}
                <button onClick={() => void editRequest()}>
                  Back to request
                </button>
              </div>
            </section>
          )}

          {(view === "ready" || view === "applying") && plan && (
            <section className="review-card">
              <p className="eyebrow">REVIEW CHANGES</p>
              <h2>Ready to apply safely</h2>
              <Hash label="Source SHA-256" value={plan.sourceSha256} />
              <Hash label="Plan SHA-256" value={plan.planSha256} />
              <h3>Proposal</h3>
              <ul>
                {plan.proposal.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3>Resolved targets</h3>
              <div className="targets">
                {plan.resolvedTargets.map((target, index) => (
                  <article
                    key={`${target.reportItemName}-${target.semanticTarget}-${index}`}
                  >
                    <strong>{target.reportItemName}</strong>
                    <small>{target.semanticTarget}</small>
                    <p>
                      <span>
                        {target.expectedBefore === "(implicit)"
                          ? "default"
                          : target.expectedBefore}
                      </span>
                      <b>→</b>
                      <span>{target.expectedAfter}</span>
                    </p>
                  </article>
                ))}
              </div>
              <p className="assurance">
                The original report will not be modified.
              </p>
              <div className="actions">
                <button
                  className="primary"
                  disabled={view === "applying"}
                  onClick={() => void apply()}
                >
                  {view === "applying" ? "Applying…" : "Apply Changes"}
                </button>
                <button
                  disabled={view === "applying"}
                  onClick={() => void editRequest()}
                >
                  Edit Request
                </button>
                <button
                  disabled={view === "applying"}
                  onClick={() => void startAnother()}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          {view === "complete" && complete && (
            <section className="complete-card">
              <p className="eyebrow">EDIT COMPLETE</p>
              <h2>{complete.editedFilename}</h2>
              <span className="valid">Validation PASS</span>
              <Hash label="Edited RDL SHA-256" value={complete.outputSha256} />
              <Hash label="Source SHA-256" value={complete.sourceSha256} />
              <Hash label="Plan SHA-256" value={complete.planSha256} />
              <p className="assurance">
                Original source unchanged · Audit manifest created
              </p>
              <p className="filename">{complete.manifestFilename}</p>
              <div className="action-grid">
                <button
                  onClick={() =>
                    void window.powerBiCopilot?.copyEditedRdlPath({
                      outputHandle: complete.outputHandle,
                    })
                  }
                >
                  Copy RDL Path
                </button>
                <button
                  onClick={() =>
                    void window.powerBiCopilot?.revealEditedRdl({
                      outputHandle: complete.outputHandle,
                    })
                  }
                >
                  {selection.revealLabel}
                </button>
                <button
                  onClick={() =>
                    void window.powerBiCopilot?.copyManifestPath({
                      outputHandle: complete.outputHandle,
                    })
                  }
                >
                  Copy Manifest Path
                </button>
                <button onClick={() => void editRequest()}>
                  Edit Same Source Again
                </button>
                <button className="primary" onClick={() => void startAnother()}>
                  Start Another Edit
                </button>
              </div>
            </section>
          )}

          {view === "error" && error && (
            <section className="error-state">
              <ErrorCard error={error} />
              <p>Original file not modified. No output was retained.</p>
              <div className="actions">
                <button
                  className="primary"
                  onClick={() => setView(selection ? "inspected" : "empty")}
                >
                  Return
                </button>
                <button onClick={() => void select()}>
                  Choose Different Report
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Hash({ label, value }: { label: string; value: string }) {
  return (
    <div className="hash">
      <small>{label}</small>
      <code>{value}</code>
    </div>
  );
}

function ErrorCard({
  error,
}: {
  error: { code: string; message: string; fragments?: string[] };
}) {
  return (
    <div className="error" role="alert">
      <strong>{error.code}</strong>
      <p>{error.message}</p>
      {error.fragments?.map((fragment) => (
        <code key={fragment}>{fragment}</code>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
