import { Html, Line } from "@react-three/drei";

const R = 13;
const Y = 0.03;

const circle: [number, number, number][] = Array.from({ length: 65 }, (_, i) => {
  const a = (i / 64) * 2 * Math.PI;
  return [Math.sin(a) * R, Y, -Math.cos(a) * R];
});

const marks: { label: string; pos: [number, number, number]; color: string }[] = [
  { label: "Пн", pos: [0, 0.1, -R], color: "#e74c3c" },
  { label: "Сх", pos: [R, 0.1, 0], color: "#ecf0f1" },
  { label: "Пд", pos: [0, 0.1, R], color: "#ecf0f1" },
  { label: "Зх", pos: [-R, 0.1, 0], color: "#ecf0f1" },
];

function Compass() {
  return (
    <group>
      <Line points={circle} color="#7f8c8d" lineWidth={1} />
      <Line
        points={[
          [0, Y, -2],
          [0, Y, -R],
        ]}
        color="#e74c3c"
        lineWidth={2}
      />
      {marks.map((m) => (
        <Html key={m.label} position={m.pos} center pointerEvents="none">
          <div
            style={{
              background: "rgba(0,0,0,0.7)",
              color: m.color,
              padding: "2px 6px",
              borderRadius: 3,
              fontSize: 13,
              fontWeight: 700,
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            {m.label}
          </div>
        </Html>
      ))}
    </group>
  );
}

export default Compass;