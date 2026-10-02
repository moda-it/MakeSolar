import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { RoofParams } from "../types/roof";
import { buildProfileOutline, DEFAULT_PROFILE } from "../geometry/roofProfile";

interface RoofProps {
  params: RoofParams;
  children?: ReactNode;
}

function Roof({ params, children }: RoofProps) {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const outline = buildProfileOutline(params.width, DEFAULT_PROFILE);

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
  }, [params.width, params.length]);

  const tiltRad = THREE.MathUtils.degToRad(params.tilt);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    group.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(group);

    const sheetTop = DEFAULT_PROFILE.thickness + DEFAULT_PROFILE.height;
    const expectedMaxY =
      params.length * Math.sin(tiltRad) + sheetTop * Math.cos(tiltRad);

    console.log("Нахил:", params.tilt, "°");
    console.log("min Y (має бути ≈ 0):", box.min.y.toFixed(3));
    console.log(
      "max Y: очікується",
      expectedMaxY.toFixed(3),
      "фактично",
      box.max.y.toFixed(3)
    );
  }, [params.length, params.tilt, tiltRad]);

  return (
    <group ref={groupRef} rotation={[tiltRad, 0, 0]}>
      <mesh
        geometry={geometry}
        position={[0, DEFAULT_PROFILE.thickness, -params.length / 2]}
      >
        <meshStandardMaterial color="gray" />
      </mesh>
      {children}
    </group>
  );
}

export default Roof;