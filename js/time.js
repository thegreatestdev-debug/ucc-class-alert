export const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

export function parseTime(hhmm) {
    const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
    if (!match) {
        throw new Error("time must be HH:MM");
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) {
        throw new Error("time out of range");
    }
    return { hours, minutes };
}

/**
 * Next start instant of a weekly lecture strictly after `now`
 * (equal-to-now counts as already started → jump 7 days).
 */
export function nextStart(day, time, now = new Date()) {
    if (!Number.isInteger(day) || day < 0 || day > 6) {
        throw new Error("day must be 0–6 (Sunday–Saturday)");
    }
    const { hours, minutes } = parseTime(time);
    const result = new Date(now.getTime());
    const delta = (day - now.getDay() + 7) % 7;
    result.setDate(now.getDate() + delta);
    result.setHours(hours, minutes, 0, 0);
    if (result.getTime() <= now.getTime()) {
        result.setDate(result.getDate() + 7);
    }
    return result;
}

export function alertAtFor(start, leadMinutes) {
    return new Date(start.getTime() - leadMinutes * 60 * 1000);
}

export function occurrenceKey(lectureId, start) {
    return lectureId + "@" + start.toISOString();
}

export function formatWhen(date, now = new Date()) {
    const sameDay =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (sameDay) {
        return "today " + time;
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow =
        date.getFullYear() === tomorrow.getFullYear() &&
        date.getMonth() === tomorrow.getMonth() &&
        date.getDate() === tomorrow.getDate();
    if (isTomorrow) {
        return "tomorrow " + time;
    }
    return (
        DAY_NAMES[date.getDay()].slice(0, 3) +
        " " +
        date.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " " +
        time
    );
}

export function formatCountdown(ms) {
    if (ms <= 0) {
        return "now";
    }
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (days > 0) {
        return days + "d " + hours + "h";
    }
    if (hours > 0) {
        return hours + "h " + String(minutes).padStart(2, "0") + "m";
    }
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

export function runTimeSelfTest() {
    const cases = [
        {
            name: "later today",
            now: "2026-11-09T08:00:00", // Monday
            day: 1,
            time: "15:00",
            expect: "2026-11-09T15:00:00",
        },
        {
            name: "earlier today → next week",
            now: "2026-11-09T16:00:00",
            day: 1,
            time: "09:00",
            expect: "2026-11-16T09:00:00",
        },
        {
            name: "tomorrow",
            now: "2026-11-09T20:00:00",
            day: 2,
            time: "08:30",
            expect: "2026-11-10T08:30:00",
        },
        {
            name: "next week same weekday",
            now: "2026-11-09T10:00:00",
            day: 1,
            time: "09:00",
            expect: "2026-11-16T09:00:00",
        },
        {
            name: "Sunday to Monday",
            now: "2026-11-08T22:00:00", // Sunday
            day: 1,
            time: "08:00",
            expect: "2026-11-09T08:00:00",
        },
    ];

    const results = [];
    for (const testCase of cases) {
        const got = nextStart(testCase.day, testCase.time, new Date(testCase.now));
        const expected = new Date(testCase.expect);
        const pass = got.getTime() === expected.getTime();
        results.push({
            name: testCase.name,
            pass,
            got: got.toISOString(),
            expected: expected.toISOString(),
        });
    }
    return results;
}
