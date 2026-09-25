import { formatNavDate } from "../../utils/dateUtils";

interface DateNavigatorProps {
  viewDate: string;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export default function DateNavigator({ viewDate, isToday, onPrev, onNext, onToday }: DateNavigatorProps) {
  return (
    <div
      className="day-nav"
      role="navigation"
      aria-label="Date navigation"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onPrev();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onNext();
        }
      }}
    >
      <button
        type="button"
        className="day-nav-arrow"
        onClick={onPrev}
        aria-label="Previous day"
        title="Previous day (Left Arrow)"
      >
        ‹
      </button>
      <button
        type="button"
        className={"today-btn" + (isToday ? " active" : "")}
        onClick={onToday}
        aria-label="Go to Today"
        title="Go to Today"
      >
        Today
      </button>
      <div className="label" aria-live="polite" aria-atomic="true">
        {formatNavDate(viewDate)}
      </div>
      <button
        type="button"
        className="day-nav-arrow"
        onClick={onNext}
        aria-label="Next day"
        title="Next day (Right Arrow)"
      >
        ›
      </button>
    </div>
  );
}
