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
    <div className="day-nav">
      <button className="day-nav-arrow" onClick={onPrev} aria-label="Previous day">
        ‹
      </button>
      <button className={"today-btn" + (isToday ? " active" : "")} onClick={onToday}>
        Today
      </button>
      <div className="label">{formatNavDate(viewDate)}</div>
      <button className="day-nav-arrow" onClick={onNext} aria-label="Next day">
        ›
      </button>
    </div>
  );
}

