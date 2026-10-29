import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Roof from "./Roof";
import MountBlock from "./MountBlock";
import SolarPanel from "./SolarPanel";
import PlacementLayer from "./PlacementLayer";
import type { RoofParams } from "../types/roof";
import type { PanelParams, PlacedPanel } from "../types/panel";
import type { LayerMode } from "../types/layers";
import type { BlockPlacement } from "../geometry/blockLayout";
import type { Pos, PlacementRules } from "../geometry/placement";
import { DEFAULT_PROFILE } from "../geometry/roofProfile";
import { DEFAULT_BLOCK_PROFILE } from "../geometry/blockProfile";

interface SolarSceneProps {
  roof: RoofParams;
  panel: PanelParams;
  panels: PlacedPanel[];
  blocks: BlockPlacement[];
  blockLength: number;
  layer: LayerMode;
  placing: boolean;
  rules: PlacementRules;
  onPlace: (pos: Pos) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDeselect: () => void;
}

function SolarScene({
  roof,
  panel,
  panels,
  blocks,
  blockLength,
  layer,
  placing,
  rules,
  onPlace,
  selectedId,
  onSelect,
  onDeselect,
}: SolarSceneProps) {
  const blockY = DEFAULT_PROFILE.thickness + DEFAULT_PROFILE.height;
  const panelY = blockY + DEFAULT_BLOCK_PROFILE.height + panel.thickness / 2;

  return (
    <Canvas camera={{ position: [10, 10, 10] }} onPointerMissed={onDeselect}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>

      <gridHelper args={[20, 20]} />
      <axesHelper args={[3]} />

      <Roof params={roof}>
        {layer !== "roof" &&
          blocks.map((b, i) => (
            <MountBlock key={i} length={blockLength} position={[b.x, blockY, b.z]} />
          ))}
        {layer === "all" &&
          panels.map((p) => (
            <SolarPanel
              key={p.id}
              params={panel}
              position={[p.x, panelY, p.z]}
              selected={p.id === selectedId}
              onSelect={placing ? undefined : () => onSelect(p.id)}
            />
          ))}
        {placing && layer === "all" && (
          <PlacementLayer
            panel={panel}
            others={panels}
            rules={rules}
            panelY={panelY}
            onPlace={onPlace}
          />
        )}
      </Roof>

      <OrbitControls />
    </Canvas>
  );
}

export default SolarScene;