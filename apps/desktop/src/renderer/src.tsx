import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const nav = ["Projects", "Build", "History", "Backups", "Settings"];

function App(): React.JSX.Element {
  return (
    <main className="shell">
      <aside>
        <div className="mark">RC</div>
        <h1>Report Copilot</h1>
        <p className="mode">Offline authoring</p>
        <nav>
          {nav.map((item, index) => (
            <button className={index === 0 ? "active" : ""} key={item}>
              {item}
            </button>
          ))}
        </nav>
        <div className="platform">Windows validation pending</div>
      </aside>
      <section className="content">
        <header>
          <div>
            <p className="eyebrow">PROJECT WORKSPACE</p>
            <h2>Choose a Power BI project</h2>
          </div>
          <span className="badge">Mode A · Local only</span>
        </header>
        <div className="welcome">
          <div className="icon">PB</div>
          <h3>Open a PBIP project</h3>
          <p>
            Inspect its semantic model and report definition before any files
            are changed.
          </p>
          <button className="primary" disabled>
            Select project folder
          </button>
          <small>Project selection arrives in the next milestone.</small>
        </div>
        <div className="status-grid">
          {["PBIP project", "TMDL model", "PBIR report", "Validation"].map(
            (label) => (
              <article key={label}>
                <span>Not inspected</span>
                <h4>{label}</h4>
                <p>Waiting for a project</p>
              </article>
            ),
          )}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
