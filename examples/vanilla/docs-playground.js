const STORAGE_KEY = "prediction-cone:docs:api-examples:v1";
const THEME_STORAGE_KEY = "prediction-cone:docs:theme:v1";

/** @typedef {{id:string,title:string,method:string,description:string,tags:string[],code:string}} ApiExample */

/** @type {ApiExample[]} */
let defaultExamples = [];
/** @type {ApiExample[]} */
let examples = [];
let editingId = null;

const listEl = document.getElementById("examplesList");
const countEl = document.getElementById("examplesCount");
const emptyEl = document.getElementById("emptyState");
const formEl = document.getElementById("exampleForm");
const searchEl = document.getElementById("searchInput");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelEditBtn");
const themeBtn = document.getElementById("themeToggle");

function toSlug(value) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || `example-${Date.now()}`
  );
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(examples));
}

function setFormValues(example) {
  formEl.id.value = example?.id || "";
  formEl.title.value = example?.title || "";
  formEl.method.value = example?.method || "createPredictionConeMenu";
  formEl.description.value = example?.description || "";
  formEl.tags.value = example?.tags?.join(", ") || "";
  formEl.code.value = example?.code || "";
}

function clearEditing() {
  editingId = null;
  saveBtn.textContent = "Add example";
  cancelBtn.hidden = true;
  setFormValues();
}

function getFilteredExamples() {
  const query = searchEl.value.trim().toLowerCase();
  if (!query) return examples;

  return examples.filter((entry) => {
    const searchable = [
      entry.id,
      entry.title,
      entry.method,
      entry.description,
      entry.tags.join(" "),
      entry.code,
    ]
      .join("\n")
      .toLowerCase();
    return searchable.includes(query);
  });
}

function render() {
  const filtered = getFilteredExamples();
  countEl.textContent = `${filtered.length}`;

  if (filtered.length === 0) {
    listEl.innerHTML = "";
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  listEl.innerHTML = filtered
    .map((entry) => {
      const tags = entry.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
      return `
        <article class="ex-card">
          <header class="ex-head">
            <h3>${escapeHtml(entry.title)}</h3>
            <div class="ex-actions">
              <button class="btn" data-action="copy" data-id="${escapeHtml(entry.id)}">Copy</button>
              <button class="btn" data-action="edit" data-id="${escapeHtml(entry.id)}">Edit</button>
              <button class="btn btn-danger" data-action="delete" data-id="${escapeHtml(entry.id)}">Delete</button>
            </div>
          </header>
          <div class="ex-body">
            <div class="m-chip">${escapeHtml(entry.method)}</div>
            ${tags ? `<div class="tags">${tags}</div>` : ""}
            ${entry.description ? `<p class="ex-desc">${escapeHtml(entry.description)}</p>` : ""}
            <div class="ex-code">
              <pre><code>${escapeHtml(entry.code)}</code></pre>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function upsertFromForm() {
  const title = formEl.title.value.trim();
  const method = formEl.method.value.trim();
  const description = formEl.description.value.trim();
  const code = formEl.code.value.trim();

  if (!title || !method || !description || !code) {
    window.alert("Fill in title, method, description, and code.");
    return;
  }

  const manualId = formEl.id.value.trim();
  const nextId = manualId || toSlug(title);
  const tags = formEl.tags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const candidate = { id: nextId, title, method, description, tags, code };

  if (editingId) {
    examples = examples.map((item) => (item.id === editingId ? candidate : item));
  } else {
    const hasDuplicate = examples.some((item) => item.id === nextId);
    if (hasDuplicate) {
      window.alert(`Example with id '${nextId}' already exists. Use another id.`);
      return;
    }
    examples = [candidate, ...examples];
  }

  persist();
  clearEditing();
  render();
}

function startEdit(id) {
  const found = examples.find((item) => item.id === id);
  if (!found) return;

  editingId = id;
  saveBtn.textContent = "Save changes";
  cancelBtn.hidden = false;
  setFormValues(found);
  // Signal the page to reveal the form if it's collapsed
  document.dispatchEvent(new CustomEvent("pg:edit-start"));
  formEl.title.focus();
}

function removeExample(id) {
  const ok = window.confirm("Delete this API example?");
  if (!ok) return;

  examples = examples.filter((item) => item.id !== id);
  persist();
  if (editingId === id) clearEditing();
  render();
}

async function copyExampleCode(id, targetButton) {
  const found = examples.find((item) => item.id === id);
  if (!found) return;

  await navigator.clipboard.writeText(found.code);
  const previous = targetButton.textContent;
  targetButton.textContent = "Copied";
  setTimeout(() => {
    targetButton.textContent = previous;
  }, 1200);
}

async function loadDefaults() {
  const defaultsUrl = new URL("./api-examples.json", import.meta.url);
  const res = await fetch(defaultsUrl, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load default API examples");
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error("Invalid default examples format");
  return json;
}

function applyTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = normalized;
  localStorage.setItem(THEME_STORAGE_KEY, normalized);
  // Icon visibility is handled by CSS [data-theme="dark"] rules in the HTML.
  // Only fall back to text label when the button has no icon spans.
  if (themeBtn && !themeBtn.querySelector(".icon-sun")) {
    themeBtn.textContent = `Theme: ${normalized}`;
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
    return;
  }

  const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(preferredDark ? "dark" : "light");
}

function wireEvents() {
  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    upsertFromForm();
  });

  cancelBtn.addEventListener("click", () => clearEditing());

  searchEl.addEventListener("input", () => render());

  listEl.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;

    if (action === "edit") startEdit(id);
    if (action === "delete") removeExample(id);
    if (action === "copy") {
      try {
        await copyExampleCode(id, target);
      } catch {
        window.alert("Clipboard access failed in this browser context.");
      }
    }
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    const ok = window.confirm("Reset examples to defaults from api-examples.json?");
    if (!ok) return;
    examples = [...defaultExamples];
    persist();
    clearEditing();
    render();
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(examples, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prediction-cone-api-examples.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  themeBtn.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

async function init() {
  initTheme();
  defaultExamples = await loadDefaults();
  const local = loadFromStorage();
  examples = local || [...defaultExamples];
  setFormValues();
  wireEvents();
  render();
}

init().catch((error) => {
  console.error(error);
  emptyEl.hidden = false;
  emptyEl.textContent = `Failed to load examples: ${error.message}`;
});
