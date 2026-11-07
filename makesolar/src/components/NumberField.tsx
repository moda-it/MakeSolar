import { useEffect, useState } from "react";
import { clamp } from "../utils/math";

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit,
  onChange,
}: NumberFieldProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  useEffect(() => {
    const parsed = Number(text);
    if (text.trim() === "" || Number.isNaN(parsed)) return;
    if (parsed < min || parsed > max || parsed === value) return;
    const timer = setTimeout(() => onChange(parsed), 400);
    return () => clearTimeout(timer);
  }, [text, value, min, max, onChange]);

  function commit() {
    const parsed = Number(text);
    if (text.trim() === "" || Number.isNaN(parsed)) {
      setText(String(value));
      return;
    }
    const result = clamp(parsed, min, max);
    setText(String(result));
    if (result !== value) onChange(result);
  }

  return (
    <label style={{ display: "block", marginBottom: 8 }}>
      {label}
      {unit ? ` (${unit})` : ""}:{" "}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        style={{ width: 80 }}
      />
    </label>
  );
}

export default NumberField;