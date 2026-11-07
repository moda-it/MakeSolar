import type { ThreeEvent } from "@react-three/fiber";
import type { PanelParams } from "../types/panel";
import type { Pos } from "../geometry/placement";

interface SolarPanelProps {
  params: PanelParams;
  position: [number, number, number];
  selected?: boolean;
  onSelect?: () => void;
  onDragStart?: (grab: Pos) => void;
}

function SolarPanel({
  params,
  position,
  selected = false,
  onSelect,
  onDragStart,
}: SolarPanelProps) {
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
    >
      <boxGeometry args={[params.width, params.thickness, params.height]} />
      <meshStandardMaterial color={selected ? "#e67e22" : "#1b2a4a"} />
    </mesh>
  );
}

export default SolarPanel;