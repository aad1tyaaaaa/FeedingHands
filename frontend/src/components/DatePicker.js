import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import "./DatePicker.css";

// Dates travel as "YYYY-MM-DD" (what <input type="date"> sent), built from local parts:
// toISOString() would shift the day for anyone east of UTC, i.e. all of India.
const pad = (n) => String(n).padStart(2, "0");
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISODate = (s) => {
  const [y, m, d] = (s || "").split("-").map(Number);
  return y ? new Date(y, m - 1, d) : null;
};
const sameDay = (a, b) => a && b && toISODate(a) === toISODate(b);
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * Themed date field with a popover calendar; replaces the browser's unstylable date picker.
 * onChange receives an input-like event ({ target: { name, value } }) so existing form handlers work.
 */
export default function DatePicker({ id, name, value, onChange, min, required, placeholder = "Choose a date" }) {
  const selected = fromISODate(value);
  const minDate = fromISODate(min);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected || minDate || new Date()); // month on screen
  const [focus, setFocus] = useState(() => selected || minDate || new Date()); // day with keyboard focus
  const rootRef = useRef(null);
  const gridRef = useRef(null);
  const today = new Date();

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep keyboard focus on the focused day while the calendar is open.
  useEffect(() => {
    if (open) gridRef.current?.querySelector(`[data-day="${toISODate(focus)}"]`)?.focus();
  }, [open, focus]);

  const disabled = (d) => minDate && d < minDate;
  const pick = (d) => {
    if (disabled(d)) return;
    onChange?.({ target: { name, value: toISODate(d) } });
    setOpen(false);
    rootRef.current?.querySelector(".fh-date-field")?.focus();
  };
  const moveFocus = (d) => {
    setFocus(d);
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) setView(d);
  };
  const shiftMonth = (delta) => setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));

  const onGridKey = (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) {
      e.preventDefault();
      moveFocus(new Date(focus.getFullYear(), focus.getMonth(), focus.getDate() + step));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      moveFocus(new Date(focus.getFullYear(), focus.getMonth() + (e.key === "PageUp" ? -1 : 1), focus.getDate()));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(focus);
    }
  };

  // Six weeks starting on the Monday on/before the 1st.
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const monthLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const canGoBack = !minDate || new Date(view.getFullYear(), view.getMonth(), 1) > minDate;

  return (
    <div className="fh-date" ref={rootRef} onKeyDown={(e) => e.key === "Escape" && open && (e.stopPropagation(), setOpen(false))}>
      <button
        type="button"
        id={id}
        className={`fh-date-field${selected ? "" : " is-empty"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          const start = selected || minDate || new Date();
          setView(start);
          setFocus(start);
          setOpen((o) => !o);
        }}
      >
        <span>{selected ? selected.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : placeholder}</span>
        <CalendarDays size={18} aria-hidden="true" />
      </button>
      {/* Carries the value for native form validation (required) without a second visible control. */}
      <input className="fh-date-proxy" tabIndex={-1} aria-hidden="true" name={name} value={value || ""} required={required} onChange={() => {}} />

      {open && (
        <div className="fh-date-pop" role="dialog" aria-label="Choose a date">
          <div className="fh-date-head">
            <button type="button" onClick={() => shiftMonth(-1)} disabled={!canGoBack} aria-label="Previous month"><ChevronLeft size={18} /></button>
            <strong aria-live="polite">{monthLabel}</strong>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
          </div>
          <div className="fh-date-grid" role="grid" ref={gridRef} onKeyDown={onGridKey}>
            {WEEKDAYS.map((w) => <span key={w} className="fh-date-dow" role="columnheader">{w}</span>)}
            {days.map((d) => {
              const iso = toISODate(d);
              const outside = d.getMonth() !== view.getMonth();
              return (
                <button
                  type="button"
                  key={iso}
                  data-day={iso}
                  role="gridcell"
                  tabIndex={sameDay(d, focus) ? 0 : -1}
                  disabled={disabled(d)}
                  aria-selected={sameDay(d, selected)}
                  aria-label={d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  className={`fh-date-day${outside ? " is-outside" : ""}${sameDay(d, today) ? " is-today" : ""}${sameDay(d, selected) ? " is-selected" : ""}`}
                  onClick={() => pick(d)}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="fh-date-foot">
            {!disabled(today) && <button type="button" onClick={() => pick(today)}>Today</button>}
            {!disabled(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)) && (
              <button type="button" onClick={() => pick(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))}>Tomorrow</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
