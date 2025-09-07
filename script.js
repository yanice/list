let list = JSON.parse(localStorage.getItem('list')) || [];
let historyList = JSON.parse(localStorage.getItem('history')) || [];

function saveData() {
  localStorage.setItem('list', JSON.stringify(list));
  localStorage.setItem('history', JSON.stringify(historyList));
}

function render() {
  const listEl = document.getElementById('list');
  const historyEl = document.getElementById('history');
  listEl.innerHTML = '';
  historyEl.innerHTML = '';

  list.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = item.priority;
    li.innerHTML = `${item.name} <button class="done" onclick="markDone(${index})">✔</button>`;
    listEl.appendChild(li);
  });

  historyList.forEach(item => {
    const li = document.createElement('li');
    li.className = item.priority;
    li.textContent = `${item.name} (done on ${item.date})`;
    historyEl.appendChild(li);
  });
}

function addItem() {
  const name = document.getElementById('itemInput').value.trim();
  const priority = document.getElementById('prioritySelect').value;
  if (!name) return;
  list.push({ name, priority });
  document.getElementById('itemInput').value = '';
  saveData();
  render();
}

function markDone(index) {
  const item = list.splice(index, 1)[0];
  item.date = new Date().toLocaleString();
  historyList.push(item);
  saveData();
  render();
}

render();
