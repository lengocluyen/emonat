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

import { RichEditor, RichViewer } from "./RichEditor.js";

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

function ShieldIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>`;
}

function CheckSquareIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="9 11 12 14 22 4"></polyline>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
  </svg>`;
}

function LayersIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>`;
}

function CalendarIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"></rect>
    <path d="M16 2v4"></path>
    <path d="M8 2v4"></path>
    <path d="M3 10h18"></path>
  </svg>`;
}

function SearchIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7"></circle>
    <path d="M21 21l-4.35-4.35"></path>
  </svg>`;
}

function SaveIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>`;
}

function CheckCircleIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>`;
}

function PlayCircleIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"></circle>
    <polygon points="10 8 16 12 10 16 10 8"></polygon>
  </svg>`;
}

function ClipboardIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1"></rect>
  </svg>`;
}

function AlertCircleIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>`;
}

function CameraIcon() {
  return html`<svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>`;
}

function colIcon(name) {
  const n = String(name || "").toLowerCase();
  if (n === "done" || n === "completed" || n === "finished" || n === "closed") return CheckCircleIcon();
  if (n === "doing" || n === "in progress" || n === "active" || n === "wip" || n === "ongoing") return PlayCircleIcon();
  if (n === "review" || n === "testing" || n === "qa" || n === "checking") return EyeIcon();
  if (n === "blocked" || n === "stuck" || n === "hold" || n === "on hold") return AlertCircleIcon();
  if (n === "planning" || n === "backlog" || n === "todo" || n === "to do" || n === "inbox") return ClipboardIcon();
  return LayersIcon();
}

function GraphIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3"></circle>
    <circle cx="6" cy="12" r="3"></circle>
    <circle cx="18" cy="19" r="3"></circle>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
  </svg>`;
}

function EyeIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>`;
}

function EyeOffIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>`;
}

function HelpIcon() {
  return html`<svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
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

function stripHtml(html) {
  if (!html) return "";
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
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
    if (source.type === "rootTask") continue;

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
  const preview = data?.content ? truncate(stripHtml(data.content), 84) : "";
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
  const preview = data?.content ? truncate(stripHtml(data.content), 90) : "";

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

// Module-level drag state — lives outside React, never stale in any closure
let __taskDropTarget = null; // { colId, index } for same-column reorder
let __isTaskDragging = false; // set synchronously on dragstart so onDragOver can use it
let __touchDrag = null;    // touch drag state for mobile
let __mouseDrag = null;    // mouse drag state for sidebar mode (bypasses HTML5 DnD)

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
  const [pwDraft, setPwDraft] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // Tasks (board)
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskEditor, setTaskEditor] = useState(null); // {mode: 'new'|'edit', task}
  const [taskDetail, setTaskDetail] = useState(null); // task object shown in preview modal
  const [autosaveStatus, setAutosaveStatus] = useState(null); // null | 'saving' | 'saved'
  const [stageEditor, setStageEditor] = useState(null); // {mode: 'new', name, description}
  const [openHelpSection, setOpenHelpSection] = useState(0); // index of open accordion panel
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskSearch, setTaskSearch] = useState("");

  const [boardSidebarOpen, setBoardSidebarOpen] = useState(true);

  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [columns, setColumns] = useState([]);
  const [boardMetaLoading, setBoardMetaLoading] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(400);
  const sidebarPanelRef = useRef(null);
  const sidebarResizeDrag = useRef({ startX: 0, startW: 400, curW: 400 });

  const columnDragIdRef = useRef(null);
  const colDropRef = useRef(null);
  const autosaveRef = useRef(null);
  const touchCbRef = useRef(null);
  const mouseCbRef = useRef(null);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [draggingColId, setDraggingColId] = useState(null);
  const [colDropVisual, setColDropVisual] = useState(null); // insert-before index for rendering
  const [dragOverColId, setDragOverColId] = useState(null);
  const [dropVisual, setDropVisual] = useState(null); // { colId, index } for rendering indicator only
  const [editingColId, setEditingColId] = useState(null);
  const [editingColName, setEditingColName] = useState("");

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
      const rootId = taskIdOverride ? `root_${taskIdOverride}` : taskGraphRootId;
      if (!rootId) return graph;
      let nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
      let edges = Array.isArray(graph.edges) ? graph.edges : [];

      // Migration: older builds used root ids like "root0" (no underscore).
      // Normalize to the canonical root id: "root_<taskId>".
      if (taskIdOverride != null) {
        const tid = String(taskIdOverride);
        const legacyIds = [`root${tid}`, `root-${tid}`, `root:${tid}`, "root_task"];
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

        // Deduplicate identical edges and drop self-loops after id normalization.
        const seen = new Set();
        edges = edges.filter((e) => {
          if (!e) return false;
          if (e.source === e.target) return false;
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

  // If already signed in, skip login/home screens and go straight to the board.
  useEffect(() => {
    if (!user) return;
    if (routePath === "#/login" || routePath === "#/home") window.location.hash = "#/board";
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
    setPwDraft({ current: "", next: "", confirm: "" });
    setPwMsg("");
    setAuthMsg("");
  }, [routePath, user]);

  // Load admin users when navigating to admin panel.
  useEffect(() => {
    if (routePath !== "#/admin") return;
    if (!user?.is_admin) return;
    fetchAdminUsers();
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

  const fetchTasks = useCallback(async (boardIdOverride, { silent = false } = {}) => {
    if (!user) return;
    if (!silent) setTasksLoading(true);
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
      if (!silent) setTasksLoading(false);
    }
  }, [user, activeBoardId]);

  const fetchBoardsAndColumns = useCallback(async ({ silent = false } = {}) => {
    if (!user) return;
    if (!silent) setBoardMetaLoading(true);
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
        await fetchTasks(boardId, { silent });
      }
    } catch (e) {
      // If the new endpoints aren't available, keep the legacy board behavior.
      console.warn(e);
    } finally {
      if (!silent) setBoardMetaLoading(false);
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

  const saveAvatar = useCallback((dataUrl) => {
    if (!user) return;
    apiJson("/api/profile", { method: "PUT", body: JSON.stringify({ avatar_url: dataUrl }) })
      .then((d) => { if (d?.user) setUser(d.user); })
      .catch((e) => setAuthMsg(e.message));
  }, [user]);

  const changePassword = useCallback(async () => {
    setPwMsg("");
    if (!pwDraft.next || pwDraft.next.length < 8) { setPwMsg("New password must be at least 8 characters."); return; }
    if (pwDraft.next !== pwDraft.confirm) { setPwMsg("Passwords do not match."); return; }
    try {
      await apiJson("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: pwDraft.current, new_password: pwDraft.next }),
      });
      setPwDraft({ current: "", next: "", confirm: "" });
      setPwMsg("Password changed successfully.");
    } catch (e) {
      setPwMsg(e.message === "wrong_password" ? "Current password is incorrect." : e.message);
    }
  }, [pwDraft]);

  const deleteAccount = useCallback(async () => {
    if (!window.confirm("Permanently delete your account and all data? This cannot be undone.")) return;
    try {
      await apiJson("/api/profile", { method: "DELETE" });
      signOut();
    } catch (e) {
      setAuthMsg(e.message === "cannot_delete_admin" ? "The permanent admin account cannot be deleted." : e.message);
    }
  }, [signOut]);

  const fetchAdminUsers = useCallback(async () => {
    setAdminLoading(true);
    try {
      const data = await apiJson("/api/admin/users");
      setAdminUsers(data.users || []);
    } catch (e) {
      setAuthMsg(e.message);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const adminPatchUser = useCallback(async (id, patch) => {
    try {
      await apiJson(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      await fetchAdminUsers();
    } catch (e) {
      setAuthMsg(e.message);
    }
  }, [fetchAdminUsers]);

  const adminDeleteUser = useCallback(async (id, email) => {
    if (!window.confirm(`Delete account "${email}"? All their data will be removed.`)) return;
    try {
      await apiJson(`/api/admin/users/${id}`, { method: "DELETE" });
      await fetchAdminUsers();
    } catch (e) {
      setAuthMsg(e.message === "cannot_delete_permanent_admin" ? "Cannot delete the permanent admin account." : e.message);
    }
  }, [fetchAdminUsers]);

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

  // Autosave task edits with a 1.5 s debounce (edit mode only — new tasks have no id yet)
  useEffect(() => {
    if (!taskEditor || taskEditor.mode !== "edit") {
      setAutosaveStatus(null);
      return;
    }
    clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(async () => {
      setAutosaveStatus("saving");
      try {
        await updateTask(taskEditor.task.id, taskEditor.task);
        setAutosaveStatus("saved");
        setTimeout(() => setAutosaveStatus((s) => (s === "saved" ? null : s)), 2000);
      } catch {
        setAutosaveStatus(null);
      }
    }, 1500);
    return () => clearTimeout(autosaveRef.current);
  }, [taskEditor?.task]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep taskDetail in sync when the tasks list refreshes (e.g. after autosave)
  useEffect(() => {
    if (!taskDetail) return;
    const fresh = tasks.find((t) => t.id === taskDetail.id);
    if (fresh) setTaskDetail(fresh);
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // When a task graph opens, collapse the kanban sidebar on all screen sizes.
  useEffect(() => {
    if (!selectedTaskId) {
      setBoardSidebarOpen(true);
      return;
    }
    setBoardSidebarOpen(false);
  }, [selectedTaskId]);

  // Keep touch-drag callbacks current (avoids stale closures in document listeners)
  useEffect(() => {
    touchCbRef.current = { tasks, columns, activeBoardId, setTasks, setColumns, fetchTasks, fetchBoardsAndColumns, setAuthMsg };
  }, [tasks, columns, activeBoardId, setTasks, setColumns, fetchTasks, fetchBoardsAndColumns, setAuthMsg]);

  // Keep mouse-drag callbacks current (sidebar mode drag-and-drop)
  useEffect(() => {
    mouseCbRef.current = { tasks, columns, taskSearch, activeBoardId, setTasks, setDraggingTaskId, setDragOverColId, setDropVisual, fetchTasks, setAuthMsg, sidebarPanelRef };
  }, [tasks, columns, taskSearch, activeBoardId]);

  // Touch drag-drop for mobile (HTML5 DnD doesn't fire on touch)
  useEffect(() => {
    const onTouchMove = (e) => {
      if (!__touchDrag) return;
      const touch = e.touches[0];
      __touchDrag.lastX = touch.clientX;
      __touchDrag.lastY = touch.clientY;

      if (!__touchDrag.active) {
        // If the finger moves significantly before long-press fires, cancel the
        // drag so the browser can scroll normally.
        const dx = touch.clientX - __touchDrag.startX;
        const dy = touch.clientY - __touchDrag.startY;
        if (Math.hypot(dx, dy) > 8) {
          clearTimeout(__touchDrag.timer);
          __touchDrag = null;
        }
        return; // don't preventDefault — let scroll work
      }

      // Active drag — block scroll and move ghost
      e.preventDefault();

      if (__touchDrag.taskId) {
        // — Task drag: move ghost, find target column —
        if (__touchDrag.ghostEl && __touchDrag.origEl) {
          const w = __touchDrag.origEl.offsetWidth;
          const h = __touchDrag.origEl.offsetHeight;
          __touchDrag.ghostEl.style.left = (touch.clientX - w / 2) + "px";
          __touchDrag.ghostEl.style.top  = (touch.clientY - h / 2) + "px";
        }
        if (__touchDrag.ghostEl) __touchDrag.ghostEl.style.display = "none";
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (__touchDrag.ghostEl) __touchDrag.ghostEl.style.display = "";
        let node = el;
        while (node && !node.dataset?.colId) node = node.parentElement;
        const overColId = node?.dataset?.colId || null;
        if (__touchDrag.overColEl) __touchDrag.overColEl.classList.remove("colDragOver");
        __touchDrag.overColId = overColId;
        if (node && overColId) {
          node.classList.add("colDragOver");
          __touchDrag.overColEl = node;
        } else {
          __touchDrag.overColEl = null;
        }
      } else if (__touchDrag.colId) {
        // — Column drag: find target insert position across columns —
        const colEls = Array.from(document.querySelectorAll("[data-col-id]"));
        const fingerEl = document.elementFromPoint(touch.clientX, touch.clientY);
        let node = fingerEl;
        while (node && !node.dataset?.colId) node = node.parentElement;
        const overColId = node?.dataset?.colId;
        if (__touchDrag.overColEl) __touchDrag.overColEl.classList.remove("colDragOver");
        if (node && overColId && overColId !== __touchDrag.colId) {
          const rect = node.getBoundingClientRect();
          const visIdx = colEls.indexOf(node);
          __touchDrag.insertIdx = touch.clientX > rect.left + rect.width / 2 ? visIdx + 1 : visIdx;
          __touchDrag.overColId = overColId;
          __touchDrag.overColEl = node;
          node.classList.add("colDragOver");
        } else {
          __touchDrag.overColId = null;
          __touchDrag.overColEl = null;
          __touchDrag.insertIdx = null;
        }
      }
    };

    const onTouchEnd = (e) => {
      if (!__touchDrag) return;
      const drag = __touchDrag;
      __touchDrag = null;
      clearTimeout(drag.timer);
      if (drag.ghostEl) drag.ghostEl.remove();
      if (drag.origEl) drag.origEl.style.opacity = "";
      if (drag.origEl) drag.origEl.classList.remove("colDragging");
      if (drag.overColEl) drag.overColEl.classList.remove("colDragOver");
      if (!drag.active) return; // short tap — let click fire normally
      e.preventDefault();
      const cb = touchCbRef.current;
      if (!cb) return;
      const { tasks, columns, activeBoardId, setTasks, setColumns, fetchTasks, fetchBoardsAndColumns, setAuthMsg } = cb;

      if (drag.colId) {
        // — Column drop — inline reorder (reorderColumnsByIndex lives inside renderBoard, not accessible here)
        if (drag.insertIdx !== null && activeBoardId) {
          const ordered = [...columns].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
          const fromIndex = ordered.findIndex((c) => c.id === drag.colId);
          if (fromIndex >= 0) {
            const next = [...ordered];
            const [moved] = next.splice(fromIndex, 1);
            const ti = drag.insertIdx > fromIndex ? drag.insertIdx - 1 : drag.insertIdx;
            next.splice(Math.max(0, Math.min(ti, next.length)), 0, moved);
            if (!next.some((c) => !c.id || String(c.id).length < 10) &&
                next.map((c) => c.id).join() !== ordered.map((c) => c.id).join()) {
              const prevColumns = columns;
              setColumns((prev) => prev.map((c) => {
                const newIdx = next.findIndex((n) => n.id === c.id);
                return newIdx >= 0 ? { ...c, order_index: newIdx } : c;
              }));
              Promise.all(next.map((c, i) =>
                apiJson(`/api/columns/${c.id}`, { method: "PATCH", body: JSON.stringify({ order_index: i }) })
              ))
                .then(() => fetchBoardsAndColumns({ silent: true }))
                .catch((err) => { setColumns(prevColumns); setAuthMsg(err.message); });
            }
          }
        }
        return;
      }

      // — Task drop —
      if (!drag.overColId) return;
      const task = tasks.find((t) => t.id === drag.taskId);
      const targetCol = columns.find((c) => c.id === drag.overColId);
      if (!task || !targetCol) return;
      const sameCol = task.column_id
        ? task.column_id === targetCol.id
        : (task.status || "planning") === targetCol.name;
      if (sameCol) return;
      const prevTasks = tasks;
      setTasks((ts) => ts.map((t) => t.id === drag.taskId
        ? { ...t, column_id: targetCol.id, status: targetCol.name } : t));
      apiJson(`/api/tasks/${drag.taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ column_id: targetCol.id, status: targetCol.name }),
      }).then(() => fetchTasks(activeBoardId, { silent: true }))
        .catch((err) => { setTasks(prevTasks); setAuthMsg(err.message); });
    };

    const onTouchCancel = () => {
      if (!__touchDrag) return;
      const drag = __touchDrag;
      __touchDrag = null;
      clearTimeout(drag.timer);
      if (drag.ghostEl) drag.ghostEl.remove();
      if (drag.origEl) drag.origEl.style.opacity = "";
      if (drag.origEl) drag.origEl.classList.remove("colDragging");
      if (drag.overColEl) drag.overColEl.classList.remove("colDragOver");
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchCancel);
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
    };
  }, []);

  // Mouse drag-drop for sidebar mode — HTML5 DnD is unreliable when the ReactFlow
  // panel sits as a sticky flex sibling; mouse events bypass that entirely.
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!__mouseDrag) return;
      __mouseDrag.lastX = e.clientX;
      __mouseDrag.lastY = e.clientY;

      if (!__mouseDrag.active) {
        const dx = e.clientX - __mouseDrag.startX;
        const dy = e.clientY - __mouseDrag.startY;
        if (Math.hypot(dx, dy) < 4) return;
        __mouseDrag.active = true;
        const origEl = __mouseDrag.origEl;
        const w = origEl.offsetWidth;
        const h = origEl.offsetHeight;
        __mouseDrag.origH = h;
        const g = origEl.cloneNode(true);
        g.style.cssText = [
          "position:fixed", "pointer-events:none", "z-index:9999",
          "opacity:0.9", "transform:rotate(2deg) scale(1.05)",
          "box-shadow:0 12px 40px rgba(0,0,0,0.55)",
          "border-radius:14px", "transition:none",
          `width:${w}px`,
          `left:${e.clientX - w / 2}px`,
          `top:${e.clientY - h / 2}px`,
        ].join(";");
        document.body.appendChild(g);
        __mouseDrag.ghostEl = g;
        origEl.style.opacity = "0.3";
        mouseCbRef.current?.setDraggingTaskId(__mouseDrag.taskId);
        return;
      }

      const g = __mouseDrag.ghostEl;
      if (g) {
        const w = __mouseDrag.origEl.offsetWidth;
        const h = __mouseDrag.origH;
        g.style.left = `${e.clientX - w / 2}px`;
        g.style.top = `${e.clientY - h / 2}px`;
      }

      // Find the column the cursor is over
      if (g) g.style.display = "none";
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (g) g.style.display = "";

      let node = el;
      while (node && !node.dataset?.colId) node = node.parentElement;

      // Fallback: if cursor is in the gap between columns, snap to nearest column
      if (!node) {
        const cb = mouseCbRef.current;
        const kanbanEl = cb?.sidebarPanelRef?.current;
        if (kanbanEl) {
          const kr = kanbanEl.getBoundingClientRect();
          if (e.clientX >= kr.left && e.clientX <= kr.right &&
              e.clientY >= kr.top && e.clientY <= kr.bottom) {
            const colEls = Array.from(kanbanEl.querySelectorAll("[data-col-id]"));
            let best = null;
            let bestDist = Infinity;
            for (const c of colEls) {
              const r = c.getBoundingClientRect();
              const dist = e.clientY < r.top ? r.top - e.clientY
                         : e.clientY > r.bottom ? e.clientY - r.bottom : 0;
              if (dist < bestDist) { bestDist = dist; best = c; }
            }
            if (best && bestDist < 20) node = best;
          }
        }
      }

      const overColId = node?.dataset?.colId || null;
      __mouseDrag.overColId = overColId;
      mouseCbRef.current?.setDragOverColId(overColId);

      if (overColId) {
        let taskNode = el;
        while (taskNode && !taskNode.dataset?.taskId) taskNode = taskNode.parentElement;
        const overTaskId = taskNode?.dataset?.taskId || null;

        if (overTaskId && overTaskId !== __mouseDrag.taskId) {
          const rect = taskNode.getBoundingClientRect();
          const cb = mouseCbRef.current;
          if (cb) {
            const { tasks, columns, taskSearch } = cb;
            const q = (taskSearch || "").trim().toLowerCase();
            const vis = q ? tasks.filter((t) => `${t.title ?? ""}\n${t.description ?? ""}\n${t.due_date ?? ""}`.toLowerCase().includes(q)) : tasks;
            const ordCols = (columns?.length
              ? [...columns].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
              : [{ id: "planning", name: "planning" }, { id: "doing", name: "doing" }, { id: "done", name: "done" }]
            ).map((c) => ({ ...c, name: String(c.name || "").trim() || "untitled" }));
            const col = ordCols.find((c) => c.id === overColId);
            if (col) {
              const colTasks = vis
                .filter((t) => (t.column_id && overColId) ? t.column_id === overColId : (t.status || "planning") === col.name)
                .sort((a, b) => {
                  const ai = a.order_index ?? 999999;
                  const bi = b.order_index ?? 999999;
                  if (ai !== bi) return ai - bi;
                  return new Date(a.created_at) - new Date(b.created_at);
                });
              const taskIdx = colTasks.findIndex((t) => t.id === overTaskId);
              if (taskIdx >= 0) {
                const hoverIdx = e.clientY < rect.top + rect.height / 2 ? taskIdx : taskIdx + 1;
                __mouseDrag.dropTarget = { colId: overColId, index: hoverIdx };
                cb.setDropVisual({ colId: overColId, index: hoverIdx });
              }
            }
          }
        } else {
          __mouseDrag.dropTarget = null;
          mouseCbRef.current?.setDropVisual(null);
        }
      } else {
        __mouseDrag.dropTarget = null;
        mouseCbRef.current?.setDropVisual(null);
      }
    };

    const onMouseUp = () => {
      if (!__mouseDrag) return;
      const drag = __mouseDrag;
      __mouseDrag = null;

      if (drag.ghostEl) drag.ghostEl.remove();
      if (drag.origEl) drag.origEl.style.opacity = "";

      const cb = mouseCbRef.current;
      if (!cb) return;

      cb.setDraggingTaskId(null);
      cb.setDragOverColId(null);
      cb.setDropVisual(null);

      if (!drag.active) return;

      const colId = drag.overColId;
      if (!colId) return;

      const drop = drag.dropTarget;
      const { tasks, columns, taskSearch, activeBoardId, setTasks, fetchTasks, setAuthMsg } = cb;

      const task = tasks.find((t) => t.id === drag.taskId);
      if (!task) return;

      const q = (taskSearch || "").trim().toLowerCase();
      const vis = q ? tasks.filter((t) => `${t.title ?? ""}\n${t.description ?? ""}\n${t.due_date ?? ""}`.toLowerCase().includes(q)) : tasks;
      const ordCols = (columns?.length
        ? [...columns].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        : [{ id: "planning", name: "planning" }, { id: "doing", name: "doing" }, { id: "done", name: "done" }]
      ).map((c) => ({ ...c, name: String(c.name || "").trim() || "untitled" }));
      const col = ordCols.find((c) => c.id === colId);
      if (!col) return;

      const sameCol = task.column_id ? task.column_id === colId : (task.status || "planning") === col.name;

      if (!sameCol) {
        const prevTasks = tasks;
        setTasks((ts) => ts.map((t) => t.id === drag.taskId ? { ...t, column_id: colId, status: col.name } : t));
        apiJson(`/api/tasks/${drag.taskId}`, {
          method: "PATCH",
          body: JSON.stringify({ column_id: colId, status: col.name }),
        }).then(() => fetchTasks(activeBoardId, { silent: true }))
          .catch((err) => { setTasks(prevTasks); setAuthMsg(err.message); });
        return;
      }

      if (!drop || drop.colId !== colId) return;

      const colTasks = vis
        .filter((t) => (t.column_id && colId) ? t.column_id === colId : (t.status || "planning") === col.name)
        .sort((a, b) => {
          const ai = a.order_index ?? 999999;
          const bi = b.order_index ?? 999999;
          if (ai !== bi) return ai - bi;
          return new Date(a.created_at) - new Date(b.created_at);
        });
      const ordered = colTasks.filter((t) => t.id !== drag.taskId);
      const insertAt = Math.max(0, Math.min(drop.index, ordered.length));
      ordered.splice(insertAt, 0, task);
      const items = ordered.map((t, i) => ({ id: t.id, order_index: i }));
      const prevTasks = tasks;
      setTasks((ts) => ts.map((t) => {
        const it = items.find((x) => x.id === t.id);
        return it ? { ...t, order_index: it.order_index } : t;
      }));
      apiJson("/api/tasks/reorder", { method: "POST", body: JSON.stringify({ items }) })
        .then(() => fetchTasks(activeBoardId, { silent: true }))
        .catch((err) => { setTasks(prevTasks); setAuthMsg(err.message); });
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

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
          <button className="btn iconBtn" title="Close" onClick=${() => setSelectedNodeId(null)}><${XIcon} /></button>
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
          <${RichEditor}
            key=${node.id}
            defaultContent=${node.data?.content ?? ""}
            onChange=${(v) => updateNodeData(node.id, { content: v })}
          />
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
              <button className=${`btn iconBtn ${routePath === "#/help" ? "active" : ""}`} onClick=${() => (window.location.hash = "#/help")} title="Help & Guide">${HelpIcon()}</button>

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
                        ${user.avatar_url ? html`<img className="avatarImgSm" src=${user.avatar_url} alt="" />` : UserIcon()}
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
                        ${user.avatar_url ? html`<img className="avatarImgSm" src=${user.avatar_url} alt="" />` : UserIcon()}
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

                        <button className="btn menuItem" onClick=${() => { setHeaderMenuOpen(false); window.location.hash = "#/help"; }}>
                          <span className="menuIcon">${HelpIcon()}</span>
                          <span>Help & Guide</span>
                        </button>

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
      return visibleTasks
        .filter((t) => {
          if (t.column_id && colId) return t.column_id === colId;
          return (t.status || "planning") === colName;
        })
        .sort((a, b) => {
          const ai = a.order_index ?? 999999;
          const bi = b.order_index ?? 999999;
          if (ai !== bi) return ai - bi;
          return new Date(a.created_at) - new Date(b.created_at);
        });
    };

    const openNew = () => {
      const first = orderedColumns[0];
      setTaskEditor({
        mode: "new",
        _key: uid("editor"),
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

    const showSidebar = !selectedTaskId || boardSidebarOpen;

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

    const deleteColumn = async (colId, colName) => {
      const label = colName ? `"${colName}"` : "this group";
      if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
      try {
        await apiJson(`/api/columns/${colId}`, { method: "DELETE" });
        await fetchBoardsAndColumns();
      } catch (e) {
        setAuthMsg(e.message === "column_has_tasks" ? "Move or delete all tasks in this group first." : e.message);
      }
    };

    const renameColumn = async (colId, name) => {
      setEditingColId(null);
      setEditingColName("");
      const trimmed = String(name).trim();
      if (!trimmed) return;
      try {
        await apiJson(`/api/columns/${colId}`, { method: "PATCH", body: JSON.stringify({ name: trimmed }) });
        await fetchBoardsAndColumns();
      } catch (e) {
        setAuthMsg(e.message);
      }
    };

    const openNewInColumn = (col) => {
      setTaskEditor({
        mode: "new",
        _key: uid("editor"),
        task: { title: "", description: "", status: col.name, column_id: col.id, due_date: "" },
      });
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

      if (next.some((c) => !c.id || String(c.id).length < 10)) return;

      try {
        await persistColumnOrder(next);
        await fetchBoardsAndColumns();
      } catch (e) {
        setAuthMsg(e.message);
      }
    };

    const reorderColumnsByIndex = (fromId, insertBeforeIndex) => {
      if (!activeBoardId || !fromId) return;
      const fromIndex = orderedColumns.findIndex((c) => c.id === fromId);
      if (fromIndex < 0) return;

      const next = [...orderedColumns];
      const [moved] = next.splice(fromIndex, 1);
      // After removal, adjust target index
      const targetIndex = insertBeforeIndex > fromIndex ? insertBeforeIndex - 1 : insertBeforeIndex;
      next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, moved);

      if (next.some((c) => !c.id || String(c.id).length < 10)) return;
      if (next.map((c) => c.id).join() === orderedColumns.map((c) => c.id).join()) return;

      // Optimistic: apply new order immediately, sync in background
      const prevColumns = columns;
      setColumns((prev) => prev.map((c) => {
        const newIdx = next.findIndex((n) => n.id === c.id);
        return newIdx >= 0 ? { ...c, order_index: newIdx } : c;
      }));
      persistColumnOrder(next)
        .then(() => fetchBoardsAndColumns({ silent: true }))
        .catch((e) => { setColumns(prevColumns); setAuthMsg(e.message); });
    };

    const moveColumn = (colId, dir) => {
      const i = orderedColumns.findIndex((c) => c.id === colId);
      if (i < 0) return;
      const j = dir === "left" ? i - 1 : i + 1;
      if (j < 0 || j >= orderedColumns.length) return;

      const a = orderedColumns[i];
      const b = orderedColumns[j];
      // Only supported for real DB columns.
      if (!a?.id || !b?.id || a.id.length < 10 || b.id.length < 10) return;

      // Optimistic: swap order immediately, sync in background
      const prevColumns = columns;
      setColumns((prev) => prev.map((c) => {
        if (c.id === a.id) return { ...c, order_index: b.order_index };
        if (c.id === b.id) return { ...c, order_index: a.order_index };
        return c;
      }));
      Promise.all([
        apiJson(`/api/columns/${a.id}`, { method: "PATCH", body: JSON.stringify({ order_index: b.order_index }) }),
        apiJson(`/api/columns/${b.id}`, { method: "PATCH", body: JSON.stringify({ order_index: a.order_index }) }),
      ])
        .then(() => fetchBoardsAndColumns({ silent: true }))
        .catch((e) => { setColumns(prevColumns); setAuthMsg(e.message); });
    };

    const saveEditor = async () => {
      if (!taskEditor) return;
      clearTimeout(autosaveRef.current);
      setAutosaveStatus(null);
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
                ${SearchIcon()}
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
                  ? html`<button className="btn iconBtn" onClick=${() => setTaskSearch("")} title="Clear search"><${XIcon} /></button>`
                  : html``}
              </div>

              <button className="btn primary" onClick=${() => openNew()}>${CheckSquareIcon()}New task</button>
              <button
                className="btn"
                onClick=${openNewStage}
                disabled=${!activeBoardId || boardMetaLoading}
                title="New task group"
              >
                ${LayersIcon()}New group
              </button>

              <button className=${`btn ${routePath === "#/board" ? "active" : ""}`} onClick=${backToBoardDashboard}>${BoardIcon()}Board</button>
              <button className=${`btn iconBtn ${routePath === "#/help" ? "active" : ""}`} onClick=${() => (window.location.hash = "#/help")} title="Help & Guide">${HelpIcon()}</button>

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
                  ${user.avatar_url ? html`<img className="avatarImgSm" src=${user.avatar_url} alt="" />` : UserIcon()}
                </button>
                ${userMenuOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <div className="userMenuHeader">
                          ${user.avatar_url ? html`<img className="avatarImgLg" src=${user.avatar_url} alt="" />` : html`<span className="avatarCircleLg">${avatarInitial(user.email)}</span>`}
                          <div className="userMenuInfo">
                            <div className="userMenuName">${user.full_name || user.email.split("@")[0]}</div>
                            <div className="userMenuEmail">${user.email}</div>
                            ${user.is_admin ? html`<span className="roleBadge">Admin</span>` : null}
                          </div>
                        </div>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/profile"; }}>
                          <span className="menuIcon">${UserIcon()}</span>
                          <span>My Profile</span>
                        </button>
                        ${user.is_admin ? html`
                          <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/admin"; }}>
                            <span className="menuIcon">${ShieldIcon()}</span>
                            <span>Admin Panel</span>
                          </button>
                        ` : null}
                        <div className="menuDivider"></div>
                        <button className="btn menuItem danger" onClick=${() => { signOut(); setUserMenuOpen(false); }}>
                          <span className="menuIcon">${LogoutIcon()}</span>
                          <span>Sign Out</span>
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
                  ${user.avatar_url ? html`<img className="avatarImgSm" src=${user.avatar_url} alt="" />` : UserIcon()}
                </button>
                ${userMenuOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <div className="userMenuHeader">
                          ${user.avatar_url ? html`<img className="avatarImgLg" src=${user.avatar_url} alt="" />` : html`<span className="avatarCircleLg">${avatarInitial(user.email)}</span>`}
                          <div className="userMenuInfo">
                            <div className="userMenuName">${user.full_name || user.email.split("@")[0]}</div>
                            <div className="userMenuEmail">${user.email}</div>
                            ${user.is_admin ? html`<span className="roleBadge">Admin</span>` : null}
                          </div>
                        </div>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/profile"; }}>
                          <span className="menuIcon">${UserIcon()}</span>
                          <span>My Profile</span>
                        </button>
                        ${user.is_admin ? html`
                          <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/admin"; }}>
                            <span className="menuIcon">${ShieldIcon()}</span>
                            <span>Admin Panel</span>
                          </button>
                        ` : null}
                        <div className="menuDivider"></div>
                        <button className="btn menuItem danger" onClick=${() => { signOut(); setUserMenuOpen(false); }}>
                          <span className="menuIcon">${LogoutIcon()}</span>
                          <span>Sign Out</span>
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
                        <span className="menuIcon">${CheckSquareIcon()}</span>
                        <span>New task</span>
                      </button>
                      <button className="btn menuItem" onClick=${() => { fetchTasks(); setHeaderMenuOpen(false); }}>
                        <span className="menuIcon">${RefreshIcon()}</span>
                        <span>Refresh</span>
                      </button>

                      <div className="menuDivider"></div>

                      <button className="btn menuItem" onClick=${() => { setHeaderMenuOpen(false); window.location.hash = "#/help"; }}>
                        <span className="menuIcon">${HelpIcon()}</span>
                        <span>Help & Guide</span>
                      </button>

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
          <div
            style=${{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: 0,
              alignItems: "flex-start",
            }}
          >
            ${showSidebar
              ? html`
                  <div
                    ref=${sidebarPanelRef}
                    className=${`kanban ${selectedTaskId ? "kanbanSidebar" : ""}`}
                    style=${{ width: selectedTaskId && !isMobile ? sidebarWidth + "px" : "100%", flexShrink: 0 }}
                    onDragOver=${(e) => { if (__isTaskDragging) e.preventDefault(); }}
                  >
              ${(() => {
                const kanbanEls = [];
                const lastIdx = orderedColumns.length - 1;
                orderedColumns.forEach((col, idx) => {
              const title = col.name === "planning" ? "Planning" : col.name === "doing" ? "Doing" : col.name === "done" ? "Done" : col.name;
              const colTasks = tasksForColumn(col);
              const isColDragging = draggingColId === col.id;
              kanbanEls.push(html`
                <div
                  key=${col.id}
                  data-col-id=${col.id}
                  className=${"col"
                    + (dragOverColId === col.id && !draggingColId ? " colDragOver" : "")
                    + (isColDragging ? " colDragging" : "")
                    + (draggingColId && colDropVisual === idx ? " colDropBefore" : "")
                    + (draggingColId && colDropVisual === lastIdx + 1 && idx === lastIdx ? " colDropAfter" : "")}
                  onDragOver=${(e) => {
                    const types = Array.from(e.dataTransfer.types);
                    if (__isTaskDragging || types.includes("application/task-id")) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverColId(col.id);
                    } else if (!isMobile && types.includes("application/col-id")) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      const rect = e.currentTarget.getBoundingClientRect();
                      const insertIdx = e.clientX > rect.left + rect.width / 2 ? idx + 1 : idx;
                      colDropRef.current = { index: insertIdx };
                      setColDropVisual(insertIdx);
                    }
                  }}
                  onDragLeave=${(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setDragOverColId(null);
                      __taskDropTarget = null;
                      setDropVisual(null);
                      // colDropVisual intentionally NOT cleared here — clearing it on
                      // dragLeave causes twitching because the drop line shifts layout
                      // and triggers another dragLeave. Cleared in onDragEnd / onDrop.
                    }
                  }}
                  onDrop=${(e) => {
                    e.preventDefault();
                    const types = Array.from(e.dataTransfer.types);

                    if (types.includes("application/task-id")) {
                      // — task drop —
                      const taskId = e.dataTransfer.getData("application/task-id");
                      const drop = __taskDropTarget;
                      __taskDropTarget = null;
                      setDraggingTaskId(null);
                      setDragOverColId(null);
                      setDropVisual(null);

                      const task = tasks.find((t) => t.id === taskId);
                      if (!task) return;

                      const sameCol = task.column_id
                        ? task.column_id === col.id
                        : (task.status || "planning") === col.name;

                      if (!sameCol) {
                        const prevTasks = tasks;
                        setTasks((ts) => ts.map((t) => t.id === taskId ? { ...t, column_id: col.id, status: col.name } : t));
                        apiJson(`/api/tasks/${taskId}`, {
                          method: "PATCH",
                          body: JSON.stringify({ column_id: col.id, status: col.name }),
                        }).then(() => fetchTasks(activeBoardId, { silent: true }))
                          .catch((err) => { setTasks(prevTasks); setAuthMsg(err.message); });
                        return;
                      }

                      if (!drop || drop.colId !== col.id) return;
                      const ordered = tasksForColumn(col).filter((t) => t.id !== taskId);
                      const insertAt = Math.max(0, Math.min(drop.index, ordered.length));
                      ordered.splice(insertAt, 0, task);
                      const items = ordered.map((t, i) => ({ id: t.id, order_index: i }));
                      const prevTasks2 = tasks;
                      setTasks((ts) => ts.map((t) => {
                        const it = items.find((x) => x.id === t.id);
                        return it ? { ...t, order_index: it.order_index } : t;
                      }));
                      apiJson("/api/tasks/reorder", { method: "POST", body: JSON.stringify({ items }) })
                        .then(() => fetchTasks(activeBoardId, { silent: true }))
                        .catch((err) => { setTasks(prevTasks2); setAuthMsg(err.message); });

                    } else if (types.includes("application/col-id")) {
                      // — column drop —
                      const fromId = columnDragIdRef.current;
                      const drop = colDropRef.current;
                      columnDragIdRef.current = null;
                      colDropRef.current = null;
                      setDraggingColId(null);
                      setColDropVisual(null);
                      if (fromId && drop !== null) reorderColumnsByIndex(fromId, drop.index);
                    }
                  }}
                >
                  <div
                    className="colHeader colHeaderDraggable"
                    draggable=${!isMobile && !selectedTaskId && activeBoardId && String(col.id).length > 10 ? "true" : "false"}
                    onTouchStart=${isMobile && activeBoardId && !selectedTaskId && String(col.id).length > 10 ? (e) => {
                      const origEl = e.currentTarget.closest('.col') || e.currentTarget;
                      const cid = col.id;
                      const timer = setTimeout(() => {
                        if (!__touchDrag || __touchDrag.colId !== cid) return;
                        __touchDrag.active = true;
                        origEl.classList.add('colDragging');
                        if (navigator.vibrate) navigator.vibrate(30);
                      }, 400);
                      const touch = e.touches[0];
                      __touchDrag = {
                        colId: cid,
                        startX: touch.clientX,
                        startY: touch.clientY,
                        lastX: touch.clientX,
                        lastY: touch.clientY,
                        active: false,
                        timer,
                        ghostEl: null,
                        origEl,
                        overColId: null,
                        overColEl: null,
                        insertIdx: null,
                      };
                    } : null}
                    onDragStart=${(e) => {
                      e.stopPropagation();
                      columnDragIdRef.current = col.id;
                      colDropRef.current = null;
                      setColDropVisual(null);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", col.id);
                      e.dataTransfer.setData("application/col-id", col.id);
                      // Defer DOM mutation so Chrome doesn't cancel the drag
                      const cid = col.id;
                      requestAnimationFrame(() => setDraggingColId(cid));
                    }}
                    onDragEnd=${() => {
                      columnDragIdRef.current = null;
                      colDropRef.current = null;
                      setDraggingColId(null);
                      setColDropVisual(null);
                    }}
                    title=${!isMobile && !draggingTaskId ? "Drag to reorder groups" : ""}
                  >
                    ${editingColId === col.id
                      ? html`<input
                          className="input colTitleEdit"
                          value=${editingColName}
                          onInput=${(e) => setEditingColName(e.target.value)}
                          onKeyDown=${(e) => {
                            if (e.key === "Enter") { e.preventDefault(); renameColumn(col.id, editingColName); }
                            if (e.key === "Escape") { setEditingColId(null); setEditingColName(""); }
                          }}
                          onBlur=${() => renameColumn(col.id, editingColName)}
                          onClick=${(e) => e.stopPropagation()}
                          autoFocus=${true}
                        />`
                      : html`<div
                          className=${"colTitle" + (activeBoardId ? " colTitleEditable" : "")}
                          title=${activeBoardId ? "Click to rename" : (col.description ? stripHtml(col.description) : title)}
                          onClick=${activeBoardId ? (e) => { e.stopPropagation(); setEditingColId(col.id); setEditingColName(col.name); } : null}
                        >${colIcon(col.name)}${title}</div>`
                    }
                    <div className="row" style=${{ gap: "4px" }}>
                      ${!isMobile && orderedColumns.length > 1
                        ? html`
                            <button className="btn iconBtn" disabled=${idx === 0} onClick=${() => moveColumn(col.id, "left")} title="Move left">${LeftIcon()}</button>
                            <button className="btn iconBtn" disabled=${idx === orderedColumns.length - 1} onClick=${() => moveColumn(col.id, "right")} title="Move right">${RightIcon()}</button>
                          `
                        : null}
                      <div className="pill">${colTasks.length}</div>
                      ${activeBoardId
                        ? html`<button className="btn iconBtn colDeleteBtn" onClick=${() => deleteColumn(col.id, col.name)} title="Delete group"><${TrashIcon} /></button>`
                        : null}
                    </div>
                  </div>

                  ${(() => {
                    // Build a flat array: interleave dropLine indicators with task cards.
                    // Using a closure + flat array avoids the htm multi-root fragment issue.
                    const dropIdx = (dropVisual && dropVisual.colId === col.id) ? dropVisual.index : null;
                    const isDraggingAny = Boolean(draggingTaskId);
                    const els = [];

                    colTasks.forEach((t, i) => {
                      // Drop line ABOVE this card
                      if (isDraggingAny && dropIdx === i) {
                        els.push(html`<div key=${"dl-" + col.id + "-" + i} className="dropLine"></div>`);
                      }

                      els.push(html`<div
                        key=${t.id}
                        data-task-id=${t.id}
                        className=${"taskCard" + (draggingTaskId === t.id ? " dragging" : "") + (selectedTaskId === t.id ? " taskSelected" : "")}
                        draggable=${selectedTaskId ? "false" : "true"}
                        onMouseDown=${selectedTaskId ? (e) => {
                          if (e.button !== 0) return;
                          __mouseDrag = {
                            taskId: t.id,
                            startX: e.clientX,
                            startY: e.clientY,
                            lastX: e.clientX,
                            lastY: e.clientY,
                            active: false,
                            ghostEl: null,
                            origEl: e.currentTarget,
                            origH: 0,
                            overColId: null,
                            dropTarget: null,
                          };
                        } : null}
                        onTouchStart=${(e) => {
                          const touch = e.touches[0];
                          const origEl = e.currentTarget;
                          const tid = t.id;
                          // Long-press timer: activate drag only after 400ms hold.
                          // If finger moves first, we cancel and let browser scroll.
                          const timer = setTimeout(() => {
                            if (!__touchDrag || __touchDrag.taskId !== tid) return;
                            __touchDrag.active = true;
                            // Build ghost at current finger position
                            const g = origEl.cloneNode(true);
                            const w = origEl.offsetWidth;
                            const h = origEl.offsetHeight;
                            g.style.cssText = [
                              "position:fixed", "pointer-events:none", "z-index:9999",
                              "opacity:0.9", "transform:rotate(2deg) scale(1.05)",
                              "box-shadow:0 12px 40px rgba(0,0,0,0.55)",
                              "border-radius:14px", "transition:none",
                              "width:" + w + "px",
                              "left:" + (__touchDrag.lastX - w / 2) + "px",
                              "top:"  + (__touchDrag.lastY - h / 2) + "px",
                            ].join(";");
                            document.body.appendChild(g);
                            __touchDrag.ghostEl = g;
                            origEl.style.opacity = "0.3";
                            if (navigator.vibrate) navigator.vibrate(30);
                          }, 400);
                          __touchDrag = {
                            taskId: tid,
                            startX: touch.clientX,
                            startY: touch.clientY,
                            lastX: touch.clientX,
                            lastY: touch.clientY,
                            active: false,
                            timer,
                            ghostEl: null,
                            origEl,
                            overColId: null,
                            overColEl: null,
                          };
                        }}
                        onDragStart=${(e) => {
                          if (selectedTaskId) {
                            // Sidebar mode: cancel HTML5 drag, let mouse events handle it
                            e.preventDefault();
                            return;
                          }
                          e.stopPropagation();
                          __taskDropTarget = null;
                          __isTaskDragging = true;
                          setDropVisual(null);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", t.id);
                          e.dataTransfer.setData("application/task-id", t.id);
                          // Defer DOM mutation — Chrome cancels the drag if the source
                          // element changes (opacity/class) during the dragstart event.
                          const tid = t.id;
                          requestAnimationFrame(() => setDraggingTaskId(tid));
                        }}
                        onDragOver=${(e) => {
                          if (!__isTaskDragging && !Array.from(e.dataTransfer.types).includes("application/task-id")) return;
                          if (draggingTaskId === t.id) return; // hovering over self
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          const rect = e.currentTarget.getBoundingClientRect();
                          const hoverIdx = e.clientY < rect.top + rect.height / 2 ? i : i + 1;
                          __taskDropTarget = { colId: col.id, index: hoverIdx };
                          setDropVisual({ colId: col.id, index: hoverIdx });
                          setDragOverColId(col.id);
                        }}
                        onDragEnd=${() => {
                          __taskDropTarget = null;
                          __isTaskDragging = false;
                          setDraggingTaskId(null);
                          setDragOverColId(null);
                          setDropVisual(null);
                        }}
                        onClick=${() => setTaskDetail(t)}
                      >
                        <div className="taskDragHandle" aria-hidden="true">⠿</div>
                        <div className="row">
                          <div className="taskTitle">${CheckSquareIcon()}${truncate(t.title, 80)}</div>
                          <div className="spacer"></div>
                          ${t.due_date ? html`<span className="pill">Due ${formatDateDMY(t.due_date)}</span>` : null}
                        </div>
                        ${t.description
                          ? html`<div className="taskDesc">${truncate(stripHtml(t.description), 160)}</div>`
                          : html`<div className="taskDesc muted">(no description)</div>`}
                        <div className="row" style=${{ marginTop: "4px" }}>
                          <span className="pill taskCardHint">Drag to move · click to view</span>
                        </div>
                      </div>`);

                      // Drop line BELOW last card
                      if (isDraggingAny && dropIdx === i + 1 && i === colTasks.length - 1) {
                        els.push(html`<div key=${"dl-" + col.id + "-end"} className="dropLine"></div>`);
                      }
                    });

                    if (colTasks.length === 0 && !isDraggingAny) {
                      els.push(html`<div key="empty" className="colEmpty">No tasks yet</div>`);
                    }

                    if (activeBoardId) {
                      els.push(html`<button key="addBtn" className="btn colAddBtn" onClick=${() => openNewInColumn(col)}>${PlusIcon()}Add task</button>`);
                    }

                    return html`<div style=${{ display: "flex", flexDirection: "column", gap: "8px" }}>${els}</div>`;
                  })()}
                </div>
              `);
                }); // end orderedColumns.forEach

                return kanbanEls;
              })()}
                  </div>
                `
              : html``}

            ${selectedTaskId && !isMobile && showSidebar && !isMobile
              ? html`<div
                  className="resizeHandle"
                  onPointerDown=${(e) => {
                    e.preventDefault();
                    sidebarResizeDrag.current = { startX: e.clientX, startW: sidebarWidth, curW: sidebarWidth };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove=${(e) => {
                    if (!(e.buttons & 1)) return;
                    const w = Math.max(200, Math.min(800, sidebarResizeDrag.current.startW + e.clientX - sidebarResizeDrag.current.startX));
                    sidebarResizeDrag.current.curW = w;
                    if (sidebarPanelRef.current) sidebarPanelRef.current.style.width = w + "px";
                  }}
                  onPointerUp=${() => setSidebarWidth(sidebarResizeDrag.current.curW)}
                ></div>`
              : null}

            ${selectedTaskId
              ? html`
                  <div className="card" style=${{ flex: 1, minWidth: 0, position: "sticky", top: "18px", maxHeight: "calc(100vh - 36px)", overflowY: "auto" }}>
                    <div className="panelHeader">
                      <div>
                        ${(() => {
                          const t = tasks.find((x) => x.id === selectedTaskId);
                          const colName = t?.column_id
                            ? (columns.find((c) => c.id === t.column_id)?.name || t?.status || "")
                            : (t?.status || "");
                          return html`
                            <div className="name">${CheckSquareIcon()}${t?.title || "Task"}</div>
                            ${colName ? html`<div className="panelMeta"><span>${colIcon(colName)}${colName.charAt(0).toUpperCase() + colName.slice(1)}</span></div>` : null}
                          `;
                        })()}
                      </div>
                      <div className="row" style=${{ gap: "8px" }}>
                        <button className="btn" onClick=${() => setBoardSidebarOpen((v) => !v)}>
                          ${showSidebar ? html`${EyeOffIcon()}Hide tasks` : html`${EyeIcon()}Show tasks`}
                        </button>
                        <button className="btn iconBtn" title="Close" onClick=${() => { setSelectedTaskId(null); setTaskGraph(null); setTaskGraphSelectedNodeId(null); }}><${XIcon} /></button>
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
                              className=${`btn iconBtn ${taskGraphAutoLink ? "primary" : ""}`}
                              title=${taskGraphAutoLink ? "Auto-link ON — new nodes auto-connect to selected parent (click to disable)" : "Auto-link OFF — new nodes placed freely (click to enable)"}
                              onClick=${() => setTaskGraphAutoLink((v) => !v)}
                            >
                              <${LayersIcon} />
                            </button>

                            <button
                              className="btn iconBtn"
                              title=${taskGraph.layoutMode === "brain" ? "Switch to river layout" : "Switch to brain layout · drag handles to connect nodes"}
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
                              title=${(taskGraphSelectedNodeId || taskGraphSelectedEdgeId) ? "Delete selected (Del)" : "Select a node or edge to delete"}
                              disabled=${!(taskGraphSelectedNodeId || taskGraphSelectedEdgeId)}
                              onClick=${deleteSelectedTaskGraphItem}
                            >
                              <${TrashIcon} />
                            </button>
                          </div>

                          <div
                            style=${{
                              height: isMobile
                                ? (showSidebar ? "380px" : "calc(100vh - 160px)")
                                : "calc(100vh - 240px)",
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
                      <div className="name">${taskEditor.mode === "new" ? html`<${CheckSquareIcon} />New Task` : html`<${EditIcon} />Edit Task`}</div>
                      <div className=${"meta" + (autosaveStatus === "saved" ? " autosaveSaved" : "")}>
                        ${autosaveStatus === "saving" ? "Saving…" : autosaveStatus === "saved" ? "Saved" : taskEditor.mode === "new" ? "Create a card" : `ID: ${taskEditor.task.id}`}
                      </div>
                    </div>
                    <button className="btn iconBtn" title="Close" onClick=${() => setTaskEditor(null)}><${XIcon} /></button>
                  </div>

                  <div className="field">
                    <div className="label">Title</div>
                    <input className="input" value=${taskEditor.task.title ?? ""} onChange=${(e) => setTaskEditor((p) => ({ ...p, task: { ...p.task, title: e.target.value } }))} />
                  </div>

                  <div className="field">
                    <div className="label">Description</div>
                    <${RichEditor}
                      key=${taskEditor.task.id ?? taskEditor._key}
                      defaultContent=${taskEditor.task.description ?? ""}
                      onChange=${(v) => setTaskEditor((p) => ({ ...p, task: { ...p.task, description: v } }))}
                    />
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
                    <button className="btn" onClick=${() => setTaskEditor(null)}>${XIcon()}Cancel</button>
                    <button className="btn primary" onClick=${saveEditor}>${SaveIcon()}Save</button>
                  </div>
                </div>
              </div>
            `
          : html``}

        ${taskDetail
          ? html`
              <div className="modalOverlay" onClick=${() => setTaskDetail(null)}>
                <div className="modal taskDetailModal" onClick=${(e) => e.stopPropagation()}>
                  <div className="panelHeader">
                    <div className="name" style=${{ fontSize: "16px" }}><${CheckSquareIcon} />${taskDetail.title}</div>
                    <button className="btn iconBtn" title="Close" onClick=${() => setTaskDetail(null)}><${XIcon} /></button>
                  </div>

                  ${taskDetail.due_date ? html`
                    <div style=${{ marginTop: "8px" }}>
                      <span className="pill" style=${{ display:"inline-flex", alignItems:"center", gap:"4px" }}><${CalendarIcon} />Due ${formatDateDMY(taskDetail.due_date)}</span>
                    </div>
                  ` : null}

                  <div className="taskDetailBody">
                    <${RichViewer} content=${taskDetail.description} />
                  </div>

                  <div className="row" style=${{ marginTop: "16px" }}>
                    <button className="btn" onClick=${() => { setTaskDetail(null); openEdit(taskDetail); }}>${EditIcon()}Edit</button>
                    <div className="spacer"></div>
                    <button className="btn primary" onClick=${() => { setTaskDetail(null); openTaskGraph(taskDetail); }}>${GraphIcon()}Open Graph</button>
                  </div>
                </div>
              </div>
            `
          : null}

        ${stageEditor
          ? html`
              <div className="modalOverlay" onClick=${() => setStageEditor(null)}>
                <div className="modal" onClick=${(e) => e.stopPropagation()}>
                  <div className="panelHeader">
                    <div>
                      <div className="name"><${LayersIcon} />New Task Group</div>
                      <div className="meta">Create a new task group</div>
                    </div>
                    <button className="btn iconBtn" title="Close" onClick=${() => setStageEditor(null)}><${XIcon} /></button>
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
                    <${RichEditor}
                      key="stage-desc"
                      defaultContent=${stageEditor.description ?? ""}
                      onChange=${(v) => setStageEditor((p) => ({ ...p, description: v }))}
                    />
                  </div>

                  <div className="row">
                    <div className="spacer"></div>
                    <button className="btn" onClick=${() => setStageEditor(null)}>${XIcon()}Cancel</button>
                    <button className="btn primary" onClick=${saveStage} disabled=${!String(stageEditor.name ?? "").trim()}>${SaveIcon()}Save</button>
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
                      <${RichEditor}
                        key=${node.id}
                        defaultContent=${node.data?.content ?? ""}
                        onChange=${(v) => patchNode({ content: v })}
                      />
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
              <button className=${`btn iconBtn ${routePath === "#/help" ? "active" : ""}`} onClick=${() => (window.location.hash = "#/help")} title="Help & Guide">${HelpIcon()}</button>

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

  const renderHelp = () => {
    const toggle = (i) => setOpenHelpSection((v) => (v === i ? null : i));
    const chevron = (i) => html`<svg className=${"icon helpChevron" + (openHelpSection === i ? " open" : "")} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

    // Mini graph nodes/edges reused from home preview pattern
    const helpGraphNodes = [
      { id: "hg1", type: "task",     position: { x: 10, y: 20  }, data: { title: "Write report", status: "doing", content: "", tags: [] } },
      { id: "hg2", type: "subtask",  position: { x: 10, y: 140 }, data: { title: "Research", kind: "subtask", status: "pending", content: "", tags: [] } },
      { id: "hg3", type: "subtask",  position: { x: 260, y: 140}, data: { title: "First draft", kind: "subtask", status: "pending", content: "", tags: [] } },
      { id: "hg4", type: "milestone",position: { x: 260, y: 20 }, data: { title: "Deadline", date: "2026-07-01", tags: [] } },
    ];
    const helpGraphEdges = [
      { id: "hge1", source: "hg1", target: "hg2", sourceHandle: "sB", targetHandle: "tT", type: "smoothstep", data: { kind: "contains" }, markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 }, style: { strokeWidth: 2 } },
      { id: "hge2", source: "hg1", target: "hg3", sourceHandle: "sB", targetHandle: "tT", type: "smoothstep", data: { kind: "contains" }, markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 }, style: { strokeWidth: 2 } },
      { id: "hge3", source: "hg1", target: "hg4", sourceHandle: "sR", targetHandle: "tL", type: "smoothstep", data: { kind: "dependency" }, markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 }, style: { strokeWidth: 2, strokeDasharray: "5 4" } },
    ];

    const sections = [
      {
        title: "Getting Started",
        icon: "🚀",
        text: html`
          <div className="helpText">
            <p><strong>Emonat</strong> is a Kanban board combined with a task graph workspace. Each task lives in a column on the board, and can have its own private graph for detailed breakdown.</p>
            <ul>
              <li><strong>Board</strong> — your main workspace with columns and task cards</li>
              <li><strong>Group (column)</strong> — a stage like Planning, Doing, Done</li>
              <li><strong>Task card</strong> — a single piece of work inside a group</li>
              <li><strong>Graph</strong> — a visual breakdown linked to one task card</li>
            </ul>
          </div>`,
        visual: html`
          <div className="helpMiniKanban">
            <div className="helpMiniCol">
              <div className="helpMiniColHeader">📋 Planning</div>
              <div className="helpMiniCard">Design mockups</div>
              <div className="helpMiniCard">Write spec</div>
            </div>
            <div className="helpMiniCol">
              <div className="helpMiniColHeader">⚡ Doing</div>
              <div className="helpMiniCard accent">Write report</div>
            </div>
            <div className="helpMiniCol">
              <div className="helpMiniColHeader">✅ Done</div>
              <div className="helpMiniCard">Setup repo</div>
            </div>
          </div>`,
      },
      {
        title: "Creating & Managing Tasks",
        icon: "✏️",
        text: html`
          <div className="helpText">
            <p>Click <strong>+ Add task</strong> at the bottom of any column to create a task card. Each card has a title, description, and optional due date.</p>
            <ul>
              <li><strong>Tap/click</strong> a card to preview it</li>
              <li>Press <strong>Edit</strong> in the preview to change title, description, or due date</li>
              <li>Press <strong>Open Graph</strong> to enter the task's graph workspace</li>
              <li>Use the <strong>search bar</strong> to filter cards across all columns</li>
            </ul>
          </div>`,
        visual: html`
          <div className="helpCardAnatomy">
            <div className="helpAnatomyCard">
              <div className="helpAnatomyTitle">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style=${{ opacity: 0.55, flexShrink: 0 }}><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                Write quarterly report
              </div>
              <div className="helpAnatomyDesc">Compile Q2 results and prepare slides for board review. Include financial overview and KPIs.</div>
              <div className="helpAnatomyMeta">
                <span className="pill" style=${{ fontSize: '10px', padding: '2px 7px' }}>Due 30 Jun</span>
              </div>
            </div>
            <div className="helpAnatomyLegend">
              <div className="helpAnatomyLegendRow"><span className="helpAnatomyDot accent"></span><span>Title</span></div>
              <div className="helpAnatomyLegendRow"><span className="helpAnatomyDot muted"></span><span>Description</span></div>
              <div className="helpAnatomyLegendRow"><span className="helpAnatomyDot pill"></span><span>Due date</span></div>
            </div>
          </div>`,
      },
      {
        title: "Drag & Drop — Desktop",
        icon: "🖱️",
        text: html`
          <div className="helpText">
            <p>On desktop, <strong>click and drag</strong> any task card to move it between columns or reorder within a column.</p>
            <ul>
              <li>Grab a card by clicking and holding, then drag left or right</li>
              <li>A blue <strong>drop line</strong> shows where the card will land</li>
              <li>Drag a <strong>column header</strong> to reorder the columns themselves</li>
              <li>A glowing vertical bar shows the column insert position</li>
            </ul>
          </div>`,
        visual: html`
          <div className="helpDragDemo">
            <div className="helpDragCol">
              <div className="helpDragColLabel">Planning</div>
              <div className="helpDragCard">Write report</div>
            </div>
            <div className="helpDragCol helpDragColDrop">
              <div className="helpDragColLabel">Doing</div>
            </div>
          </div>`,
      },
      {
        title: "Drag & Drop — Mobile (Touch)",
        icon: "👆",
        text: html`
          <div className="helpText">
            <p>On mobile, touch drag uses a <strong>long-press</strong> gesture to avoid conflicts with normal scrolling.</p>
            <ul>
              <li><strong>Hold</strong> a task card or column header for ~400ms</li>
              <li>A glowing border appears — your device may vibrate</li>
              <li>The card <strong>dims</strong> and a ghost copy follows your finger</li>
              <li>Drag to a target column, then <strong>release</strong> to drop</li>
              <li>A quick tap (no hold) opens the task preview as normal</li>
            </ul>
          </div>`,
        visual: html`
          <div className="helpLongPressDemo">
            <div className="helpLongPressCard">Write report</div>
            <div className="helpLongPressSteps">
              <div className="helpLongPressStep helpLongPressStep1">Hold 400ms</div>
              <div className="helpLongPressArrow">→</div>
              <div className="helpLongPressStep helpLongPressStep2">Glow appears</div>
              <div className="helpLongPressArrow">→</div>
              <div className="helpLongPressStep helpLongPressStep3">Drag to column</div>
            </div>
          </div>`,
      },
      {
        title: "Task Graph",
        icon: "🔗",
        text: html`
          <div className="helpText">
            <p>Each task card has its own <strong>graph workspace</strong>. Click a card and press <em>Open Graph</em> to enter it.</p>
            <ul>
              <li>Add <strong>subtasks, notes, resources, milestones, checklists</strong> as graph nodes</li>
              <li><strong>Drag from the handles</strong> (edges of nodes) to draw connections</li>
              <li>Use <strong>dependency edges</strong> to block downstream tasks</li>
              <li>Switch between <em>Brain</em> and <em>River</em> layouts with the layout button</li>
              <li>Click a node to open its inspector panel and edit its content</li>
              <li>Press <kbd>Del</kbd> with a node/edge selected to delete it</li>
            </ul>
          </div>`,
        visual: html`
          <div className="helpGraphPreview previewCanvas">
            <${ReactFlow}
              className="homePreviewFlow"
              nodes=${helpGraphNodes}
              edges=${helpGraphEdges}
              nodeTypes=${nodeTypes}
              fitView=${true}
              nodesDraggable=${false}
              nodesConnectable=${false}
              elementsSelectable=${false}
              zoomOnScroll=${false}
              panOnDrag=${false}
              proOptions=${{ hideAttribution: true }}
            >
              <${Background} gap=${18} color=${theme === "light" ? "rgba(15,23,42,0.07)" : "rgba(255,255,255,0.05)"} />
            </${ReactFlow}>
          </div>`,
      },
      {
        title: "Groups & Boards",
        icon: "📂",
        text: html`
          <div className="helpText">
            <p><strong>Groups</strong> are the columns on your board (Planning, Doing, Done). <strong>Boards</strong> let you keep separate workspaces — for different projects or contexts.</p>
            <ul>
              <li><strong>Click a column title</strong> to rename it</li>
              <li>Use the <strong>← →</strong> arrows to reorder columns</li>
              <li>Press the <strong>trash</strong> icon to delete a column (only when empty)</li>
              <li>Click <strong>+ New group</strong> in the toolbar to add a custom column</li>
              <li>Switch boards using the <strong>board selector</strong> dropdown in the toolbar</li>
            </ul>
          </div>`,
        visual: html`
          <div className="helpMiniKanban" style=${{ flexDirection: 'column', gap: '6px' }}>
            <div className="helpGroupRow">
              <div className="helpGroupDot" style=${{ background: 'rgba(41,182,246,0.6)' }}></div>
              <span className="helpGroupName">Planning</span>
              <span className="helpGroupActions">← → 🗑</span>
            </div>
            <div className="helpGroupRow accent">
              <div className="helpGroupDot" style=${{ background: 'rgba(34,197,94,0.6)' }}></div>
              <span className="helpGroupName">Doing</span>
              <span className="helpGroupActions">← → 🗑</span>
            </div>
            <div className="helpGroupRow">
              <div className="helpGroupDot" style=${{ background: 'rgba(255,107,107,0.6)' }}></div>
              <span className="helpGroupName">Done</span>
              <span className="helpGroupActions">← → 🗑</span>
            </div>
            <div className="helpGroupRow dashed">
              <span style=${{ color: 'var(--accent)', fontSize: '12px' }}>+ New group</span>
            </div>
          </div>`,
      },
      {
        title: "Keyboard Shortcuts",
        icon: "⌨️",
        text: html`
          <div className="helpText">
            <p>Emonat supports keyboard shortcuts to speed up common actions — especially useful when editing graphs.</p>
          </div>`,
        visual: html`
          <div className="helpKbdGrid">
            <div className="helpKbdRow"><span className="helpKbdLabel">Close / cancel</span><kbd>Esc</kbd></div>
            <div className="helpKbdRow"><span className="helpKbdLabel">Delete selected node/edge</span><kbd>Del</kbd></div>
            <div className="helpKbdRow"><span className="helpKbdLabel">Search tasks</span><kbd>Ctrl</kbd><kbd>K</kbd></div>
            <div className="helpKbdRow"><span className="helpKbdLabel">Clear search</span><kbd>Esc</kbd></div>
            <div className="helpKbdRow"><span className="helpKbdLabel">Save task (in editor)</span><kbd>Ctrl</kbd><kbd>Enter</kbd></div>
            <div className="helpKbdRow"><span className="helpKbdLabel">Confirm rename</span><kbd>Enter</kbd></div>
          </div>`,
      },
    ];

    return html`
      <div className="screen">
        <div className="topbar">
          <div className="headerBlock">
            <div
              className="brand brandLink"
              role="button"
              tabIndex="0"
              onClick=${() => (window.location.hash = "#/home")}
              onKeyDown=${(e) => { if (e.key === "Enter") window.location.hash = "#/home"; }}
              title="Home"
            >
              <img className="brandLogo" src="/logo.png" alt="Emonat" />
              <div className="title">Emonat</div>
            </div>

            <div className="headerRight desktopOnly">
              <button className="btn" onClick=${() => (window.location.hash = "#/board")}>${BoardIcon()}Board</button>
              <button className="btn active">${HelpIcon()}Help</button>

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
                  ${user.avatar_url ? html`<img className="avatarImgSm" src=${user.avatar_url} alt="" />` : UserIcon()}
                </button>
                ${userMenuOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <div className="userMenuHeader">
                          ${user.avatar_url ? html`<img className="avatarImgLg" src=${user.avatar_url} alt="" />` : html`<span className="avatarCircleLg">${avatarInitial(user.email)}</span>`}
                          <div className="userMenuInfo">
                            <div className="userMenuName">${user.full_name || user.email.split("@")[0]}</div>
                            <div className="userMenuEmail">${user.email}</div>
                            ${user.is_admin ? html`<span className="roleBadge">Admin</span>` : null}
                          </div>
                        </div>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/profile"; }}>
                          <span className="menuIcon">${UserIcon()}</span>
                          <span>My Profile</span>
                        </button>
                        ${user.is_admin ? html`
                          <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/admin"; }}>
                            <span className="menuIcon">${ShieldIcon()}</span>
                            <span>Admin Panel</span>
                          </button>
                        ` : null}
                        <div className="menuDivider"></div>
                        <button className="btn menuItem danger" onClick=${() => { signOut(); setUserMenuOpen(false); }}>
                          <span className="menuIcon">${LogoutIcon()}</span>
                          <span>Sign Out</span>
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
                  ${user.avatar_url ? html`<img className="avatarImgSm" src=${user.avatar_url} alt="" />` : UserIcon()}
                </button>
                ${userMenuOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <div className="userMenuHeader">
                          ${user.avatar_url ? html`<img className="avatarImgLg" src=${user.avatar_url} alt="" />` : html`<span className="avatarCircleLg">${avatarInitial(user.email)}</span>`}
                          <div className="userMenuInfo">
                            <div className="userMenuName">${user.full_name || user.email.split("@")[0]}</div>
                            <div className="userMenuEmail">${user.email}</div>
                            ${user.is_admin ? html`<span className="roleBadge">Admin</span>` : null}
                          </div>
                        </div>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/profile"; }}>
                          <span className="menuIcon">${UserIcon()}</span>
                          <span>My Profile</span>
                        </button>
                        ${user.is_admin ? html`
                          <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/admin"; }}>
                            <span className="menuIcon">${ShieldIcon()}</span>
                            <span>Admin Panel</span>
                          </button>
                        ` : null}
                        <div className="menuDivider"></div>
                        <button className="btn menuItem danger" onClick=${() => { signOut(); setUserMenuOpen(false); }}>
                          <span className="menuIcon">${LogoutIcon()}</span>
                          <span>Sign Out</span>
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
                        <button className="btn menuItem active" onClick=${() => setHeaderMenuOpen(false)}>
                          <span className="menuIcon">${HelpIcon()}</span>
                          <span>Help & Guide</span>
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
          <div className="helpWrap">
            <div className="helpHero">
              <div className="helpHeroTitle">${HelpIcon()} Help & Guide</div>
              <div className="helpHeroSub">Everything you need to use Emonat effectively.</div>
            </div>

            ${sections.map((s, i) => html`
              <div key=${i} className="helpSection">
                <div className="helpSectionHeader" onClick=${() => toggle(i)} role="button" tabIndex="0"
                  onKeyDown=${(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(i); } }}>
                  <span className="helpSectionIcon" aria-hidden="true">${s.icon}</span>
                  <span className="helpSectionTitle">${s.title}</span>
                  ${chevron(i)}
                </div>
                ${openHelpSection === i ? html`
                  <div className="helpSectionBody">
                    <div className="helpTextCol">${s.text}</div>
                    <div className="helpVisual">${s.visual}</div>
                  </div>` : null}
              </div>
            `)}
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
                  ${user.avatar_url ? html`<img className="avatarImgSm" src=${user.avatar_url} alt="" />` : UserIcon()}
                </button>
                ${userMenuOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <div className="userMenuHeader">
                          ${user.avatar_url ? html`<img className="avatarImgLg" src=${user.avatar_url} alt="" />` : html`<span className="avatarCircleLg">${avatarInitial(user.email)}</span>`}
                          <div className="userMenuInfo">
                            <div className="userMenuName">${user.full_name || user.email.split("@")[0]}</div>
                            <div className="userMenuEmail">${user.email}</div>
                            ${user.is_admin ? html`<span className="roleBadge">Admin</span>` : null}
                          </div>
                        </div>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/profile"; }}>
                          <span className="menuIcon">${UserIcon()}</span>
                          <span>My Profile</span>
                        </button>
                        ${user.is_admin ? html`
                          <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/admin"; }}>
                            <span className="menuIcon">${ShieldIcon()}</span>
                            <span>Admin Panel</span>
                          </button>
                        ` : null}
                        <div className="menuDivider"></div>
                        <button className="btn menuItem danger" onClick=${() => { signOut(); setUserMenuOpen(false); }}>
                          <span className="menuIcon">${LogoutIcon()}</span>
                          <span>Sign Out</span>
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
                  ${user.avatar_url ? html`<img className="avatarImgSm" src=${user.avatar_url} alt="" />` : UserIcon()}
                </button>
                ${userMenuOpen
                  ? html`
                      <div className="menu" onClick=${(e) => e.stopPropagation()}>
                        <div className="userMenuHeader">
                          ${user.avatar_url ? html`<img className="avatarImgLg" src=${user.avatar_url} alt="" />` : html`<span className="avatarCircleLg">${avatarInitial(user.email)}</span>`}
                          <div className="userMenuInfo">
                            <div className="userMenuName">${user.full_name || user.email.split("@")[0]}</div>
                            <div className="userMenuEmail">${user.email}</div>
                            ${user.is_admin ? html`<span className="roleBadge">Admin</span>` : null}
                          </div>
                        </div>
                        <div className="menuDivider"></div>
                        <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/profile"; }}>
                          <span className="menuIcon">${UserIcon()}</span>
                          <span>My Profile</span>
                        </button>
                        ${user.is_admin ? html`
                          <button className="btn menuItem" onClick=${() => { setUserMenuOpen(false); window.location.hash = "#/admin"; }}>
                            <span className="menuIcon">${ShieldIcon()}</span>
                            <span>Admin Panel</span>
                          </button>
                        ` : null}
                        <div className="menuDivider"></div>
                        <button className="btn menuItem danger" onClick=${() => { signOut(); setUserMenuOpen(false); }}>
                          <span className="menuIcon">${LogoutIcon()}</span>
                          <span>Sign Out</span>
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
          <div className="profilePage">

            <!-- Avatar + identity card -->
            <div className="card profileIdentity">
              <label className="profileAvatarWrap" title="Click to change photo">
                ${user.avatar_url
                  ? html`<img className="profileAvatar profileAvatarImg" src=${user.avatar_url} alt="Avatar" />`
                  : html`<div className="profileAvatar profileAvatarInitial">${avatarInitial(user.email)}</div>`}
                <div className="profileAvatarOverlay">${CameraIcon()}</div>
                <input type="file" accept="image/*" style=${{display:"none"}} onChange=${(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 500000) { setAuthMsg("Image must be under 500 KB."); return; }
                  const reader = new FileReader();
                  reader.onload = (ev) => saveAvatar(ev.target.result);
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }} />
              </label>
              <div className="profileIdentityInfo">
                <div className="profileDisplayName">${user.full_name || user.email.split("@")[0]}</div>
                <div className="profileEmail">${user.email}</div>
                ${user.is_admin ? html`<span className="roleBadge roleBadgeLg">Admin</span>` : null}
              </div>
              <button className="btn" style=${{ marginLeft: "auto", alignSelf: "flex-start" }} onClick=${() => (window.location.hash = "#/board")}>← Board</button>
            </div>

            <!-- Personal info -->
            <div className="card">
              <div className="profileSectionTitle">Personal information</div>

              <div className="field">
                <div className="label">Email</div>
                <input className="input" value=${user.email ?? ""} disabled />
              </div>

              <div className="field">
                <div className="label">Full name</div>
                <input className="input" placeholder="Your name" value=${profileDraft.full_name ?? ""} onInput=${(e) => setProfileDraft((p) => ({ ...p, full_name: e.target.value }))} />
              </div>

              <div className="row" style=${{ gap: "12px", flexWrap: "wrap" }}>
                <div className="field" style=${{ flex: 1, minWidth: "200px" }}>
                  <div className="label">Phone</div>
                  <input className="input" placeholder="+84…" value=${profileDraft.phone ?? ""} onInput=${(e) => setProfileDraft((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="field" style=${{ flex: 1, minWidth: "200px" }}>
                  <div className="label">Birthday</div>
                  <input className="input" type="date" value=${profileDraft.birthday ?? ""} onChange=${(e) => setProfileDraft((p) => ({ ...p, birthday: normalizeDateOnly(e.target.value) }))} />
                </div>
              </div>

              <div className="row" style=${{ marginTop: "12px" }}>
                <button className="btn" onClick=${() => { setAuthMsg(""); fetchProfile(); }}>Reset</button>
                <div className="spacer"></div>
                <button className="btn primary" onClick=${saveProfile}>Save changes</button>
              </div>
              ${authMsg ? html`<div className=${"profileMsg " + (authMsg.includes("saved") ? "ok" : "danger")} style=${{ marginTop: "10px" }}>${authMsg}</div>` : null}
            </div>

            <!-- Change password -->
            <div className="card">
              <div className="profileSectionTitle">Change password</div>

              <div className="field">
                <div className="label">Current password</div>
                <input className="input" type="password" value=${pwDraft.current} onInput=${(e) => setPwDraft((p) => ({ ...p, current: e.target.value }))} />
              </div>
              <div className="row" style=${{ gap: "12px", flexWrap: "wrap" }}>
                <div className="field" style=${{ flex: 1, minWidth: "200px" }}>
                  <div className="label">New password</div>
                  <input className="input" type="password" value=${pwDraft.next} onInput=${(e) => setPwDraft((p) => ({ ...p, next: e.target.value }))} />
                </div>
                <div className="field" style=${{ flex: 1, minWidth: "200px" }}>
                  <div className="label">Confirm new password</div>
                  <input className="input" type="password" value=${pwDraft.confirm} onInput=${(e) => setPwDraft((p) => ({ ...p, confirm: e.target.value }))} />
                </div>
              </div>

              <div className="row" style=${{ marginTop: "12px" }}>
                <div className="spacer"></div>
                <button className="btn primary" onClick=${changePassword}>Update password</button>
              </div>
              ${pwMsg ? html`<div className=${"profileMsg " + (pwMsg.includes("successfully") ? "ok" : "danger")} style=${{ marginTop: "10px" }}>${pwMsg}</div>` : null}
            </div>

            <!-- Danger zone -->
            <div className="card dangerZone">
              <div className="profileSectionTitle danger">Danger zone</div>
              <div className="dangerZoneRow">
                <div>
                  <div style=${{ fontWeight: 600 }}>Delete account</div>
                  <div className="muted" style=${{ fontSize: "13px" }}>Permanently remove your account and all associated data. This cannot be undone.</div>
                </div>
                <button className="btn danger" onClick=${deleteAccount}>Delete account</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  };

  const renderAdmin = () => {
    if (!user) return renderLogin();
    if (!user.is_admin) { window.location.hash = "#/board"; return null; }

    const fmt = (iso) => iso ? new Date(iso).toLocaleDateString() : "—";

    return html`
      <div className="screen">
        <div className="topbar">
          <div className="headerBlock">
            <div className="brand brandLink" role="button" tabIndex="0"
              onClick=${() => (window.location.hash = "#/home")}
              onKeyDown=${(e) => { if (e.key === "Enter") window.location.hash = "#/home"; }}
              title="Home">
              <img className="brandLogo" src="/logo.png" alt="Emonat" />
              <div className="title">Emonat</div>
            </div>
            <div className="headerRight desktopOnly">
              <button className="btn" onClick=${() => (window.location.hash = "#/board")}>Board</button>
              <button className="btn" onClick=${() => (window.location.hash = "#/profile")}>${avatarInitial(user.email)}</button>
            </div>
          </div>
        </div>

        <div className="screenBody">
          <div className="adminPage">

            <div className="adminPageHeader">
              <div>
                <div className="name" style=${{ fontSize: "22px" }}>Admin Panel</div>
                <div className="meta">${adminUsers.length} registered user${adminUsers.length !== 1 ? "s" : ""}</div>
              </div>
              <button className="btn" onClick=${fetchAdminUsers} disabled=${adminLoading}>
                ${adminLoading ? "Loading…" : "Refresh"}
              </button>
            </div>

            <!-- Stats row -->
            <div className="adminStats">
              <div className="adminStat">
                <div className="adminStatValue">${adminUsers.length}</div>
                <div className="adminStatLabel">Total users</div>
              </div>
              <div className="adminStat">
                <div className="adminStatValue">${adminUsers.filter((u) => u.is_admin).length}</div>
                <div className="adminStatLabel">Admins</div>
              </div>
              <div className="adminStat">
                <div className="adminStatValue">${adminUsers.filter((u) => u.is_suspended).length}</div>
                <div className="adminStatLabel">Suspended</div>
              </div>
              <div className="adminStat">
                <div className="adminStatValue">${adminUsers.filter((u) => !u.is_suspended && !u.is_admin).length}</div>
                <div className="adminStatLabel">Active users</div>
              </div>
            </div>

            <!-- Users table -->
            <div className="card" style=${{ padding: 0, overflow: "hidden" }}>
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Joined</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th style=${{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${adminUsers.map((u) => {
                    const isPermanent = u.is_permanent_admin;
                    const isSelf = u.id === user.id;
                    return html`
                      <tr key=${u.id} className=${u.is_suspended ? "suspendedRow" : ""}>
                        <td>
                          <div className="adminUserCell">
                            <span className="avatarCircle avatarSm">${avatarInitial(u.email)}</span>
                            <div>
                              <div className="adminUserName">${u.full_name || u.email.split("@")[0]}</div>
                              <div className="adminUserEmail">${u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="adminMeta">${fmt(u.created_at)}</td>
                        <td>
                          ${u.is_admin
                            ? html`<span className="roleBadge">${isPermanent ? "Super Admin" : "Admin"}</span>`
                            : html`<span className="roleBadge roleBadgeUser">User</span>`}
                        </td>
                        <td>
                          ${u.is_suspended
                            ? html`<span className="statusBadge statusSuspended">Suspended</span>`
                            : html`<span className="statusBadge statusActive">Active</span>`}
                        </td>
                        <td>
                          <div className="adminActions">
                            ${!isPermanent && !isSelf ? html`
                              <button className="btn" style=${{ fontSize: "12px", padding: "4px 8px" }}
                                onClick=${() => adminPatchUser(u.id, { is_admin: !u.is_admin })}>
                                ${u.is_admin ? "Revoke admin" : "Make admin"}
                              </button>
                              <button className="btn" style=${{ fontSize: "12px", padding: "4px 8px" }}
                                onClick=${() => adminPatchUser(u.id, { is_suspended: !u.is_suspended })}>
                                ${u.is_suspended ? "Unsuspend" : "Suspend"}
                              </button>
                              <button className="btn danger" style=${{ fontSize: "12px", padding: "4px 8px" }}
                                onClick=${() => adminDeleteUser(u.id, u.email)}>
                                Delete
                              </button>
                            ` : html`<span className="muted" style=${{ fontSize: "12px" }}>${isPermanent ? "Protected" : "You"}</span>`}
                          </div>
                        </td>
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
              ${adminLoading ? html`<div style=${{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>Loading users…</div>` : null}
            </div>

          </div>
        </div>
      </div>
    `;
  };

  return html`
    <${GraphActionsContext.Provider} value=${actions}>
      ${(tasksLoading || boardMetaLoading) ? html`<div className="loadingBar"></div>` : null}
      ${routePath === "#/home"
        ? renderHome()
        : routePath === "#/login"
          ? renderLogin()
          : routePath === "#/profile"
            ? renderProfile()
          : routePath === "#/admin"
            ? renderAdmin()
          : routePath === "#/help"
            ? renderHelp()
          : routePath === "#/board"
            ? renderBoard()
            : renderHome()}
    </${GraphActionsContext.Provider}>
  `;
}


export { App };
export default App;


