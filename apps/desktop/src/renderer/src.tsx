import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  visibleGenerationError,
  type GenerationResult,
} from "../shared/desktop-api";
import { runGeneration } from "./generation-ui";
import "./style.css";

function Totals({
  values,
}: {
  values: { Quantity: number; Revenue: number; GrossProfit: number };
}) {
  return (
    <span>
      Qty {values.Quantity} · Revenue ${values.Revenue.toLocaleString()} · GP $
      {values.GrossProfit.toLocaleString()}
    </span>
  );
}

function App(): React.JSX.Element {
  const [request, setRequest] = useState("");
  const [result, setResult] = useState<GenerationResult>();
  const [busy, setBusy] = useState(false);
  const generate = () =>
    runGeneration(window.powerBiCopilot, request, setBusy, setResult);
  return (
    <main className="shell">
      <aside>
        <div className="mark">RC</div>
        <h1>Report Copilot</h1>
        <p className="mode">Offline deterministic authoring</p>
        <nav>
          <button className="active">Generate</button>
          <button disabled>History</button>
          <button disabled>Settings</button>
        </nav>
        <div className="platform">Accepted template · Local only</div>
      </aside>
      <section className="content">
        <header>
          <div>
            <p className="eyebrow">PAGINATED REPORT MVP</p>
            <h2>Generate a regional sales report</h2>
          </div>
          <span className="badge">No network · No LLM</span>
        </header>
        <section className="generator-card">
          <label htmlFor="request">Constrained report request</label>
          <textarea
            id="request"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            placeholder={
              'Create a report titled "…" using the production pagination template with data: […]'
            }
          />
          <div className="actions">
            <button
              className="primary"
              disabled={busy || !request.trim()}
              onClick={() => void generate()}
            >
              {busy ? "Generating…" : "Generate Report"}
            </button>
            <span>
              {busy
                ? "Validating and writing locally"
                : "Uses the accepted production template"}
            </span>
          </div>
          {result?.status === "error" && (
            <div className="error" role="alert">
              {visibleGenerationError(result)}
            </div>
          )}
        </section>
        {result?.status === "generated" && (
          <section className="result" aria-live="polite">
            <div className="result-head">
              <div>
                <p className="eyebrow">GENERATION COMPLETE</p>
                <h3>{result.title}</h3>
              </div>
              <span className="success">Validated</span>
            </div>
            <div className="summary-grid">
              <article>
                <small>Rows</small>
                <strong>{result.rowCount}</strong>
              </article>
              <article>
                <small>Regions</small>
                <strong>{result.regions.join(", ")}</strong>
              </article>
              <article>
                <small>Template</small>
                <strong>{result.template}</strong>
              </article>
              <article>
                <small>SHA-256</small>
                <code>{result.sha256}</code>
              </article>
            </div>
            <h4>Expected Region subtotals</h4>
            <div className="totals">
              {Object.entries(result.regionSubtotals).map(
                ([region, values]) => (
                  <div key={region}>
                    <b>{region}</b>
                    <Totals values={values} />
                  </div>
                ),
              )}
              <div className="grand">
                <b>Grand Total</b>
                <Totals values={result.grandTotal} />
              </div>
            </div>
            <div className="path">
              <code>{result.outputPath}</code>
              <button
                onClick={() => void window.powerBiCopilot?.copyGeneratedPath()}
              >
                Copy path
              </button>
              <button
                onClick={() =>
                  void window.powerBiCopilot?.revealGeneratedReport()
                }
              >
                Reveal in Finder
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
