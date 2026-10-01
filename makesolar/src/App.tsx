import { useState } from "react";
import SolarScene from "./scene/SolarScene";
import type { RoofParams } from "./types/roof";
import { computePanelLayout } from "./geometry/panelLayout";
import { computeBlockLayout } from "./geometry/blockLayout";

const PANEL_GAP = 0.025;  // проміжок між панелями, м
const EDGE_MARGIN = 0.3;  // відступ від панелей до країв даху, м

const layout = computePanelLayout({
  roofWidth: 10,
  roofLength: 6,
  panelWidth: 1.1,
  panelHeight: 1.7,
  gap: PANEL_GAP,
  margin: EDGE_MARGIN,
});
console.log("всього:", layout.total, "колонок:", layout.cols, "рядів:", layout.rows);
console.log("перша:", layout.placements[0]);
console.log("остання:", layout.placements[layout.placements.length - 1]);

const blocks = computeBlockLayout({
  layout,
  panelWidth: 1.1,
  panelHeight: 1.7,
  blockLength: 0.3,
  endInsetRatio: 0.25,
  edgeOverhang: 0.03,
});
console.log("блоків:", blocks.length);
console.log("перший:", blocks[0]);
console.log("останній:", blocks[blocks.length - 1]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function App() {
  const [tilt, setTilt] = useState(30);

  const roof: RoofParams = { width: 10, length: 6, tilt };

  return (
    <div className="app">
      <h1>MakeSOLAR</h1>
      <label>
        Нахил даху (°):{" "}
        <input
          type="number"
          min={0}
          max={90}
          value={tilt}
          onChange={(e) => setTilt(clamp(Number(e.target.value), 0, 90))}
        />
      </label>
      <p>Поточний нахил: {tilt}°</p>

      <div style={{ height: 500 }}>
        <SolarScene roof={roof} />
      </div>
    </div>
  );
}

export default App;