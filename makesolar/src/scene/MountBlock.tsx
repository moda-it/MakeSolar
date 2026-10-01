import { useMemo } from "react";
import * as THREE from "three";
import {
  buildBlockOutline,
  DEFAULT_BLOCK_PROFILE,
} from "../geometry/blockProfile";

interface MountBlockProps {
  length: number;
  position: [number, number, number];
}

function MountBlock({ length, position }: MountBlockProps) {
  const geometry = useMemo(() => {
    const outline = buildBlockOutline(DEFAULT_BLOCK_PROFILE);

    const shape = new THREE.Shape();
    shape.moveTo(outline[0].x, outline[0].y);
    for (let i = 1; i < outline.length; i++) {
      shape.lineTo(outline[i].x, outline[i].y);
    }

    const extruded = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false,
    });
    extruded.translate(0, 0, -length / 2);
    return extruded;
  }, [length]);

  return (
    <mesh geometry={geometry} position={position} rotation={[0, Math.PI / 2, 0]}>
      <meshStandardMaterial color="silver" />
    </mesh>
  );
}

export default MountBlock;