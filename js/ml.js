import { loadModel, saveModel } from "./store.js";

const MIN_LEAD = 5;
const MAX_LEAD = 90;

function clamp(value, lo, hi) {
    return Math.min(hi, Math.max(lo, value));
}

function features(lecture, start) {
    const hour = start.getHours() + start.getMinutes() / 60;
    const weekend = lecture.day === 0 || lecture.day === 6 ? 1 : 0;
    return { hour, weekend };
}

export function predictLeadMinutes(lecture, start, settings) {
    if (lecture.leadMinutes != null && lecture.leadMinutes !== "") {
        return clamp(Number(lecture.leadMinutes), MIN_LEAD, MAX_LEAD);
    }
    if (!settings.useModel) {
        return clamp(Number(settings.leadMinutes) || 15, MIN_LEAD, MAX_LEAD);
    }
    const model = loadModel();
    const { hour, weekend } = features(lecture, start);
    const raw = model.bias + model.wHour * (hour - 12) + model.wWeekend * weekend;
    return Math.round(clamp(raw, MIN_LEAD, MAX_LEAD));
}

/**
 * Online linear model. Feedback:
 *  too_early → we should alert closer to the start (smaller lead)
 *  too_late  → we should alert sooner (larger lead)
 *  just_right → small nudge toward the lead we used
 */
export function learnFromFeedback(lecture, start, usedLead, kind) {
    const delta = { too_early: -4, too_late: 6, just_right: 0 }[kind];
    if (delta === undefined) {
        return loadModel();
    }
    const model = loadModel();
    const { hour, weekend } = features(lecture, start);
    const target = clamp(usedLead + delta, MIN_LEAD, MAX_LEAD);
    const pred = model.bias + model.wHour * (hour - 12) + model.wWeekend * weekend;
    const error = target - pred;
    const lr = 0.12;
    model.bias += lr * error;
    model.wHour += lr * error * (hour - 12) * 0.05;
    model.wWeekend += lr * error * weekend;
    model.samples += 1;
    saveModel(model);
    return model;
}

export function modelSummary() {
    const model = loadModel();
    return (
        "lead ≈ " +
        model.bias.toFixed(1) +
        " min  +  " +
        model.wHour.toFixed(2) +
        "·(hour−12)  +  " +
        model.wWeekend.toFixed(2) +
        "·weekend   (" +
        model.samples +
        " samples)"
    );
}
