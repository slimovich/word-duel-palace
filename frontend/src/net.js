/*
 * Thin WebSocket client for Word Duel Palace.
 * Connects to the same-origin `/ws` endpoint and exposes a tiny pub/sub API.
 */

function wsUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";

  return `${proto}//${location.host}/ws`;
}

export default class Net {
  constructor() {
    this.ws = null;
    this.handlers = new Set();
    this.queue = [];
    this.ready = false;
  }

  connect() {
    if (this.ws) return;

    this.ws = new WebSocket(wsUrl());
    this.ws.onopen = () => {
      this.ready = true;

      for (const m of this.queue) this.ws.send(JSON.stringify(m));

      this.queue = [];
      this._emit({ type: "_open" });
    };
    this.ws.onclose = () => {
      this.ready = false;
      this._emit({ type: "_close" });
    };
    this.ws.onerror = () => this._emit({ type: "_error" });
    this.ws.onmessage = (ev) => {
      try {
        this._emit(JSON.parse(ev.data));
      } catch {
        /* ignore malformed */
      }
    };
  }

  send(msg) {
    if (this.ready && this.ws) this.ws.send(JSON.stringify(msg));
    else this.queue.push(msg);
  }

  on(fn) {
    this.handlers.add(fn);

    return () => this.handlers.delete(fn);
  }

  _emit(msg) {
    for (const fn of this.handlers) fn(msg);
  }

  close() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.ready = false;
  }
}
