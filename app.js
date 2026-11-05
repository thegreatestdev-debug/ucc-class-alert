const STORAGE_KEY = "lectures";

const form = document.getElementById("lecture-form");
const listEl = document.getElementById("lecture-list");

function load() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function save(lectures) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lectures));
}

function render(lectures) {
    listEl.textContent = "";
    for (const lecture of lectures) {
        const li = document.createElement("li");
        li.textContent =
            lecture.course + " — day " + lecture.day +
            " — " + lecture.time + " — " + lecture.room;
        listEl.appendChild(li);
    }
}

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const data = new FormData(form);
    const course = data.get("course").trim();
    const dayRaw = data.get("day");
    const time = data.get("time");
    const room = data.get("room").trim();

    if (!course || !dayRaw || !time || !room) {
        return;
    }

    const lectures = load();
    lectures.push({
        course: course,
        day: Number(dayRaw),
        time: time,
        room: room
    });
    save(lectures);
    render(lectures);
    form.reset();
});

render(load());
