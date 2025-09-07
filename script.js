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
let isInitialLoad = true;

// --- DOM elements ---
const listEl = document.getElementById("list");
const historyEl = document.getElementById("history");
const inputEl = document.getElementById("itemInput");
const priorityEl = document.getElementById("prioritySelect");
const addBtn = document.getElementById("addBtn");

// Ensure Firestore doc exists
async function ensureDoc() {
  const snap = await getDoc(dataRef);
  if (!snap.exists()) {
    await setDoc(dataRef, { list: [], historyList: [] });
  }
}

// Render UI
function render() {
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

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete";
    deleteBtn.title = "Delete item";
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", () => deleteItem(index));
    actions.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(actions);
    listEl.appendChild(li);
  });

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

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(dataRef);
    const data = snap.exists() ? snap.data() : { list: [], historyList: [] };
    const newList = [...(data.list || []), { name, priority }];
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

// Delete item
async function deleteItem(index) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(dataRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const curList = [...(data.list || [])];
    if (index < 0 || index >= curList.length) return;

    curList.splice(index, 1);
    tx.set(dataRef, { list: curList, historyList: data.historyList || [] });
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
