import { STORAGE_VERSION } from "./config.js";

const KEYS = {
    lectures: "ucc.lectures",
    settings: "ucc.settings",
    fired: "ucc.fired",
    model: "ucc.ml",
};

const defaultSettings = {
    leadMinutes: 15,
    useModel: true,
    notify: true,
};

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) {
            return fallback;
        }
        return JSON.parse(raw);
    } catch (error) {
        console.warn("storage read failed", key, error);
        return fallback;
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function migrateLectures(rows) {
    return rows.map((row) => {
        const copy = { ...row };
        if (!copy.id) {
            copy.id = crypto.randomUUID();
        }
        copy.day = Number(copy.day);
        copy.source = copy.source || "personal";
        return copy;
    });
}

export function loadLectures() {
    const legacy = readJson("lectures", null);
    if (legacy && !localStorage.getItem(KEYS.lectures)) {
        const moved = migrateLectures(legacy);
        writeJson(KEYS.lectures, moved);
        localStorage.removeItem("lectures");
        return moved;
    }
    return migrateLectures(readJson(KEYS.lectures, []));
}

export function saveLectures(lectures) {
    writeJson(KEYS.lectures, lectures);
}

export function loadSettings() {
    return { ...defaultSettings, ...readJson(KEYS.settings, {}), storageVersion: STORAGE_VERSION };
}

export function saveSettings(settings) {
    writeJson(KEYS.settings, settings);
}

export function loadFired() {
    return readJson(KEYS.fired, {});
}

export function saveFired(map) {
    const keys = Object.keys(map);
    if (keys.length > 250) {
        const trimmed = {};
        for (const key of keys.slice(-200)) {
            trimmed[key] = map[key];
        }
        writeJson(KEYS.fired, trimmed);
        return;
    }
    writeJson(KEYS.fired, map);
}

export function loadModel() {
    return readJson(KEYS.model, {
        bias: 15,
        wHour: 0,
        wWeekend: 0,
        samples: 0,
    });
}

export function saveModel(model) {
    writeJson(KEYS.model, model);
}
