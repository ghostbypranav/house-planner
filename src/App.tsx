import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./index.css";

import Model3D from "./components/Model3D";
import Plan2D from "./components/Plan2D";
import ProjectControls from "./components/ProjectControls";

import {
  detectRooms,
} from "./geometry/roomDetection";

import {
  useHouseStore,
  type FloorId,
  type ToolMode,
} from "./store/houseStore";

import type {
  Door,
  FurnitureItem,
  FurnitureType,
  Measurement,
  Point,
  Stair,
  Wall,
  WindowItem,
} from "./types/house";

type FurniturePreset = {
  label: string;
  width: number;
  depth: number;
  height: number;
};

const FURNITURE_PRESETS: Record<
  FurnitureType,
  FurniturePreset
> = {
  bed: {
    label: "Bed",
    width: 1.8,
    depth: 2,
    height: 0.55,
  },

  sofa: {
    label: "Sofa",
    width: 2.1,
    depth: 0.9,
    height: 0.85,
  },

  dining: {
    label: "Dining Table",
    width: 1.8,
    depth: 1,
    height: 0.75,
  },

  wardrobe: {
    label: "Wardrobe",
    width: 1.5,
    depth: 0.6,
    height: 2.1,
  },

  table: {
    label: "Table",
    width: 1.2,
    depth: 0.7,
    height: 0.75,
  },

  chair: {
    label: "Chair",
    width: 0.5,
    depth: 0.5,
    height: 0.9,
  },
};

const FURNITURE_TYPES =
  Object.keys(
    FURNITURE_PRESETS
  ) as FurnitureType[];

function getDistance(
  start: Point,
  end: Point
) {
  return Math.hypot(
    end.x - start.x,
    end.y - start.y
  );
}

function getWallLength(
  wall: Wall
) {
  return getDistance(
    wall.start,
    wall.end
  );
}

function getStairLength(
  stair: Stair
) {
  return getDistance(
    stair.start,
    stair.end
  );
}

function App() {
  const walls =
    useHouseStore(
      (state) =>
        state.walls
    );

  const doors =
    useHouseStore(
      (state) =>
        state.doors
    );

  const windows =
    useHouseStore(
      (state) =>
        state.windows
    );

  const rooms =
    useHouseStore(
      (state) =>
        state.rooms
    );

  const stairs =
    useHouseStore(
      (state) =>
        state.stairs
    );

  const furniture =
    useHouseStore(
      (state) =>
        state.furniture
    );

  const measurements =
    useHouseStore(
      (state) =>
        state.measurements
    );

  const activeFloorId =
    useHouseStore(
      (state) =>
        state.activeFloorId
    );

  const setActiveFloor =
    useHouseStore(
      (state) =>
        state.setActiveFloor
    );

  const activeTool =
    useHouseStore(
      (state) =>
        state.activeTool
    );

  const setActiveTool =
    useHouseStore(
      (state) =>
        state.setActiveTool
    );

  const activeFurnitureType =
    useHouseStore(
      (state) =>
        state.activeFurnitureType
    );

  const setActiveFurnitureType =
    useHouseStore(
      (state) =>
        state.setActiveFurnitureType
    );

  const selectedWallId =
    useHouseStore(
      (state) =>
        state.selectedWallId
    );

  const selectedDoorId =
    useHouseStore(
      (state) =>
        state.selectedDoorId
    );

  const selectedWindowId =
    useHouseStore(
      (state) =>
        state.selectedWindowId
    );

  const selectedRoomId =
    useHouseStore(
      (state) =>
        state.selectedRoomId
    );

  const selectedStairId =
    useHouseStore(
      (state) =>
        state.selectedStairId
    );

  const selectedFurnitureId =
    useHouseStore(
      (state) =>
        state.selectedFurnitureId
    );

  const selectedMeasurementId =
    useHouseStore(
      (state) =>
        state.selectedMeasurementId
    );

  const clearHouse =
    useHouseStore(
      (state) =>
        state.clearHouse
    );

  const undo =
    useHouseStore(
      (state) =>
        state.undo
    );

  const redo =
    useHouseStore(
      (state) =>
        state.redo
    );

  const canUndo =
    useHouseStore(
      (state) =>
        state.canUndo
    );

  const canRedo =
    useHouseStore(
      (state) =>
        state.canRedo
    );

  useEffect(() => {
    function handleKeyboard(
      event: KeyboardEvent
    ) {
      const target =
        event.target;

      if (
        target instanceof
          HTMLInputElement ||
        target instanceof
          HTMLTextAreaElement ||
        target instanceof
          HTMLSelectElement ||
        (
          target instanceof
            HTMLElement &&
          target.isContentEditable
        )
      ) {
        return;
      }

      const modifier =
        event.ctrlKey ||
        event.metaKey;

      if (!modifier) {
        return;
      }

      const key =
        event.key.toLowerCase();

      if (
        key === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        undo();

        return;
      }

      if (
        key === "y" ||
        (
          key === "z" &&
          event.shiftKey
        )
      ) {
        event.preventDefault();

        redo();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  }, [
    undo,
    redo,
  ]);

  const detectedRooms =
    useMemo(
      () =>
        detectRooms(
          walls
        ),
      [walls]
    );

  const selectedWall =
    walls.find(
      (wall) =>
        wall.id ===
        selectedWallId
    ) ?? null;

  const selectedDoor =
    doors.find(
      (door) =>
        door.id ===
        selectedDoorId
    ) ?? null;

  const selectedWindow =
    windows.find(
      (windowItem) =>
        windowItem.id ===
        selectedWindowId
    ) ?? null;

  const selectedStair =
    stairs.find(
      (stair) =>
        stair.id ===
        selectedStairId
    ) ?? null;

  const selectedFurniture =
    furniture.find(
      (item) =>
        item.id ===
        selectedFurnitureId
    ) ?? null;

  const selectedMeasurement =
    measurements.find(
      (measurement) =>
        measurement.id ===
        selectedMeasurementId
    ) ?? null;

  const selectedDetectedRoom =
    detectedRooms.find(
      (room) =>
        room.id ===
        selectedRoomId
    ) ?? null;

  const selectedSavedRoom =
    rooms.find(
      (room) =>
        room.id ===
        selectedRoomId
    ) ?? null;

  const selectedDoorWall =
    selectedDoor
      ? walls.find(
          (wall) =>
            wall.id ===
            selectedDoor.wallId
        ) ?? null
      : null;

  const selectedWindowWall =
    selectedWindow
      ? walls.find(
          (wall) =>
            wall.id ===
            selectedWindow.wallId
        ) ?? null
      : null;

  function chooseTool(
    tool: ToolMode
  ) {
    setActiveTool(
      tool
    );
  }

  function changeFloor(
    value: string
  ) {
    const floor =
      value as FloorId;

    if (
      floor === "first" &&
      activeTool === "stairs"
    ) {
      setActiveTool(
        "select"
      );
    }

    setActiveFloor(
      floor
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            ⌂
          </div>

          <div>
            <h1>
              House Planner
            </h1>

            <p>
              2D + 3D Home Designer
            </p>
          </div>
        </div>

        <div className="top-actions">
          <button
            type="button"
            disabled={
              !canUndo
            }
            onClick={
              undo
            }
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>

          <button
            type="button"
            disabled={
              !canRedo
            }
            onClick={
              redo
            }
            title="Redo (Ctrl+Y)"
          >
            Redo
          </button>

          <select
            value={
              activeFloorId
            }
            onChange={(
              event
            ) =>
              changeFloor(
                event.target.value
              )
            }
          >
            <option value="ground">
              Ground Floor
            </option>

            <option value="first">
              First Floor
            </option>
          </select>

          <ProjectControls />
        </div>
      </header>

      <div className="tool-bar">
        <ToolButton
          label="Select"
          icon="↖"
          active={
            activeTool ===
            "select"
          }
          onClick={() =>
            chooseTool(
              "select"
            )
          }
        />

        <ToolButton
          label="Wall"
          icon="╱"
          active={
            activeTool ===
            "wall"
          }
          onClick={() =>
            chooseTool(
              "wall"
            )
          }
        />

        <ToolButton
          label="Door"
          icon="▯"
          active={
            activeTool ===
            "door"
          }
          onClick={() =>
            chooseTool(
              "door"
            )
          }
        />

        <ToolButton
          label="Window"
          icon="▭"
          active={
            activeTool ===
            "window"
          }
          onClick={() =>
            chooseTool(
              "window"
            )
          }
        />

        <ToolButton
          label="Room"
          icon="□"
          active={
            activeTool ===
            "room"
          }
          onClick={() =>
            chooseTool(
              "room"
            )
          }
        />

        <ToolButton
          label="Stairs"
          icon="⇧"
          active={
            activeTool ===
            "stairs"
          }
          disabled={
            activeFloorId !==
            "ground"
          }
          onClick={() =>
            chooseTool(
              "stairs"
            )
          }
        />

        <ToolButton
          label="Furniture"
          icon="⌑"
          active={
            activeTool ===
            "furniture"
          }
          onClick={() =>
            chooseTool(
              "furniture"
            )
          }
        />

        {activeTool ===
          "furniture" && (
          <select
            value={
              activeFurnitureType
            }
            onChange={(
              event
            ) =>
              setActiveFurnitureType(
                event.target
                  .value as FurnitureType
              )
            }
            style={{
              height: 38,
              border:
                "1px solid #d7dce2",
              borderRadius: 8,
              background:
                "#ffffff",
              padding:
                "0 10px",
            }}
          >
            {FURNITURE_TYPES.map(
              (type) => (
                <option
                  key={
                    type
                  }
                  value={
                    type
                  }
                >
                  {
                    FURNITURE_PRESETS[
                      type
                    ].label
                  }
                </option>
              )
            )}
          </select>
        )}

        <ToolButton
          label="Measure"
          icon="↔"
          active={
            activeTool ===
            "measure"
          }
          onClick={() =>
            chooseTool(
              "measure"
            )
          }
        />
      </div>

      <main className="workspace">
        <section className="workspace-panel plan-section">
          <div className="section-header">
            <div>
              <h2>
                {activeFloorId ===
                "ground"
                  ? "Ground Floor Plan"
                  : "First Floor Plan"}
              </h2>

              <p>
                {activeTool ===
                "wall"
                  ? "Click and drag to draw walls"
                  : activeTool ===
                      "door"
                    ? "Click a wall to place a door"
                    : activeTool ===
                        "window"
                      ? "Click a wall to place a window"
                      : activeTool ===
                          "room"
                        ? "Click inside a closed room to name it"
                        : activeTool ===
                            "stairs"
                          ? "Drag from the bottom to the top of the staircase"
                          : activeTool ===
                              "furniture"
                            ? `Click the plan to place ${FURNITURE_PRESETS[activeFurnitureType].label}`
                            : activeTool ===
                                "measure"
                              ? "Drag between two points to measure the distance"
                              : "Select an item to edit it"}
              </p>
            </div>

            <span className="status-pill">
              {walls.length} W ·{" "}
              {doors.length} D ·{" "}
              {windows.length} Win ·{" "}
              {detectedRooms.length} R ·{" "}
              {stairs.length} St ·{" "}
              {furniture.length} F ·{" "}
              {measurements.length} M
            </span>
          </div>

          <div className="plan-area">
            <Plan2D />

            {selectedWall && (
              <WallProperties
                wall={
                  selectedWall
                }
              />
            )}

            {selectedDoor &&
              selectedDoorWall && (
                <DoorProperties
                  door={
                    selectedDoor
                  }
                  wall={
                    selectedDoorWall
                  }
                />
              )}

            {selectedWindow &&
              selectedWindowWall && (
                <WindowProperties
                  windowItem={
                    selectedWindow
                  }
                  wall={
                    selectedWindowWall
                  }
                />
              )}

            {selectedDetectedRoom && (
              <RoomProperties
                roomId={
                  selectedDetectedRoom.id
                }
                name={
                  selectedSavedRoom
                    ?.name ??
                  "Room"
                }
                area={
                  selectedDetectedRoom.area
                }
                wallCount={
                  selectedDetectedRoom
                    .wallIds
                    .length
                }
              />
            )}

            {selectedStair && (
              <StairProperties
                stair={
                  selectedStair
                }
              />
            )}

            {selectedFurniture && (
              <FurnitureProperties
                item={
                  selectedFurniture
                }
              />
            )}

            {selectedMeasurement && (
              <MeasurementProperties
                measurement={
                  selectedMeasurement
                }
              />
            )}
          </div>
        </section>

        <section className="workspace-panel model-section">
          <div className="section-header">
            <div>
              <h2>
                3D Model
              </h2>

              <p>
                Full building live preview
              </p>
            </div>

            <div className="model-actions">
              <button
                type="button"
                className="clear-button"
                onClick={
                  clearHouse
                }
                disabled={
                  walls.length === 0 &&
                  doors.length === 0 &&
                  windows.length === 0 &&
                  stairs.length === 0 &&
                  furniture.length === 0 &&
                  measurements.length === 0
                }
              >
                Clear Floor
              </button>

              <span className="status-pill live">
                <span className="live-dot" />
                Live
              </span>
            </div>
          </div>

          <div className="model-area">
            <Model3D />
          </div>
        </section>
      </main>
    </div>
  );
}

function ToolButton({
  label,
  icon,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`tool ${
        active
          ? "active"
          : ""
      }`}
      disabled={
        disabled
      }
      onClick={
        onClick
      }
    >
      <span>
        {icon}
      </span>

      {label}
    </button>
  );
}

function PropertyHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="properties-heading">
      <div>
        <strong>
          {title}
        </strong>

        <span>
          {subtitle}
        </span>
      </div>

      <span className="selected-label">
        Selected
      </span>
    </div>
  );
}

function WallProperties({
  wall,
}: {
  wall: Wall;
}) {
  const updateWall =
    useHouseStore(
      (state) =>
        state.updateWall
    );

  const removeWall =
    useHouseStore(
      (state) =>
        state.removeWall
    );

  const [
    length,
    setLength,
  ] =
    useState(
      getWallLength(
        wall
      ).toFixed(2)
    );

  const [
    thickness,
    setThickness,
  ] =
    useState(
      (
        wall.thickness *
        100
      ).toFixed(0)
    );

  const [
    height,
    setHeight,
  ] =
    useState(
      wall.height.toFixed(
        2
      )
    );

  useEffect(() => {
    setLength(
      getWallLength(
        wall
      ).toFixed(2)
    );

    setThickness(
      (
        wall.thickness *
        100
      ).toFixed(0)
    );

    setHeight(
      wall.height.toFixed(
        2
      )
    );
  }, [wall]);

  function applyLength() {
    const value =
      Number(length);

    const current =
      getWallLength(
        wall
      );

    if (
      !Number.isFinite(
        value
      ) ||
      value < 0.5 ||
      current <= 0
    ) {
      setLength(
        current.toFixed(
          2
        )
      );

      return;
    }

    const dx =
      (
        wall.end.x -
        wall.start.x
      ) /
      current;

    const dy =
      (
        wall.end.y -
        wall.start.y
      ) /
      current;

    updateWall(
      wall.id,
      {
        end: {
          x:
            wall.start.x +
            dx * value,

          y:
            wall.start.y +
            dy * value,
        },
      }
    );
  }

  return (
    <aside className="properties-panel">
      <PropertyHeader
        title="Wall"
        subtitle="Properties"
      />

      <PropertyInput
        label="Length"
        value={
          length
        }
        unit="m"
        onChange={
          setLength
        }
        onApply={
          applyLength
        }
      />

      <PropertyInput
        label="Thickness"
        value={
          thickness
        }
        unit="cm"
        onChange={
          setThickness
        }
        onApply={() => {
          const value =
            Number(
              thickness
            );

          if (
            Number.isFinite(
              value
            ) &&
            value >= 5 &&
            value <= 60
          ) {
            updateWall(
              wall.id,
              {
                thickness:
                  value /
                  100,
              }
            );
          }
        }}
      />

      <PropertyInput
        label="Height"
        value={
          height
        }
        unit="m"
        onChange={
          setHeight
        }
        onApply={() => {
          const value =
            Number(
              height
            );

          if (
            Number.isFinite(
              value
            ) &&
            value >= 1 &&
            value <= 10
          ) {
            updateWall(
              wall.id,
              {
                height:
                  value,
              }
            );
          }
        }}
      />

      <DeleteButton
        label="Delete Wall"
        onClick={() =>
          removeWall(
            wall.id
          )
        }
      />
    </aside>
  );
}

function DoorProperties({
  door,
  wall,
}: {
  door: Door;
  wall: Wall;
}) {
  const updateDoor =
    useHouseStore(
      (state) =>
        state.updateDoor
    );

  const removeDoor =
    useHouseStore(
      (state) =>
        state.removeDoor
    );

  const [
    width,
    setWidth,
  ] =
    useState(
      door.width.toFixed(
        2
      )
    );

  const [
    height,
    setHeight,
  ] =
    useState(
      door.height.toFixed(
        2
      )
    );

  useEffect(() => {
    setWidth(
      door.width.toFixed(
        2
      )
    );

    setHeight(
      door.height.toFixed(
        2
      )
    );
  }, [door]);

  return (
    <aside className="properties-panel">
      <PropertyHeader
        title="Door"
        subtitle="Properties"
      />

      <PropertyInput
        label="Width"
        value={
          width
        }
        unit="m"
        onChange={
          setWidth
        }
        onApply={() => {
          const value =
            Number(
              width
            );

          if (
            Number.isFinite(
              value
            ) &&
            value >= 0.5 &&
            value <
              getWallLength(
                wall
              )
          ) {
            updateDoor(
              door.id,
              {
                width:
                  value,
              }
            );
          }
        }}
      />

      <PropertyInput
        label="Height"
        value={
          height
        }
        unit="m"
        onChange={
          setHeight
        }
        onApply={() => {
          const value =
            Number(
              height
            );

          if (
            Number.isFinite(
              value
            ) &&
            value >= 1.5 &&
            value <
              wall.height
          ) {
            updateDoor(
              door.id,
              {
                height:
                  value,
              }
            );
          }
        }}
      />

      <DeleteButton
        label="Delete Door"
        onClick={() =>
          removeDoor(
            door.id
          )
        }
      />
    </aside>
  );
}

function WindowProperties({
  windowItem,
  wall,
}: {
  windowItem: WindowItem;
  wall: Wall;
}) {
  const updateWindow =
    useHouseStore(
      (state) =>
        state.updateWindow
    );

  const removeWindow =
    useHouseStore(
      (state) =>
        state.removeWindow
    );

  const [
    width,
    setWidth,
  ] =
    useState(
      windowItem.width.toFixed(
        2
      )
    );

  const [
    height,
    setHeight,
  ] =
    useState(
      windowItem.height.toFixed(
        2
      )
    );

  const [
    sill,
    setSill,
  ] =
    useState(
      windowItem.sillHeight.toFixed(
        2
      )
    );

  useEffect(() => {
    setWidth(
      windowItem.width.toFixed(
        2
      )
    );

    setHeight(
      windowItem.height.toFixed(
        2
      )
    );

    setSill(
      windowItem.sillHeight.toFixed(
        2
      )
    );
  }, [windowItem]);

  function applyWindow() {
    const w =
      Number(width);

    const h =
      Number(height);

    const s =
      Number(sill);

    if (
      Number.isFinite(w) &&
      Number.isFinite(h) &&
      Number.isFinite(s) &&
      w >= 0.4 &&
      w <
        getWallLength(
          wall
        ) &&
      h >= 0.4 &&
      s >= 0 &&
      s + h <
        wall.height
    ) {
      updateWindow(
        windowItem.id,
        {
          width: w,
          height: h,
          sillHeight: s,
        }
      );
    }
  }

  return (
    <aside className="properties-panel">
      <PropertyHeader
        title="Window"
        subtitle="Properties"
      />

      <PropertyInput
        label="Width"
        value={
          width
        }
        unit="m"
        onChange={
          setWidth
        }
        onApply={
          applyWindow
        }
      />

      <PropertyInput
        label="Height"
        value={
          height
        }
        unit="m"
        onChange={
          setHeight
        }
        onApply={
          applyWindow
        }
      />

      <PropertyInput
        label="Sill height"
        value={
          sill
        }
        unit="m"
        onChange={
          setSill
        }
        onApply={
          applyWindow
        }
      />

      <DeleteButton
        label="Delete Window"
        onClick={() =>
          removeWindow(
            windowItem.id
          )
        }
      />
    </aside>
  );
}

function RoomProperties({
  roomId,
  name,
  area,
  wallCount,
}: {
  roomId: string;
  name: string;
  area: number;
  wallCount: number;
}) {
  const setRoomName =
    useHouseStore(
      (state) =>
        state.setRoomName
    );

  const roomTypes = [
    "Room",
    "Living Room",
    "Bedroom",
    "Master Bedroom",
    "Kitchen",
    "Dining",
    "Bathroom",
    "Pooja Room",
    "Study",
    "Utility",
    "Balcony",
  ];

  return (
    <aside className="properties-panel">
      <PropertyHeader
        title="Room"
        subtitle="Properties"
      />

      <label className="property-field">
        <span>
          Room type
        </span>

        <div className="input-with-unit">
          <select
            value={
              name
            }
            onChange={(
              event
            ) =>
              setRoomName(
                roomId,
                event.target.value
              )
            }
            style={{
              width:
                "100%",

              height:
                "100%",

              border:
                0,

              outline:
                0,

              padding:
                "0 9px",

              background:
                "transparent",
            }}
          >
            {roomTypes.map(
              (roomType) => (
                <option
                  key={
                    roomType
                  }
                  value={
                    roomType
                  }
                >
                  {roomType}
                </option>
              )
            )}
          </select>
        </div>
      </label>

      <ReadOnlyProperty
        label="Floor area"
        value={
          area.toFixed(
            2
          )
        }
        unit="m²"
      />

      <ReadOnlyProperty
        label="Boundary walls"
        value={
          wallCount.toString()
        }
        unit="walls"
      />
    </aside>
  );
}

function StairProperties({
  stair,
}: {
  stair: Stair;
}) {
  const updateStair =
    useHouseStore(
      (state) =>
        state.updateStair
    );

  const removeStair =
    useHouseStore(
      (state) =>
        state.removeStair
    );

  const [
    length,
    setLength,
  ] =
    useState(
      getStairLength(
        stair
      ).toFixed(2)
    );

  const [
    width,
    setWidth,
  ] =
    useState(
      stair.width.toFixed(
        2
      )
    );

  const [
    steps,
    setSteps,
  ] =
    useState(
      stair.stepCount.toString()
    );

  useEffect(() => {
    setLength(
      getStairLength(
        stair
      ).toFixed(2)
    );

    setWidth(
      stair.width.toFixed(
        2
      )
    );

    setSteps(
      stair.stepCount.toString()
    );
  }, [stair]);

  return (
    <aside className="properties-panel">
      <PropertyHeader
        title="Stairs"
        subtitle="Ground → First Floor"
      />

      <PropertyInput
        label="Length"
        value={
          length
        }
        unit="m"
        onChange={
          setLength
        }
        onApply={() => {
          const value =
            Number(
              length
            );

          const current =
            getStairLength(
              stair
            );

          if (
            !Number.isFinite(
              value
            ) ||
            value < 1.5 ||
            current <= 0
          ) {
            return;
          }

          const dx =
            (
              stair.end.x -
              stair.start.x
            ) /
            current;

          const dy =
            (
              stair.end.y -
              stair.start.y
            ) /
            current;

          updateStair(
            stair.id,
            {
              end: {
                x:
                  stair.start.x +
                  dx * value,

                y:
                  stair.start.y +
                  dy * value,
              },
            }
          );
        }}
      />

      <PropertyInput
        label="Width"
        value={
          width
        }
        unit="m"
        onChange={
          setWidth
        }
        onApply={() => {
          const value =
            Number(
              width
            );

          if (
            Number.isFinite(
              value
            ) &&
            value >= 0.6 &&
            value <= 3
          ) {
            updateStair(
              stair.id,
              {
                width:
                  value,
              }
            );
          }
        }}
      />

      <PropertyInput
        label="Steps"
        value={
          steps
        }
        unit="steps"
        onChange={
          setSteps
        }
        onApply={() => {
          const value =
            Math.round(
              Number(
                steps
              )
            );

          if (
            Number.isFinite(
              value
            ) &&
            value >= 8 &&
            value <= 30
          ) {
            updateStair(
              stair.id,
              {
                stepCount:
                  value,
              }
            );
          }
        }}
      />

      <DeleteButton
        label="Delete Stairs"
        onClick={() =>
          removeStair(
            stair.id
          )
        }
      />
    </aside>
  );
}

function FurnitureProperties({
  item,
}: {
  item: FurnitureItem;
}) {
  const updateFurniture =
    useHouseStore(
      (state) =>
        state.updateFurniture
    );

  const removeFurniture =
    useHouseStore(
      (state) =>
        state.removeFurniture
    );

  const [
    width,
    setWidth,
  ] =
    useState(
      item.width.toFixed(
        2
      )
    );

  const [
    depth,
    setDepth,
  ] =
    useState(
      item.depth.toFixed(
        2
      )
    );

  const [
    height,
    setHeight,
  ] =
    useState(
      item.height.toFixed(
        2
      )
    );

  const [
    rotation,
    setRotation,
  ] =
    useState(
      item.rotation.toFixed(
        0
      )
    );

  useEffect(() => {
    setWidth(
      item.width.toFixed(
        2
      )
    );

    setDepth(
      item.depth.toFixed(
        2
      )
    );

    setHeight(
      item.height.toFixed(
        2
      )
    );

    setRotation(
      item.rotation.toFixed(
        0
      )
    );
  }, [item]);

  function applyDimensions() {
    const w =
      Number(
        width
      );

    const d =
      Number(
        depth
      );

    const h =
      Number(
        height
      );

    if (
      Number.isFinite(
        w
      ) &&
      Number.isFinite(
        d
      ) &&
      Number.isFinite(
        h
      ) &&
      w >= 0.2 &&
      d >= 0.2 &&
      h >= 0.1
    ) {
      updateFurniture(
        item.id,
        {
          width:
            w,

          depth:
            d,

          height:
            h,
        }
      );
    }
  }

  return (
    <aside className="properties-panel">
      <PropertyHeader
        title={
          FURNITURE_PRESETS[
            item.type
          ].label
        }
        subtitle="Furniture"
      />

      <label className="property-field">
        <span>
          Type
        </span>

        <div className="input-with-unit">
          <select
            value={
              item.type
            }
            onChange={(
              event
            ) => {
              const type =
                event.target
                  .value as FurnitureType;

              const preset =
                FURNITURE_PRESETS[
                  type
                ];

              updateFurniture(
                item.id,
                {
                  type,

                  width:
                    preset.width,

                  depth:
                    preset.depth,

                  height:
                    preset.height,
                }
              );
            }}
            style={{
              width:
                "100%",

              height:
                "100%",

              border:
                0,

              outline:
                0,

              padding:
                "0 9px",

              background:
                "transparent",
            }}
          >
            {FURNITURE_TYPES.map(
              (type) => (
                <option
                  key={
                    type
                  }
                  value={
                    type
                  }
                >
                  {
                    FURNITURE_PRESETS[
                      type
                    ].label
                  }
                </option>
              )
            )}
          </select>
        </div>
      </label>

      <PropertyInput
        label="Width"
        value={
          width
        }
        unit="m"
        onChange={
          setWidth
        }
        onApply={
          applyDimensions
        }
      />

      <PropertyInput
        label="Depth"
        value={
          depth
        }
        unit="m"
        onChange={
          setDepth
        }
        onApply={
          applyDimensions
        }
      />

      <PropertyInput
        label="Height"
        value={
          height
        }
        unit="m"
        onChange={
          setHeight
        }
        onApply={
          applyDimensions
        }
      />

      <PropertyInput
        label="Rotation"
        value={
          rotation
        }
        unit="°"
        onChange={
          setRotation
        }
        onApply={() => {
          const value =
            Number(
              rotation
            );

          if (
            Number.isFinite(
              value
            )
          ) {
            const normalized =
              (
                (
                  value %
                  360
                ) +
                360
              ) %
              360;

            updateFurniture(
              item.id,
              {
                rotation:
                  normalized,
              }
            );

            setRotation(
              normalized.toFixed(
                0
              )
            );
          }
        }}
      />

      <DeleteButton
        label="Delete Furniture"
        onClick={() =>
          removeFurniture(
            item.id
          )
        }
      />
    </aside>
  );
}

function MeasurementProperties({
  measurement,
}: {
  measurement: Measurement;
}) {
  const removeMeasurement =
    useHouseStore(
      (state) =>
        state.removeMeasurement
    );

  const length =
    getDistance(
      measurement.start,
      measurement.end
    );

  return (
    <aside className="properties-panel">
      <PropertyHeader
        title="Measurement"
        subtitle="Dimension"
      />

      <ReadOnlyProperty
        label="Distance"
        value={
          length.toFixed(
            2
          )
        }
        unit="m"
      />

      <DeleteButton
        label="Delete Measurement"
        onClick={() =>
          removeMeasurement(
            measurement.id
          )
        }
      />
    </aside>
  );
}

function PropertyInput({
  label,
  value,
  unit,
  onChange,
  onApply,
}: {
  label: string;
  value: string;
  unit: string;

  onChange: (
    value: string
  ) => void;

  onApply: () => void;
}) {
  return (
    <label className="property-field">
      <span>
        {label}
      </span>

      <div className="input-with-unit">
        <input
          type="number"
          step="0.05"
          value={
            value
          }
          onChange={(
            event
          ) =>
            onChange(
              event.target.value
            )
          }
          onBlur={
            onApply
          }
          onKeyDown={(
            event
          ) => {
            if (
              event.key ===
              "Enter"
            ) {
              event.currentTarget.blur();
            }
          }}
        />

        <span>
          {unit}
        </span>
      </div>
    </label>
  );
}

function ReadOnlyProperty({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <label className="property-field">
      <span>
        {label}
      </span>

      <div className="input-with-unit">
        <input
          readOnly
          value={
            value
          }
        />

        <span>
          {unit}
        </span>
      </div>
    </label>
  );
}

function DeleteButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="delete-wall-button"
      onClick={
        onClick
      }
    >
      {label}
    </button>
  );
}

export default App;