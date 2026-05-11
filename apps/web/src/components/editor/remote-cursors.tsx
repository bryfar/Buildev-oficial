import { useMemo } from 'react';
import { usePresenceStore } from '@/stores/presence-store';
import { useCanvasStore } from '@/stores/canvas-store';
import { MousePointer2 } from 'lucide-react';
import { getSkiaEngineRef } from '@/canvas/skia-engine-ref';

export default function RemoteCursors() {
  const remoteUsersMap = usePresenceStore((s) => s.remoteUsers);
  const remoteUsers = useMemo(() => [...remoteUsersMap.values()], [remoteUsersMap]);
  const { zoom, panX, panY } = useCanvasStore((s) => s.viewport);
  const engine = getSkiaEngineRef();
  const rect = engine?.getCanvasRect();

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {remoteUsers.map((user) => {
        if (user.sceneX === undefined || user.sceneY === undefined || !rect) return null;
        
        // Project scene x/y to viewport clientX/Y
        const x = user.sceneX * zoom + panX + rect.left;
        const y = user.sceneY * zoom + panY + rect.top;

        return (
          <div
            key={user.id}
            className="absolute transition-all duration-75 ease-linear"
            style={{
              left: x,
              top: y,
              color: user.color,
            }}
          >
            <MousePointer2 size={18} fill="currentColor" stroke="white" strokeWidth={1} />
            <div
              className="ml-3 mt-2 rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
