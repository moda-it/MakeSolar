import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Roof from "./roof";
import MountBlock from "./MountBlock";
import SolarPanel from "./solarPanel";
import type { RoofParams } from "../types/roof";
import type { PanelParams } from "../types/panel";
import type { BlockPlacement } from "../geometry/blockLayout";
import type { PanelPlacement } from "../geometry/panelLayout";
import { DEFAULT_PROFILE } from "../geometry/roofProfile";
import { DEFAULT_BLOCK_PROFILE } from "../geometry/blockProfile";

interface SolarSceneProps {
  roof: RoofParams;
  panel: PanelParams;
  panels: PanelPlacement[];
  blocks: BlockPlacement[];
  blockLength: number;
}

function SolarScene({ roof, panel, panels, blocks, blockLength }: SolarSceneProps) {
  const blockY = DEFAULT_PROFILE.thickness + DEFAULT_PROFILE.height;
  const panelY = blockY + DEFAULT_BLOCK_PROFILE.height + panel.thickness / 2;

  return (
    <Canvas camera={{ position: [10, 10, 10] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>

      <gridHelper args={[20, 20]} />
      <axesHelper args={[3]} />

      <Roof params={roof}>
        {blocks.map((b, i) => (
          <MountBlock key={i} length={blockLength} position={[b.x, blockY, b.z]} />
        ))}
        {panels.map((p, i) => (
          <SolarPanel key={i} params={panel} position={[p.x, panelY, p.z]} />
        ))}
      </Roof>

      <OrbitControls />
    </Canvas>
  );
}

export default SolarScene;