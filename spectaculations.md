# Product Specification: "Emonat"

**Version:** 1.0
**Concept:** A Graph-Based Task & Memory Manager
**Target Platforms:** Windows, Linux, Web, Android, iOS

---

## 1. Executive Summary

"NeuroTask" is a cross-platform application that eliminates the separation between **Task Management** (execution), **Note Taking** (context/memory), and **Project Planning** (flow of time).

Unlike traditional list-based apps, NeuroTask utilizes an **interactive, collaborative Knowledge Graph**. It visualizes tasks as nodes in a network, allowing users to see dependencies, context, and time-flow intuitively.

---

## 2. Core Philosophy: The Unified "Item"

The system is built on a single atomic unit called an **Item (Node)**. An Item is polymorphic:

* **It is a Task:** It has state (`To Do`, `Done`), assignees, and deadlines.
* **It is a Note:** It contains a rich-text block editor for storing files, history, and details.
* **It is a Point in Time:** It exists relative to other nodes (e.g., "3 days before Node B").

---

## 3. User Experience (UX) & Visual Interface

### 3.1. The Primary View: The Infinite Canvas

Instead of a list, the user lands on an infinite 2D plane.

* **Node Types (Visual Shapes):**
  
  * **Square (Action Node):** Represents a Task. Contains a checkbox and assignee avatar.
  * **Circle (Memory Node):** Represents Context/Files (e.g., PDF attachment, meeting notes).
  * **Diamond (Milestone Node):** Represents a major deadline or event.

* **Edge Types (Connections):**
  
  * **Solid Line (Dependency):** Task A $\rightarrow$ Task B. (Logic: *B cannot start until A is complete*).
  * **Dotted Line (Reference):** Memory Node - - - Task Node. (Logic: *Contextual link, no blocking*).

### 3.2. Dynamic Layout Modes

The user can toggle "Physics Engines" to visualize data differently:

1. **Brain Mode (Force-Directed):** Nodes float organically. Related items cluster together. Best for brainstorming and organizing chaos.
2. **River Mode (DAG - Directed Acyclic Graph):** Forces nodes into a strict Left-to-Right timeline flow.
   * *Left:* Immediate actions.
   * *Right:* Future goals.
   * *Visual:* The "Critical Path" (longest chain of dependencies) glows to highlight bottlenecks.

### 3.3. Collaboration ("Multiplayer")

* **Live Cursors:** Users see team members' mouse cursors moving on the graph in real-time (similar to Figma/Miro).
* **Node Chat:** Clicking a node opens a chat thread specific to that task/memory.

---

## 4. Technical Architecture

To support high-performance graph rendering and cross-platform deployment, the following stack is recommended:

### 4.1. Core Tech Stack

* **Frontend Framework:** **React (TypeScript)**
  * *Rationale:* Best ecosystem for complex interactive graphs.
* **Graph Engine:** **React Flow** or **TanStack Query**
  * *Rationale:* Industry standard for node-based UIs. Handles zooming, panning, and custom node rendering efficiently.
* **State Management:** **Zustand** or **Redux Toolkit**
* **Backend / Database:** **Supabase**
  * *Rationale:* Provides PostgreSQL, Auth, and **Real-time Subscriptions** (crucial for the multiplayer features) out of the box.

### 4.2. Cross-Platform Strategy

* **Web:** Direct React deployment.
* **Desktop (Windows/Linux):** **Tauri** (Rust wrapper) or **Electron**.
  * *Rationale:* Tauri is lighter and more secure; allows the React app to run as a native desktop app.
* **Mobile (iOS/Android):** **Capacitor** or **React Native**.
  * *Rationale:* Allows reusing the core logic while adapting the graph interactions for touch (gestures).

---

## 5. Data Model (JSON Schema)

The database will store a graph structure consisting of `nodes` and `edges`.

```json
{
  "graph_id": "project_health_01",
  "nodes": [
    {
      "id": "node_001",
      "type": "task",
      "position": { "x": 100, "y": 200 },
      "data": {
        "title": "Dr. Peunolkogie Appointment",
        "status": "pending",
        "date": "2023-12-15",
        "content": "<h1>Meeting Notes</h1><p>Discuss cough...</p>"
      }
    },
    {
      "id": "node_002",
      "type": "memory",
      "position": { "x": 50, "y": 200 },
      "data": {
        "title": "Blood_Results.pdf",
        "file_url": "storage/bucket/blood.pdf"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_01",
      "source": "node_002",
      "target": "node_001",
      "type": "reference"
    }
  ]
}

## 6. Functional Use Case Example

**Scenario:** Managing a Complex Medical Appointment (Dr. Peunolkogie)

This scenario demonstrates how the application handles "Task," "Memory," and "Time Flow" simultaneously.

1. **Creation (The Node):**
   
   * User double-clicks the canvas to create a **Task Node**.
   * **Title:** "Meeting Dr. Peunolkogie".
   * **Date:** Set for Dec 15th.

2. **Context (The Memory):**
   
   * User drags a PDF file (`Blood_Analysis.pdf`) directly onto the canvas.
   * The system creates a **Memory Node** (Circle shape) containing the file preview.

3. **Linking (The Connection):**
   
   * User draws a **Dotted Line** from the *PDF Node* to the *Meeting Node*.
   * *Meaning:* "This document is reference material for the meeting."

4. **Micro-Tasking (The Breakdown):**
   
   * User creates a new node: "Prepare Documents".
   * User creates a new node: "Fast for 12 hours".

5. **Dependency Logic (The Flow):**
   
   * User draws a **Solid Arrow** from "Prepare Documents" $\rightarrow$ "Meeting Dr. Peunolkogie".
   * *System Action:* The Meeting Node becomes "Locked" (visually dimmed) until the "Prepare Documents" node is checked off.

6. **Timeline Visualization (The Dynamic View):**
   
   * User clicks the **"River Mode"** button.
   * The graph automatically rearranges itself. "Prepare Documents" slides to the left (Earlier), and the Meeting slides to the right (Later), visually confirming the timeline sequence.

---

## 7. Development Roadmap

### Phase 1: The Prototype (Web Only)

**Goal:** Prove the visual concept works using React Flow.

- [ ] Initialize project with **React (Vite)** and **TypeScript**.
- [ ] Integrate **React Flow** library.
- [ ] Implement Custom Nodes:
  - [ ] **Task Node:** Square container with editable title and checkbox.
  - [ ] **Memory Node:** Circular container for text/images.
- [ ] Implement basic Drag-and-Drop to connect nodes (Edges).

### Phase 2: The Logic (Desktop Focus)

**Goal:** Make it a functional single-player application.

- [ ] Wrap the web app using **Tauri** (for Windows/Linux support).
- [ ] Implement the **"River Mode"** auto-layout algorithm (using `dagre` or `elkjs` libraries to force left-to-right sorting).
- [ ] Add the Rich Text Editor inside the nodes (using `tiptap` or `slate.js`).
- [ ] Implement Local Storage (save graph to a JSON file on the computer).

### Phase 3: The Cloud & Collaboration

**Goal:** Enable multiplayer and mobile sync.

- [ ] Connect the app to **Supabase** (PostgreSQL).
- [ ] Implement **Real-time Presence** (show other users' cursors moving on the graph).
- [ ] Develop the **Mobile Companion App** (using Capacitor):
  - [ ] Read-only view of the graph.
  - [ ] "Quick Capture" button to add nodes to the Inbox.

You have created what is known in branding as a **"Palindrome Derivation"** or **"Anagrammatic Acronym."** It gives your application a deep, hidden story that tech-savvy users love to discover.





*EMONAT** works even better now that I know the origin:

### 1. The "Tanome" Coincidence (The Hidden Japanese Meaning)

This is a happy accident that makes the name incredibly suitable for a task manager.

- **TANOME** (the reverse of Emonat) sounds exactly like the Japanese word **頼め (Tanome)**.

- **Meaning:** It is the imperative form of *Tanomu* (to request, to ask, to entrust).

- **Context:** In Japan, you use it when you are **assigning a task** or asking someone to take care of something.

- **Result:** Your app's hidden name literally means *"Entrust this task"* in Japanese. That is a fantastic "Easter Egg" for your brand story.

### 2. The Logic: "Input vs. Output"

- **TANOME (Input):** Task + Note + Memory. This is what you put *into* the system.

- **EMONAT (Output):** The result. The flow. The output that comes from organizing your inputs.

### 3. Updated Brand Story

You can use this in your "About" page or marketing:

> *"Why Emonat? It’s 'Task, Note, Memory' flipped on its head. We take your inputs (Tanome) and turn them into a natural flow (Emonat)."*

### Visualizing the Brand Identity

Since the name is a reversal, your logo could reflect this symmetry.

- **Concept:** Two arrows or triangles. One pointing **In** (Tanome/Input), one pointing **Out** (Emonat/Flow).

- **Style:** Minimalist, geometric.

- **Color:** Since "Tanome" feels grounded (Input), and "Emonat" sounds like "Emanate" (Flow), a gradient from **Dark Blue** (Deep Memory) to **Bright Teal** (Active Flow) would work perfectly.

**Verdict:** **Keep it.** It is rare to find a name that is unique (available domain), sounds good phonetically ("Emanate"), and has a double-meaning (Inverse of ingredients + Japanese for "Entrust task").