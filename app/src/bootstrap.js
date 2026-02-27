import { React, createRoot } from "./vendor.js";
import { App } from "./App.js";

export function mount() {
  const el = document.getElementById("root");
  if (!el) throw new Error("Missing #root");
  createRoot(el).render(React.createElement(App));
}
