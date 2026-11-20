import "./Tracking.css";

// The "Load more" button under a usePagedList list; renders nothing once the last page is shown.
export default function LoadMore({ list }) {
  if (!list.next) return null;
  return (
    <div className="load-more">
      <button className="workspace-secondary" type="button" onClick={list.loadMore} disabled={list.loadingMore}>
        {list.loadingMore ? "Loading…" : "Load more"}
      </button>
    </div>
  );
}
