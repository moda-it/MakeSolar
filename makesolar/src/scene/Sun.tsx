import { Line } from "@react-three/drei";
import type { Vec3 } from "../utils/math";

const DISTANCE = 18;

interface SunProps {
  direction: Vec3;
  elevationDeg: number;
  path: Vec3[];
}

function toPoint(v: Vec3): [number, number, number] {
  return [v.x * DISTANCE, v.y * DISTANCE, v.z * DISTANCE];
}

function Sun({ direction, elevationDeg, path }: SunProps) {
  const position = toPoint(direction);
  const pathPoints = path.map(toPoint);
  const isUp = elevationDeg > 0;

  return (
    <group>
      {pathPoints.length > 1 && (
        <Line points={pathPoints} color="#f39c12" lineWidth={1.5} />
      )}
      {isUp && (
        <>
          <mesh position={position}>
            <sphereGeometry args={[0.8, 24, 24]} />
            <meshBasicMaterial color="#ffd54a" />
          </mesh>
          <Line points={[position, [0, 0, 0]]} color="#f1c40f" lineWidth={1} />
        </>
      )}
    </group>
  );
}

export default Sun;