import type { ThreeEvent } from "@react-three/fiber";
import type { Obstacle } from "../types/obstacle";

interface ObstacleBoxProps {
  obstacle: Obstacle;
  baseY: number;
  selected: boolean;
  onSelect?: () => void;
  onDragStart?: (grab: { x: number; y: number; z: number }) => void;
}

function ObstacleBox({ obstacle, baseY, selected, onSelect, onDragStart }: ObstacleBoxProps) {
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
    onDragStart?.({ x: local.x, y: local.y, z: local.z });
  }

  return (
    <mesh
      position={[obstacle.x, baseY + obstacle.height / 2, obstacle.z]}
      onClick={onSelect ? handleClick : undefined}
      onPointerDown={selected && onDragStart ? handlePointerDown : undefined}
    >
      <boxGeometry args={[obstacle.width, obstacle.height, obstacle.depth]} />
      <meshStandardMaterial color={selected ? "#e67e22" : "#8d6e63"} />
    </mesh>
  );
}

export default ObstacleBox;