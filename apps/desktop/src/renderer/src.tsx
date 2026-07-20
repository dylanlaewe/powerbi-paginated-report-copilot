import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import type { PowerBiProject } from "@powerbi-copilot/domain";
import "./style.css";

const nav = ["Projects", "Build", "History", "Backups", "Settings"];

function App(): React.JSX.Element {
  const [project, setProject] = useState<PowerBiProject>();
  const [message, setMessage] = useState("Selection is local and read-only.");
  const selectProject = async (): Promise<void> => {
    const result = await window.powerBiCopilot.selectProject();
    if (result.status === "selected") {
      setProject(result.project);
      setMessage("Read-only inspection complete. No files were modified.");
    }
    if (result.status === "error") setMessage(result.message);
  };
  const statuses = project
    ? [
        ["PBIP project", "Detected"],
        ["TMDL model", project.format.tmdl ? "Detected" : "Not detected"],
        ["PBIR report", project.format.pbir ? "Detected" : "Not detected"],
        ["Validation", "Inspection passed"],
      ]
    : [
        ["PBIP project", "Waiting for a project"],
        ["TMDL model", "Waiting for a project"],
        ["PBIR report", "Waiting for a project"],
        ["Validation", "Not inspected"],
      ];
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
          <h3>{project?.name ?? "Open a PBIP project"}</h3>
          <p>
            {project?.paths.root ??
              "Inspect its semantic model and report definition before any files are changed."}
          </p>
          <button className="primary" onClick={() => void selectProject()}>
            Select project folder
          </button>
          <small>{message}</small>
        </div>
        <div className="status-grid">
          {statuses.map(([label, detail]) => (
            <article key={label}>
              <span>{project ? "Inspected" : "Not inspected"}</span>
              <h4>{label}</h4>
              <p>{detail}</p>
            </article>
          ))}
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
