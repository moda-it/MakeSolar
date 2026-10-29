import type { ThreeEvent } from "@react-three/fiber";
import type { PanelParams } from "../types/panel";

interface SolarPanelProps {
  params: PanelParams;
  position: [number, number, number];
  selected?: boolean;
  onSelect?: () => void;
}

function SolarPanel({ params, position, selected = false, onSelect }: SolarPanelProps) {
  function handleClick(e: ThreeEvent<MouseEvent>) {
    if (e.delta > 5) return;
    e.stopPropagation();
    onSelect?.();
  }

  return (
    <mesh position={position} onClick={onSelect ? handleClick : undefined}>
      <boxGeometry args={[params.width, params.thickness, params.height]} />
      <meshStandardMaterial color={selected ? "#e67e22" : "#1b2a4a"} />
    </mesh>
  );
}

export default SolarPanel;