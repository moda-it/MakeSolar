import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Obstacle } from "../types/obstacle";
import type { Pos, Rect } from "../geometry/placement";
import { snapObstacle, isValidObstaclePos } from "../geometry/obstaclePlacement";
import RulerLayer from "./RulerLayer";

interface ObstacleDragLayerProps {
  obstacle: Obstacle;
  panelRects: Rect[];
  otherObstacles: Rect[];
  roofWidth: number;
  roofLength: number;
  snapDistance: number;
  baseY: number;
  rulerY: number;
  grab: { x: number; y: number; z: number };
  onDrop: (pos: Pos) => void;
  onCancel: () => void;
}

interface Ghost {
  pos: Pos;
  valid: boolean;
}

function ObstacleDragLayer({
  obstacle,
  panelRects,
  otherObstacles,
  roofWidth,
  roofLength,
  snapDistance,
  baseY,
  rulerY,
  grab,
  onDrop,
  onCancel,
}: ObstacleDragLayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const initial: Ghost = { pos: { x: obstacle.x, z: obstacle.z }, valid: true };
  const [ghost, setGhost] = useState<Ghost>(initial);
  const ghostRef = useRef<Ghost>(initial);

  const offsetX = obstacle.x - grab.x;
  const offsetZ = obstacle.z - grab.z;
  const size = { width: obstacle.width, depth: obstacle.depth };

  useEffect(() => {
    function onUp() {
      const g = ghostRef.current;
      if (g.valid) onDrop(g.pos);
      else onCancel();
    }
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [onDrop, onCancel]);

  return (
    <group ref={groupRef}>
      <mesh
        position={[0, grab.y, -roofLength / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          e.stopPropagation();
          const group = groupRef.current;
          if (!group) return;
          const local = group.worldToLocal(e.point.clone());
          const target = { x: local.x + offsetX, z: local.z + offsetZ };
          const pos = snapObstacle(target, size, { roofWidth, roofLength, snapDistance });
          const next = { pos, valid: isValidObstaclePos(pos, size, otherObstacles) };
          ghostRef.current = next;
          setGhost(next);
        }}
      >
        <planeGeometry args={[roofWidth * 3, roofLength * 3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh
        position={[ghost.pos.x, baseY + obstacle.height / 2, ghost.pos.z]}
        raycast={() => null}
      >
        <boxGeometry args={[obstacle.width, obstacle.height, obstacle.depth]} />
        <meshStandardMaterial
          color={ghost.valid ? "#e67e22" : "#e74c3c"}
          transparent
          opacity={0.7}
        />
      </mesh>

      <RulerLayer
        target={{
          x: ghost.pos.x,
          z: ghost.pos.z,
          width: obstacle.width,
          depth: obstacle.depth,
        }}
        others={[...panelRects, ...otherObstacles]}
        roofWidth={roofWidth}
        roofLength={roofLength}
        y={rulerY}
      />
    </group>
  );
}

export default ObstacleDragLayer;