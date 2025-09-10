// --- Firebase imports & setup ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Your Firebase config (using your original values)
const firebaseConfig = {
  apiKey: "AIzaSyDnKtU3vXAijLIYT4Rn92tGrYn4-xBfnRo",
  authDomain: "list-55b07.firebaseapp.com",
  projectId: "list-55b07",
  storageBucket: "list-55b07.appspot.com",
  messagingSenderId: "998487684637",
  appId: "1:998487684637:web:277e966a27f76270b638f4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const dataRef = doc(db, "shared", "todoData");

// --- Local state ---
let list = [];
let historyList = [];

// Priority order mapping
const priorityOrder = { high: 1, medium: 2, low: 3 };
const allowedPriorities = new Set(["low", "medium", "high"]);

// --- DOM elements ---
const listEl = document.getElementById("list");
const historyEl = document.getElementById("history");
const inputEl = document.getElementById("itemInput");
const priorityEl = document.getElementById("prioritySelect");
const addBtn = document.getElementById("addBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Ensure Firestore doc exists
async function ensureDoc() {
  const snap = await getDoc(dataRef);
  if (!snap.exists()) {
    await setDoc(dataRef, { list: [], historyList: [] });
  }
}

// Render UI
function render() {
  // Sort active list
  list.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));
  // Sort history list
  historyList.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));

  // Active list
  listEl.innerHTML = "";
  list.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = item.priority || "low";

    const left = document.createElement("div");
    left.className = "item-name";
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = (item.priority || "low").toUpperCase();
    const name = document.createElement("span");
    name.textContent = item.name;
    left.appendChild(badge);
    left.appendChild(name);

    const actions = document.createElement("div");
    actions.className = "actions";

    const doneBtn = document.createElement("button");
    doneBtn.className = "done";
    doneBtn.textContent = "✔";
    doneBtn.title = "Mark done";
    doneBtn.addEventListener("click", () => markDone(index));
    actions.appendChild(doneBtn);

    const editBtn = document.createElement("button");
    editBtn.className = "edit";
    editBtn.textContent = "✎";
    editBtn.title = "Edit item";
    editBtn.addEventListener("click", () => editItem(index));
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete";
    deleteBtn.textContent = "×";
    deleteBtn.title = "Delete item";
    deleteBtn.addEventListener("click", () => deleteItem(index));
    actions.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(actions);
    listEl.appendChild(li);
  });

  // History list
  historyEl.innerHTML = "";
  historyList.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = item.priority || "low";

    const left = document.createElement("div");
    left.className = "item-name";
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = (item.priority || "low").toUpperCase();
    const name = document.createElement("span");
    const dateText = item.date ? ` (done on ${item.date})` : "";
    name.textContent = `${item.name}${dateText}`;
    left.appendChild(badge);
    left.appendChild(name);

    const actions = document.createElement("div");
    actions.className = "actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete";
    deleteBtn.textContent = "×";
    deleteBtn.title = "Remove from history";
    deleteBtn.addEventListener("click", () => deleteHistoryItem(index));
    actions.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(actions);
    historyEl.appendChild(li);
  });
}

// Add item
async function addItem() {
  const name = inputEl.value.trim();
  const priority = (priorityEl?.value || "low").toLowerCase();
  if (!name) return;

  const p = allowedPriorities.has(priority) ? priority : "low";

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(dataRef);
    const data = snap.exists() ? snap.data() : { list: [], historyList: [] };
    const curList = Array.isArray(data.list) ? [...data.list] : [];
    curList.push({ name, priority: p });

    tx.set(dataRef, {
      list: curList,
      historyList: Array.isArray(data.historyList) ? data.historyList : []
    });
  });

  inputEl.value = "";
}

// Edit item (name and/or priority)
async function editItem(index) {
  const current = list[index];
  if (!current) return;

  const newName = prompt("Edit item name:", current.name);
  if (newName === null) return; // user cancelled

  const newPriorityInput = prompt(
    "Edit priority (low, medium, high):",
    current.priority || "low"
  );
  if (newPriorityInput === null) return; // user cancelled

  const newPriority = (newPriorityInput || "").toLowerCase();
  const p = allowedPriorities.has(newPriority) ? newPriority : (current.priority || "low");

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(dataRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const curList = Array.isArray(data.list) ? [...data.list] : [];

    if (index < 0 || index >= curList.length) return;

    curList[index] = {
      ...curList[index],
      name: newName.trim() || curList[index].name,
      priority: p
    };

    tx.set(dataRef, {
      list: curList,
      historyList: Array.isArray(data.historyList) ? data.historyList : []
    });
  });
}

// Mark as done (move from active list to history)
async function markDone(index) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(dataRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const curList = Array.isArray(data.list) ? [...data.list] : [];
    const curHistory = Array.isArray(data.historyList) ? [...data.historyList] : [];

    if (index < 0 || index >= curList.length) return;

    const item = curList.splice(index, 1)[0];
    item.date = new Date().toLocaleString();
    curHistory.push(item);

    tx.set(dataRef, {
      list: curList,
      historyList: curHistory
    });
  });
}

// Delete item from active list
async function deleteItem(index) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(dataRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const curList = Array.isArray(data.list) ? [...data.list] : [];

    if (index < 0 || index >= curList.length) return;

    curList.splice(index, 1);

    tx.set(dataRef, {
      list: curList,
      historyList: Array.isArray(data.historyList) ? data.historyList : []
    });
  });
}

// Delete single history item
async function deleteHistoryItem(index) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(dataRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const curList = Array.isArray(data.list) ? data.list : [];
    const curHistory = Array.isArray(data.historyList) ? [...data.historyList] : [];

    if (index < 0 || index >= curHistory.length) return;

    curHistory.splice(index, 1);

    tx.set(dataRef, {
      list: curList,
      historyList: curHistory
    });
  });
}

// Clear all history
async function clearHistory() {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(dataRef);
    if (!snap.exists()) return;

    const data = snap.data();

    tx.set(dataRef, {
      list: Array.isArray(data.list) ? data.list : [],
      historyList: []
    });
  });
}

// Real-time listener
function startRealtimeListener() {
  onSnapshot(dataRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      list = Array.isArray(data.list) ? data.list : [];
      historyList = Array.isArray(data.historyList) ? data.historyList : [];
      render();
    }
  });
}

// --- Init & event bindings ---
async function init() {
  await ensureDoc();
  startRealtimeListener();

  addBtn.addEventListener("click", addItem);
  inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addItem();
  });
  clearHistoryBtn.addEventListener("click", clearHistory);
}

init();
