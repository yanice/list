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

// Your Firebase config
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
  const priority = priorityEl.value || "low";
  if (!name) return;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(dataRef);
    const data = snap.exists() ? snap.data() :