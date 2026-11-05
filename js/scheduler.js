import { loadFired, saveFired } from "./store.js";
import { alertAtFor, nextStart, occurrenceKey } from "./time.js";
import { predictLeadMinutes } from "./ml.js";

export function planLecture(lecture, settings, now = new Date()) {
    const start = nextStart(lecture.day, lecture.time, now);
    const leadMinutes = predictLeadMinutes(lecture, start, settings);
    const alertAt = alertAtFor(start, leadMinutes);
    return { start, leadMinutes, alertAt };
}

export function dueAlerts(lectures, settings, now = new Date()) {
    const fired = loadFired();
    const due = [];
    for (const lecture of lectures) {
        const plan = planLecture(lecture, settings, now);
        const key = occurrenceKey(lecture.id, plan.start);
        if (fired[key]) {
            continue;
        }
        if (now.getTime() >= plan.alertAt.getTime() && now.getTime() < plan.start.getTime()) {
            due.push({ lecture, plan, key });
        }
    }
    return due;
}

export function markFired(key) {
    const fired = loadFired();
    fired[key] = Date.now();
    saveFired(fired);
}

export function upcomingSorted(lectures, settings, now = new Date()) {
    return lectures
        .map((lecture) => ({ lecture, plan: planLecture(lecture, settings, now) }))
        .sort((a, b) => a.plan.alertAt.getTime() - b.plan.alertAt.getTime());
}
