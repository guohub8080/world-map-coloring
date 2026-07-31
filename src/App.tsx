import { useIsMobile } from "./hooks/useIsMobile";
import Ribbon from "./components/Ribbon";
import WorldMap from "./components/WorldMap";
import Sidebar from "./components/Sidebar";
import MobileChrome from "./components/MobileChrome";

export default function App() {
  const isMobile = useIsMobile();

  if (isMobile) {
    // 移动端：全屏地图 + 底部色板/标签栏（MobileChrome）
    return (
      <div className="h-dvh w-screen relative overflow-hidden">
        <WorldMap />
        <MobileChrome />
      </div>
    );
  }

  return (
    <div className="h-dvh w-screen flex flex-col bg-muted/30 overflow-hidden">
      <Ribbon />
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <WorldMap />
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
