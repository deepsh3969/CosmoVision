import { cameraCommands } from '../scene/CameraRig';
import { useAppStore } from '../store/useAppStore';

/** Camera buttons talk to the render loop through `cameraCommands` — no React re-renders. */
export function NavControls() {
  const goBack = useAppStore((state) => state.goBack);
  const goHome = useAppStore((state) => state.goHome);
  const exitFocus = useAppStore((state) => state.exitFocus);
  const focusedId = useAppStore((state) => state.focusedId);

  return (
    <div className="nav-controls" role="group" aria-label="Camera and navigation">
      <button type="button" onClick={goBack} title="Back (Backspace)">
        ← Back
      </button>
      <button type="button" onClick={goHome} title="Home view (Home)">
        Home
      </button>
      {focusedId && (
        <button type="button" onClick={exitFocus} title="Exit focus (Esc)">
          Exit focus
        </button>
      )}
      <button type="button" onClick={() => cameraCommands.zoom(-1)} title="Zoom in (+)">
        ＋
      </button>
      <button type="button" onClick={() => cameraCommands.zoom(1)} title="Zoom out (−)">
        －
      </button>
      <button type="button" onClick={() => cameraCommands.reset()} title="Reset camera (R)">
        ⟲
      </button>
    </div>
  );
}
