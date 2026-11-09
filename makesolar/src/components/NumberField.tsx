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
  const [shownValue, setShownValue] = useState(value);

  // Значення змінили ззовні: оновлюємо текст під час рендера, без зайвого ефекту
  if (value !== shownValue) {
    setShownValue(value);
    setText(String(value));
  }

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

  const parsed = Number(text);
  const invalid =
    text.trim() !== "" && (Number.isNaN(parsed) || parsed < min || parsed > max);

  return (
    <label className="field" title={`${min} – ${max}${unit ? " " + unit : ""}`}>
      <span className="field-label">{label}</span>
      <span className="field-control" data-invalid={invalid || undefined}>
        <input
          className="field-input"
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
        />
        {unit && <span className="field-unit">{unit}</span>}
      </span>
    </label>
  );
}

export default NumberField;
