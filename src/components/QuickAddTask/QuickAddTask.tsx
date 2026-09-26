import { useRef, useState } from "react";

interface QuickAddTaskProps {
  onAdd: (title: string) => void;
}

export default function QuickAddTask({ onAdd }: QuickAddTaskProps) {
  const [value, setValue] = useState("");
  const lockRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (lockRef.current) return;
    const title = value.trim();
    if (!title) {
      inputRef.current?.focus();
      return;
    }
    lockRef.current = true;
    onAdd(title);
    setValue("");
    // Prevent accidental double submissions (double Enter / double tap).
    setTimeout(() => {
      lockRef.current = false;
    }, 60);
    inputRef.current?.focus();
  }

  return (
    <div className="quick-add">
      <input
        ref={inputRef}
        type="text"
        placeholder="What needs to be done today?"
        autoComplete="off"
        maxLength={140}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button type="button" onClick={submit} aria-label="Add task">
        + Add
      </button>
    </div>
  );
}
