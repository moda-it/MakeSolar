import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Roof from "./roof";
import MountBlock from "./MountBlock";
import SolarPanel from "./solarPanel";
import ObstacleBox from "./ObstacleBox";
import PlacementLayer from "./PlacementLayer";
import DragLayer from "./DragLayer";
import ObstacleDragLayer from "./ObstacleDragLayer";
import RulerLayer from "./RulerLayer";
import type { RoofParams } from "../types/roof";
import type { PanelParams, PlacedPanel, DragState } from "../types/panel";
import type { Obstacle, ObstacleDragState } from "../types/obstacle";
import type { LayerMode } from "../types/layers";
import type { BlockPlacement } from "../geometry/blockLayout";
import type { Pos, PlacementRules, Rect } from "../geometry/placement";
import { profileTopY, type ProfileParams } from "../geometry/roofProfile";
import { DEFAULT_BLOCK_PROFILE } from "../geometry/blockProfile";

interface SolarSceneProps {
  roof: RoofParams;
  profile: ProfileParams;
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
  drag: DragState | null;
  onDragStart: (id: number, grab: Pos) => void;
  onDrop: (pos: Pos) => void;
  onCancelDrag: () => void;
  obstacles: Obstacle[];
  selectedObstacleId: number | null;
  onSelectObstacle: (id: number) => void;
  obstacleDrag: ObstacleDragState | null;
  onObstacleDragStart: (id: number, grab: { x: number; y: number; z: number }) => void;
  onObstacleDrop: (pos: Pos) => void;
  onObstacleCancelDrag: () => void;
  selectedBlock: Pos | null;
  onSelectBlock: (b: Pos) => void;
}

function SolarScene({
  roof,
  profile,
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
  drag,
  onDragStart,
  onDrop,
  onCancelDrag,
  obstacles,
  selectedObstacleId,
  onSelectObstacle,
  obstacleDrag,
  onObstacleDragStart,
  onObstacleDrop,
  onObstacleCancelDrag,
  selectedBlock,
  onSelectBlock,
}: SolarSceneProps) {
  const blockY = profileTopY(profile);
  const panelY = blockY + DEFAULT_BLOCK_PROFILE.height + panel.thickness / 2;
  const rulerY = panelY + panel.thickness / 2 + 0.04;

  const showPanels = layer === "all";
  const idle = !placing && !drag && !obstacleDrag;

  const toPanelRect = (p: PlacedPanel): Rect => ({
    x: p.x,
    z: p.z,
    width: panel.width,
    depth: panel.height,
  });
  const toObstacleRect = (o: Obstacle): Rect => ({
    x: o.x,
    z: o.z,
    width: o.width,
    depth: o.depth,
  });
  const blockRect = (b: BlockPlacement): Rect => ({
    x: b.x,
    z: b.z,
    width: blockLength,
    depth: DEFAULT_BLOCK_PROFILE.totalWidth,
  });
  const isSelectedBlock = (b: BlockPlacement) =>
    selectedBlock !== null &&
    Math.abs(b.x - selectedBlock.x) < 0.02 &&
    Math.abs(b.z - selectedBlock.z) < 0.02;

  const visiblePanels = drag ? panels.filter((p) => p.id !== drag.id) : panels;
  const visibleObstacles = obstacleDrag
    ? obstacles.filter((o) => o.id !== obstacleDrag.id)
    : obstacles;
  const draggedObstacle = obstacleDrag
    ? obstacles.find((o) => o.id === obstacleDrag.id)
    : undefined;

  const selectedPanel =
    showPanels && idle ? panels.find((p) => p.id === selectedId) : undefined;
  const selectedObstacle = idle
    ? obstacles.find((o) => o.id === selectedObstacleId)
    : undefined;
  const activeBlock =
    idle && layer !== "roof" ? blocks.find(isSelectedBlock) : undefined;

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

      <Roof params={roof} profile={profile}>
        {visibleObstacles.map((o) => (
          <ObstacleBox
            key={o.id}
            obstacle={o}
            baseY={blockY}
            selected={o.id === selectedObstacleId}
            onSelect={placing || drag || obstacleDrag ? undefined : () => onSelectObstacle(o.id)}
            onDragStart={
              placing || drag || obstacleDrag
                ? undefined
                : (grab) => onObstacleDragStart(o.id, grab)
            }
          />
        ))}

        {layer !== "roof" &&
          blocks.map((b, i) => (
            <MountBlock
              key={i}
              length={blockLength}
              position={[b.x, blockY, b.z]}
              selected={isSelectedBlock(b)}
              onSelect={idle ? () => onSelectBlock({ x: b.x, z: b.z }) : undefined}
            />
          ))}

        {showPanels &&
          visiblePanels.map((p) => (
            <SolarPanel
              key={p.id}
              params={panel}
              position={[p.x, panelY, p.z]}
              selected={p.id === selectedId}
              onSelect={placing || obstacleDrag ? undefined : () => onSelect(p.id)}
              onDragStart={
                placing || obstacleDrag ? undefined : (grab) => onDragStart(p.id, grab)
              }
            />
          ))}

        {placing && showPanels && (
          <PlacementLayer
            panel={panel}
            others={panels}
            rules={rules}
            panelY={panelY}
            onPlace={onPlace}
          />
        )}

        {drag && showPanels && (
          <DragLayer
            key={drag.id}
            panel={panel}
            others={visiblePanels}
            rules={rules}
            panelY={panelY}
            start={drag.start}
            grab={drag.grab}
            onDrop={onDrop}
            onCancel={onCancelDrag}
          />
        )}

        {obstacleDrag && draggedObstacle && (
          <ObstacleDragLayer
            key={obstacleDrag.id}
            obstacle={draggedObstacle}
            panelRects={showPanels ? panels.map(toPanelRect) : []}
            otherObstacles={visibleObstacles.map(toObstacleRect)}
            roofWidth={roof.width}
            roofLength={roof.length}
            snapDistance={rules.snapDistance}
            baseY={blockY}
            rulerY={rulerY}
            grab={obstacleDrag.grab}
            onDrop={onObstacleDrop}
            onCancel={onObstacleCancelDrag}
          />
        )}

        {selectedPanel && (
          <RulerLayer
            target={toPanelRect(selectedPanel)}
            others={[
              ...panels.filter((p) => p.id !== selectedPanel.id).map(toPanelRect),
              ...obstacles.map(toObstacleRect),
            ]}
            roofWidth={roof.width}
            roofLength={roof.length}
            y={rulerY}
          />
        )}

        {selectedObstacle && (
          <RulerLayer
            target={toObstacleRect(selectedObstacle)}
            others={[
              ...(showPanels ? panels.map(toPanelRect) : []),
              ...obstacles
                .filter((o) => o.id !== selectedObstacle.id)
                .map(toObstacleRect),
            ]}
            roofWidth={roof.width}
            roofLength={roof.length}
            y={rulerY}
          />
        )}

        {activeBlock && (
          <RulerLayer
            target={blockRect(activeBlock)}
            others={[
              ...blocks.filter((b) => b !== activeBlock).map(blockRect),
              ...obstacles.map(toObstacleRect),
            ]}
            roofWidth={roof.width}
            roofLength={roof.length}
            y={rulerY}
          />
        )}
      </Roof>

      <OrbitControls enabled={!drag && !obstacleDrag} />
    </Canvas>
  );
}

export default SolarScene;