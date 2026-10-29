/*
 * TEAMi standalone runtime. The page was built against three capabilities (db, user, sample);
 * this file provides the same calls backed by TEAMi's own server:
 *   db     → /api/db/* (documents, polled every few seconds for changes)
 *   user   → /api/auth/me (email + password accounts)
 *   sample → /api/ai (the AI Mentor, via the server's Anthropic API key)
 */
(function () {
  window.TEAMI_STANDALONE = true;

  async function api(url, opts) {
    const init = Object.assign({ credentials: "same-origin" }, opts || {});
    if (init.body) init.headers = Object.assign({ "content-type": "application/json" }, init.headers || {});
    let res;
    try { res = await fetch(url, init); }
    catch (e) {
      if (e && e.name === "AbortError") throw Object.assign(new Error("cancelled"), { code: "cancelled" });
      throw Object.assign(new Error("Network error"), { code: "unavailable" });
    }
    let body = null;
    try { body = await res.json(); } catch (e) {}
    if (!res.ok) {
      const code = (body && body.code) || (res.status === 401 ? "unauthenticated" : res.status === 403 ? "invalid_argument" : res.status === 429 ? "rate_limited" : "unavailable");
      throw Object.assign(new Error((body && body.error) || res.statusText), { code, status: res.status });
    }
    return body;
  }

  // ── Session ──
  let me = null;
  const ready = api("/api/auth/me").then((r) => { me = r.user; }).catch(() => { me = null; });

  window.teamiAuth = {
    async signIn(email, password) { await api("/api/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) }); location.reload(); },
    async signUp(email, password, age13) { await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password, age13 }) }); location.reload(); },
    async signOut() { try { await api("/api/auth/signout", { method: "POST", body: "{}" }); } finally { location.href = "/"; } },
  };

  // ── Document store ──
  const docs = new Map(); // path -> { data, version }
  const listeners = new Set();
  let loaded = false, started = false, since = 0, polling = false;
  const notify = () => listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  const parentOf = (path) => path.slice(0, path.lastIndexOf("/"));
  const snapDoc = (path) => { const d = docs.get(path); return { id: path.split("/").pop(), exists: Boolean(d), data: () => (d ? d.data : undefined) }; };

  async function poll() {
    if (polling || !me) return;
    polling = true;
    try {
      const r = await api("/api/db/sync?since=" + since);
      let changed = false;
      for (const d of r.docs) {
        const cur = docs.get(d.path);
        if (cur && cur.version > d.version) continue; // a newer local write is still in flight
        if (d.deleted) { if (cur) { docs.delete(d.path); changed = true; } }
        else if (!cur || cur.version !== d.version) { docs.set(d.path, { data: d.data, version: d.version }); changed = true; }
      }
      // Re-read a short overlap so writes that commit during this request aren't missed.
      since = Math.max(0, r.now - 5000);
      if (!loaded) { loaded = true; changed = true; }
      if (changed) notify();
    } catch (e) {
      if (e.code === "unauthenticated") { me = null; location.reload(); }
    } finally { polling = false; }
  }
  function start() {
    if (started) return;
    started = true;
    poll();
    setInterval(() => { if (!document.hidden) poll(); }, 2500);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
  }
  const whenLoaded = () => new Promise((resolve) => { if (loaded) return resolve(); const fn = () => { if (loaded) { listeners.delete(fn); resolve(); } }; listeners.add(fn); start(); });

  const db = Object.freeze({
    collection(path) {
      return {
        onSnapshot(cb) {
          start();
          const fn = () => { if (!loaded) return; const list = []; for (const p of docs.keys()) if (parentOf(p) === path) list.push(snapDoc(p)); cb({ docs: list }); };
          listeners.add(fn); fn();
          return () => listeners.delete(fn);
        },
      };
    },
    doc(path) {
      return {
        onSnapshot(cb) {
          start();
          const fn = () => { if (loaded) cb(snapDoc(path)); };
          listeners.add(fn); fn();
          return () => listeners.delete(fn);
        },
        async get() { await whenLoaded(); return snapDoc(path); },
        async set(data) {
          const prev = docs.get(path);
          const value = JSON.parse(JSON.stringify(data));
          docs.set(path, { data: value, version: (prev ? prev.version : 0) + 0.5 });
          notify();
          try {
            const r = await api("/api/db/doc", { method: "PUT", body: JSON.stringify({ path, data: value }) });
            const cur = docs.get(path);
            if (cur && cur.data === value) docs.set(path, { data: value, version: r.version });
          } catch (e) {
            if (docs.get(path) && docs.get(path).data === value) { if (prev) docs.set(path, prev); else docs.delete(path); notify(); }
            throw e;
          }
        },
      };
    },
  });

  const user = Object.freeze({
    id: async () => (await ready, me ? me.id : null),
    isOwner: async () => (await ready, Boolean(me && me.isAdmin)),
    canEdit: async () => (await ready, Boolean(me && me.isAdmin)),
    can: async () => (await ready, Boolean(me)),
  });

  // ── AI Mentor ──
  async function ask(input, opts) {
    const o = opts || {};
    const r = await api("/api/ai", { method: "POST", body: JSON.stringify({ input, modelTier: o.modelTier }), signal: o.signal });
    if (typeof o.onText === "function") { try { o.onText({ text: r.text, delta: r.text }); } catch (e) {} }
    return { text: r.text, truncated: Boolean(r.truncated) };
  }
  const sample = Object.assign((input, opts) => ask(input, opts), {
    async json(input, opts) {
      const r = await ask(input, opts);
      const t = r.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
      const start = Math.min(...["{", "["].map((c) => t.indexOf(c)).filter((i) => i >= 0));
      try { return JSON.parse(Number.isFinite(start) ? t.slice(start) : t); }
      catch (e) {
        const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
        try { return JSON.parse(t.slice(start, end + 1)); } catch (e2) { throw Object.assign(new Error("invalid_json"), { code: "invalid_json", text: r.text }); }
      }
    },
  });

  window.claude = Object.freeze({
    use: async (name) => {
      await ready;
      if (name === "db") return db;
      if (name === "user") return user;
      if (name === "sample") return sample;
      return null;
    },
  });
})();
