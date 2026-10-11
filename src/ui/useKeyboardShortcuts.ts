import { useEffect } from 'react';

import { cameraCommands } from '../scene/CameraRig';
import { useAppStore } from '../store/useAppStore';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Global keyboard shortcuts. All keys are documented in the help dialog and on
 * the search overlay; nothing here shadows browser accessibility basics.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const store = useAppStore.getState();

      if (event.key === 'Escape') {
        if (store.searchOpen) {
          store.setSearchOpen(false);
          return;
        }
        if (store.helpOpen) {
          store.setHelp(false);
          return;
        }
        if (store.settingsOpen) {
          useAppStore.setState({ settingsOpen: false });
          return;
        }
        if (store.activePanel) {
          store.closePanel();
          return;
        }
        if (store.focusedId) {
          store.exitFocus();
        }
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (event.key === '/' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        store.setSearchOpen(true);
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        store.togglePlay();
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        store.goHome();
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        store.goBack();
        return;
      }

      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        store.setHelp(!store.helpOpen);
        return;
      }

      if (event.key === '+' || event.key === '=') {
        cameraCommands.zoom(-1);
        return;
      }

      if (event.key === '-' || event.key === '_') {
        cameraCommands.zoom(1);
        return;
      }

      if (event.key.toLowerCase() === 'r') {
        cameraCommands.reset();
        return;
      }

      if (event.key.toLowerCase() === 'l') {
        store.setLabels(!store.labels);
        return;
      }

      if (event.key.toLowerCase() === 't') {
        store.setTrails(!store.trails);
        return;
      }

      const ORBIT_STEP = 28;
      if (event.key === 'ArrowLeft') {
        cameraCommands.orbit(-ORBIT_STEP, 0);
      } else if (event.key === 'ArrowRight') {
        cameraCommands.orbit(ORBIT_STEP, 0);
      } else if (event.key === 'ArrowUp') {
        cameraCommands.tilt(-ORBIT_STEP);
      } else if (event.key === 'ArrowDown') {
        cameraCommands.tilt(ORBIT_STEP);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
