import { useRef, type ReactNode } from 'react';

import { isClick } from '../navigation/cameraMath';
import { useAppStore } from '../store/useAppStore';

interface SelectableProps {
  id: string;
  /** Raycast target radius in scene units (kept generous so small bodies stay clickable. */
  hitRadius: number;
  /** Optional torus band (used by asteroid belts so the hollow centre stays clickable. */
  band?: { radius: number; tube: number };
  children?: ReactNode;
}

/**
 * Invisible raycast target bound to an object id.
 * A click (pointer travel ≤ 6 px) selects; a double click focuses.
 * `colorWrite`/`depthWrite` are off so the target never shows up in the frame.
 */
export function Selectable({ id, hitRadius, band, children }: SelectableProps) {
  const select = useAppStore((state) => state.select);
  const focusObject = useAppStore((state) => state.focusObject);
  const setHover = useAppStore((state) => state.setHover);
  const down = useRef<{ x: number; y: number } | null>(null);

  const handleOver = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    setHover(id);
    document.body.style.cursor = 'pointer';
  };

  const handleOut = () => {
    setHover(null);
    document.body.style.cursor = '';
  };

  return (
    <group>
      <mesh
        rotation={band ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          down.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          if (isClick(down.current, { x: event.clientX, y: event.clientY })) select(id);
          down.current = null;
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          focusObject(id);
        }}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        {band ? (
          <torusGeometry args={[band.radius, band.tube, 6, 48]} />
        ) : (
          <sphereGeometry args={[hitRadius, 14, 10]} />
        )}
        <meshBasicMaterial colorWrite={false} depthWrite={false} depthTest={false} />
      </mesh>
      {children}
    </group>
  );
}
