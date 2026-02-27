import {
  React,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
  htm,
  ReactFlow,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  dagre,
} from "./vendor.js";

const html = htm.bind(React.createElement);

const STORAGE_KEY = "emonat.graph.v1";
const THEME_KEY = "emonat.theme"; // 'dark' | 'light'
function apiFetch(pathname, options) {
  return fetch(pathname, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function safeParseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, [query]);

  return matches;
}

function getSystemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function SunIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="M4.93 4.93l1.41 1.41"></path>
    <path d="M17.66 17.66l1.41 1.41"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <path d="M4.93 19.07l1.41-1.41"></path>
    <path d="M17.66 6.34l1.41-1.41"></path>
  </svg>`;
}

function MoonIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path>
  </svg>`;
}

function GearIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 1l2 3.5 4 .8-2.7 3 0.6 4.2L12 11l-3.9 1.5 0.6-4.2L6 5.3l4-.8L12 1z" opacity="0.35"></path>
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a8 8 0 0 0 .1-6"></path>
    <path d="M4.5 9a8 8 0 0 0 .1 6"></path>
  </svg>`;
}

function BurgerIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 6h16"></path>
    <path d="M4 12h16"></path>
    <path d="M4 18h16"></path>
  </svg>`;
}

function LeftIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M15 18l-6-6 6-6"></path>
  </svg>`;
}

function RightIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M9 18l6-6-6-6"></path>
  </svg>`;
}

function LogoutIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <path d="M16 17l5-5-5-5"></path>
    <path d="M21 12H9"></path>
  </svg>`;
}

function RefreshIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-3-6.7"></path>
    <path d="M21 3v6h-6"></path>
  </svg>`;
}

function BoardIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="7" height="16" rx="1"></rect>
    <rect x="14" y="4" width="7" height="10" rx="1"></rect>
  </svg>`;
}

function PlusIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 5v14"></path>
    <path d="M5 12h14"></path>
  </svg>`;
}

function XIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M18 6L6 18"></path>
    <path d="M6 6l12 12"></path>
  </svg>`;
}

function TrashIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 6h18"></path>
    <path d="M8 6V4h8v2"></path>
    <path d="M19 6l-1 14H6L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
  </svg>`;
}

function ZoomInIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7"></circle>
    <path d="M21 21l-4.35-4.35"></path>
    <path d="M11 8v6"></path>
    <path d="M8 11h6"></path>
  </svg>`;
}

function ZoomOutIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7"></circle>
    <path d="M21 21l-4.35-4.35"></path>
    <path d="M8 11h6"></path>
  </svg>`;
}

function FitIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 9V4h5"></path>
    <path d="M20 9V4h-5"></path>
    <path d="M4 15v5h5"></path>
    <path d="M20 15v5h-5"></path>
  </svg>`;
}

function LayoutIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="7" height="7" rx="2"></rect>
    <rect x="14" y="4" width="7" height="7" rx="2"></rect>
    <rect x="8.5" y="13" width="7" height="7" rx="2"></rect>
    <path d="M10 7h4"></path>
    <path d="M12 11v2"></path>
  </svg>`;
}

function PointerIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 3l6.8 15.8 2.1-5.2 5.2-2.1L5 3z"></path>
    <path d="M13 13l5 5"></path>
  </svg>`;
}

function EditIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
  </svg>`;
}

function UserIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 21a8 8 0 0 0-16 0"></path>
    <circle cx="12" cy="8" r="4"></circle>
  </svg>`;
}

function avatarInitial(email) {
  const v = String(email ?? "").trim();
  if (!v) return "?";
  return v[0].toUpperCase();
}

function getHashRoute() {
  const raw = window.location.hash || "#/home";
  return raw.startsWith("#/") ? raw : "#/home";
}

function parseHashRoute(hash) {
  const raw = String(hash || "#/home");
  const normalized = raw.startsWith("#/") ? raw : "#/home";
  const withoutPrefix = normalized.slice(2); // remove '#/'
  const qIndex = withoutPrefix.indexOf("?");
  const pathPart = qIndex >= 0 ? withoutPrefix.slice(0, qIndex) : withoutPrefix;
  const queryPart = qIndex >= 0 ? withoutPrefix.slice(qIndex + 1) : "";
  const path = `#/${pathPart || "home"}`;
  const params = new URLSearchParams(queryPart);
  return { path, params, raw: normalized };
}

function truncate(s, n) {
  const v = String(s ?? "").trim();
  if (v.length <= n) return v;
  return v.slice(0, n - 1) + "…";
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((x) => String(x ?? "").trim())
      .filter(Boolean);
  }
  const s = String(value ?? "").trim();
  if (!s) return [];
  return s
    .split(",")
    .map((x) => String(x).trim())
    .filter(Boolean);
}

function tagsToInput(value) {
  return normalizeTags(value).join(", ");
}

function normalizeDateOnly(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}

function formatDateDMY(value) {
  const iso = normalizeDateOnly(value);
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

async function apiJson(pathname, options) {
  const res = await apiFetch(pathname, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error ? String(data.error) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const GraphActionsContext = createContext(null);

function useGraphActions() {
  const ctx = useContext(GraphActionsContext);
  if (!ctx) throw new Error("GraphActionsContext missing");
  return ctx;
}

function isDependencyEdge(edge) {
  return edge?.data?.kind === "dependency";
}

function isContainsEdge(edge) {
  return edge?.data?.kind === "contains";
}

function computeLockedNodeIds(nodes, edges) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const locked = new Set();

  for (const edge of edges) {
    if (!isDependencyEdge(edge)) continue;

    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) continue;

    const sourceDone = source?.data?.status === "done";
    if (!sourceDone) locked.add(target.id);
  }

  return locked;
}

function computeCriticalPath(nodes, edges) {
  // Longest path in DAG over dependency edges only.
  const depEdges = edges.filter(isDependencyEdge);
  const incoming = new Map();
  const outgoing = new Map();

  for (const n of nodes) {
    incoming.set(n.id, []);
    outgoing.set(n.id, []);
  }

  for (const e of depEdges) {
    if (!incoming.has(e.target) || !outgoing.has(e.source)) continue;
    incoming.get(e.target).push(e.source);
    outgoing.get(e.source).push(e.target);
  }

  // Kahn topological order
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of depEdges) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);

  const q = [];
  for (const [id, d] of indeg.entries()) if (d === 0) q.push(id);

  const topo = [];
  while (q.length) {
    const id = q.shift();
    topo.push(id);
    for (const nxt of outgoing.get(id) ?? []) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if (indeg.get(nxt) === 0) q.push(nxt);
    }
  }

  const dist = new Map(nodes.map((n) => [n.id, 0]));
  const prev = new Map();

  for (const id of topo) {
    for (const src of incoming.get(id) ?? []) {
      const cand = (dist.get(src) ?? 0) + 1;
      if (cand > (dist.get(id) ?? 0)) {
        dist.set(id, cand);
        prev.set(id, src);
      }
    }
  }

  let bestNode = null;
  let bestDist = -1;
  for (const [id, d] of dist.entries()) {
    if (d > bestDist) {
      bestDist = d;
      bestNode = id;
    }
  }

  const nodePath = [];
  const edgePath = new Set();
  let cur = bestNode;
  while (cur) {
    nodePath.push(cur);
    const p = prev.get(cur);
    if (!p) break;
    const edge = depEdges.find((e) => e.source === p && e.target === cur);
    if (edge) edgePath.add(edge.id);
    cur = p;
  }

  return { criticalNodeIds: new Set(nodePath), criticalEdgeIds: edgePath };
}

function layoutRiver(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 110 });
  g.setDefaultEdgeLabel(() => ({}));

  const hasContains = edges.some(isContainsEdge);

  for (const n of nodes) {
    const dims =
      n.type === "memory" || n.type === "milestone"
        ? { width: 240, height: 190 }
        : n.type === "checklist"
          ? { width: 260, height: 170 }
          : n.type === "timeline" || n.type === "note"
            ? { width: 240, height: 120 }
            : { width: 240, height: 130 };
    g.setNode(n.id, dims);
  }

  for (const e of edges) {
    // Prefer parent/child edges when they exist; otherwise fall back to dependencies.
    if (hasContains) {
      if (!isContainsEdge(e)) continue;
    } else {
      if (!isDependencyEdge(e)) continue;
    }
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const p = g.node(n.id);
    if (!p) return n;
    return {
      ...n,
      position: { x: p.x - p.width / 2, y: p.y - p.height / 2 },
    };
  });
}

function TaskNode({ id, data, selected, type }) {
  const { lockedNodeIds, openNodeEditor } = useGraphActions();
  const locked = lockedNodeIds.has(id);

  const status = data?.status === "done" ? "done" : "pending";
  const tags = normalizeTags(data?.tags).slice(0, 4);
  const title = String(data?.title ?? "Untitled task");
  const preview = data?.content ? truncate(data.content, 84) : "";
  const due = data?.date ? `Due: ${formatDateDMY(data.date)}` : "";
  const isSubtask = String(data?.kind || "") === "subtask" || type === "subtask";

  return html`
    <div className=${`rf-node taskNode ${selected ? "selected" : ""} ${locked ? "locked" : ""}`}>
      <${Handle} id="tL" type="target" position=${Position.Left} />
      <${Handle} id="tT" type="target" position=${Position.Top} />
      <${Handle} id="sR" type="source" position=${Position.Right} />
      <${Handle} id="sB" type="source" position=${Position.Bottom} />
      <div className="nodeHeader">
        <div className="nodeChips">
          <span className="chip">${isSubtask ? "Subtask" : "Task"}</span>
          ${locked ? html`<span className="chip lock" title="Blocked by dependencies">Locked</span>` : html``}
          ${status === "done" ? html`<span className="chip ok">Done</span>` : html`<span className="chip">To Do</span>`}
          ${tags.map((t) => html`<span className="chip">${t}</span>`)}
        </div>
        <button
          className="btn nodeIconBtn"
          title="Edit"
          onPointerDown=${(e) => e.stopPropagation()}
          onClick=${(e) => {
            e.stopPropagation();
            openNodeEditor?.(id);
          }}
        >
          <${EditIcon} />
        </button>
      </div>

      <div className="nodeTitleText">${title}</div>
      <div className="nodeBodyText">${preview || due || ""}</div>
    </div>
  `;
}

function MemoryNode({ id, data, selected }) {
  const { openNodeEditor } = useGraphActions();
  const title = String(data?.title ?? data?.fileName ?? "Memory");
  const tags = normalizeTags(data?.tags).slice(0, 4);
  const fileName = data?.fileName ? String(data.fileName) : "";
  const hint = fileName ? "" : "Add a file or link";

  return html`
    <div className=${`rf-node memoryNode ${selected ? "selected" : ""}`}>
      <${Handle} id="tL" type="target" position=${Position.Left} />
      <${Handle} id="tT" type="target" position=${Position.Top} />
      <${Handle} id="sR" type="source" position=${Position.Right} />
      <${Handle} id="sB" type="source" position=${Position.Bottom} />
      <div className="nodeHeader">
        <div className="nodeChips">
          <span className="chip">Memory</span>
          ${tags.map((t) => html`<span className="chip">${t}</span>`)}
        </div>
        <button
          className="btn nodeIconBtn"
          title="Edit"
          onPointerDown=${(e) => e.stopPropagation()}
          onClick=${(e) => {
            e.stopPropagation();
            openNodeEditor?.(id);
          }}
        >
          <${EditIcon} />
        </button>
      </div>

      <div className="nodeTitleText">${title}</div>
      ${data?.previewUrl ? html`<img className="memoryPreview" src=${data.previewUrl} alt="preview" />` : html``}
      <div className="nodeBodyText">${fileName || hint}</div>
    </div>
  `;
}

function ResourceNode({ id, data, selected }) {
  const { openNodeEditor } = useGraphActions();
  const title = String(data?.title ?? "Resource");
  const tags = normalizeTags(data?.tags).slice(0, 4);
  const url = String(data?.url ?? "").trim();

  return html`
    <div className=${`rf-node noteNode ${selected ? "selected" : ""}`}>
      <${Handle} id="tL" type="target" position=${Position.Left} />
      <${Handle} id="tT" type="target" position=${Position.Top} />
      <${Handle} id="sR" type="source" position=${Position.Right} />
      <${Handle} id="sB" type="source" position=${Position.Bottom} />
      <div className="nodeHeader">
        <div className="nodeChips">
          <span className="chip">Resource</span>
          ${tags.map((t) => html`<span className="chip">${t}</span>`)}
        </div>
        <button
          className="btn nodeIconBtn"
          title="Edit"
          onPointerDown=${(e) => e.stopPropagation()}
          onClick=${(e) => {
            e.stopPropagation();
            openNodeEditor?.(id);
          }}
        >
          <${EditIcon} />
        </button>
      </div>
      <div className="nodeTitleText">${title}</div>
      <div className="nodeBodyText">${url ? truncate(url, 80) : "Add a link"}</div>
    </div>
  `;
}

function RootTaskNode({ id, data, selected }) {
  const { openMainTaskEditor } = useGraphActions();
  const title = String(data?.title ?? "Task");
  const tags = normalizeTags(data?.tags).slice(0, 4);

  return html`
    <div className=${`rf-node taskNode ${selected ? "selected" : ""} rootTaskNode`}>
      <${Handle} id="tL" type="target" position=${Position.Left} />
      <${Handle} id="tT" type="target" position=${Position.Top} />
      <${Handle} id="sR" type="source" position=${Position.Right} />
      <${Handle} id="sB" type="source" position=${Position.Bottom} />
      <div className="nodeHeader">
        <div className="nodeChips">
          <span className="chip">Task</span>
          ${tags.map((t) => html`<span className="chip">${t}</span>`)}
        </div>
        <button
          className="btn nodeIconBtn"
          title="Edit task"
          onPointerDown=${(e) => e.stopPropagation()}
          onClick=${(e) => {
            e.stopPropagation();
            openMainTaskEditor?.();
          }}
        >
          <${EditIcon} />
        </button>
      </div>
      <div className="nodeTitleText">${title}</div>
      <div className="nodeBodyText">Main task (root)</div>
    </div>
  `;
}

function MilestoneNode({ id, data, selected }) {
  const { openNodeEditor } = useGraphActions();
  const title = String(data?.title ?? "Milestone");
  const tags = normalizeTags(data?.tags).slice(0, 4);
  const dateText = data?.date ? `On: ${formatDateDMY(data.date)}` : "";

  return html`
    <div className="milestoneWrap">
      <div className=${`rf-node milestoneNode ${selected ? "selected" : ""}`}>
        <${Handle} id="tL" type="target" position=${Position.Left} />
        <${Handle} id="tT" type="target" position=${Position.Top} />
        <${Handle} id="sR" type="source" position=${Position.Right} />
        <${Handle} id="sB" type="source" position=${Position.Bottom} />
        <div className="inner">
          <div className="nodeHeader">
            <div className="nodeChips">
              <span className="chip">Milestone</span>
              ${tags.map((t) => html`<span className="chip">${t}</span>`)}
            </div>
            <button
              className="btn nodeIconBtn"
              title="Edit"
              onPointerDown=${(e) => e.stopPropagation()}
              onClick=${(e) => {
                e.stopPropagation();
                openNodeEditor?.(id);
              }}
            >
              <${EditIcon} />
            </button>
          </div>

          <div className="nodeTitleText" style=${{ textAlign: "center" }}>${title}</div>
          <div className="nodeBodyText" style=${{ textAlign: "center" }}>${dateText}</div>
        </div>
      </div>
    </div>
  `;
}

function NoteNode({ id, data, selected }) {
  const { openNodeEditor } = useGraphActions();
  const title = String(data?.title ?? "Note");
  const tags = normalizeTags(data?.tags).slice(0, 4);
  const preview = data?.content ? truncate(data.content, 90) : "";

  return html`
    <div className=${`rf-node noteNode ${selected ? "selected" : ""}`}>
      <${Handle} id="tL" type="target" position=${Position.Left} />
      <${Handle} id="tT" type="target" position=${Position.Top} />
      <${Handle} id="sR" type="source" position=${Position.Right} />
      <${Handle} id="sB" type="source" position=${Position.Bottom} />
      <div className="nodeHeader">
        <div className="nodeChips">
          <span className="chip">Note</span>
          ${tags.map((t) => html`<span className="chip">${t}</span>`)}
        </div>
        <button
          className="btn nodeIconBtn"
          title="Edit"
          onPointerDown=${(e) => e.stopPropagation()}
          onClick=${(e) => {
            e.stopPropagation();
            openNodeEditor?.(id);
          }}
        >
          <${EditIcon} />
        </button>
      </div>
      <div className="nodeTitleText">${title}</div>
      <div className="nodeBodyText">${preview || "Click pencil to edit"}</div>
    </div>
  `;
}

function ChecklistNode({ id, data, selected }) {
  const { openNodeEditor } = useGraphActions();

  const items = Array.isArray(data?.items) ? data.items : [];
  const doneCount = items.filter((x) => x?.done).length;
  const title = String(data?.title ?? "Checklist");
  const tags = normalizeTags(data?.tags).slice(0, 4);
  const preview = items.length
    ? items
        .slice(0, 3)
        .map((it) => (it?.done ? "✓" : "•") + " " + truncate(it?.text ?? "", 26))
        .join("  ")
    : "No items yet";

  return html`
    <div className=${`rf-node checklistNode ${selected ? "selected" : ""}`}>
      <${Handle} id="tL" type="target" position=${Position.Left} />
      <${Handle} id="tT" type="target" position=${Position.Top} />
      <${Handle} id="sR" type="source" position=${Position.Right} />
      <${Handle} id="sB" type="source" position=${Position.Bottom} />
      <div className="nodeHeader">
        <div className="nodeChips">
          <span className="chip">Checklist</span>
          <span className="chip">${doneCount}/${items.length || 0}</span>
          ${tags.map((t) => html`<span className="chip">${t}</span>`)}
        </div>
        <button
          className="btn nodeIconBtn"
          title="Edit"
          onPointerDown=${(e) => e.stopPropagation()}
          onClick=${(e) => {
            e.stopPropagation();
            openNodeEditor?.(id);
          }}
        >
          <${EditIcon} />
        </button>
      </div>
      <div className="nodeTitleText">${title}</div>
      <div className="nodeBodyText">${preview}</div>
    </div>
  `;
}

function TimelineNode({ id, data, selected }) {
  const { openNodeEditor } = useGraphActions();
  const title = String(data?.title ?? "Timeline");
  const tags = normalizeTags(data?.tags).slice(0, 4);
  const dateText = data?.date ? `On: ${formatDateDMY(data.date)}` : "Pick a date";

  return html`
    <div className=${`rf-node timelineNode ${selected ? "selected" : ""}`}>
      <${Handle} id="tL" type="target" position=${Position.Left} />
      <${Handle} id="tT" type="target" position=${Position.Top} />
      <${Handle} id="sR" type="source" position=${Position.Right} />
      <${Handle} id="sB" type="source" position=${Position.Bottom} />
      <div className="nodeHeader">
        <div className="nodeChips">
          <span className="chip">Timeline</span>
          ${tags.map((t) => html`<span className="chip">${t}</span>`)}
        </div>
        <button
          className="btn nodeIconBtn"
          title="Edit"
          onPointerDown=${(e) => e.stopPropagation()}
          onClick=${(e) => {
            e.stopPropagation();
            openNodeEditor?.(id);
          }}
        >
          <${EditIcon} />
        </button>
      </div>
      <div className="nodeTitleText">${title}</div>
      <div className="nodeBodyText">${dateText}</div>
    </div>
  `;
}

function loadInitialGraph() {
  const saved = safeParseJSON(localStorage.getItem(STORAGE_KEY) ?? "null", null);
  if (saved?.nodes && saved?.edges) return saved;

  // Seed with the use-case example.
  const meetingId = "node_meeting";
  const prepId = "node_prepare";
  const pdfId = "node_pdf";

  return {
    layoutMode: "brain",
    edgeKind: "reference",
    nodes: [
      {
        id: meetingId,
        type: "task",
        position: { x: 420, y: 210 },
        data: { title: "Meeting Dr. Peunolkogie", status: "pending", date: "2026-02-10", content: "Discuss symptoms, next steps." },
      },
      {
        id: prepId,
        type: "task",
        position: { x: 140, y: 120 },
        data: { title: "Prepare Documents", status: "pending", date: "2026-02-09", content: "Bring prior results, ID." },
      },
      {
        id: pdfId,
        type: "memory",
        position: { x: 140, y: 310 },
        data: { title: "Blood_Analysis.pdf", fileName: "Blood_Analysis.pdf", mimeType: "application/pdf" },
      },
      {
        id: "node_milestone",
        type: "milestone",
        position: { x: 700, y: 120 },
        data: { title: "Appointment", date: "2026-02-10" },
      },
    ],
    edges: [
      {
        id: "edge_dep_1",
        source: prepId,
        target: meetingId,
        data: { kind: "dependency" },
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        style: { strokeWidth: 2 },
      },
      {
        id: "edge_ref_1",
        source: pdfId,
        target: meetingId,
        data: { kind: "reference" },
        style: { strokeDasharray: "5 6" },
      },
    ],
  };
}

function App() {
  const isMobile = useMediaQuery("(max-width: 900px)");

  const initial = useMemo(() => loadInitialGraph(), []);
  const [nodes, setNodes] = useState(initial.nodes);
  const [edges, setEdges] = useState(initial.edges);
  const [layoutMode, setLayoutMode] = useState(initial.layoutMode ?? "brain");
  const [edgeKind, setEdgeKind] = useState(initial.edgeKind ?? "reference");
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : getSystemTheme();
  });

  const [route, setRoute] = useState(() => getHashRoute());
  const { path: routePath, params: routeParams } = useMemo(() => parseHashRoute(route), [route]);

  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMsg, setAuthMsg] = useState("");

  const [profileDraft, setProfileDraft] = useState({ full_name: "", phone: "", birthday: "" });

  // Tasks (board)
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskEditor, setTaskEditor] = useState(null); // {mode: 'new'|'edit', task}
  const [stageEditor, setStageEditor] = useState(null); // {mode: 'new', name, description}
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskSearch, setTaskSearch] = useState("");

  const [boardSidebarOpen, setBoardSidebarOpen] = useState(true);

  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [columns, setColumns] = useState([]);
  const [boardMetaLoading, setBoardMetaLoading] = useState(false);

  const columnDragIdRef = useRef(null);

  const [taskGraph, setTaskGraph] = useState(null);
  const [taskGraphLoading, setTaskGraphLoading] = useState(false);
  const [taskGraphSelectedNodeId, setTaskGraphSelectedNodeId] = useState(null);
  const [taskGraphSelectedEdgeId, setTaskGraphSelectedEdgeId] = useState(null);
  const [taskGraphEditingNodeId, setTaskGraphEditingNodeId] = useState(null);
  const [taskGraphAddType, setTaskGraphAddType] = useState("subtask");
  const [taskGraphAddMode, setTaskGraphAddMode] = useState(false);
  const [taskGraphAutoLink, setTaskGraphAutoLink] = useState(true);

  const suppressTaskGraphSelectionRef = useRef(false);
  const taskGraphRootId = useMemo(() => (selectedTaskId ? `root_${selectedTaskId}` : null), [selectedTaskId]);

  const ensureTaskGraphRoot = useCallback(
    (graph, rootTitle, taskIdOverride) => {
      if (!graph) return graph;
      const taskIdForRoot = taskIdOverride ?? (taskGraphRootId ? String(taskGraphRootId).replace(/^root_/, "") : null);
      const rootId = taskIdOverride ? `root_${taskIdOverride}` : taskGraphRootId;
      if (!rootId) return graph;
      let nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
      let edges = Array.isArray(graph.edges) ? graph.edges : [];

      // Migration: older builds used root ids like "root0" (no underscore).
      // Normalize to the canonical root id: "root_<taskId>".
      if (taskIdOverride != null) {
        const tid = String(taskIdOverride);
        const legacyIds = [`root${tid}`, `root-${tid}`, `root:${tid}`];
        const legacyNode = nodes.find((n) => legacyIds.includes(n?.id));
        const canonicalExists = nodes.some((n) => n?.id === rootId);

        if (legacyNode) {
          // Redirect edges from legacy -> canonical.
          edges = edges.map((e) => {
            if (!e) return e;
            const next = { ...e };
            if (next.source === legacyNode.id) next.source = rootId;
            if (next.target === legacyNode.id) next.target = rootId;
            return next;
          });

          if (canonicalExists) {
            // Drop the legacy node so we don't render two roots.
            nodes = nodes.filter((n) => n?.id !== legacyNode.id);
          } else {
            // Rename the legacy node into the canonical id.
            nodes = nodes.map((n) => (n?.id === legacyNode.id ? { ...n, id: rootId } : n));
          }
        }

        // If multiple legacy roots existed, remove them all.
        nodes = nodes.filter((n) => !legacyIds.includes(n?.id));

        // Deduplicate identical edges after id normalization.
        const seen = new Set();
        edges = edges.filter((e) => {
          if (!e) return false;
          const key = `${e.source}__${e.target}__${e?.data?.kind ?? ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      const existing = nodes.find((n) => n.id === rootId);
      let nextNodes;
      if (existing) {
        // Keep title in sync with current task title.
        nextNodes = nodes.map((n) => (n.id === rootId ? { ...n, type: "rootTask", data: { ...(n.data ?? {}), title: rootTitle } } : n));
      } else {
        const rootNode = {
          id: rootId,
          type: "rootTask",
          position: { x: 240, y: 80 },
          data: { title: rootTitle, tags: [] },
        };

        nextNodes = [rootNode, ...nodes];
      }

      // Legacy migration: inside task graphs, only the root is the main task.
      // Convert any old "task" nodes into "subtask" nodes so the UI doesn't show repeated Task cards.
      nextNodes = nextNodes.map((n) => {
        if (!n || n.id === rootId) return n;
        if (n.type !== "task") return n;
        const nextData = { ...(n.data ?? {}) };
        if (!nextData.kind) nextData.kind = "subtask";
        return { ...n, type: "subtask", data: nextData };
      });

      // Ensure every non-root node has a parent (incoming contains edge).
      const containsEdges = edges.filter(isContainsEdge);
      const childIds = new Set(containsEdges.map((e) => e.target));
      const nextEdges = edges.slice();
      for (const n of nextNodes) {
        if (!n || n.id === rootId) continue;
        if (childIds.has(n.id)) continue;
        // Avoid duplicate edges if one exists but isn't marked as contains.
        const already = nextEdges.some((e) => e.source === rootId && e.target === n.id && isContainsEdge(e));
        if (already) continue;
        nextEdges.push({
          id: uid("edge"),
          source: rootId,
          target: n.id,
          data: { kind: "contains" },
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
          style: { strokeWidth: 2 },
        });
      }

      return { ...graph, nodes: nextNodes, edges: nextEdges };
    },
    [taskGraphRootId]
  );


  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const reactFlowRef = useRef(null);
  const reactFlowInstanceRef = useRef(null);
  const taskGraphInstanceRef = useRef(null);

  const closeTaskGraphInspector = useCallback(() => {
    setTaskGraphEditingNodeId(null);
  }, []);

  const openTaskGraphInspector = useCallback((nodeId) => {
    if (!nodeId) return;
    setTaskGraphEditingNodeId(nodeId);
    setTaskGraphSelectedNodeId(nodeId);
    setTaskGraphSelectedEdgeId(null);
    // Prevent the click from also flipping selection state unpredictably.
    suppressTaskGraphSelectionRef.current = true;
    setTimeout(() => {
      suppressTaskGraphSelectionRef.current = false;
    }, 0);
  }, []);

  const addTaskGraphNodeAt = useCallback(
    (screenPos) => {
      const instance = taskGraphInstanceRef.current;
      const position = instance ? instance.screenToFlowPosition(screenPos) : { x: 240, y: 160 };
      const id = uid("node");
      const type = taskGraphAddType || "subtask";
      const data =
        type === "subtask"
          ? { title: "New subtask", kind: "subtask", status: "pending", date: "", content: "", tags: [] }
          : type === "note"
            ? { title: "New note", date: "", content: "", tags: [] }
            : type === "checklist"
              ? { title: "Checklist", date: "", content: "", tags: [], items: [{ text: "First item", done: false }] }
              : type === "timeline"
                ? { title: "Timeline", date: "", content: "", tags: [] }
                : type === "resource"
                  ? { title: "Resource", url: "", tags: [] }
                  : type === "memory"
                    ? { title: "Memory", fileName: "", previewUrl: "", tags: [] }
                    : { title: "Milestone", date: "", tags: [] };

      const parentId = taskGraphSelectedNodeId || taskGraphRootId;

      setTaskGraph((g) => {
        if (!g) return g;
        const nextNodes = g.nodes.concat({ id, type, position, data });
        if (!taskGraphAutoLink || !parentId) return { ...g, nodes: nextNodes };

        const edge = {
          id: uid("edge"),
          source: parentId,
          target: id,
          data: { kind: "contains" },
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
          style: { strokeWidth: 2 },
        };
        return { ...g, nodes: nextNodes, edges: g.edges.concat(edge) };
      });
      setTaskGraphSelectedNodeId(id);
      setTaskGraphSelectedEdgeId(null);
    },
    [taskGraphAddType, taskGraphSelectedNodeId, taskGraphRootId, taskGraphAutoLink]
  );

  const deleteSelectedTaskGraphItem = useCallback(() => {
    const nodeId = taskGraphSelectedNodeId;
    const edgeId = taskGraphSelectedEdgeId;
    if (!nodeId && !edgeId) return;

    setTaskGraph((g) => {
      if (!g) return g;
      if (nodeId) {
        return {
          ...g,
          nodes: g.nodes.filter((n) => n.id !== nodeId),
          edges: g.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        };
      }
      return { ...g, edges: g.edges.filter((e) => e.id !== edgeId) };
    });
    closeTaskGraphInspector();
  }, [taskGraphSelectedNodeId, taskGraphSelectedEdgeId, closeTaskGraphInspector]);

  const lockedNodeIds = useMemo(() => computeLockedNodeIds(nodes, edges), [nodes, edges]);
  const { criticalEdgeIds } = useMemo(() => computeCriticalPath(nodes, edges), [nodes, edges]);

  const updateNodeData = useCallback((nodeId, patch) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...(n.data ?? {}), ...patch } } : n)));
  }, []);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onConnect = useCallback(
    (params) => {
      const kind = edgeKind;
      const base = {
        ...params,
        id: uid("edge"),
        data: { kind },
      };

      const edge =
        kind === "dependency"
          ? {
              ...base,
              markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
              style: { strokeWidth: 2 },
            }
          : {
              ...base,
              style: { strokeDasharray: "5 6" },
            };

      setEdges((eds) => addEdge(edge, eds));
    },
    [edgeKind]
  );

  const onInit = useCallback((instance) => {
    reactFlowInstanceRef.current = instance;
  }, []);

  const onPaneDoubleClick = useCallback(
    (event) => {
      const instance = reactFlowInstanceRef.current;
      if (!instance) return;

      const position = instance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = uid("node");
      setNodes((prev) =>
        prev.concat({
          id,
          type: "task",
          position,
          data: { title: "New task", status: "pending", content: "" },
        })
      );
      setSelectedNodeId(id);
    },
    []
  );

  const applyLayout = useCallback(
    (nextMode) => {
      setLayoutMode(nextMode);
      if (nextMode === "river") {
        setNodes((prev) => layoutRiver(prev, edges));
      }
    },
    [edges]
  );

  // Theme (apply + persist)
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const settingsRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const headerMenuRef = useRef(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  const userMenuDesktopRef = useRef(null);
  const userMenuMobileRef = useRef(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (!settingsOpen && !headerMenuOpen && !userMenuOpen) return;

    const onDown = (e) => {
      const t = e.target;
      const settingsEl = settingsRef.current;
      const headerEl = headerMenuRef.current;
      const userElDesktop = userMenuDesktopRef.current;
      const userElMobile = userMenuMobileRef.current;

      const clickedInUserMenu =
        (userElDesktop && userElDesktop.contains(t)) ||
        (userElMobile && userElMobile.contains(t));

      if (settingsOpen && settingsEl && !settingsEl.contains(t)) setSettingsOpen(false);
      if (headerMenuOpen && headerEl && !headerEl.contains(t)) setHeaderMenuOpen(false);
      if (userMenuOpen && !clickedInUserMenu) setUserMenuOpen(false);
    };

    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setSettingsOpen(false);
      setHeaderMenuOpen(false);
      setUserMenuOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [settingsOpen, headerMenuOpen, userMenuOpen]);

  // Hash routing
  useEffect(() => {
    const onHash = () => setRoute(getHashRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // If the board is opened with a query (#/board?q=...), sync it into the search box.
  useEffect(() => {
    if (routePath !== "#/board") return;
    const q = routeParams.get("q");
    if (q != null && q !== taskSearch) setTaskSearch(q);
  }, [routePath, routeParams, taskSearch]);

  // If already signed in, no need to stay on login screen.
  useEffect(() => {
    if (!user) return;
    if (routePath === "#/login") window.location.hash = "#/board";
  }, [user, routePath]);

  // When opening profile page, seed draft from current user object.
  useEffect(() => {
    if (routePath !== "#/profile") return;
    if (!user) return;
    setProfileDraft({
      full_name: user.full_name ?? "",
      phone: user.phone ?? "",
      birthday: normalizeDateOnly(user.birthday),
    });
  }, [routePath, user]);

  // API session handling
  useEffect(() => {
    apiFetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user ?? null)).catch(() => setUser(null));
  }, []);

  const signUp = useCallback(async () => {
    try {
      setAuthMsg("Registering…");
      const data = await apiJson("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
      });
      setUser(data.user);
      setAuthMsg("Registered and signed in.");
      window.location.hash = "#/board";
    } catch (e) {
      setAuthMsg(e.message);
    }
  }, [authEmail, authPassword]);

  const signIn = useCallback(async () => {
    try {
      setAuthMsg("Signing in…");
      const data = await apiJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
      });
      setUser(data.user);
      setAuthMsg("Signed in.");
      window.location.hash = "#/board";
    } catch (e) {
      setAuthMsg(e.message);
    }
  }, [authEmail, authPassword]);

  const signOut = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setUser(null);
    setTasks([]);
    setTaskSearch("");
    setTaskEditor(null);
    setStageEditor(null);
    setSelectedTaskId(null);
    setTaskGraph(null);
    setSettingsOpen(false);
    setHeaderMenuOpen(false);
    setUserMenuOpen(false);
    window.location.hash = "#/home";
  }, []);

  const fetchTasks = useCallback(async (boardIdOverride) => {
    if (!user) return;
    setTasksLoading(true);
    try {
      const boardId = boardIdOverride || activeBoardId;
      if (boardId) {
        const data = await apiJson(`/api/boards/${boardId}/tasks`, { method: "GET" });
        setTasks(data.tasks ?? []);
      } else {
        const data = await apiJson("/api/tasks", { method: "GET" });
        setTasks(data.tasks ?? []);
      }
    } catch (e) {
      setAuthMsg(e.message);
    } finally {
      setTasksLoading(false);
    }
  }, [user, activeBoardId]);

  const fetchBoardsAndColumns = useCallback(async () => {
    if (!user) return;
    setBoardMetaLoading(true);
    try {
      const b = await apiJson("/api/boards", { method: "GET" });
      const list = b.boards ?? [];
      setBoards(list);
      let boardId = activeBoardId;
      if (!boardId || !list.some((x) => x.id === boardId)) {
        const def = list.find((x) => x.is_default) || list[0];
        boardId = def?.id ?? null;
        setActiveBoardId(boardId);
      }

      if (boardId) {
        const c = await apiJson(`/api/boards/${boardId}/columns`, { method: "GET" });
        setColumns(c.columns ?? []);
        await fetchTasks(boardId);
      }
    } catch (e) {
      // If the new endpoints aren't available, keep the legacy board behavior.
      console.warn(e);
    } finally {
      setBoardMetaLoading(false);
    }
  }, [user, activeBoardId, fetchTasks]);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiJson("/api/profile", { method: "GET" });
      if (data?.user) setUser(data.user);
    } catch {
      // ignore
    }
  }, [user]);

  const saveProfile = useCallback(async () => {
    if (!user) return;
    try {
      const payload = {
        full_name: String(profileDraft.full_name ?? "").trim() || null,
        phone: String(profileDraft.phone ?? "").trim() || null,
        birthday: normalizeDateOnly(profileDraft.birthday) || null,
      };
      const data = await apiJson("/api/profile", { method: "PUT", body: JSON.stringify(payload) });
      if (data?.user) setUser(data.user);
      setAuthMsg("Profile saved.");
    } catch (e) {
      setAuthMsg(e.message);
    }
  }, [user, profileDraft]);

  useEffect(() => {
    if (routePath !== "#/board") return;
    if (!user) return;
    fetchBoardsAndColumns();
  }, [routePath, user, fetchBoardsAndColumns]);

  const createTask = useCallback(async (partial) => {
    if (!user) return;
    try {
      const boardId = activeBoardId;
      const colId = partial.column_id || null;
      const colName = colId ? columns.find((c) => c.id === colId)?.name : null;
      await apiJson("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: partial.title,
          description: partial.description,
          status: colName || partial.status || "planning",
          board_id: boardId || undefined,
          column_id: colId || undefined,
          due_date: partial.due_date || null,
        }),
      });
      await fetchTasks(boardId);
    } catch (e) {
      setAuthMsg(e.message);
    }
  }, [user, activeBoardId, columns, fetchTasks]);

  const updateTask = useCallback(async (id, patch) => {
    if (!user) return;
    try {
      const boardId = activeBoardId;
      const colId = patch.column_id !== undefined ? patch.column_id : undefined;
      const colName = colId ? columns.find((c) => c.id === colId)?.name : null;
      await apiJson(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: patch.title,
          description: patch.description,
          status: colName || patch.status,
          board_id: patch.board_id,
          column_id: colId,
          due_date: patch.due_date,
        }),
      });
      await fetchTasks(boardId);
    } catch (e) {
      setAuthMsg(e.message);
    }
  }, [user, activeBoardId, columns, fetchTasks]);

  const deleteTask = useCallback(async (id) => {
    if (!user) return;
    try {
      await apiJson(`/api/tasks/${id}`, { method: "DELETE" });
      await fetchTasks(activeBoardId);
      if (selectedTaskId === id) {
        setSelectedTaskId(null);
        setTaskGraph(null);
      }
    } catch (e) {
      setAuthMsg(e.message);
    }
  }, [user, activeBoardId, fetchTasks, selectedTaskId]);

  const fetchTaskGraph = useCallback(async (taskId) => {
    if (!user || !taskId) return;
    setTaskGraphLoading(true);
    try {
      const data = await apiJson(`/api/tasks/${taskId}/graph`, { method: "GET" });
      const t = tasks.find((x) => x.id === taskId);
      const title = String(t?.title ?? "Task");
      const baseGraph = data?.graph && typeof data.graph === "object" ? data.graph : { nodes: [], edges: [] };
      setTaskGraph(ensureTaskGraphRoot(baseGraph, title, taskId));
    } catch (e) {
      setAuthMsg(e.message);
    } finally {
      setTaskGraphLoading(false);
    }
  }, [user, tasks, ensureTaskGraphRoot]);

  // When a task graph is open on desktop, shrink the Kanban area to give the graph more space.
  useEffect(() => {
    if (!selectedTaskId) {
      setBoardSidebarOpen(true);
      return;
    }
    if (!isMobile) setBoardSidebarOpen(false);
  }, [selectedTaskId, isMobile]);

  // Persist task graph (debounced)
  useEffect(() => {
    if (!user || !selectedTaskId || !taskGraph) return;
    const handle = setTimeout(() => {
      apiFetch(`/api/tasks/${selectedTaskId}/graph`, {
        method: "PUT",
        body: JSON.stringify({ graph: taskGraph }),
      }).catch(() => null);
    }, 350);
    return () => clearTimeout(handle);
  }, [user, selectedTaskId, taskGraph]);

  // Persist to localStorage (debounced)
  useEffect(() => {
    const handle = setTimeout(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          nodes,
          edges,
          layoutMode,
          edgeKind,
        })
      );
    }, 200);

    return () => clearTimeout(handle);
  }, [nodes, edges, layoutMode, edgeKind]);

  // Edge class names for critical path + reference
  const edgesForRender = useMemo(() => {
    return edges.map((e) => {
      const classes = [];
      if (criticalEdgeIds.has(e.id)) classes.push("critical");
      if (e?.data?.kind === "reference") classes.push("reference");
      return { ...e, className: classes.join(" ") };
    });
  }, [edges, criticalEdgeIds]);

  const nodeTypes = useMemo(
    () => ({
      rootTask: RootTaskNode,
      task: TaskNode,
      subtask: TaskNode,
      memory: MemoryNode,
      milestone: MilestoneNode,
      note: NoteNode,
      checklist: ChecklistNode,
      timeline: TimelineNode,
      resource: ResourceNode,
    }),
    []
  );

  const actions = useMemo(
    () => ({
      updateNodeData,
      lockedNodeIds,
      openNodeEditor: (nodeId) => {
        // Only task graphs have an inspector editor today.
        if (!selectedTaskId || !taskGraph) return;
        const node = (taskGraph.nodes || []).find((n) => n.id === nodeId);
        if (node?.type === "rootTask") {
          const t = tasks.find((x) => x.id === selectedTaskId);
          if (t) setTaskEditor({ mode: "edit", task: { ...t } });
          return;
        }
        openTaskGraphInspector(nodeId);
      },
      openMainTaskEditor: () => {
        if (!selectedTaskId) return;
        const t = tasks.find((x) => x.id === selectedTaskId);
        if (t) setTaskEditor({ mode: "edit", task: { ...t } });
      },
    }),
    [updateNodeData, lockedNodeIds, selectedTaskId, taskGraph, openTaskGraphInspector, tasks]
  );

  const onSelectionChange = useCallback((sel) => {
    const next = sel?.nodes?.[0]?.id ?? null;
    setSelectedNodeId(next);
  }, []);

  const clearGraph = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = loadInitialGraph();
    setNodes(fresh.nodes);
    setEdges(fresh.edges);
    setLayoutMode(fresh.layoutMode ?? "brain");
    setEdgeKind(fresh.edgeKind ?? "reference");
    setSelectedNodeId(null);
  }, []);

  const addMilestone = useCallback(() => {
    const instance = reactFlowInstanceRef.current;
    const position = instance ? instance.screenToFlowPosition({ x: window.innerWidth * 0.55, y: window.innerHeight * 0.35 }) : { x: 400, y: 200 };
    const id = uid("node");
    setNodes((prev) => prev.concat({ id, type: "milestone", position, data: { title: "Milestone", date: "" } }));
    setSelectedNodeId(id);
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    if (!isDraggingFile) setIsDraggingFile(true);
  }, [isDraggingFile]);

  const onDragLeave = useCallback(() => {
    setIsDraggingFile(false);
  }, []);

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDraggingFile(false);

    const files = Array.from(e.dataTransfer?.files ?? []);
    if (!files.length) return;

    const instance = reactFlowInstanceRef.current;
    const position = instance ? instance.screenToFlowPosition({ x: e.clientX, y: e.clientY }) : { x: 120, y: 120 };

    for (const file of files) {
      const id = uid("node");

      let previewUrl = null;
      const isSmallImage = file.type.startsWith("image/") && file.size <= 500_000;
      if (isSmallImage) {
        previewUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
      }

      setNodes((prev) =>
        prev.concat({
          id,
          type: "memory",
          position: { x: position.x + Math.random() * 20, y: position.y + Math.random() * 20 },
          data: {
            title: file.name,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            previewUrl,
          },
        })
      );
      setSelectedNodeId(id);
    }
  }, []);

  const renderPanelContent = (node) => {
    if (!node) {
      return html`
        <div>
          <div className="panelHeader">
            <div>
              <div className="name">No selection</div>
              <div className="meta">Select a node to edit details</div>
            </div>
          </div>

          <div className="field">
            <div className="label">Quick actions</div>
            <div style=${{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button className="btn primary" onClick=${() => applyLayout(layoutMode === "brain" ? "river" : "brain")}>Toggle ${layoutMode === "brain" ? "River" : "Brain"}</button>
              <button className="btn" onClick=${addMilestone}>Add milestone</button>
              <button className="btn danger" onClick=${clearGraph}>Reset demo</button>
            </div>
          </div>

          <div className="field">
            <div className="label">Tips</div>
            <div className="meta">
              - Double-click the canvas to create a task node<br />
              - Drag a file onto the canvas to create a memory node<br />
              - Connect nodes (drag from handles) to create edges
            </div>
          </div>
        </div>
      `;
    }

    const type = node.type;
    const locked = lockedNodeIds.has(node.id);

    return html`
      <div>
        <div className="panelHeader">
          <div>
            <div className="name">${type.toUpperCase()}</div>
            <div className="meta">${locked ? "Blocked by unfinished dependencies" : ""}</div>
          </div>
          <button className="btn" onClick=${() => setSelectedNodeId(null)}>Close</button>
        </div>

        <div className="field">
          <div className="label">Title</div>
          <input className="input" value=${node.data?.title ?? ""} onChange=${(e) => updateNodeData(node.id, { title: e.target.value })} />
        </div>

        ${type !== "memory"
          ? html`
              <div className="field">
                <div className="label">Date</div>
                <input className="input" placeholder="YYYY-MM-DD" value=${node.data?.date ?? ""} onChange=${(e) => updateNodeData(node.id, { date: e.target.value })} />
              </div>
            `
          : html``}

        ${type === "task"
          ? html`
              <div className="field">
                <div className="label">Status</div>
                <select className="select" value=${node.data?.status ?? "pending"} onChange=${(e) => updateNodeData(node.id, { status: e.target.value })}>
                  <option value="pending">To Do</option>
                  <option value="done">Done</option>
                </select>
              </div>
            `
          : html``}

        <div className="field">
          <div className="label">Notes</div>
          <textarea className="textarea" value=${node.data?.content ?? ""} onChange=${(e) => updateNodeData(node.id, { content: e.target.value })}></textarea>
        </div>

        ${type === "memory" && node.data?.fileName
          ? html`
              <div className="field">
                <div className="label">Attachment</div>
                <div className="meta">${node.data.fileName} (${node.data.mimeType ?? ""})</div>
              </div>
            `
          : html``}
      </div>
    `;
  };

  const renderLogin = () => {
    const mode = (routeParams.get("mode") || "").toLowerCase() === "register" ? "register" : "login";
    return html`
      <div className="screen">
        <div className="topbar">
          <div className="headerBlock">
            <div
              className="brand brandLink"
              role="button"
              tabIndex="0"
              onClick=${() => (window.location.hash = "#/home")}
              onKeyDown=${(e) => {
                if (e.key === "Enter") window.location.hash = "#/home";
              }}
              title="Home"
            >
              <img className="brandLogo" src="/logo.png" alt="Emonat" />
              <div className="title">Emonat</div>
            </div>

            <div className="headerRight desktopOnly">
              <div className="searchBar" role="search">
                <input
                  className="input searchInput"
                  placeholder="Search tasks…"
                  title=${!user ? "Login to search" : "Search tasks"}
                  value=${taskSearch}
                  disabled=${!user}
                  onChange=${(e) => setTaskSearch(e.target.value)}
                  onKeyDown=${(e) => {
                    if (e.key === "Escape") setTaskSearch("");
                    if (e.key === "Enter") {
                      if (!user) window.location.hash = "#/login?mode=login";
                      else window.location.hash = `#/board?q=${encodeURIComponent(taskSearch.trim())}`;
                    }
                  }}
                />
                ${taskSearch
                  ? html`<button className="btn" onClick=${() => setTaskSearch("")} title="Clear">Clear</button>`
                  : html``}
              </div>

              <button className=${`btn ${routePath === "#/board" ? "active" : ""}`} onClick=${() => (window.location.hash = "#/board")}>Board</button>

              <div className="menuWrap" ref=${settingsRef}>
                <button
                  className="btn iconBtn"
                  onClick=${() => {
                    setHeaderMenuOpen(false);
                    setSettingsOpen((v) => !v);
                  }}
                  title="Settings"
                  aria-label="Settings"
                >
                  ${GearIcon()}
                </button>
                ${settingsOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <button
                          className="btn menuItem"
                          onClick=${() => {
                            setTheme((t) => (t === "dark" ? "light" : "dark"));
                            setSettingsOpen(false);
                          }}
                        >
                          <span className="menuIcon">${theme === "dark" ? SunIcon() : MoonIcon()}</span>
                          <span>${theme === "dark" ? "Switch to light" : "Switch to dark"}</span>
                        </button>
                      </div>
                    `
                  : html``}
              </div>

              ${user
                ? html`
                    <div className="menuWrap" ref=${userMenuDesktopRef}>
                      <button
                        className="btn avatarBtn"
                        onClick=${() => {
                          setHeaderMenuOpen(false);
                          setSettingsOpen(false);
                          setUserMenuOpen((v) => !v);
                        }}
                        title=${user.email}
                        aria-label="User menu"
                      >
                        <span className="avatarCircle">${avatarInitial(user.email)}</span>
                      </button>
                      ${userMenuOpen
                        ? html`
                            <div className="menu" onClick=${(e) => e.stopPropagation()}>
                              <div className="menuTitle">Signed in</div>
                              <div className="menuMeta">${user.email}</div>
                              <div className="menuDivider"></div>
                              <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/profile"; }}>
                                <span className="menuIcon">${UserIcon()}</span>
                                <span>View my profile</span>
                              </button>
                              <div className="menuDivider"></div>
                              <button className="btn menuItem danger" onClick=${() => { signOut(); setUserMenuOpen(false); }}>
                                <span className="menuIcon">${LogoutIcon()}</span>
                                <span>Logout</span>
                              </button>
                            </div>
                          `
                        : html``}
                    </div>
                  `
                : html``}
            </div>

            <div className="mobileActions mobileOnly">
              ${user
                ? html`
                    <div className="menuWrap" ref=${userMenuMobileRef}>
                      <button
                        className="btn avatarBtn"
                        onClick=${() => {
                          setHeaderMenuOpen(false);
                          setSettingsOpen(false);
                          setUserMenuOpen((v) => !v);
                        }}
                        title=${user.email}
                        aria-label="User menu"
                      >
                        <span className="avatarCircle">${avatarInitial(user.email)}</span>
                      </button>
                      ${userMenuOpen
                        ? html`
                            <div className="menu" onClick=${(e) => e.stopPropagation()}>
                              <div className="menuTitle">Signed in</div>
                              <div className="menuMeta">${user.email}</div>
                              <div className="menuDivider"></div>
                              <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/profile"; }}>
                                <span className="menuIcon">${UserIcon()}</span>
                                <span>View my profile</span>
                              </button>
                              <div className="menuDivider"></div>
                              <button className="btn menuItem danger" onClick=${() => { signOut(); setUserMenuOpen(false); }}>
                                <span className="menuIcon">${LogoutIcon()}</span>
                                <span>Logout</span>
                              </button>
                            </div>
                          `
                        : html``}
                    </div>
                  `
                : html``}

              <div className="menuWrap" ref=${headerMenuRef}>
                <button
                  className="btn iconBtn"
                  onClick=${() => {
                    setUserMenuOpen(false);
                    setSettingsOpen(false);
                    setHeaderMenuOpen((v) => !v);
                  }}
                  title="Menu"
                  aria-label="Menu"
                >
                  ${BurgerIcon()}
                </button>
                ${headerMenuOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <button className="btn menuItem" onClick=${() => { setHeaderMenuOpen(false); window.location.hash = "#/board"; }}>
                          <span className="menuIcon">${BoardIcon()}</span>
                          <span>Board</span>
                        </button>

                        <div className="searchBar" role="search">
                          <input
                            className="input searchInput"
                            placeholder="Search tasks…"
                            title=${!user ? "Login to search" : "Search tasks"}
                            value=${taskSearch}
                            disabled=${!user}
                            onChange=${(e) => setTaskSearch(e.target.value)}
                            onKeyDown=${(e) => {
                              if (e.key === "Escape") setTaskSearch("");
                              if (e.key === "Enter") {
                                setHeaderMenuOpen(false);
                                if (!user) window.location.hash = "#/login?mode=login";
                                else window.location.hash = `#/board?q=${encodeURIComponent(taskSearch.trim())}`;
                              }
                            }}
                          />
                          ${taskSearch
                            ? html`<button className="btn" onClick=${() => setTaskSearch("")} title="Clear">Clear</button>`
                            : html``}
                        </div>

                        <div className="menuDivider"></div>

                        <button
                          className="btn menuItem"
                          onClick=${() => {
                            setTheme((t) => (t === "dark" ? "light" : "dark"));
                            setHeaderMenuOpen(false);
                          }}
                        >
                          <span className="menuIcon">${theme === "dark" ? SunIcon() : MoonIcon()}</span>
                          <span>${theme === "dark" ? "Switch to light" : "Switch to dark"}</span>
                        </button>
                      </div>
                    `
                  : html``}
              </div>
            </div>
          </div>
        </div>

        <div className="screenBody">
          <div className="card" style=${{ maxWidth: "560px", margin: "0 auto" }}>
            <div className="panelHeader">
              <div>
                <div className="name">${mode === "register" ? "Create your account" : "Welcome back"}</div>
                <div className="meta">Use your email and password.</div>
              </div>
            </div>

            ${user
              ? html`
                  <div className="row" style=${{ marginTop: "10px" }}>
                    <div className="muted">Signed in as <strong>${user.email}</strong></div>
                    <div className="spacer"></div>
                    <button className="btn" onClick=${() => (window.location.hash = "#/board")}>Go to Board</button>
                    <button className="btn danger" onClick=${signOut}>Sign out</button>
                  </div>
                `
              : html`
                  <div className="authCard">
                    <div className="field">
                      <div className="label">Email</div>
                      <input className="input" placeholder="you@example.com" value=${authEmail} onChange=${(e) => setAuthEmail(e.target.value)} />
                    </div>

                    <div className="field">
                      <div className="label">Password</div>
                      <input
                        className="input"
                        placeholder=${mode === "register" ? "Create a password (min 8 chars)" : "Your password"}
                        type="password"
                        value=${authPassword}
                        onChange=${(e) => setAuthPassword(e.target.value)}
                        onKeyDown=${(e) => {
                          if (e.key === "Enter") {
                            if (mode === "register") signUp();
                            else signIn();
                          }
                        }}
                      />
                    </div>

                    <div className="authActions">
                      <button className="btn primary" onClick=${mode === "register" ? signUp : signIn}>
                        ${mode === "register" ? "Register" : "Login"}
                      </button>
                    </div>

                    <div className="authLinks">
                      <div className="muted">
                        ${mode === "login" ? "No account?" : "Already have an account?"}
                        ${" "}
                        <button
                          className="linkBtn"
                          onClick=${() => {
                            setAuthMsg("");
                            window.location.hash = mode === "login" ? "#/login?mode=register" : "#/login?mode=login";
                          }}
                        >
                          ${mode === "login" ? "Register" : "Login"}
                        </button>
                      </div>
                      ${mode === "login"
                        ? html`
                            <button
                              className="linkBtn"
                              onClick=${() => {
                                setAuthMsg(
                                  "Forgot password isn't implemented yet. If you need a reset, ask the admin or we can add an email reset flow."
                                );
                              }}
                            >
                              Forgot password?
                            </button>
                          `
                        : html``}
                    </div>
                  </div>
                `}

            ${authMsg ? html`<div className="muted" style=${{ marginTop: "12px" }}>${authMsg}</div>` : html``}
          </div>
        </div>
      </div>
    `;
  };

  const renderBoard = () => {
    if (!user) return renderLogin();

    const orderedColumns = (columns?.length
      ? [...columns].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      : [
          { id: "planning", name: "planning", order_index: 0 },
          { id: "doing", name: "doing", order_index: 1 },
          { id: "done", name: "done", order_index: 2 },
        ]
    ).map((c) => ({ ...c, name: String(c.name || "").trim() || "untitled" }));

    const q = taskSearch.trim().toLowerCase();
    const visibleTasks = q
      ? tasks.filter((t) => {
          const hay = `${t.title ?? ""}\n${t.description ?? ""}\n${t.due_date ?? ""}`.toLowerCase();
          return hay.includes(q);
        })
      : tasks;

    const tasksForColumn = (col) => {
      const colName = col?.name;
      const colId = col?.id;
      return visibleTasks.filter((t) => {
        if (t.column_id && colId) return t.column_id === colId;
        return (t.status || "planning") === colName;
      });
    };

    const openNew = () => {
      const first = orderedColumns[0];
      setTaskEditor({
        mode: "new",
        task: {
          title: "",
          description: "",
          status: first?.name || "planning",
          column_id: first?.id || null,
          due_date: "",
        },
      });
    };
    const openEdit = (task) => setTaskEditor({ mode: "edit", task: { ...task } });

    const openTaskGraph = (task) => {
      setSelectedTaskId(task.id);
      setTaskGraphSelectedNodeId(`root_${task.id}`);
      setTaskGraphSelectedEdgeId(null);
      setTaskGraphEditingNodeId(null);
      setTaskGraphAddMode(false);
      fetchTaskGraph(task.id);
    };

    const backToBoardDashboard = () => {
      // If already on #/board, clicking the Board button should still reset the view
      // back to the Kanban dashboard (close any open task graph).
      setSelectedTaskId(null);
      setTaskGraph(null);
      setBoardSidebarOpen(true);
      if (window.location.hash !== "#/board") window.location.hash = "#/board";
    };

    const showSidebar = !selectedTaskId || isMobile || boardSidebarOpen;

    const openNewStage = () => {
      if (!activeBoardId) return;
      setStageEditor({ mode: "new", name: "", description: "" });
    };

    const saveStage = async () => {
      if (!activeBoardId) return;
      if (!stageEditor) return;
      const name = String(stageEditor.name ?? "").trim();
      if (!name) return;
      const description = String(stageEditor.description ?? "").trim() || null;
      try {
        const orderIndex = orderedColumns.length;
        await apiJson(`/api/boards/${activeBoardId}/columns`, {
          method: "POST",
          body: JSON.stringify({ name, description, order_index: orderIndex }),
        });
        setStageEditor(null);
        await fetchBoardsAndColumns();
      } catch (e) {
        setAuthMsg(e.message);
      }
    };

    const persistColumnOrder = async (nextCols) => {
      // Persist sequential order_index.
      // This keeps ordering stable and avoids collisions.
      const updates = nextCols.map((c, index) =>
        apiJson(`/api/columns/${c.id}`, { method: "PATCH", body: JSON.stringify({ order_index: index }) })
      );
      await Promise.all(updates);
    };

    const reorderColumnsByDrag = async (fromId, toId) => {
      if (!activeBoardId) return;
      if (!fromId || !toId || fromId === toId) return;
      const fromIndex = orderedColumns.findIndex((c) => c.id === fromId);
      const toIndex = orderedColumns.findIndex((c) => c.id === toId);
      if (fromIndex < 0 || toIndex < 0) return;

      const next = [...orderedColumns];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      // Only for real DB columns (uuid-like ids).
      if (next.some((c) => !c.id || String(c.id).length < 10)) return;

      try {
        await persistColumnOrder(next);
        await fetchBoardsAndColumns();
      } catch (e) {
        setAuthMsg(e.message);
      }
    };

    const moveColumn = async (colId, dir) => {
      const i = orderedColumns.findIndex((c) => c.id === colId);
      if (i < 0) return;
      const j = dir === "left" ? i - 1 : i + 1;
      if (j < 0 || j >= orderedColumns.length) return;

      const a = orderedColumns[i];
      const b = orderedColumns[j];
      // Only supported for real DB columns.
      if (!a?.id || !b?.id || a.id.length < 10 || b.id.length < 10) return;

      try {
        await apiJson(`/api/columns/${a.id}`, { method: "PATCH", body: JSON.stringify({ order_index: b.order_index }) });
        await apiJson(`/api/columns/${b.id}`, { method: "PATCH", body: JSON.stringify({ order_index: a.order_index }) });
        await fetchBoardsAndColumns();
      } catch (e) {
        setAuthMsg(e.message);
      }
    };

    const saveEditor = async () => {
      if (!taskEditor) return;
      if (taskEditor.mode === "new") {
        await createTask(taskEditor.task);
      } else {
        await updateTask(taskEditor.task.id, taskEditor.task);
      }
      setTaskEditor(null);
    };

    return html`
      <div className="screen">
        <div className="topbar">
          <div className="headerBlock">
            <div
              className="brand brandLink"
              role="button"
              tabIndex="0"
              onClick=${() => (window.location.hash = "#/home")}
              onKeyDown=${(e) => {
                if (e.key === "Enter") window.location.hash = "#/home";
              }}
              title="Home"
            >
              <img className="brandLogo" src="/logo.png" alt="Emonat" />
              <div className="title">Emonat</div>
            </div>

            <div className="headerRight desktopOnly">
              <div className="searchBar" role="search">
                <input
                  className="input searchInput"
                  placeholder="Search tasks…"
                  value=${taskSearch}
                  onChange=${(e) => setTaskSearch(e.target.value)}
                  onKeyDown=${(e) => {
                    if (e.key === "Escape") setTaskSearch("");
                  }}
                />
                ${taskSearch
                  ? html`<button className="btn" onClick=${() => setTaskSearch("")} title="Clear">Clear</button>`
                  : html``}
              </div>

              <button className="btn primary" onClick=${() => openNew()}>+ New task</button>
              <button
                className="btn iconBtn circleBtn"
                onClick=${openNewStage}
                disabled=${!activeBoardId || boardMetaLoading}
                title="New task group"
                aria-label="New task group"
              >
                ${PlusIcon()}
              </button>

              <button className=${`btn ${routePath === "#/board" ? "active" : ""}`} onClick=${backToBoardDashboard}>Board</button>

              <div className="menuWrap" ref=${settingsRef}>
                <button
                  className="btn iconBtn"
                  onClick=${() => {
                    setHeaderMenuOpen(false);
                    setSettingsOpen((v) => !v);
                  }}
                  title="Menu"
                  aria-label="Menu"
                >
                  ${GearIcon()}
                </button>
                ${settingsOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <button className="btn menuItem" onClick=${() => { fetchTasks(); setSettingsOpen(false); }}>
                          <span className="menuIcon">${RefreshIcon()}</span>
                          <span>Refresh</span>
                        </button>
                        <div className="menuDivider"></div>
                        <button
                          className="btn menuItem"
                          onClick=${() => {
                            setTheme((t) => (t === "dark" ? "light" : "dark"));
                            setSettingsOpen(false);
                          }}
                        >
                          <span className="menuIcon">${theme === "dark" ? SunIcon() : MoonIcon()}</span>
                          <span>${theme === "dark" ? "Switch to light" : "Switch to dark"}</span>
                        </button>
                      </div>
                    `
                  : html``}
              </div>

              <div className="menuWrap" ref=${userMenuDesktopRef}>
                <button
                  className="btn avatarBtn"
                  onClick=${() => {
                    setHeaderMenuOpen(false);
                    setSettingsOpen(false);
                    setUserMenuOpen((v) => !v);
                  }}
                  title=${user.email}
                  aria-label="User menu"
                >
                  <span className="avatarCircle">${avatarInitial(user.email)}</span>
                </button>
                ${userMenuOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <div className="menuTitle">Signed in</div>
                        <div className="menuMeta">${user.email}</div>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/profile"; }}>
                          <span className="menuIcon">${UserIcon()}</span>
                          <span>View my profile</span>
                        </button>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem danger" onClick=${() => { signOut(); setUserMenuOpen(false); }}>
                          <span className="menuIcon">${LogoutIcon()}</span>
                          <span>Logout</span>
                        </button>
                      </div>
                    `
                  : html``}
              </div>
            </div>

            <div className="mobileActions mobileOnly">
              <div className="menuWrap" ref=${userMenuMobileRef}>
                <button
                  className="btn avatarBtn"
                  onClick=${() => {
                    setHeaderMenuOpen(false);
                    setSettingsOpen(false);
                    setUserMenuOpen((v) => !v);
                  }}
                  title=${user.email}
                  aria-label="User menu"
                >
                  <span className="avatarCircle">${avatarInitial(user.email)}</span>
                </button>
                ${userMenuOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <div className="menuTitle">Signed in</div>
                        <div className="menuMeta">${user.email}</div>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/profile"; }}>
                          <span className="menuIcon">${UserIcon()}</span>
                          <span>View my profile</span>
                        </button>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem danger" onClick=${() => { signOut(); setUserMenuOpen(false); }}>
                          <span className="menuIcon">${LogoutIcon()}</span>
                          <span>Logout</span>
                        </button>
                      </div>
                    `
                  : html``}
              </div>

              <div className="menuWrap" ref=${headerMenuRef}>
              <button
                className="btn iconBtn"
                onClick=${() => {
                  setUserMenuOpen(false);
                  setSettingsOpen(false);
                  setHeaderMenuOpen((v) => !v);
                }}
                title="Menu"
                aria-label="Menu"
              >
                ${BurgerIcon()}
              </button>
              ${headerMenuOpen
                ? html`
                    <div className="menu" onClick=${(e) => e.stopPropagation()}>
                      <button className="btn menuItem" onClick=${() => { setHeaderMenuOpen(false); backToBoardDashboard(); }}>
                        <span className="menuIcon">${BoardIcon()}</span>
                        <span>Board</span>
                      </button>

                      <div className="searchBar" role="search">
                        <input
                          className="input searchInput"
                          placeholder="Search tasks…"
                          value=${taskSearch}
                          onChange=${(e) => setTaskSearch(e.target.value)}
                          onKeyDown=${(e) => {
                            if (e.key === "Escape") setTaskSearch("");
                            if (e.key === "Enter") setHeaderMenuOpen(false);
                          }}
                        />
                        ${taskSearch
                          ? html`<button className="btn" onClick=${() => setTaskSearch("")} title="Clear">Clear</button>`
                          : html``}
                      </div>

                      <div className="menuDivider"></div>

                      <button className="btn menuItem" onClick=${() => { openNew(); setHeaderMenuOpen(false); }}>
                        <span className="menuIcon">+</span>
                        <span>New task</span>
                      </button>
                      <button className="btn menuItem" onClick=${() => { fetchTasks(); setHeaderMenuOpen(false); }}>
                        <span className="menuIcon">${RefreshIcon()}</span>
                        <span>Refresh</span>
                      </button>

                      <div className="menuDivider"></div>

                      <button
                        className="btn menuItem"
                        onClick=${() => {
                          setTheme((t) => (t === "dark" ? "light" : "dark"));
                          setHeaderMenuOpen(false);
                        }}
                      >
                        <span className="menuIcon">${theme === "dark" ? SunIcon() : MoonIcon()}</span>
                        <span>${theme === "dark" ? "Switch to light" : "Switch to dark"}</span>
                      </button>
                    </div>
                  `
                : html``}
              </div>
            </div>
          </div>
        </div>

        <div className="screenBody">
          ${(tasksLoading || boardMetaLoading) ? html`<div className="muted">Loading…</div>` : html``}
          <div
            style=${{
              display: "grid",
              gridTemplateColumns: selectedTaskId && !isMobile ? (showSidebar ? "360px 1fr" : "1fr") : "1fr",
              gap: "14px",
              alignItems: "start",
            }}
          >
            ${showSidebar
              ? html`
                  <div className=${`kanban ${selectedTaskId && !isMobile ? "kanbanSidebar" : ""}`}>
              ${orderedColumns.map((col, idx) => {
              const title = col.name === "planning" ? "Planning" : col.name === "doing" ? "Doing" : col.name === "done" ? "Done" : col.name;
              const colTasks = tasksForColumn(col);
              return html`
                <div className="col">
                  <div
                    className="colHeader colHeaderDraggable"
                    draggable=${!isMobile && activeBoardId && String(col.id).length > 10}
                    onDragStart=${(e) => {
                      columnDragIdRef.current = col.id;
                      try {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", col.id);
                      } catch {}
                    }}
                    onDragEnd=${() => {
                      columnDragIdRef.current = null;
                    }}
                    onDragOver=${(e) => {
                      if (isMobile) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop=${(e) => {
                      e.preventDefault();
                      const fromId = columnDragIdRef.current;
                      const toId = col.id;
                      columnDragIdRef.current = null;
                      reorderColumnsByDrag(fromId, toId);
                    }}
                    title=${!isMobile ? "Drag to reorder" : ""}
                  >
                    <div className="colTitle" title=${col.description ? String(col.description) : title}>${title}</div>
                    <div className="row" style=${{ gap: "6px" }}>
                      ${!isMobile && orderedColumns.length > 1
                        ? html`
                            <button className="btn iconBtn" style=${{ padding: "4px 8px" }} disabled=${idx === 0} onClick=${() => moveColumn(col.id, "left")} title="Move left" aria-label="Move left">${LeftIcon()}</button>
                            <button className="btn iconBtn" style=${{ padding: "4px 8px" }} disabled=${idx === orderedColumns.length - 1} onClick=${() => moveColumn(col.id, "right")} title="Move right" aria-label="Move right">${RightIcon()}</button>
                          `
                        : html``}
                      <div className="pill">${colTasks.length}</div>
                    </div>
                  </div>

                  <div style=${{ display: "grid", gap: "10px" }}>
                    ${colTasks.map((t) => {
                      return html`
                        <div className="taskCard" onClick=${() => openTaskGraph(t)}>
                          <div className="row">
                            <div className="taskTitle">${truncate(t.title, 80)}</div>
                            <div className="spacer"></div>
                            ${t.due_date ? html`<span className="pill">Due ${formatDateDMY(t.due_date)}</span>` : html``}
                          </div>
                          ${t.description ? html`<div className="taskDesc">${truncate(t.description, 160)}</div>` : html`<div className="taskDesc">(no description)</div>`}
                          <div className="row" style=${{ marginTop: "4px" }}>
                            <span className="pill">Open graph</span>
                            <div className="spacer"></div>
                            <button className="btn" style=${{ padding: "6px 8px" }} onClick=${(e) => { e.stopPropagation(); openEdit(t); }}>Edit</button>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                </div>
              `;
              })}
                  </div>
                `
              : html``}

            ${selectedTaskId
              ? html`
                  <div className="card" style=${{ minHeight: "420px" }}>
                    <div className="panelHeader">
                      <div>
                        <div className="name">${(tasks.find((t) => t.id === selectedTaskId)?.title || "Task")}</div>
                      </div>
                      <div className="row" style=${{ gap: "8px" }}>
                        ${!isMobile
                          ? html`
                              <button className="btn" onClick=${() => setBoardSidebarOpen((v) => !v)}>
                                ${showSidebar ? "Hide tasks" : "Show tasks"}
                              </button>
                            `
                          : html``}
                        <button className="btn" onClick=${() => { setSelectedTaskId(null); setTaskGraph(null); setTaskGraphSelectedNodeId(null); }}>Close</button>
                      </div>
                    </div>

                    ${taskGraphLoading || !taskGraph
                      ? html`<div className="muted" style=${{ padding: "10px 0" }}>Loading graph…</div>`
                      : html`
                          <div className="graphToolbar">
                            <label className="row" style=${{ gap: "8px" }}>
                              <select className="select" value=${taskGraphAddType} onChange=${(e) => setTaskGraphAddType(e.target.value)} title="Node type">
                                <option value="subtask">Subtask</option>
                                <option value="note">Note</option>
                                <option value="resource">Resource</option>
                                <option value="checklist">Checklist</option>
                                <option value="timeline">Timeline</option>
                                <option value="milestone">Milestone</option>
                                <option value="memory">Memory</option>
                              </select>
                            </label>

                            <button
                              className=${`btn iconBtn ${taskGraphAddMode ? "primary" : ""}`}
                              title=${taskGraphAddMode ? "Click on canvas to add (Esc to stop)" : "Enable click-to-add"}
                              onClick=${() => setTaskGraphAddMode((v) => !v)}
                            >
                              <${PointerIcon} />
                            </button>

                            <button
                              className="btn iconBtn"
                              title="Add node"
                              onClick=${() => {
                                addTaskGraphNodeAt({ x: window.innerWidth * 0.62, y: window.innerHeight * 0.42 });
                              }}
                            >
                              <${PlusIcon} />
                            </button>

                            <label className="row" style=${{ gap: "8px" }}>
                              <select
                                className="select"
                                value=${taskGraph.edgeKind ?? "reference"}
                                onChange=${(e) => setTaskGraph((g) => ({ ...g, edgeKind: e.target.value }))}
                                title="Edge type"
                              >
                                <option value="contains">Parent → Child</option>
                                <option value="reference">Reference</option>
                                <option value="dependency">Dependency</option>
                              </select>
                            </label>

                            <button
                              className=${`btn ${taskGraphAutoLink ? "primary" : ""}`}
                              title=${taskGraphAutoLink ? "Auto-link ON: new nodes become children" : "Auto-link OFF"}
                              onClick=${() => setTaskGraphAutoLink((v) => !v)}
                            >
                              ${taskGraphAutoLink ? "Auto-link" : "Manual"}
                            </button>

                            <button
                              className="btn iconBtn"
                              title="Zoom in"
                              onClick=${() => {
                                const instance = taskGraphInstanceRef.current;
                                if (!instance?.getZoom || !instance?.setViewport) return;
                                const z = instance.getZoom();
                                instance.setViewport({ x: instance.getViewport().x, y: instance.getViewport().y, zoom: Math.min(2.2, z + 0.2) }, { duration: 160 });
                              }}
                            >
                              <${ZoomInIcon} />
                            </button>

                            <button
                              className="btn iconBtn"
                              title="Zoom out"
                              onClick=${() => {
                                const instance = taskGraphInstanceRef.current;
                                if (!instance?.getZoom || !instance?.setViewport) return;
                                const z = instance.getZoom();
                                instance.setViewport({ x: instance.getViewport().x, y: instance.getViewport().y, zoom: Math.max(0.35, z - 0.2) }, { duration: 160 });
                              }}
                            >
                              <${ZoomOutIcon} />
                            </button>

                            <button
                              className="btn iconBtn"
                              title="Fit view"
                              onClick=${() => {
                                const instance = taskGraphInstanceRef.current;
                                if (instance?.fitView) instance.fitView({ padding: 0.15, duration: 220 });
                              }}
                            >
                              <${FitIcon} />
                            </button>

                            <button
                              className="btn iconBtn"
                              title=${taskGraph.layoutMode === "brain" ? "Switch to river layout" : "Switch to free layout"}
                              onClick=${() =>
                                setTaskGraph((g) => ({
                                  ...g,
                                  layoutMode: g.layoutMode === "brain" ? "river" : "brain",
                                  nodes: g.layoutMode === "brain" ? layoutRiver(g.nodes, g.edges) : g.nodes,
                                }))}
                            >
                              <${LayoutIcon} />
                            </button>

                            <button
                              className="btn danger iconBtn"
                              title=${(taskGraphSelectedNodeId || taskGraphSelectedEdgeId) ? "Delete selected (Del)" : "Select a node/edge to delete"}
                              disabled=${!(taskGraphSelectedNodeId || taskGraphSelectedEdgeId)}
                              onClick=${deleteSelectedTaskGraphItem}
                            >
                              <${TrashIcon} />
                            </button>

                            <div className="spacer"></div>
                            <div className="muted graphTip">Drag from handles to connect</div>
                          </div>

                          <div
                            style=${{
                              height: isMobile ? "440px" : showSidebar ? "520px" : "calc(100vh - 260px)",
                              borderRadius: "14px",
                              overflow: "hidden",
                              border: "1px solid var(--panelBorder)",
                            }}
                            tabIndex=${0}
                            onKeyDown=${(e) => {
                              if (e.key === "Escape") {
                                if (taskGraphAddMode) setTaskGraphAddMode(false);
                                else if (taskGraphSelectedNodeId) closeTaskGraphInspector();
                                return;
                              }
                              if (e.key === "Delete" || e.key === "Backspace") {
                                deleteSelectedTaskGraphItem();
                              }
                            }}
                          >
                            <${ReactFlow}
                              onInit=${(instance) => {
                                taskGraphInstanceRef.current = instance;
                              }}
                              nodes=${taskGraph.nodes.map((n) => {
                                const locked = computeLockedNodeIds(taskGraph.nodes, taskGraph.edges).has(n.id);
                                return { ...n, className: locked ? "locked" : "" };
                              })}
                              edges=${taskGraph.edges.map((e) => {
                                const { criticalEdgeIds } = computeCriticalPath(taskGraph.nodes, taskGraph.edges);
                                const classes = [];
                                if (criticalEdgeIds.has(e.id)) classes.push("critical");
                                if (e?.data?.kind === "reference") classes.push("reference");
                                return { ...e, className: classes.join(" ") };
                              })}
                              nodeTypes=${nodeTypes}
                              onSelectionChange=${(sel) => {
                                const next = sel?.nodes?.[0]?.id ?? null;
                                const nextEdge = sel?.edges?.[0]?.id ?? null;
                                if (suppressTaskGraphSelectionRef.current) return;
                                setTaskGraphSelectedNodeId(next);
                                setTaskGraphSelectedEdgeId(nextEdge);
                              }}
                              onNodesChange=${(changes) => setTaskGraph((g) => ({ ...g, nodes: applyNodeChanges(changes, g.nodes) }))}
                              onEdgesChange=${(changes) => setTaskGraph((g) => ({ ...g, edges: applyEdgeChanges(changes, g.edges) }))}
                              onConnect=${(params) => {
                                const kind = taskGraph.edgeKind ?? "reference";
                                const base = { ...params, id: uid("edge"), data: { kind } };
                                const edge =
                                  kind === "dependency"
                                    ? { ...base, markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 }, style: { strokeWidth: 2 } }
                                    : kind === "reference"
                                      ? { ...base, style: { strokeDasharray: "5 6" } }
                                      : { ...base, markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 }, style: { strokeWidth: 2 } };
                                setTaskGraph((g) => ({ ...g, edges: addEdge(edge, g.edges) }));
                              }}
                              onPaneDoubleClick=${(event) => {
                                // Quick-add a subtask on double-click.
                                const instance = taskGraphInstanceRef.current;
                                const position = instance ? instance.screenToFlowPosition({ x: event.clientX, y: event.clientY }) : { x: 200, y: 150 };
                                const id = uid("node");
                                const parentId = taskGraphSelectedNodeId || taskGraphRootId;
                                setTaskGraph((g) => {
                                  if (!g) return g;
                                  const nextNodes = g.nodes.concat({
                                    id,
                                    type: "subtask",
                                    position,
                                    data: { title: "New subtask", kind: "subtask", status: "pending", date: "", content: "", tags: [] },
                                  });
                                  if (!taskGraphAutoLink || !parentId) return { ...g, nodes: nextNodes };
                                  const edge = {
                                    id: uid("edge"),
                                    source: parentId,
                                    target: id,
                                    data: { kind: "contains" },
                                    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
                                    style: { strokeWidth: 2 },
                                  };
                                  return { ...g, nodes: nextNodes, edges: g.edges.concat(edge) };
                                });
                                setTaskGraphSelectedNodeId(id);
                                setTaskGraphSelectedEdgeId(null);
                              }}
                              onPaneClick=${(event) => {
                                if (!taskGraphAddMode) return;
                                // When add-mode is active, clicking the canvas drops the selected node type.
                                // Prevent "click" from being interpreted as normal selection.
                                addTaskGraphNodeAt({ x: event.clientX, y: event.clientY });
                              }}
                              fitView=${true}
                              proOptions=${{ hideAttribution: true }}
                            >
                              <${Background} gap=${18} color=${theme === "light" ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.06)"} />
                              <${Controls} />
                            </${ReactFlow}>
                          </div>
                        `}
                  </div>
                `
              : html``}
          </div>
        </div>

        ${taskEditor
          ? html`
              <div className="modalOverlay" onClick=${() => setTaskEditor(null)}>
                <div className="modal" onClick=${(e) => e.stopPropagation()}>
                  <div className="panelHeader">
                    <div>
                      <div className="name">${taskEditor.mode === "new" ? "New Task" : "Edit Task"}</div>
                      <div className="meta">${taskEditor.mode === "new" ? "Create a card" : `ID: ${taskEditor.task.id}`}</div>
                    </div>
                    <button className="btn" onClick=${() => setTaskEditor(null)}>Close</button>
                  </div>

                  <div className="field">
                    <div className="label">Title</div>
                    <input className="input" value=${taskEditor.task.title ?? ""} onChange=${(e) => setTaskEditor((p) => ({ ...p, task: { ...p.task, title: e.target.value } }))} />
                  </div>

                  <div className="field">
                    <div className="label">Description</div>
                    <textarea className="textarea" value=${taskEditor.task.description ?? ""} onChange=${(e) => setTaskEditor((p) => ({ ...p, task: { ...p.task, description: e.target.value } }))}></textarea>
                  </div>

                  <div className="row">
                    <div style=${{ flex: 1, minWidth: "220px" }}>
                      <div className="label">Task group</div>
                      ${orderedColumns.length
                        ? html`
                            <select
                              className="select"
                              style=${{ width: "100%" }}
                              value=${taskEditor.task.column_id ?? ""}
                              onChange=${(e) => {
                                const nextId = e.target.value;
                                const col = orderedColumns.find((c) => c.id === nextId);
                                setTaskEditor((p) => ({ ...p, task: { ...p.task, column_id: nextId, status: col?.name || p.task.status } }));
                              }}
                            >
                              ${orderedColumns.map((c) => html`<option value=${c.id}>${c.name}</option>`)}
                            </select>
                          `
                        : html`
                            <select className="select" style=${{ width: "100%" }} value=${taskEditor.task.status ?? "planning"} onChange=${(e) => setTaskEditor((p) => ({ ...p, task: { ...p.task, status: e.target.value } }))}>
                              <option value="planning">Planning</option>
                              <option value="doing">Doing</option>
                              <option value="done">Done</option>
                            </select>
                          `}
                    </div>
                    <div style=${{ flex: 1, minWidth: "220px" }}>
                      <div className="label">Due date</div>
                      <input
                        className="input"
                        style=${{ width: "100%" }}
                        type="date"
                        value=${normalizeDateOnly(taskEditor.task.due_date) || ""}
                        onChange=${(e) => setTaskEditor((p) => ({ ...p, task: { ...p.task, due_date: e.target.value } }))}
                      />
                    </div>
                  </div>

                  <div className="row">
                    ${taskEditor.mode === "edit"
                      ? html`<button className="btn danger" onClick=${async () => {
                          await deleteTask(taskEditor.task.id);
                          setTaskEditor(null);
                        }}>Delete</button>`
                      : html``}
                    <div className="spacer"></div>
                    <button className="btn" onClick=${() => setTaskEditor(null)}>Cancel</button>
                    <button className="btn primary" onClick=${saveEditor}>Save</button>
                  </div>
                </div>
              </div>
            `
          : html``}

        ${stageEditor
          ? html`
              <div className="modalOverlay" onClick=${() => setStageEditor(null)}>
                <div className="modal" onClick=${(e) => e.stopPropagation()}>
                  <div className="panelHeader">
                    <div>
                      <div className="name">New Task Group</div>
                      <div className="meta">Create a new task group</div>
                    </div>
                    <button className="btn" onClick=${() => setStageEditor(null)}>Close</button>
                  </div>

                  <div className="field">
                    <div className="label">Name</div>
                    <input
                      className="input"
                      placeholder="e.g. Inbox, Doing, Review"
                      value=${stageEditor.name ?? ""}
                      autoFocus=${true}
                      onChange=${(e) => setStageEditor((p) => ({ ...p, name: e.target.value }))}
                      onKeyDown=${(e) => {
                        if (e.key === "Escape") setStageEditor(null);
                        if (e.key === "Enter" && !e.shiftKey) saveStage();
                      }}
                    />
                  </div>

                  <div className="field">
                    <div className="label">Description</div>
                    <textarea
                      className="textarea"
                      placeholder="Describe what belongs in this group (context, rules, examples)"
                      value=${stageEditor.description ?? ""}
                      onChange=${(e) => setStageEditor((p) => ({ ...p, description: e.target.value }))}
                    ></textarea>
                  </div>

                  <div className="row">
                    <div className="spacer"></div>
                    <button className="btn" onClick=${() => setStageEditor(null)}>Cancel</button>
                    <button className="btn primary" onClick=${saveStage} disabled=${!String(stageEditor.name ?? "").trim()}>Save</button>
                  </div>
                </div>
              </div>
            `
          : html``}

          ${selectedTaskId && taskGraph && taskGraphEditingNodeId
          ? (() => {
            const node = (taskGraph.nodes || []).find((n) => n.id === taskGraphEditingNodeId);
              if (!node) return html``;

              const type = String(node.type || "");
              const items = Array.isArray(node.data?.items) ? node.data.items : [];

              const patchNode = (patch) => {
                setTaskGraph((g) => ({
                  ...g,
                  nodes: g.nodes.map((n) => (n.id === node.id ? { ...n, data: { ...(n.data ?? {}), ...patch } } : n)),
                }));
              };

              const deleteNode = () => {
                setTaskGraph((g) => ({
                  ...g,
                  nodes: g.nodes.filter((n) => n.id !== node.id),
                  edges: g.edges.filter((e) => e.source !== node.id && e.target !== node.id),
                }));
                closeTaskGraphInspector();
              };

              const addChecklistItem = () => {
                const next = items.concat({ text: "New item", done: false });
                patchNode({ items: next });
              };

              return html`
                <div className="modalOverlay" onClick=${closeTaskGraphInspector}>
                  <div className="modal" onClick=${(e) => e.stopPropagation()}>
                    <div className="panelHeader">
                      <div>
                        <div className="name">${type ? (type[0].toUpperCase() + type.slice(1)) : "Node"}</div>
                        <div className="meta">Edit node content</div>
                      </div>
                      <button className="btn iconBtn" title="Close" onClick=${closeTaskGraphInspector}><${XIcon} /></button>
                    </div>

                    <div className="field">
                      <div className="label">Title</div>
                      <input className="input" value=${node.data?.title ?? ""} onChange=${(e) => patchNode({ title: e.target.value })} />
                    </div>

                    <div className="field">
                      <div className="label">Tags</div>
                      <input
                        className="input"
                        placeholder="e.g. urgent, health, reading"
                        value=${tagsToInput(node.data?.tags)}
                        onChange=${(e) => patchNode({ tags: normalizeTags(e.target.value) })}
                      />
                    </div>

                    ${type !== "memory"
                      ? html`
                          <div className="field">
                            <div className="label">Date</div>
                            <input
                              className="input"
                              type="date"
                              value=${normalizeDateOnly(node.data?.date) || ""}
                              onChange=${(e) => patchNode({ date: e.target.value })}
                            />
                          </div>
                        `
                      : html``}

                    ${type === "task"
                      ? html`
                          <div className="field">
                            <div className="label">Status</div>
                            <select className="select" value=${node.data?.status ?? "pending"} onChange=${(e) => patchNode({ status: e.target.value })}>
                              <option value="pending">To Do</option>
                              <option value="done">Done</option>
                            </select>
                          </div>
                        `
                      : html``}

                    ${type === "checklist"
                      ? html`
                          <div className="field">
                            <div className="label">Checklist</div>
                            <div style=${{ display: "grid", gap: "8px" }}>
                              ${items.map((it, idx) => html`
                                <div className="row" style=${{ gap: "8px" }}>
                                  <input
                                    className="checkbox"
                                    type="checkbox"
                                    checked=${!!it?.done}
                                    onChange=${() => {
                                      const next = items.map((x, i) => (i === idx ? { ...x, done: !x?.done } : x));
                                      patchNode({ items: next });
                                    }}
                                  />
                                  <input
                                    className="input"
                                    style=${{ flex: 1 }}
                                    value=${it?.text ?? ""}
                                    onChange=${(e) => {
                                      const next = items.map((x, i) => (i === idx ? { ...x, text: e.target.value } : x));
                                      patchNode({ items: next });
                                    }}
                                  />
                                  <button
                                    className="btn"
                                    onClick=${() => {
                                      const next = items.filter((_, i) => i !== idx);
                                      patchNode({ items: next });
                                    }}
                                    title="Remove"
                                  >
                                    Remove
                                  </button>
                                </div>
                              `)}
                              <button className="btn" onClick=${addChecklistItem}>+ Add item</button>
                            </div>
                          </div>
                        `
                      : html``}

                    <div className="field">
                      <div className="label">Notes</div>
                      <textarea className="textarea" value=${node.data?.content ?? ""} onChange=${(e) => patchNode({ content: e.target.value })}></textarea>
                    </div>

                    <div className="row">
                      <button className="btn danger" onClick=${deleteNode}>Delete node</button>
                      <div className="spacer"></div>
                      <button className="btn" onClick=${closeTaskGraphInspector}>Done</button>
                    </div>
                  </div>
                </div>
              `;
            })()
          : html``}
      </div>
    `;
  };

  const renderHome = () => {
    return html`
      <div className="screen">
        <div className="topbar">
          <div className="headerBlock">
            <div
              className="brand brandLink"
              role="button"
              tabIndex="0"
              onClick=${() => (window.location.hash = "#/home")}
              onKeyDown=${(e) => {
                if (e.key === "Enter") window.location.hash = "#/home";
              }}
              title="Home"
            >
              <img className="brandLogo" src="/logo.png" alt="Emonat" />
              <div className="title">Emonat</div>
            </div>

            <div className="headerRight desktopOnly">
              <div className="searchBar" role="search">
                <input
                  className="input searchInput"
                  placeholder="Search tasks…"
                  title=${!user ? "Login to search" : "Search tasks"}
                  value=${taskSearch}
                  disabled=${!user}
                  onChange=${(e) => setTaskSearch(e.target.value)}
                  onKeyDown=${(e) => {
                    if (e.key === "Escape") setTaskSearch("");
                    if (e.key === "Enter") {
                      if (!user) window.location.hash = "#/login?mode=login";
                      else window.location.hash = `#/board?q=${encodeURIComponent(taskSearch.trim())}`;
                    }
                  }}
                />
                ${taskSearch
                  ? html`<button className="btn" onClick=${() => setTaskSearch("")} title="Clear">Clear</button>`
                  : html``}
              </div>

              <button className=${`btn ${routePath === "#/board" ? "active" : ""}`} onClick=${() => (window.location.hash = "#/board")}>Board</button>

              <div className="menuWrap" ref=${settingsRef}>
                <button
                  className="btn iconBtn"
                  onClick=${() => {
                    setHeaderMenuOpen(false);
                    setSettingsOpen((v) => !v);
                  }}
                  title="Settings"
                  aria-label="Settings"
                >
                  ${GearIcon()}
                </button>
                ${settingsOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <button
                          className="btn menuItem"
                          onClick=${() => {
                            setTheme((t) => (t === "dark" ? "light" : "dark"));
                            setSettingsOpen(false);
                          }}
                        >
                          <span className="menuIcon">${theme === "dark" ? SunIcon() : MoonIcon()}</span>
                          <span>${theme === "dark" ? "Switch to light" : "Switch to dark"}</span>
                        </button>
                      </div>
                    `
                  : html``}
              </div>
            </div>

            <div className="menuWrap mobileOnly" ref=${headerMenuRef}>
              <button
                className="btn iconBtn"
                onClick=${() => {
                  setSettingsOpen(false);
                  setHeaderMenuOpen((v) => !v);
                }}
                title="Menu"
                aria-label="Menu"
              >
                ${BurgerIcon()}
              </button>
              ${headerMenuOpen
                ? html`
                    <div className="menu" onClick=${(e) => e.stopPropagation()}>
                      <button className="btn menuItem" onClick=${() => { setHeaderMenuOpen(false); window.location.hash = "#/board"; }}>
                        <span className="menuIcon">${BoardIcon()}</span>
                        <span>Board</span>
                      </button>

                      <div className="searchBar" role="search">
                        <input
                          className="input searchInput"
                          placeholder="Search tasks…"
                          title=${!user ? "Login to search" : "Search tasks"}
                          value=${taskSearch}
                          disabled=${!user}
                          onChange=${(e) => setTaskSearch(e.target.value)}
                          onKeyDown=${(e) => {
                            if (e.key === "Escape") setTaskSearch("");
                            if (e.key === "Enter") {
                              setHeaderMenuOpen(false);
                              if (!user) window.location.hash = "#/login?mode=login";
                              else window.location.hash = `#/board?q=${encodeURIComponent(taskSearch.trim())}`;
                            }
                          }}
                        />
                        ${taskSearch
                          ? html`<button className="btn" onClick=${() => setTaskSearch("")} title="Clear">Clear</button>`
                          : html``}
                      </div>

                      <div className="menuDivider"></div>

                      <button
                        className="btn menuItem"
                        onClick=${() => {
                          setTheme((t) => (t === "dark" ? "light" : "dark"));
                          setHeaderMenuOpen(false);
                        }}
                      >
                        <span className="menuIcon">${theme === "dark" ? SunIcon() : MoonIcon()}</span>
                        <span>${theme === "dark" ? "Switch to light" : "Switch to dark"}</span>
                      </button>
                    </div>
                  `
                : html``}
            </div>
          </div>
        </div>

        <div className="screenBody homeBody">
          <div className="welcomeWrap">
            <div className="welcomeHero">
              <div className="welcomeCopy">
                <div className="welcomeKicker">Graph-based tasks · Memory nodes · Milestones</div>
                <div className="welcomeTitle">Turn plans into a living map.</div>
                <div className="welcomeLead">
                  Emonat is a board + graph workspace. Create task cards, then open a dedicated graph for each card to break it down into dependencies, notes, and attached memories.
                </div>

                <div className="welcomeCtas">
                  ${user
                    ? html`
                        <button className="btn primary" onClick=${() => (window.location.hash = "#/board")}>Go to Board</button>
                        <button className="btn" onClick=${signOut}>Sign out</button>
                      `
                    : html`
                        <button className="btn primary" onClick=${() => (window.location.hash = "#/login?mode=register")}>Register</button>
                        <button className="btn" onClick=${() => (window.location.hash = "#/login?mode=login")}>Login</button>
                      `}
                </div>

                <div className="welcomeMiniMeta">
                  ${user ? html`Signed in as <strong>${user.email}</strong>` : html`Private by default · Multi-user accounts · Works on mobile`}
                </div>
              </div>

              <div className="welcomePreview" aria-hidden="true">
                <div className="previewCanvas">
                  ${(() => {
                    const pNodes = [
                      {
                        id: "home_task",
                        type: "task",
                        position: { x: 60, y: 34 },
                        data: { title: "Plan the week", status: "pending", content: "Break down into subtasks", tags: [] },
                      },
                      {
                        id: "home_subtask",
                        type: "subtask",
                        position: { x: 60, y: 176 },
                        data: { title: "Draft schedule", kind: "subtask", status: "pending", content: "List 3 priorities", tags: ["focus"] },
                      },
                      {
                        id: "home_milestone",
                        type: "milestone",
                        position: { x: 430, y: 34 },
                        data: { title: "Deadline", date: "2026-02-10", tags: [] },
                      },
                      {
                        id: "home_memory",
                        type: "memory",
                        position: { x: 430, y: 176 },
                        data: { title: "Notes & Docs", fileName: "notes.pdf", tags: ["file"] },
                      },
                    ];

                    const pEdges = [
                      {
                        id: "home_edge_contains",
                        source: "home_task",
                        target: "home_subtask",
                        sourceHandle: "sB",
                        targetHandle: "tT",
                        type: "smoothstep",
                        data: { kind: "contains" },
                        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
                        style: { strokeWidth: 2 },
                      },
                      {
                        id: "home_edge_dep",
                        source: "home_subtask",
                        target: "home_milestone",
                        sourceHandle: "sR",
                        targetHandle: "tL",
                        type: "smoothstep",
                        data: { kind: "dependency" },
                        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
                        style: { strokeWidth: 2 },
                      },
                      {
                        id: "home_edge_ref",
                        source: "home_memory",
                        target: "home_subtask",
                        sourceHandle: "sB",
                        targetHandle: "tT",
                        type: "smoothstep",
                        data: { kind: "reference" },
                        className: "reference",
                      },
                    ];

                    return html`
                      <div className="homePreviewFlow">
                        <${ReactFlow}
                          nodes=${pNodes}
                          edges=${pEdges}
                          nodeTypes=${nodeTypes}
                          nodesDraggable=${false}
                          nodesConnectable=${false}
                          elementsSelectable=${false}
                          panOnDrag=${false}
                          zoomOnScroll=${false}
                          zoomOnPinch=${false}
                          zoomOnDoubleClick=${false}
                          fitView=${true}
                          fitViewOptions=${{ padding: 0.18 }}
                          proOptions=${{ hideAttribution: true }}
                        >
                        </${ReactFlow}>
                      </div>
                    `;
                  })()}
                </div>
              </div>
            </div>

            <div className="welcomeGrid">
              <div className="welcomeCard">
                <div className="welcomeCardTitle">Board to Graph</div>
                <div className="welcomeCardText">Create cards in Planning/Doing/Done. Click a card to open its own graph and auto-save your changes.</div>
              </div>
              <div className="welcomeCard">
                <div className="welcomeCardTitle">Dependencies</div>
                <div className="welcomeCardText">Draw solid dependency edges to block downstream tasks until prerequisites are done.</div>
              </div>
              <div className="welcomeCard">
                <div className="welcomeCardTitle">Memories</div>
                <div className="welcomeCardText">Drag files into the graph to create memory nodes (images get previews). Keep context next to the work.</div>
              </div>
            </div>

            <div className="welcomeSteps card">
              <div className="panelHeader">
                <div>
                  <div className="name">How it works</div>
                  <div className="meta">A fast workflow, optimized for clarity.</div>
                </div>
              </div>
              <div className="welcomeStepList">
                <div className="welcomeStep"><span className="pill">1</span> Register or login</div>
                <div className="welcomeStep"><span className="pill">2</span> Create a task card on your board</div>
                <div className="welcomeStep"><span className="pill">3</span> Click the card to open its graph</div>
                <div className="welcomeStep"><span className="pill">4</span> Add dependencies, notes, and memory nodes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const renderProfile = () => {
    if (!user) return renderLogin();

    return html`
      <div className="screen">
        <div className="topbar">
          <div className="headerBlock">
            <div
              className="brand brandLink"
              role="button"
              tabIndex="0"
              onClick=${() => (window.location.hash = "#/home")}
              onKeyDown=${(e) => {
                if (e.key === "Enter") window.location.hash = "#/home";
              }}
              title="Home"
            >
              <img className="brandLogo" src="/logo.png" alt="Emonat" />
              <div className="title">Emonat</div>
            </div>

            <div className="headerRight desktopOnly">
              <button className="btn" onClick=${() => { setAuthMsg(""); window.location.hash = "#/board"; }}>Board</button>

              <div className="menuWrap" ref=${settingsRef}>
                <button
                  className="btn iconBtn"
                  onClick=${() => {
                    setHeaderMenuOpen(false);
                    setUserMenuOpen(false);
                    setSettingsOpen((v) => !v);
                  }}
                  title="Settings"
                  aria-label="Settings"
                >
                  ${GearIcon()}
                </button>
                ${settingsOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <button
                          className="btn menuItem"
                          onClick=${() => {
                            setTheme((t) => (t === "dark" ? "light" : "dark"));
                            setSettingsOpen(false);
                          }}
                        >
                          <span className="menuIcon">${theme === "dark" ? SunIcon() : MoonIcon()}</span>
                          <span>${theme === "dark" ? "Switch to light" : "Switch to dark"}</span>
                        </button>
                      </div>
                    `
                  : html``}
              </div>

              <div className="menuWrap" ref=${userMenuDesktopRef}>
                <button
                  className="btn avatarBtn"
                  onClick=${() => {
                    setHeaderMenuOpen(false);
                    setSettingsOpen(false);
                    setUserMenuOpen((v) => !v);
                  }}
                  title=${user.email}
                  aria-label="User menu"
                >
                  <span className="avatarCircle">${avatarInitial(user.email)}</span>
                </button>
                ${userMenuOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <div className="menuTitle">Signed in</div>
                        <div className="menuMeta">${user.email}</div>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/profile"; }}>
                          <span className="menuIcon">${UserIcon()}</span>
                          <span>View my profile</span>
                        </button>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem danger" onClick=${() => { signOut(); setUserMenuOpen(false); }}>
                          <span className="menuIcon">${LogoutIcon()}</span>
                          <span>Logout</span>
                        </button>
                      </div>
                    `
                  : html``}
              </div>
            </div>

            <div className="mobileActions mobileOnly">
              <div className="menuWrap" ref=${userMenuMobileRef}>
                <button
                  className="btn avatarBtn"
                  onClick=${() => {
                    setHeaderMenuOpen(false);
                    setSettingsOpen(false);
                    setUserMenuOpen((v) => !v);
                  }}
                  title=${user.email}
                  aria-label="User menu"
                >
                  <span className="avatarCircle">${avatarInitial(user.email)}</span>
                </button>
                ${userMenuOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <div className="menuTitle">Signed in</div>
                        <div className="menuMeta">${user.email}</div>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/profile"; }}>
                          <span className="menuIcon">${UserIcon()}</span>
                          <span>View my profile</span>
                        </button>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem danger" onClick=${() => { signOut(); setUserMenuOpen(false); }}>
                          <span className="menuIcon">${LogoutIcon()}</span>
                          <span>Logout</span>
                        </button>
                      </div>
                    `
                  : html``}
              </div>

              <div className="menuWrap" ref=${headerMenuRef}>
                <button
                  className="btn iconBtn"
                  onClick=${() => {
                    setUserMenuOpen(false);
                    setSettingsOpen(false);
                    setHeaderMenuOpen((v) => !v);
                  }}
                  title="Menu"
                  aria-label="Menu"
                >
                  ${BurgerIcon()}
                </button>
                ${headerMenuOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <button className="btn menuItem" onClick=${() => { setHeaderMenuOpen(false); window.location.hash = "#/board"; }}>
                          <span className="menuIcon">${BoardIcon()}</span>
                          <span>Board</span>
                        </button>
                        <button className="btn menuItem" onClick=${() => { fetchProfile(); setHeaderMenuOpen(false); }}>
                          <span className="menuIcon">${RefreshIcon()}</span>
                          <span>Refresh profile</span>
                        </button>
                        <div className="menuDivider"></div>
                        <button
                          className="btn menuItem"
                          onClick=${() => {
                            setTheme((t) => (t === "dark" ? "light" : "dark"));
                            setHeaderMenuOpen(false);
                          }}
                        >
                          <span className="menuIcon">${theme === "dark" ? SunIcon() : MoonIcon()}</span>
                          <span>${theme === "dark" ? "Switch to light" : "Switch to dark"}</span>
                        </button>
                      </div>
                    `
                  : html``}
              </div>
            </div>
          </div>
        </div>

        <div className="screenBody">
          <div className="card" style=${{ maxWidth: "720px", margin: "0 auto" }}>
            <div className="panelHeader">
              <div>
                <div className="name">My profile</div>
                <div className="meta">Update your personal information.</div>
              </div>
              <button className="btn" onClick=${() => (window.location.hash = "#/board")}>Back</button>
            </div>

            <div className="field">
              <div className="label">Email</div>
              <input className="input" value=${user.email ?? ""} disabled />
            </div>

            <div className="field">
              <div className="label">Full name</div>
              <input className="input" value=${profileDraft.full_name ?? ""} onChange=${(e) => setProfileDraft((p) => ({ ...p, full_name: e.target.value }))} />
            </div>

            <div className="row">
              <div style=${{ flex: 1, minWidth: "220px" }}>
                <div className="label">Telephone</div>
                <input className="input" placeholder="+84…" value=${profileDraft.phone ?? ""} onChange=${(e) => setProfileDraft((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div style=${{ flex: 1, minWidth: "220px" }}>
                <div className="label">Birthday</div>
                <input
                  className="input"
                  type="date"
                  value=${profileDraft.birthday ?? ""}
                  onChange=${(e) => setProfileDraft((p) => ({ ...p, birthday: normalizeDateOnly(e.target.value) }))}
                />
              </div>
            </div>

            <div className="row" style=${{ marginTop: "10px" }}>
              <button className="btn" onClick=${() => { setAuthMsg(""); fetchProfile(); }}>Reset</button>
              <div className="spacer"></div>
              <button className="btn primary" onClick=${saveProfile}>Save</button>
            </div>

            ${authMsg ? html`<div className="muted" style=${{ marginTop: "10px" }}>${authMsg}</div>` : html``}
          </div>
        </div>
      </div>
    `;
  };

  return html`
    <${GraphActionsContext.Provider} value=${actions}>
      ${routePath === "#/home"
        ? renderHome()
        : routePath === "#/login"
          ? renderLogin()
          : routePath === "#/profile"
            ? renderProfile()
          : routePath === "#/board"
            ? renderBoard()
            : renderHome()}
    </${GraphActionsContext.Provider}>
  `;
}


export { App };
export default App;
