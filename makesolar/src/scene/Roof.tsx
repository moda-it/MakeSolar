import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { RoofParams } from "../types/roof";
import {
  buildProfileOutline,
  type ProfileParams,
} from "../geometry/roofProfile";

interface RoofProps {
  params: RoofParams;
  profile: ProfileParams;
  children?: ReactNode;
}

function Roof({ params, profile, children }: RoofProps) {
  const geometry = useMemo(() => {
    const outline = buildProfileOutline(params.width, profile);

    const shape = new THREE.Shape();
    shape.moveTo(outline[0].x, outline[0].y);
    for (let i = 1; i < outline.length; i++) {
      shape.lineTo(outline[i].x, outline[i].y);
    }

    const extruded = new THREE.ExtrudeGeometry(shape, {
      depth: params.length,
      bevelEnabled: false,
    });

    extruded.translate(-params.width / 2, 0, -params.length / 2);
    return extruded;
  }, [params.width, params.length, profile]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const tiltRad = THREE.MathUtils.degToRad(params.tilt);

  return (
    <group rotation={[tiltRad, 0, 0]}>
      <mesh
        geometry={geometry}
        position={[0, profile.thickness, -params.length / 2]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="grey" />
      </mesh>
      {children}
    </group>
  );
}

export default Roof;