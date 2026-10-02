import type { PanelParams } from "../types/panel";

interface SolarPanelProps {
  params: PanelParams;
  position: [number, number, number];
}

function SolarPanel({ params, position }: SolarPanelProps) {
  return (
    <mesh position={position}>
      <boxGeometry args={[params.width, params.thickness, params.height]} />
      <meshStandardMaterial color="#1b2a4a"/>
    </mesh>
  );
}

export default SolarPanel;