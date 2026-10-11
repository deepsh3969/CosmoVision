import { Html } from '@react-three/drei';
import { useAppStore } from '../store/useAppStore';

export function ObjectLabel({ id, name, small = false }: { id: string; name: string; small?: boolean }) {
  const active = useAppStore(
    (state) => state.selectedId === id || state.focusedId === id || state.hoveredId === id,
  );
  return (
    <Html center zIndexRange={[8, 0]} style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <div className={`obj-label${active ? ' is-active' : ''}${small ? ' is-small' : ''}`}>{name}</div>
    </Html>
  );
}
