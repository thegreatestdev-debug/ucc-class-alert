import { DEFAULT_LEAD_MINUTES, TICK_MS } from "./config.js";
import { clear, el, toast } from "./dom.js";
import { learnFromFeedback, modelSummary, predictLeadMinutes } from "./ml.js";
import {
    notificationPermission,
    registerWorker,
    requestNotifyPermission,
    showLectureNotification,
} from "./notify.js";
import { dueAlerts, markFired, upcomingSorted } from "./scheduler.js";
import { loadLectures, loadSettings, saveLectures, saveSettings } from "./store.js";
import { pullOfficialTimetable } from "./sync.js";
import { DAY_NAMES, formatCountdown, formatWhen, runTimeSelfTest } from "./time.js";

const state = {
    tab: "upcoming",
    editingId: null,
    lastBanner: null,
};

function lectures() {
    return loadLectures();
}

function settings() {
    return loadSettings();
}

function setTab(tab) {
    state.tab = tab;
    for (const button of document.querySelectorAll("[data-tab]")) {
        button.classList.toggle("is-active", button.dataset.tab === tab);
        button.setAttribute("aria-selected", button.dataset.tab === tab ? "true" : "false");
    }
    for (const panel of document.querySelectorAll("[data-panel]")) {
        panel.hidden = panel.dataset.panel !== tab;
    }
}

function fillDaySelect(select, selected) {
    clear(select);
    DAY_NAMES.forEach((name, index) => {
        const option = el("option", { text: name, attrs: { value: String(index) } });
        if (index === selected) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function renderClock() {
    const now = new Date();
    document.getElementById("clock").textContent = now.toLocaleString([], {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function renderStatus() {
    const line = document.getElementById("status-line");
    const online = navigator.onLine;
    const perm = notificationPermission();
    const worker = "serviceWorker" in navigator;
    line.textContent =
        (online ? "Online" : "Offline") +
        " · notifications " +
        perm +
        " · service worker " +
        (worker ? "ready" : "missing");
}

function lectureCard(entry, now) {
    const { lecture, plan } = entry;
    const untilAlert = plan.alertAt.getTime() - now.getTime();
    const untilStart = plan.start.getTime() - now.getTime();
    const urgency =
        untilStart <= 0 ? "is-live" : untilAlert <= 0 ? "is-due" : untilAlert < 30 * 60 * 1000 ? "is-soon" : "";

    const card = el("article", { className: "card " + urgency });
    const top = el("div", { className: "card-top" });
    top.appendChild(el("h3", { text: lecture.course }));
    top.appendChild(
        el("span", {
            className: "pill",
            text: lecture.source === "official" ? "official" : "personal",
        })
    );
    card.appendChild(top);
    card.appendChild(
        el("p", {
            className: "meta",
            text:
                DAY_NAMES[lecture.day] +
                " · " +
                lecture.time +
                " · " +
                lecture.room +
                " · lead " +
                plan.leadMinutes +
                " min",
        })
    );
    card.appendChild(
        el("p", {
            className: "countdown",
            text:
                untilAlert > 0
                    ? "Alert in " + formatCountdown(untilAlert)
                    : "Starts " + formatWhen(plan.start, now),
        })
    );

    const actions = el("div", { className: "row-actions" });
    const editBtn = el("button", { className: "btn btn-ghost", text: "Edit", attrs: { type: "button" } });
    const delBtn = el("button", { className: "btn btn-ghost", text: "Remove", attrs: { type: "button" } });
    editBtn.addEventListener("click", () => openEditor(lecture));
    delBtn.addEventListener("click", () => removeLecture(lecture.id));
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);
    return card;
}

function renderUpcoming() {
    const now = new Date();
    const host = document.getElementById("upcoming-list");
    clear(host);
    const rows = upcomingSorted(lectures(), settings(), now);
    if (rows.length === 0) {
        host.appendChild(
            el("p", {
                className: "empty",
                text: "No lectures yet. Add one, or import the signed departmental sample.",
            })
        );
        return;
    }
    for (const entry of rows.slice(0, 8)) {
        host.appendChild(lectureCard(entry, now));
    }
}

function renderTimetable() {
    const now = new Date();
    const host = document.getElementById("timetable-list");
    clear(host);
    const rows = upcomingSorted(lectures(), settings(), now);
    if (rows.length === 0) {
        host.appendChild(el("p", { className: "empty", text: "Timetable is empty." }));
        return;
    }
    for (const entry of rows) {
        host.appendChild(lectureCard(entry, now));
    }
}

function renderSettings() {
    const s = settings();
    document.getElementById("lead-input").value = String(s.leadMinutes);
    document.getElementById("use-model").checked = s.useModel;
    document.getElementById("model-view").textContent = modelSummary();
    document.getElementById("notify-state").textContent = "Permission: " + notificationPermission();
}

function renderAll() {
    renderClock();
    renderStatus();
    renderUpcoming();
    renderTimetable();
    renderSettings();
}

function openEditor(lecture) {
    state.editingId = lecture ? lecture.id : null;
    const form = document.getElementById("lecture-form");
    document.getElementById("editor-title").textContent = lecture ? "Edit lecture" : "Add lecture";
    form.elements.course.value = lecture ? lecture.course : "";
    fillDaySelect(form.elements.day, lecture ? lecture.day : 1);
    form.elements.time.value = lecture ? lecture.time : "09:00";
    form.elements.room.value = lecture ? lecture.room : "";
    form.elements.leadMinutes.value = lecture && lecture.leadMinutes != null ? lecture.leadMinutes : "";
    document.getElementById("editor").showModal();
}

function closeEditor() {
    document.getElementById("editor").close();
    state.editingId = null;
}

function saveFromForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const course = form.elements.course.value.trim();
    const room = form.elements.room.value.trim();
    const time = form.elements.time.value;
    const day = Number(form.elements.day.value);
    const leadRaw = form.elements.leadMinutes.value;
    if (!course || !room || !time) {
        return;
    }
    const rows = lectures();
    const payload = {
        id: state.editingId || crypto.randomUUID(),
        course,
        day,
        time,
        room,
        source: "personal",
        leadMinutes: leadRaw === "" ? null : Number(leadRaw),
    };
    const index = rows.findIndex((row) => row.id === payload.id);
    if (index >= 0) {
        payload.source = rows[index].source;
        rows[index] = payload;
    } else {
        rows.push(payload);
    }
    saveLectures(rows);
    closeEditor();
    renderAll();
    toast("Saved " + course);
}

function removeLecture(id) {
    saveLectures(lectures().filter((row) => row.id !== id));
    renderAll();
    toast("Removed lecture");
}

async function enableNotifications() {
    try {
        const perm = await requestNotifyPermission();
        renderStatus();
        renderSettings();
        toast(perm === "granted" ? "Notifications on" : "Permission: " + perm);
    } catch (error) {
        toast(String(error.message || error));
    }
}

async function importOfficial() {
    try {
        const result = await pullOfficialTimetable();
        renderAll();
        toast("Imported " + result.count + " signed lectures");
    } catch (error) {
        toast(String(error.message || error));
    }
}

function addDemoLecture() {
    const start = new Date(Date.now() + 2 * 60 * 1000);
    const rows = lectures();
    rows.push({
        id: crypto.randomUUID(),
        course: "DEMO 101",
        day: start.getDay(),
        time: String(start.getHours()).padStart(2, "0") + ":" + String(start.getMinutes()).padStart(2, "0"),
        room: "Board Room",
        source: "personal",
        leadMinutes: 0,
    });
    saveLectures(rows);
    renderAll();
    toast("Demo lecture in 2 minutes (lead 0). Leave this tab open, or background it after enabling notifications.");
}

function runTests() {
    const host = document.getElementById("test-results");
    clear(host);
    const results = runTimeSelfTest();
    let failed = 0;
    for (const row of results) {
        if (!row.pass) {
            failed += 1;
        }
        host.appendChild(
            el("li", {
                className: row.pass ? "pass" : "fail",
                text: (row.pass ? "PASS — " : "FAIL — ") + row.name,
            })
        );
    }
    toast(failed === 0 ? "All 5 time tests passed" : failed + " time tests failed");
}

function showBanner(entry) {
    const banner = document.getElementById("alert-banner");
    state.lastBanner = entry;
    banner.hidden = false;
    document.getElementById("banner-text").textContent =
        entry.lecture.course +
        " at " +
        entry.plan.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        " · " +
        entry.lecture.room;
}

async function tick() {
    renderClock();
    const now = new Date();
    const due = dueAlerts(lectures(), settings(), now);
    for (const entry of due) {
        markFired(entry.key);
        showBanner(entry);
        const s = settings();
        if (s.notify && notificationPermission() === "granted") {
            await showLectureNotification(entry.lecture, entry.plan.start, entry.plan.leadMinutes);
        }
        toast("Alert: " + entry.lecture.course);
    }
    if (state.tab === "upcoming") {
        renderUpcoming();
    }
}

function feedback(kind) {
    const entry = state.lastBanner;
    if (!entry) {
        return;
    }
    learnFromFeedback(entry.lecture, entry.plan.start, entry.plan.leadMinutes, kind);
    document.getElementById("alert-banner").hidden = true;
    renderSettings();
    toast("Saved feedback. " + modelSummary());
}

function bind() {
    fillDaySelect(document.querySelector("#lecture-form select[name='day']"), 1);

    document.querySelectorAll("[data-tab]").forEach((button) => {
        button.addEventListener("click", () => setTab(button.dataset.tab));
    });

    document.getElementById("add-btn").addEventListener("click", () => openEditor(null));
    document.getElementById("editor-close").addEventListener("click", closeEditor);
    document.getElementById("lecture-form").addEventListener("submit", saveFromForm);

    document.getElementById("lead-input").addEventListener("change", (event) => {
        const s = settings();
        s.leadMinutes = Number(event.target.value) || DEFAULT_LEAD_MINUTES;
        saveSettings(s);
        renderAll();
    });
    document.getElementById("use-model").addEventListener("change", (event) => {
        const s = settings();
        s.useModel = event.target.checked;
        saveSettings(s);
        renderAll();
    });

    document.getElementById("notify-btn").addEventListener("click", enableNotifications);
    document.getElementById("import-btn").addEventListener("click", importOfficial);
    document.getElementById("demo-btn").addEventListener("click", addDemoLecture);
    document.getElementById("test-btn").addEventListener("click", runTests);

    document.getElementById("fb-early").addEventListener("click", () => feedback("too_early"));
    document.getElementById("fb-ok").addEventListener("click", () => feedback("just_right"));
    document.getElementById("fb-late").addEventListener("click", () => feedback("too_late"));

    window.addEventListener("online", renderStatus);
    window.addEventListener("offline", renderStatus);
}

async function main() {
    bind();
    setTab("upcoming");
    renderAll();
    try {
        await registerWorker();
        renderStatus();
    } catch (error) {
        console.warn(error);
    }
    setInterval(tick, TICK_MS);
    await tick();
}

main();
