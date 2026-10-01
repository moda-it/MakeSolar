import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Roof from "./roof";
import type { RoofParams } from "../types/roof";
import MountBlock from "./MountBlock";
import { DEFAULT_PROFILE } from "../geometry/roofProfile";

interface SolarSceneProps {
  roof: RoofParams;
}

function SolarScene({ roof }: SolarSceneProps) {
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
  <MountBlock
    length={0.3}
    position={[0, DEFAULT_PROFILE.thickness + DEFAULT_PROFILE.height, -roof.length / 2]}
  />
</Roof>

      <OrbitControls />
    </Canvas>
  );
}

export default SolarScene;