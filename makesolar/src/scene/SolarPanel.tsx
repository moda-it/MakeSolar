import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { PanelParams } from "../types/panel";
import type { Pos } from "../geometry/placement";

interface SolarPanelProps {
  params: PanelParams;
  position: [number, number, number];
  selected?: boolean;
  shade?: number; // частка втрат від тіні, 0..1; undefined = не підсвічувати
  onSelect?: () => void;
  onDragStart?: (grab: Pos) => void;
}

const BASE = new THREE.Color("#1b2a4a");
const SHADED = new THREE.Color("#c0392b");
const SHADE_FULL_AT = 0.3; // з 30% втрат панель повністю червона

function SolarPanel({
  params,
  position,
  selected = false,
  shade,
  onSelect,
  onDragStart,
}: SolarPanelProps) {
  const color = useMemo(() => {
    if (selected) return "#e67e22";
    if (shade === undefined) return "#1b2a4a";
    const t = Math.min(1, shade / SHADE_FULL_AT);
    return `#${BASE.clone().lerp(SHADED, t).getHexString()}`;
  }, [selected, shade]);

  function handleClick(e: ThreeEvent<MouseEvent>) {
    if (e.delta > 5) return;
    e.stopPropagation();
    onSelect?.();
  }

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    const parent = e.object.parent;
    if (!parent) return;
    e.stopPropagation();
    const local = parent.worldToLocal(e.point.clone());
    onDragStart?.({ x: local.x, z: local.z });
  }

  return (
    <mesh
      position={position}
      onClick={onSelect ? handleClick : undefined}
      onPointerDown={selected && onDragStart ? handlePointerDown : undefined}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[params.width, params.thickness, params.height]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export default SolarPanel;
