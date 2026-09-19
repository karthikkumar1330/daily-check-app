import { formatShort } from "../../utils/dateUtils";

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
      <button onClick={onPrev} aria-label="Previous day">
        {"\u2039"}
      </button>
      <button className={"today-btn" + (isToday ? " active" : "")} onClick={onToday}>
        Today
      </button>
      <div className="label">{formatShort(viewDate)}</div>
      <button onClick={onNext} aria-label="Next day">
        {"\u203A"}
      </button>
    </div>
  );
}
