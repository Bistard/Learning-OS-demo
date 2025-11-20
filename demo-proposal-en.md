# 📘 “Xiaomo Demo Proposal”

## 1. Demo Overview
- Core purpose of the demo: Show an early-stage, purely front-end AI learning operating system that connects the full chain from “set goals → break down tasks → take notes → review,” so that when a large model takes over, it can immediately understand how to continue expanding the system.
- Usage scenarios: Suitable for college students who are approaching midterms/finals, preparing for entrance exams, or self-studying a course—especially those who only have scattered materials on hand and need AI to help with planning and review.
- Key value demonstrated by the demo: Goal profile and task-tree scheduling, linkage between the learning workspace and Markdown notes, knowledge-base categorization and RAG data visualization, and transparent reasoning through AI conversation replay and the Review Lab.
- Current maturity and dependencies: Runs entirely in the browser using Vite + TypeScript + native DOM. All data (goals, task trees, knowledge bases, review question banks) are driven by JSON templates. The display logic is complete, but it is not yet connected to a real backend or an online large model.

## 2. Core Feature Summary
| Feature | Purpose | Input / Output | Interaction with Other Modules | Status |
| --- | --- | --- | --- | --- |
| Goal Cockpit | Aggregate active goals, remaining time, and CTAs | Reads the list of goals and statistics from the global snapshot | Button clicks can navigate to goal creation, the knowledge base, or the goal workspace | Completed |
| Goal Creation Flow | Simulate a three-stage goal-creation process: “basic info → materials → AI generation” | Draft status, creation-flow status, preset list, knowledge-base preview | Can import knowledge-base entries, handle multi-file uploads, and finally call the “create goal” action | Completed |
| Task Tree & Profile Workspace | Display persona, remaining time, strategy lines, and the layered task tree | Current active goal | Can mark tasks as completed, open the learning workspace, and trigger toasts | Completed |
| Learning Workspace | Integrate lesson Markdown, rectangular selection, and the note system in a single screen | Current working assets, linked notes, AI menu presets | Can return to the task tree, capture a selection to form a question, and sync notes into the knowledge base | Completed |
| Markdown Notes | Provide a titled + body + optional preview editing experience | Note object passed in from the current tab or workspace | Changing the title/body writes back to global state in real time; can create or open notes with one click | Completed |
| Knowledge-Base Management | Category board + entry list + upload records + subject-library switching | Knowledge-base state, library list | Drag entries between categories, import materials into the goal-creation draft, create categories | Completed |
| AI Conversation Replay | Demonstrate tutoring dialogs with traceable citations | Preset conversation logs, current goal metadata | During playback, reads source tags and shares persona context with other modules | Completed |
| Review Lab | Unified question-bank engine (flashcards/single-choice/multiple-choice/matching/fill-in-the-blank/short-answer) | Preset questions, personalized context | Updates timeline and feedback based on answer status; can later write back to goal statistics | Completed |
| Shell Navigation & Tabs | Fixed side navigation + draggable tabs + toast area | Current page and tab list from the global snapshot | Responsible for mounting feature modules into the content area and syncing sidebar/meta | Completed |
| System Settings | Manage global configuration (currently only the Markdown preview switch) | Configuration state | Toggling the switch affects previews in the note editor and learning workspace | Completed |

## 3. Key Module Breakdown
- **Central State Dispatcher**: Responsible for initializing default goals, today route, task trees, knowledge bases, notes, workspace assets, and global configurations. It is also the single entry point for all events (navigation, goal creation, record upload, library switching, toasts). The tab manager and knowledge-base manager are injected here to ensure any module can safely read/write state.
- **Goal Creation Subsystem**: Contains draft data, flow progress, preset templates, and advanced settings logic. In the materials stage, users can upload files or batch-pull knowledge-base entries into the draft. In the generation stage, a front-end timer simulates AI processing. After completion, it automatically generates a new goal, today route, and weekly plan, and opens a goal workspace tab.
- **Task Tree / Profile Panel**: Extracts persona (remaining time, target score, preferences, weaknesses) from the current goal, along with strategy lines and task-tree nodes. Each node has chunked steps, persona-based scheduling hints, and a “why this matters” explanation. Nodes can be expanded/collapsed, marked completed, or used as entry points into the learning workspace.
- **Integrated Learning Workspace + Notes**: The left side presents the lesson Markdown (with KaTeX support) plus an Alt+drag rectangular selector that pops up a set of buttons: “Explain / Example / Review / Link / Note / Practice / Tools,” making it easy to feed selections to Gemini later. The right side is a collapsible note system automatically tied to the current task and supports one-click “add to knowledge base.”
- **Knowledge-Base Manager**: Encapsulates the logic for adding, renaming, deleting, dragging, uploading, and recording notes. It guarantees that the “Uncategorized” and “Notes” categories always exist. Upload records show up as prominently highlighted entries. When switching subject libraries, it automatically rebuilds the seed notes.
- **Review Lab Engine**: Uniformly handles 6 question types. Question prompts, hints, and feedback can all contain variables, dynamically inserting persona, remaining days, material sources, etc. It also provides a question timeline, progress bar, feedback cards, flashcard flipping, matching lines, and keyword-based evaluation for short answers.
- **AI Conversation Stage**: Pre-written “student vs. Xiaomo” examples. Playback includes a thinking state, typing animation, and citation list, and can be quickly swapped for real user conversations or live-generated results.
- **Shell Component**: Contains side navigation, tab strip, sidebar meta, toast area, and draggable nav width. All pages implement the same render interface; the shell only mounts and routes them, making it easy to add more pages later.
- **Subject Registry**: Manages the default goals, task trees, knowledge bases, and course Markdown for different subjects. Switching subjects only requires calling a single entry to replace the entire data set.

## 4. Demo Runtime Flow (User Perspective)
1. Upon opening the page, the user sees the Goal Cockpit: the system auto-loads a default Calculus goal, displaying remaining days, progress, and CTAs. The sidebar simultaneously shows a progress bar.
2. If the user wants to create a new goal, they enter the creation flow:
   - In the basic stage, they choose subject, preset, and time mode; the system auto-fills advanced options.
   - In the materials stage, they can drag files, paste links, and directly import knowledge-base entries; all materials persist in the draft.
   - In the generation stage, they see a progress animation of AI “parsing materials → building chapters → extracting key points → generating study routes.” Once done, a new goal is created and the user is redirected to the workspace.
3. In the task-tree page, the user can read persona, strategy, and remaining time; they can expand any task node to see breakdown steps and the “Why” block. Clicking “Start Study” jumps into the learning workspace.
4. The learning workspace automatically loads the lesson Markdown or auto-generated task notes based on the task. The left panel allows rectangular selections to generate questions; the right-note panel is bound to the task and supports one-click “add to knowledge base.”
5. Switching to the knowledge-base page, the user can drag categories, move entries, upload materials, and create custom categories. Uploaded files appear as highlighted entries in the list, and clicking an entry can navigate back to the related note.
6. To experience AI feedback, the user enters the Review Lab. The system renders prompts and feedback according to persona. After finishing questions, the user sees an updated timeline and forward-moving progress bar. They can also switch to the AI Conversation Stage to replay real cases and observe how AI cites materials, points out mistakes, and sets up sprint routes.
7. Throughout the flow, toasts show messages like “Note saved to knowledge base” and “Study progress synced,” indicating that the loop from “goal → execution → review” has been closed.

## 5. Feature Chain Decomposition (AI Agent Perspective)
- **Chain A: Goal Creation → Task Tree → Learning Workspace**
  - Input: Draft filled during the creation flow (subject, preset, time, materials).
  - Output: A complete Study Goal (including persona, today route, task tree, and weekly plan).
  - Basic logic: A front-end factory generates the skeleton according to presets; after inserting the new goal, it opens the corresponding workspace.
  - Extension: Replace placeholder logic with real Gemini reasoning, or let Gemini directly write the task tree and persona.

- **Chain B: Learning Workspace → Markdown Notes → Knowledge Base → Review Lab**
  - Input: Current active task, workspace assets, and linked notes.
  - Output: Task-specific notes, “Notes” category entries in the knowledge base, and citation text inside review questions.
  - Basic logic: The workspace ensures each task has a note; when collected, notes are automatically written into the knowledge base. The Review Lab reads these entries to generate hints.
  - Extension: Rectangular selections can directly trigger Gemini parsing; Review Lab results can be written back to goals to drive secondary scheduling.

- **Chain C: Knowledge Base → Goal-Creation Material Pool**
  - Input: Categories and entries of the current knowledge base.
  - Output: A flattened list for the “material preview” area in goal creation, where entries can be injected into the draft with one click.
  - Basic logic: The creation flow flattens the knowledge base into a preview list; clicking “Import” syncs entries into the materials array.
  - Extension: Let Gemini auto-extract key information from entry content and sort them, helping users pick materials.

- **Chain D: Persona → Dialog/Review Tone**
  - Input: Goal profile (remaining time, target score, preferences, weaknesses, constraints).
  - Output: Prompt text in Review Lab, AI dialog labels, and the persona panel in the Goal Workspace.
  - Basic logic: When rendering context, template variables are replaced with persona fields to ensure consistent tone across modules.
  - Extension: Let Gemini dynamically refresh persona based on user performance and feed it back into task ordering and feedback tone.

## 6. Design Principles Summary
- **System-Level Closed Loop**: All data revolves around a single state tree. Planning, execution, and review are fully connected so students can see that “goals–tasks–study–review” belong to the same main line.
- **Personalization-Driven**: Presets, dimensions, persona, and task-node tags all emphasize “strategy based on profile.” Whether in AI dialogs or Review Lab, prompts and tones can adapt to different personas.
- **Knowledge Accumulation**: Any material, note, or upload ends up in some category within the knowledge base, and can flow back into goal creation or review, ensuring that “everything studied has a traceable source.”
- **Visible State**: The cockpit, sidebar, task tree, and Review Lab timeline all let users sense progress and remaining pressure in real time, preventing them from getting lost halfway through.
- **AI Collaboration**: Rectangular selection + QA menu, AI dialog citations, and Review Lab feedback all highlight the collaborative pattern of “AI provides strategy, the user executes, and the system auto-records.”
- **Educational Logic**: The today route + weekly plan manage everyday pacing, the task-tree chunk steps implement “breakdown → practice → review,” the Review Lab strengthens active recall, and the countdown mode in Goal Creation underscores a sprint mindset. All of these concepts can be directly executed by Gemini.

## 7. Demo MVP Scope Suggestions
- **Must-Haves**:
  1. Goal Cockpit + three-stage goal creation (to highlight AI planning).
  2. Task tree + persona panel + learning workspace (to show the linkage “task → notes → study”).
  3. Sync between Markdown notes and the knowledge base (to prove the knowledge-accumulation loop).
  4. Review Lab with at least three question types and personalized hints (to showcase the AI review engine).
- **Optional Highlights**:
  1. AI conversation replay to showcase RAG transparency.
  2. Multi-knowledge-base switching, dragging, upload animations, and other interaction details.
  3. Rectangular selection and Alt shortcuts in the learning workspace.
- **Deferred Items**:
  1. Full data sets for additional subjects.
  2. Complex persona editors or data dashboards.
  3. Voice or audio/video interaction.

## 8. Expansion Space (Free-Play Zone for Gemini)
- **No Constraints**: UI visuals, layout, animations, and theme can all be redesigned from scratch, as long as the result remains modular and maintainable.
- **Left to Gemini to Decide**:
  1. Real AI reasoning—goal creation, Q&A in the learning workspace, and scoring in Review Lab can all call Gemini directly.
  2. Data persistence strategy—local IndexedDB, cloud sync, team collaboration, etc. can all be designed freely.
  3. Persona evolution mechanism—dynamically update preferences and strategies according to learning performance, then affect task ordering.
- **Creative Directions**:
  1. Wire the rectangular selection directly to Gemini prompts to achieve “select to ask, answer instantly.”
  2. Let Review Lab results push new tasks or automatically generate note bullet points.
  3. Automatically generate summaries, difficulty levels, and reliability scores for knowledge-base entries to build a true RAG vault.
  4. Upgrade the AI Conversation Stage into a multi-agent system where Gemini actively calls “task tree/knowledge base/notes” interfaces for material.
