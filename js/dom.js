export function el(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) {
        node.className = options.className;
    }
    if (options.text != null) {
        node.textContent = options.text;
    }
    if (options.attrs) {
        for (const [key, value] of Object.entries(options.attrs)) {
            node.setAttribute(key, value);
        }
    }
    if (options.children) {
        for (const child of options.children) {
            if (child) {
                node.appendChild(child);
            }
        }
    }
    return node;
}

export function clear(node) {
    node.textContent = "";
}

export function toast(message) {
    const host = document.getElementById("toast");
    host.textContent = message;
    host.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => host.classList.remove("is-on"), 3200);
}
