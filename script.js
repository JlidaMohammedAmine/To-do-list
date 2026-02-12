const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");

const modal = document.getElementById("scheduleModal");
const noScheduleBtn = document.getElementById("noScheduleBtn");
const chooseTimeBtn = document.getElementById("chooseTimeBtn");
const confirmScheduleBtn = document.getElementById("confirmScheduleBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

const chosenPreview = document.getElementById("chosenPreview");
const previewText = document.getElementById("previewText");

const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
const viewTitle = document.getElementById("viewTitle");
const viewSubtitle = document.getElementById("viewSubtitle");
const emptyState = document.getElementById("emptyState");

const pickerOverlay = document.getElementById("pickerOverlay");
const pickerCloseBtn = document.getElementById("pickerCloseBtn");
const pickerDoneBtn = document.getElementById("pickerDoneBtn");

const calPrevBtn = document.getElementById("calPrevBtn");
const calNextBtn = document.getElementById("calNextBtn");
const calMonthLabel = document.getElementById("calMonthLabel");
const calGrid = document.getElementById("calGrid");

const timeBtn = document.getElementById("timeBtn");
const timeBtnText = document.getElementById("timeBtnText");
const timeMenu = document.getElementById("timeMenu");

const pickerSummaryText = document.getElementById("pickerSummaryText");

let pendingTaskText = "";
let currentView = "all";

// Picker state
let calCursor = new Date();              // month/year cursor
let selectedDate = null;                // Date (no time)
let selectedTime = null;                // {h, m}
let selectedDateTimeISO = null;         // ISO string to store

addTaskBtn.addEventListener("click", openScheduleModal);
taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") openScheduleModal();
});

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    navButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.dataset.view;
    updateHeader(currentView);
    applyFilter(currentView);
  });
});

function updateHeader(view) {
  if (view === "all") {
    viewTitle.textContent = "My Tasks";
    viewSubtitle.textContent = "Stay productive. Stay sharp.";
  } else if (view === "today") {
    viewTitle.textContent = "Today";
    viewSubtitle.textContent = "What matters now.";
  } else if (view === "upcoming") {
    viewTitle.textContent = "Upcoming";
    viewSubtitle.textContent = "Plan ahead. Execute.";
  } else if (view === "completed") {
    viewTitle.textContent = "Completed";
    viewSubtitle.textContent = "Done is better than perfect.";
  }
}

function openScheduleModal() {
  const text = taskInput.value.trim();
  if (text === "") return;

  pendingTaskText = text;

  // reset selection in modal UI (not the picker month cursor)
  selectedDateTimeISO = null;
  confirmScheduleBtn.disabled = true;
  previewText.textContent = "No date selected";
  chosenPreview.classList.remove("has-value");

  modal.classList.add("active");
}

closeModalBtn.addEventListener("click", () => {
  modal.classList.remove("active");
});

noScheduleBtn.addEventListener("click", () => {
  createTask(pendingTaskText, null);
  modal.classList.remove("active");
  applyFilter(currentView);
});

chooseTimeBtn.addEventListener("click", () => {
  openPicker();
});

confirmScheduleBtn.addEventListener("click", () => {
  if (!selectedDateTimeISO) return;
  createTask(pendingTaskText, selectedDateTimeISO);
  modal.classList.remove("active");
  applyFilter(currentView);
});

/* ===================== Picker ===================== */

function openPicker() {
  pickerOverlay.classList.add("active");
  pickerOverlay.setAttribute("aria-hidden", "false");

  // Initialize view
  if (!calCursor) calCursor = new Date();
  renderCalendar();
  buildTimeMenu();
  syncPickerSummary();
}

function closePicker() {
  pickerOverlay.classList.remove("active");
  pickerOverlay.setAttribute("aria-hidden", "true");
  timeMenu.classList.remove("open");
}

pickerCloseBtn.addEventListener("click", closePicker);

pickerOverlay.addEventListener("click", (e) => {
  // close if click outside picker
  if (e.target === pickerOverlay) closePicker();
});

calPrevBtn.addEventListener("click", () => {
  calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1);
  renderCalendar();
});

calNextBtn.addEventListener("click", () => {
  calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1);
  renderCalendar();
});

timeBtn.addEventListener("click", () => {
  timeMenu.classList.toggle("open");
});

pickerDoneBtn.addEventListener("click", () => {
  if (!selectedDate || !selectedTime) return;

  const dt = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    selectedTime.h,
    selectedTime.m,
    0,
    0
  );

  selectedDateTimeISO = dt.toISOString();

  // Update schedule modal preview + enable Done
  confirmScheduleBtn.disabled = false;
  chosenPreview.classList.add("has-value");
  previewText.textContent = dt.toLocaleString();

  closePicker();
});

function renderCalendar() {
  const month = calCursor.getMonth();
  const year = calCursor.getFullYear();

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  calMonthLabel.textContent = `${monthNames[month]} ${year}`;

  calGrid.innerHTML = "";

  // We want Monday-first grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const firstDow = (firstDay.getDay() + 6) % 7; // convert Sunday=0 to Monday=0
  const daysInMonth = lastDay.getDate();

  // Fill leading blanks
  for (let i = 0; i < firstDow; i++) {
    const cell = document.createElement("button");
    cell.className = "cal-day ghost";
    cell.type = "button";
    cell.disabled = true;
    cell.textContent = "";
    calGrid.appendChild(cell);
  }

  // Days
  const today = new Date();
  const todayKey = keyOfDate(today);

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    const cellKey = keyOfDate(cellDate);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal-day";
    btn.textContent = String(d);

    if (cellKey === todayKey) btn.classList.add("today");
    if (selectedDate && keyOfDate(selectedDate) === cellKey) btn.classList.add("selected");

    btn.addEventListener("click", () => {
      selectedDate = cellDate;
      renderCalendar();
      syncPickerSummary();
    });

    calGrid.appendChild(btn);
  }

  // Close time menu if open on nav
  timeMenu.classList.remove("open");
}

function buildTimeMenu() {
  // 15-min increments
  timeMenu.innerHTML = "";

  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      times.push({ h, m });
    }
  }

  times.forEach((t) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "time-item";
    item.textContent = fmtTime(t.h, t.m);

    if (selectedTime && selectedTime.h === t.h && selectedTime.m === t.m) {
      item.classList.add("selected");
    }

    item.addEventListener("click", () => {
      selectedTime = t;
      timeBtnText.textContent = fmtTime(t.h, t.m);
      timeMenu.classList.remove("open");
      buildTimeMenu(); // re-render selection state
      syncPickerSummary();
    });

    timeMenu.appendChild(item);
  });

  // If no selection yet, show placeholder
  if (!selectedTime) timeBtnText.textContent = "Select time";
  else timeBtnText.textContent = fmtTime(selectedTime.h, selectedTime.m);
}

function syncPickerSummary() {
  const hasDate = !!selectedDate;
  const hasTime = !!selectedTime;

  let text = "Choose a date and time";
  if (hasDate && !hasTime) text = `${selectedDate.toDateString()} • choose time`;
  if (!hasDate && hasTime) text = `${fmtTime(selectedTime.h, selectedTime.m)} • choose date`;
  if (hasDate && hasTime) {
    const dt = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      selectedTime.h,
      selectedTime.m
    );
    text = dt.toLocaleString();
  }

  pickerSummaryText.textContent = text;

  // enable apply only if both chosen
  pickerDoneBtn.disabled = !(hasDate && hasTime);
}

function fmtTime(h, m) {
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`;
}

function keyOfDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ===================== Tasks ===================== */

function generateColor() {
  const colors = [
    "#6366f1", "#10b981", "#f59e0b",
    "#ef4444", "#3b82f6", "#8b5cf6",
    "#ec4899", "#14b8a6"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function createTask(text, dueISOOrNull) {
  const color = generateColor();
  const createdISO = new Date().toISOString();
  const dueISO = dueISOOrNull ? new Date(dueISOOrNull).toISOString() : "";

  const taskCard = document.createElement("div");
  taskCard.className = "task-card";
  taskCard.dataset.created = createdISO;
  taskCard.dataset.due = dueISO;
  taskCard.dataset.completed = "false";

  const timeLabel = dueISO
    ? `<p class="task-time">Reminder: ${new Date(dueISO).toLocaleString()}</p>`
    : `<p>New task added just now</p>`;

  taskCard.innerHTML = `
    <div class="task-info">
      <input type="checkbox" class="task-check" />
      <div>
        <h3>${escapeHtml(text)}</h3>
        ${timeLabel}
      </div>
    </div>

    <div class="task-actions">
      <div class="task-color" style="background:${color}"></div>
      <button class="move-up" type="button" aria-label="Move up">↑</button>
      <button class="move-down" type="button" aria-label="Move down">↓</button>
      <button class="remove-task" type="button" aria-label="Remove task">✕</button>
    </div>
  `;

  const checkbox = taskCard.querySelector(".task-check");
  checkbox.addEventListener("change", function () {
    const done = this.checked;
    taskCard.classList.toggle("completed", done);
    taskCard.dataset.completed = done ? "true" : "false";
    applyFilter(currentView);
  });

  taskCard.querySelector(".move-up").addEventListener("click", () => {
    const prev = taskCard.previousElementSibling;
    if (prev) taskList.insertBefore(taskCard, prev);
    applyFilter(currentView);
  });

  taskCard.querySelector(".move-down").addEventListener("click", () => {
    const next = taskCard.nextElementSibling;
    if (next) taskList.insertBefore(next, taskCard);
    applyFilter(currentView);
  });

  taskCard.querySelector(".remove-task").addEventListener("click", () => {
    taskCard.style.opacity = "0";
    taskCard.style.transform = "translateX(20px)";
    setTimeout(() => {
      taskCard.remove();
      applyFilter(currentView);
    }, 200);
  });

  taskList.prepend(taskCard);
  taskInput.value = "";

  // keep picker selections for next tasks? no.
  selectedDate = null;
  selectedTime = null;
  selectedDateTimeISO = null;
  confirmScheduleBtn.disabled = true;
  previewText.textContent = "No date selected";
  chosenPreview.classList.remove("has-value");
}

function applyFilter(view) {
  const cards = Array.from(taskList.children);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let visibleCount = 0;

  cards.forEach((card) => {
    const completed = card.dataset.completed === "true";
    const due = card.dataset.due ? new Date(card.dataset.due) : null;

    let show = true;

    if (view === "all") show = true;

    if (view === "today") {
      const isToday = due && due >= startOfToday && due <= endOfToday;
      const isOverdue = due && due < startOfToday;
      const noTime = !due;
      show = !completed && (noTime || isToday || isOverdue);
    }

    if (view === "upcoming") {
      show = !completed && !!due && due > endOfToday;
    }

    if (view === "completed") {
      show = completed;
    }

    card.classList.toggle("is-hidden", !show);
    if (show) visibleCount += 1;
  });

  emptyState.classList.toggle("show", visibleCount === 0);
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

updateHeader(currentView);
applyFilter(currentView);
