import { useState, useEffect, useMemo } from "react";
import { sections, STORAGE_KEY } from "./data";
import { CANONICAL, GROUP_MEMBERS } from "./duplicates";
import "./App.css";

const STATUS = {
  untouched: { label: "Not started", color: "#1e1e2e", dot: "#44445a" },
  learning: { label: "Learning", color: "#0f2744", dot: "#3b82f6" },
  anki: { label: "In Anki", color: "#0f2e1a", dot: "#22c55e" },
  confident: { label: "Confident", color: "#1e2e0f", dot: "#84cc16" },
  done: { label: "Done ✓", color: "#0f1e0f", dot: "#4ade80" },
};

const YIELD_LABELS = { 1: "+", 2: "++", 3: "+++" };

function useProgress() {
  const [progress, setProgress] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  // Always read/write via canonical ID
  const getStatus = (id) => {
    const canon = CANONICAL[id] ?? id;
    return progress[canon] || "untouched";
  };

  const setStatus = (id, status) => {
    const canon = CANONICAL[id] ?? id;
    setProgress((p) => ({ ...p, [canon]: status }));
  };

  return { progress, getStatus, setStatus };
}

function StatusCycle({ id, status, onSet }) {
  const keys = Object.keys(STATUS);
  const current = status || "untouched";
  const next = keys[(keys.indexOf(current) + 1) % keys.length];
  return (
    <button
      className="status-btn"
      style={{ background: STATUS[current].color, borderColor: STATUS[current].dot }}
      onClick={() => onSet(id, next)}
      title={`Click to mark as: ${STATUS[next].label}`}
    >
      <span className="dot" style={{ background: STATUS[current].dot }} />
      <span className="status-label">{STATUS[current].label}</span>
    </button>
  );
}

function ConditionRow({ condition, status, onSet }) {
  const isLinked = CANONICAL[condition.id] !== undefined;
  return (
    <div className={`condition-row status-${status || "untouched"}`}>
      <div className="condition-name">
        <span className={`yield-badge y${condition.yield}`}>
          {YIELD_LABELS[condition.yield]}
        </span>
        <span>{condition.name}</span>
        {isLinked && (
          <span className="linked-badge" title="Shared across multiple sections — ticking here updates all">
            ⟳ linked
          </span>
        )}
      </div>
      <StatusCycle id={condition.id} status={status} onSet={onSet} />
    </div>
  );
}

function SectionCard({ section, getStatus, setStatus, isOpen, onToggle }) {
  const total = section.conditions.length;
  const done = section.conditions.filter(
    (c) => getStatus(c.id) === "done"
  ).length;
  const confident = section.conditions.filter(
    (c) => getStatus(c.id) === "confident"
  ).length;
  const pct = Math.round(((done + confident) / total) * 100);

  return (
    <div className="section-card" style={{ "--accent": section.color }}>
      <button className="section-header" onClick={onToggle}>
        <div className="section-left">
          <span className="section-dot" style={{ background: section.color }} />
          <span className="section-name">{section.label}</span>
          <span className="section-count">{total}</span>
        </div>
        <div className="section-right">
          <div className="mini-bar">
            <div
              className="mini-fill"
              style={{ width: `${pct}%`, background: section.color }}
            />
          </div>
          <span className="pct-label">{pct}%</span>
          <span className="chevron">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>
      {isOpen && (
        <div className="conditions-list">
          {section.conditions.map((c) => (
            <ConditionRow
              key={c.id}
              condition={c}
              status={getStatus(c.id)}
              onSet={setStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stats({ getStatus }) {
  const all = sections.flatMap((s) => s.conditions);
  const total = all.length;
  const counts = Object.fromEntries(Object.keys(STATUS).map((k) => [k, 0]));
  all.forEach((c) => {
    const s = getStatus(c.id);
    counts[s]++;
  });
  const done = counts.done + counts.confident;
  const pct = Math.round((done / total) * 100);

  // Calculate yield type breakdown
  const yieldStats = [1, 2, 3].map((yieldType) => {
    const yieldConditions = all.filter((c) => c.yield === yieldType);
    const yieldTotal = yieldConditions.length;
    const yieldDone = yieldConditions.filter(
      (c) => {
        const status = getStatus(c.id);
        return status === "done" || status === "confident";
      }
    ).length;
    const yieldPct = yieldTotal > 0 ? Math.round((yieldDone / yieldTotal) * 100) : 0;
    return { yieldType, yieldTotal, yieldDone, yieldPct };
  });

  return (
    <div className="stats-bar">
      <div className="stats-row-one">
        <div className="stat-overview">
          <span className="big-pct">{pct}%</span>
          <span className="stat-sub">{done} / {total} completed</span>
        </div>
        <div className="stat-breakdown">
          {Object.entries(STATUS).map(([k, v]) => (
            <div key={k} className="stat-item">
              <span className="stat-dot" style={{ background: v.dot }} />
              <span className="stat-num">{counts[k]}</span>
              <span className="stat-lbl">{v.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="yield-breakdown">
        {yieldStats.map(({ yieldType, yieldTotal, yieldDone, yieldPct }) => (
          <div key={yieldType} className="yield-stat">
            <span className="yield-label">{YIELD_LABELS[yieldType]}</span>
            <span className="yield-pct">{yieldPct}%</span>
            <span className="yield-sub">({yieldDone}/{yieldTotal})</span>
          </div>
        ))}
      </div>
      <div className="total-bar">
        <div
          className="total-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function App() {
  const { getStatus, setStatus } = useProgress();
  const [openSections, setOpenSections] = useState(() => new Set());
  const [filter, setFilter] = useState("all");
  const [yieldFilter, setYieldFilter] = useState("all");
  const [search, setSearch] = useState("");

  const toggleSection = (id) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(sections.map((s) => s.id)));
  const collapseAll = () => setOpenSections(new Set());

  const filteredSections = useMemo(() => {
    return sections
      .map((section) => {
        const conditions = section.conditions.filter((c) => {
          const statusMatch =
            filter === "all" || getStatus(c.id) === filter;
          const yieldMatch =
            yieldFilter === "all" || c.yield === Number(yieldFilter);
          const searchMatch =
            !search || c.name.toLowerCase().includes(search.toLowerCase());
          return statusMatch && yieldMatch && searchMatch;
        });
        return { ...section, conditions };
      })
      .filter((s) => s.conditions.length > 0);
  }, [filter, yieldFilter, search, getStatus]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div>
            <h1 className="app-title">
              <span className="title-accent">Core</span> Conditions
            </h1>
            <p className="app-subtitle">Abhinav Rajaram · Medical Study Tracker</p>
          </div>
          <div className="header-actions">
            <button className="ghost-btn" onClick={expandAll}>Expand all</button>
            <button className="ghost-btn" onClick={collapseAll}>Collapse all</button>
          </div>
        </div>
        <Stats getStatus={getStatus} />
      </header>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search conditions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-pills">
          {["all", ...Object.keys(STATUS)].map((k) => (
            <button
              key={k}
              className={`pill ${filter === k ? "active" : ""}`}
              style={
                filter === k && k !== "all"
                  ? { background: STATUS[k]?.dot + "22", borderColor: STATUS[k]?.dot, color: STATUS[k]?.dot }
                  : {}
              }
              onClick={() => setFilter(k)}
            >
              {k === "all" ? "All" : STATUS[k].label}
            </button>
          ))}
        </div>
        <div className="filter-pills">
          {[["all", "Any yield"], ["3", "+++"], ["2", "++"], ["1", "+"]].map(([val, label]) => (
            <button
              key={val}
              className={`pill ${yieldFilter === val ? "active" : ""} ${val !== "all" ? "yp" + val : ""}`}
              onClick={() => setYieldFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="sections-list">
        {filteredSections.length === 0 && (
          <div className="empty-state">No conditions match your filter.</div>
        )}
        {filteredSections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            getStatus={getStatus}
            setStatus={setStatus}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </main>

      <footer className="app-footer">
        Progress saved locally · Click any status badge to cycle · ⟳ linked = shared across sections · +++ = highest yield
      </footer>
    </div>
  );
}
