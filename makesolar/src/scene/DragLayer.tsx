import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { PanelParams } from "../types/panel";
import {
  snapPosition,
  isValidPlacement,
  type Pos,
  type PlacementRules,
  type Rect,
} from "../geometry/placement";
import RulerLayer from "./RulerLayer";

interface DragLayerProps {
  panel: PanelParams;
  others: Pos[];
  rules: PlacementRules;
  panelY: number;
  start: Pos;
  grab: Pos;
  onDrop: (pos: Pos) => void;
  onCancel: () => void;
}

interface Ghost {
  pos: Pos;
  valid: boolean;
}

function DragLayer({
  panel,
  others,
  rules,
  panelY,
  start,
  grab,
  onDrop,
  onCancel,
}: DragLayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const initial: Ghost = { pos: start, valid: true };
  const [ghost, setGhost] = useState<Ghost>(initial);
  const ghostRef = useRef<Ghost>(initial);

  const offsetX = start.x - grab.x;
  const offsetZ = start.z - grab.z;

  const rulerOthers: Rect[] = [
    ...others.map((o) => ({
      x: o.x,
      z: o.z,
      width: rules.panelWidth,
      depth: rules.panelHeight,
    })),
    ...rules.obstacles,
  ];

  function update(next: Ghost) {
    ghostRef.current = next;
    setGhost(next);
  }

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
        position={[0, panelY, -rules.roofLength / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          e.stopPropagation();
          const group = groupRef.current;
          if (!group) return;
          const local = group.worldToLocal(e.point.clone());
          const target = { x: local.x + offsetX, z: local.z + offsetZ };
          const pos = snapPosition(target, others, rules);
          update({ pos, valid: isValidPlacement(pos, others, rules) });
        }}
      >
        <planeGeometry args={[rules.roofWidth, rules.roofLength]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh position={[ghost.pos.x, panelY, ghost.pos.z]} raycast={() => null}>
        <boxGeometry args={[panel.width, panel.thickness, panel.height]} />
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
          width: panel.width,
          depth: panel.height,
        }}
        others={rulerOthers}
        roofWidth={rules.roofWidth}
        roofLength={rules.roofLength}
        y={panelY + panel.thickness / 2 + 0.04}
      />
    </group>
  );
}

export default DragLayer;