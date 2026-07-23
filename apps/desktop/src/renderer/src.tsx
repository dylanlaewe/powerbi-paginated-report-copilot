import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  ApplyEditResult,
  ExistingRdlSelectionResult,
  PlanEditResult,
} from "../shared/desktop-api";
import "./style.css";

type View =
  | "empty"
  | "selecting"
  | "inspected"
  | "planning"
  | "rejected"
  | "ready"
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
  const [error, setError] = useState<{
    code: string;
    message: string;
    fragments?: string[];
  }>();

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
    if (plan)
      await window.powerBiCopilot
        ?.cancelExistingRdlPlan({ planSessionId: plan.planSessionId })
        .catch(() => undefined);
    setPlan(undefined);
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
            view === "rejected") && (
            <section className="request-card">
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
                <button
                  className="primary"
                  disabled={view === "planning" || !request.trim()}
                  onClick={() => void review()}
                >
                  {view === "planning" ? "Planning…" : "Review Changes"}
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
