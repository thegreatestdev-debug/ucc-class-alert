let registration = null;

export async function registerWorker() {
    if (!("serviceWorker" in navigator)) {
        return null;
    }
    registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    return registration;
}

export function notificationPermission() {
    if (!("Notification" in window)) {
        return "unsupported";
    }
    return Notification.permission;
}

export async function requestNotifyPermission() {
    if (!("Notification" in window)) {
        throw new Error("This browser has no Notification API");
    }
    const result = await Notification.requestPermission();
    return result;
}

export async function showLectureNotification(lecture, start, leadMinutes) {
    const title = lecture.course + " starts soon";
    const body =
        lecture.room +
        " · " +
        start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        " · alerted " +
        leadMinutes +
        " min early";
    const options = {
        body,
        icon: "./icons/icon-192.png",
        badge: "./icons/icon-192.png",
        tag: "lecture-" + lecture.id,
        renotify: true,
        data: { lectureId: lecture.id },
    };

    const worker = registration || (await navigator.serviceWorker.getRegistration());
    if (worker && worker.showNotification) {
        await worker.showNotification(title, options);
        return "system";
    }
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, options);
        return "page";
    }
    return "in-app";
}
