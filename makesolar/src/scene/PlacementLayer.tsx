import { useRef, useState } from "react";
import * as THREE from "three";
import type { PanelParams } from "../types/panel";
import {
  snapPosition,
  isValidPlacement,
  type Pos,
  type PlacementRules,
} from "../geometry/placement";

interface PlacementLayerProps {
  panel: PanelParams;
  others: Pos[];
  rules: PlacementRules;
  panelY: number;
  onPlace: (pos: Pos) => void;
}

interface Ghost {
  pos: Pos;
  valid: boolean;
}

function PlacementLayer({ panel, others, rules, panelY, onPlace }: PlacementLayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);

  function toGhost(worldPoint: THREE.Vector3): Ghost | null {
    const group = groupRef.current;
    if (!group) return null;
    const local = group.worldToLocal(worldPoint.clone());
    const pos = snapPosition({ x: local.x, z: local.z }, others, rules);
    return { pos, valid: isValidPlacement(pos, others, rules) };
  }

  return (
    <group ref={groupRef}>
      <mesh
        position={[0, panelY, -rules.roofLength / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          e.stopPropagation();
          setGhost(toGhost(e.point));
        }}
        onPointerOut={() => setGhost(null)}
        onClick={(e) => {
          if (e.delta > 5) return;
          e.stopPropagation();
          const g = toGhost(e.point);
          if (g && g.valid) onPlace(g.pos);
        }}
      >
        <planeGeometry args={[rules.roofWidth, rules.roofLength]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {ghost && (
        <mesh
          position={[ghost.pos.x, panelY, ghost.pos.z]}
          raycast={() => null}
        >
          <boxGeometry args={[panel.width, panel.thickness, panel.height]} />
          <meshStandardMaterial
            color={ghost.valid ? "#2ecc71" : "#e74c3c"}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}

export default PlacementLayer;