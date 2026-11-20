import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "./client";
import { appendPage, mergeFirstPage } from "./pager.mjs";

// Calls load now, every `ms` while the tab is visible, and again when the user comes back to the tab.
export default function usePolling(load, ms = 30000) {
  useEffect(() => {
    let last = 0;
    const run = () => {
      // focus and visibilitychange both fire on a tab switch; one reload is enough
      if (document.visibilityState !== "visible" || Date.now() - last < 2000) return;
      last = Date.now();
      load();
    };
    run();
    const timer = setInterval(run, ms);
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, [load, ms]);
}

// A polled list endpoint that answers {donations, next}. Polling refreshes the first page only;
// loadMore() fetches ?before=next and appends. path null = don't load.
export function usePagedList(path) {
  const [list, setList] = useState({ items: [], next: null, more: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const [loadingMore, setLoadingMore] = useState(false);
  const pathRef = useRef(path);

  const refresh = useCallback(async () => {
    if (!path) return;
    try {
      const data = await apiFetch(path);
      if (pathRef.current !== path) return; // the path changed while this was in flight
      setList((s) => ({
        items: mergeFirstPage(s.items, data.donations || []),
        next: s.more ? s.next : data.next ?? null, // once older pages are loaded, their cursor wins
        more: s.more,
      }));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    pathRef.current = path;
    setList({ items: [], next: null, more: false });
    setLoading(Boolean(path));
  }, [path]);

  usePolling(refresh);

  const loadMore = async () => {
    if (!list.next) return;
    setLoadingMore(true);
    try {
      const data = await apiFetch(`${path}${path.includes("?") ? "&" : "?"}before=${list.next}`);
      setList((s) => ({ items: appendPage(s.items, data.donations || []), next: data.next ?? null, more: true }));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return { items: list.items, next: list.next, error, loading, loadingMore, loadMore, refresh };
}
