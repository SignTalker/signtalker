export function stableClientId() {
    const key = "signtalker_client_id";
    try {
        const existing = localStorage.getItem(key);
        if (existing && existing.trim().length)
            return existing;
        const created = crypto.randomUUID();
        localStorage.setItem(key, created);
        return created;
    }
    catch {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}
