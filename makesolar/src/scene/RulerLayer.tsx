import { Html, Line } from "@react-three/drei";
import { measureAround } from "../geometry/measure";
import type { Rect } from "../geometry/placement";

interface RulerLayerProps {
  target: Rect;
  others: Rect[];
  roofWidth: number;
  roofLength: number;
  y: number;
}

function formatDistance(d: number): string {
  return d < 1 ? `${(d * 100).toFixed(1)} см` : `${d.toFixed(2)} м`;
}

function RulerLayer({ target, others, roofWidth, roofLength, y }: RulerLayerProps) {
  const items = measureAround(target, others, roofWidth, roofLength).filter(
    (m) => m.distance > -0.0005
  );

  return (
    <group>
      {items.map((m) => {
        const color = m.toObject ? "#f1c40f" : "#00e5ff";
        const mid: [number, number, number] = [
          (m.from.x + m.to.x) / 2,
          y,
          (m.from.z + m.to.z) / 2,
        ];
        return (
          <group key={m.dir}>
            <Line
              points={[
                [m.from.x, y, m.from.z],
                [m.to.x, y, m.to.z],
              ]}
              color={color}
              lineWidth={2}
            />
            <Html position={mid} center pointerEvents="none" zIndexRange={[20, 0]}>
              <div
                style={{
                  background: "rgba(0,0,0,0.75)",
                  color,
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              >
                {formatDistance(m.distance)}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default RulerLayer;