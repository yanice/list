// IMPORTANT: Replace these with your Firebase project config from the Firebase Console.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID"
};

/*
  Real-time collaborative list using Firestore.
  - All users share a single document: collection "shared", doc "todoData".
  - Fields: list (array), historyList (array)
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const dataRef = doc(db, "shared", "todoData");

// Local state
let list = [];
let historyList = [];
let isInitialLoad = true;

// DOM
const listEl = document.getElementById("list");
const historyEl = document.getElementById("history");
const inputEl = document.getElementById("itemInput");
const priorityEl = document.getElementById("prioritySelect");
const addBtn = document.getElementById("addBtn");

// Ensure the document exists on first load
async function ensureDoc() {
  const snap = await getDoc(dataRef);
  if (!snap.exists()) {
    await setDoc(dataRef, { list: [], historyList: [] });
  }
}

// Render UI
function render() {
  // To-do list
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
    doneBtn.title = "Mark done";
    doneBtn.textContent = "✔";
    doneBtn.addEventListener("click", () => markDone(index));
    actions.appendChild(doneBtn);

    li.appendChild(left);
    li.appendChild(actions);
    listEl.appendChild(li);
  });

  // History
  historyEl.innerHTML = "";
  historyList.forEach((item) => {
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

    li.appendChild(left);
    historyEl.appendChild(li);
  });
}

// Add item
async function addItem() {
  const name = inputEl.value.trim();
  const priority = priorityEl.value || "low";
  if (!name) return;

  // Use transaction to avoid overwriting concurrent changes
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(dataRef);
    const data = snap.exists() ? snap.data() : { list: [], historyList: [] };
    const newList = [...(data.list || [])];
    newList.push({ name, priority });
    tx.set(dataRef, { list: newList, historyList: data.historyList || [] });
  });

  inputEl.value = "";
}

// Mark as done
async function markDone(index) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(dataRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const curList = [...(data.list || [])];
    if (index < 0 || index >= curList.length) return;

    const item = curList.splice(index, 1)[0];
    item.date = new Date().toLocaleString();
    const newHistory = [...(data.historyList || []), item];

    tx.set(dataRef, { list: curList, historyList: newHistory });
  });
}

// Real-time listener
onSnapshot(dataRef, (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    list = Array.isArray(data.list) ? data.list : [];
    historyList = Array.isArray(data.historyList) ? data.historyList : [];
  } else {
    list = [];
    historyList = [];
  }
  render();

  // On first load, keep input focused
  if (isInitialLoad) {
    inputEl.focus();
    isInitialLoad = false;
  }
});

// Wire up UI
addBtn.addEventListener("click", addItem);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addItem();
});

// Boot
await ensureDoc();
render();

// Expose for inline use if you decide to keep inline handlers in HTML
window.addItem = addItem;
window.markDone = markDone;
