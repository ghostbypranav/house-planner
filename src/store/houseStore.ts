import { create } from "zustand";

import type {
  Door,
  FurnitureItem,
  FurnitureType,
  Measurement,
  Point,
  Room,
  Stair,
  Wall,
  WindowItem,
} from "../types/house";

export type ToolMode =
  | "select"
  | "wall"
  | "door"
  | "window"
  | "room"
  | "stairs"
  | "furniture"
  | "measure";

export type WallEndpoint = "start" | "end";

export type FloorId = "ground" | "first";

export type RoofStyle =
  | "flat"
  | "gable"
  | "hip"
  | "none";

export type MaterialStyle =
  | "white"
  | "cream"
  | "concrete"
  | "brick"
  | "oak"
  | "walnut"
  | "tile"
  | "marble"
  | "terracotta"
  | "charcoal"
  | "sage";

export type MaterialCategory =
  | "wall"
  | "floor"
  | "roof"
  | "door"
  | "furniture";

export type LightingMode =
  | "day"
  | "sunset"
  | "night";

export type BuildingMaterials = {
  wall: MaterialStyle;
  floor: MaterialStyle;
  roof: MaterialStyle;
  door: MaterialStyle;
  furniture: MaterialStyle;
};

type FloorData = {
  walls: Wall[];
  doors: Door[];
  windows: WindowItem[];
  rooms: Room[];
  stairs: Stair[];
  furniture: FurnitureItem[];
  measurements: Measurement[];
};

type HistorySnapshot = {
  floorData: Record<FloorId, FloorData>;
  roofStyle: RoofStyle;
  parapetEnabled: boolean;
  materials: BuildingMaterials;
  lightingMode: LightingMode;
  sunAzimuth: number;
  sunElevation: number;
};

type HouseState = {
  walls: Wall[];
  doors: Door[];
  windows: WindowItem[];
  rooms: Room[];
  stairs: Stair[];
  furniture: FurnitureItem[];
  measurements: Measurement[];

  activeFloorId: FloorId;

  floorData: Record<
    FloorId,
    FloorData
  >;

  activeTool: ToolMode;

  activeFurnitureType:
    FurnitureType;

  roofStyle: RoofStyle;

  parapetEnabled: boolean;

  materials: BuildingMaterials;

  lightingMode: LightingMode;

  sunAzimuth: number;

  sunElevation: number;

  selectedWallId:
    string | null;

  selectedDoorId:
    string | null;

  selectedWindowId:
    string | null;

  selectedRoomId:
    string | null;

  selectedStairId:
    string | null;

  selectedFurnitureId:
    string | null;

  selectedMeasurementId:
    string | null;

  historyPast:
    HistorySnapshot[];

  historyFuture:
    HistorySnapshot[];

  canUndo: boolean;

  canRedo: boolean;

  undo: () => void;

  redo: () => void;

  clearHistory: () => void;

  setActiveFloor: (
    floorId: FloorId
  ) => void;

  setActiveTool: (
    tool: ToolMode
  ) => void;

  setActiveFurnitureType: (
    type: FurnitureType
  ) => void;

  setRoofStyle: (
    style: RoofStyle
  ) => void;

  setParapetEnabled: (
    enabled: boolean
  ) => void;

  setMaterial: (
    category: MaterialCategory,
    material: MaterialStyle
  ) => void;

  setLightingMode: (
    mode: LightingMode
  ) => void;

  setSunAzimuth: (
    value: number
  ) => void;

  setSunElevation: (
    value: number
  ) => void;

  setSelectedWallId: (
    id: string | null
  ) => void;

  setSelectedDoorId: (
    id: string | null
  ) => void;

  setSelectedWindowId: (
    id: string | null
  ) => void;

  setSelectedRoomId: (
    id: string | null
  ) => void;

  setSelectedStairId: (
    id: string | null
  ) => void;

  setSelectedFurnitureId: (
    id: string | null
  ) => void;

  setSelectedMeasurementId: (
    id: string | null
  ) => void;

  addWall: (
    wall: Wall
  ) => void;

  updateWall: (
    id: string,
    updates: Partial<Wall>
  ) => void;

  moveWallEndpoint: (
    wallId: string,
    endpoint: WallEndpoint,
    point: Point
  ) => void;

  removeWall: (
    id: string
  ) => void;

  addDoor: (
    door: Door
  ) => void;

  updateDoor: (
    id: string,
    updates: Partial<Door>
  ) => void;

  removeDoor: (
    id: string
  ) => void;

  addWindow: (
    windowItem: WindowItem
  ) => void;

  updateWindow: (
    id: string,
    updates: Partial<WindowItem>
  ) => void;

  removeWindow: (
    id: string
  ) => void;

  ensureRoom: (
    id: string,
    wallIds: string[]
  ) => void;

  setRoomName: (
    id: string,
    name: string
  ) => void;

  addStair: (
    stair: Stair
  ) => void;

  updateStair: (
    id: string,
    updates: Partial<Stair>
  ) => void;

  removeStair: (
    id: string
  ) => void;

  addFurniture: (
    item: FurnitureItem
  ) => void;

  updateFurniture: (
    id: string,
    updates:
      Partial<FurnitureItem>
  ) => void;

  removeFurniture: (
    id: string
  ) => void;

  addMeasurement: (
    measurement:
      Measurement
  ) => void;

  removeMeasurement: (
    id: string
  ) => void;

  clearHouse: () => void;
};

const MAX_HISTORY = 100;

export const DEFAULT_MATERIALS:
  BuildingMaterials = {
    wall: "white",
    floor: "tile",
    roof: "concrete",
    door: "walnut",
    furniture: "oak",
  };

function createEmptyFloorData():
  FloorData {
  return {
    walls: [],
    doors: [],
    windows: [],
    rooms: [],
    stairs: [],
    furniture: [],
    measurements: [],
  };
}

function pointsEqual(
  a: Point,
  b: Point
) {
  return (
    Math.abs(
      a.x - b.x
    ) < 0.001 &&
    Math.abs(
      a.y - b.y
    ) < 0.001
  );
}

function currentFloor(
  state: HouseState,
  updates:
    Partial<FloorData>
): FloorData {
  return {
    walls:
      updates.walls ??
      state.walls,

    doors:
      updates.doors ??
      state.doors,

    windows:
      updates.windows ??
      state.windows,

    rooms:
      updates.rooms ??
      state.rooms,

    stairs:
      updates.stairs ??
      state.stairs,

    furniture:
      updates.furniture ??
      state.furniture,

    measurements:
      updates.measurements ??
      state.measurements,
  };
}

function syncActiveFloor(
  state: HouseState,
  floor: FloorData
): Partial<HouseState> {
  return {
    walls:
      floor.walls,

    doors:
      floor.doors,

    windows:
      floor.windows,

    rooms:
      floor.rooms,

    stairs:
      floor.stairs,

    furniture:
      floor.furniture,

    measurements:
      floor.measurements,

    floorData: {
      ...state.floorData,

      [state.activeFloorId]:
        floor,
    },
  };
}

function createSnapshot(
  state: HouseState
): HistorySnapshot {
  return {
    floorData:
      state.floorData,

    roofStyle:
      state.roofStyle,

    parapetEnabled:
      state.parapetEnabled,

    materials:
      state.materials,

    lightingMode:
      state.lightingMode,

    sunAzimuth:
      state.sunAzimuth,

    sunElevation:
      state.sunElevation,
  };
}

function createHistoryPast(
  state: HouseState
) {
  return [
    ...state.historyPast.slice(
      -(MAX_HISTORY - 1)
    ),

    createSnapshot(
      state
    ),
  ];
}

function commitFloorChange(
  state: HouseState,
  floor: FloorData,
  extra:
    Partial<HouseState> = {}
): Partial<HouseState> {
  return {
    ...syncActiveFloor(
      state,
      floor
    ),

    ...extra,

    historyPast:
      createHistoryPast(
        state
      ),

    historyFuture: [],

    canUndo: true,

    canRedo: false,
  };
}

function commitGlobalChange(
  state: HouseState,
  updates:
    Partial<HouseState>
): Partial<HouseState> {
  return {
    ...updates,

    historyPast:
      createHistoryPast(
        state
      ),

    historyFuture: [],

    canUndo: true,

    canRedo: false,
  };
}

function restoreSnapshot(
  state: HouseState,
  snapshot:
    HistorySnapshot
): Partial<HouseState> {
  const activeFloor =
    snapshot.floorData[
      state.activeFloorId
    ];

  return {
    floorData:
      snapshot.floorData,

    walls:
      activeFloor.walls,

    doors:
      activeFloor.doors,

    windows:
      activeFloor.windows,

    rooms:
      activeFloor.rooms,

    stairs:
      activeFloor.stairs,

    furniture:
      activeFloor.furniture,

    measurements:
      activeFloor.measurements,

    roofStyle:
      snapshot.roofStyle,

    parapetEnabled:
      snapshot.parapetEnabled,

    materials:
      snapshot.materials,

    lightingMode:
      snapshot.lightingMode,

    sunAzimuth:
      snapshot.sunAzimuth,

    sunElevation:
      snapshot.sunElevation,

    selectedWallId: null,
    selectedDoorId: null,
    selectedWindowId: null,
    selectedRoomId: null,
    selectedStairId: null,
    selectedFurnitureId: null,
    selectedMeasurementId: null,
  };
}

function normalizeAngle(
  value: number
) {
  return (
    (
      value %
      360
    ) +
    360
  ) %
  360;
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

const groundFloor =
  createEmptyFloorData();

const firstFloor =
  createEmptyFloorData();

export const useHouseStore =
  create<HouseState>(
    (set) => ({
      walls:
        groundFloor.walls,

      doors:
        groundFloor.doors,

      windows:
        groundFloor.windows,

      rooms:
        groundFloor.rooms,

      stairs:
        groundFloor.stairs,

      furniture:
        groundFloor.furniture,

      measurements:
        groundFloor.measurements,

      activeFloorId:
        "ground",

      floorData: {
        ground:
          groundFloor,

        first:
          firstFloor,
      },

      activeTool:
        "wall",

      activeFurnitureType:
        "sofa",

      roofStyle:
        "flat",

      parapetEnabled:
        true,

      materials: {
        ...DEFAULT_MATERIALS,
      },

      lightingMode:
        "day",

      sunAzimuth:
        315,

      sunElevation:
        50,

      selectedWallId:
        null,

      selectedDoorId:
        null,

      selectedWindowId:
        null,

      selectedRoomId:
        null,

      selectedStairId:
        null,

      selectedFurnitureId:
        null,

      selectedMeasurementId:
        null,

      historyPast: [],

      historyFuture: [],

      canUndo:
        false,

      canRedo:
        false,

      undo: () =>
        set(
          (state) => {
            if (
              state.historyPast.length ===
              0
            ) {
              return {};
            }

            const previous =
              state.historyPast[
                state.historyPast.length -
                  1
              ];

            const current =
              createSnapshot(
                state
              );

            const nextPast =
              state.historyPast.slice(
                0,
                -1
              );

            const nextFuture = [
              current,
              ...state.historyFuture,
            ].slice(
              0,
              MAX_HISTORY
            );

            return {
              ...restoreSnapshot(
                state,
                previous
              ),

              historyPast:
                nextPast,

              historyFuture:
                nextFuture,

              canUndo:
                nextPast.length >
                0,

              canRedo:
                nextFuture.length >
                0,
            };
          }
        ),

      redo: () =>
        set(
          (state) => {
            if (
              state.historyFuture.length ===
              0
            ) {
              return {};
            }

            const next =
              state.historyFuture[
                0
              ];

            const current =
              createSnapshot(
                state
              );

            const nextPast = [
              ...state.historyPast,
              current,
            ].slice(
              -MAX_HISTORY
            );

            const nextFuture =
              state.historyFuture.slice(
                1
              );

            return {
              ...restoreSnapshot(
                state,
                next
              ),

              historyPast:
                nextPast,

              historyFuture:
                nextFuture,

              canUndo:
                nextPast.length >
                0,

              canRedo:
                nextFuture.length >
                0,
            };
          }
        ),

      clearHistory: () =>
        set({
          historyPast: [],
          historyFuture: [],
          canUndo: false,
          canRedo: false,
        }),

      setActiveFloor:
        (floorId) =>
          set(
            (state) => {
              if (
                state.activeFloorId ===
                floorId
              ) {
                return {};
              }

              const target =
                state.floorData[
                  floorId
                ];

              return {
                activeFloorId:
                  floorId,

                walls:
                  target.walls,

                doors:
                  target.doors,

                windows:
                  target.windows,

                rooms:
                  target.rooms,

                stairs:
                  target.stairs,

                furniture:
                  target.furniture,

                measurements:
                  target.measurements,

                selectedWallId:
                  null,

                selectedDoorId:
                  null,

                selectedWindowId:
                  null,

                selectedRoomId:
                  null,

                selectedStairId:
                  null,

                selectedFurnitureId:
                  null,

                selectedMeasurementId:
                  null,
              };
            }
          ),

      setActiveTool:
        (tool) =>
          set({
            activeTool:
              tool,

            selectedWallId:
              null,

            selectedDoorId:
              null,

            selectedWindowId:
              null,

            selectedRoomId:
              null,

            selectedStairId:
              null,

            selectedFurnitureId:
              null,

            selectedMeasurementId:
              null,
          }),

      setActiveFurnitureType:
        (type) =>
          set({
            activeFurnitureType:
              type,
          }),

      setRoofStyle:
        (style) =>
          set(
            (state) => {
              if (
                state.roofStyle ===
                style
              ) {
                return {};
              }

              return commitGlobalChange(
                state,
                {
                  roofStyle:
                    style,
                }
              );
            }
          ),

      setParapetEnabled:
        (enabled) =>
          set(
            (state) => {
              if (
                state.parapetEnabled ===
                enabled
              ) {
                return {};
              }

              return commitGlobalChange(
                state,
                {
                  parapetEnabled:
                    enabled,
                }
              );
            }
          ),

      setMaterial:
        (
          category,
          material
        ) =>
          set(
            (state) => {
              if (
                state.materials[
                  category
                ] ===
                material
              ) {
                return {};
              }

              return commitGlobalChange(
                state,
                {
                  materials: {
                    ...state.materials,

                    [category]:
                      material,
                  },
                }
              );
            }
          ),

      setLightingMode:
        (mode) =>
          set(
            (state) => {
              if (
                state.lightingMode ===
                mode
              ) {
                return {};
              }

              return commitGlobalChange(
                state,
                {
                  lightingMode:
                    mode,
                }
              );
            }
          ),

      setSunAzimuth:
        (value) =>
          set(
            (state) => {
              const next =
                normalizeAngle(
                  value
                );

              if (
                Math.abs(
                  state.sunAzimuth -
                    next
                ) <
                0.001
              ) {
                return {};
              }

              return commitGlobalChange(
                state,
                {
                  sunAzimuth:
                    next,
                }
              );
            }
          ),

      setSunElevation:
        (value) =>
          set(
            (state) => {
              const next =
                clamp(
                  value,
                  5,
                  85
                );

              if (
                Math.abs(
                  state.sunElevation -
                    next
                ) <
                0.001
              ) {
                return {};
              }

              return commitGlobalChange(
                state,
                {
                  sunElevation:
                    next,
                }
              );
            }
          ),

      setSelectedWallId:
        (id) =>
          set({
            selectedWallId:
              id,

            selectedDoorId:
              null,

            selectedWindowId:
              null,

            selectedRoomId:
              null,

            selectedStairId:
              null,

            selectedFurnitureId:
              null,

            selectedMeasurementId:
              null,
          }),

      setSelectedDoorId:
        (id) =>
          set({
            selectedDoorId:
              id,

            selectedWallId:
              null,

            selectedWindowId:
              null,

            selectedRoomId:
              null,

            selectedStairId:
              null,

            selectedFurnitureId:
              null,

            selectedMeasurementId:
              null,
          }),

      setSelectedWindowId:
        (id) =>
          set({
            selectedWindowId:
              id,

            selectedWallId:
              null,

            selectedDoorId:
              null,

            selectedRoomId:
              null,

            selectedStairId:
              null,

            selectedFurnitureId:
              null,

            selectedMeasurementId:
              null,
          }),

      setSelectedRoomId:
        (id) =>
          set({
            selectedRoomId:
              id,

            selectedWallId:
              null,

            selectedDoorId:
              null,

            selectedWindowId:
              null,

            selectedStairId:
              null,

            selectedFurnitureId:
              null,

            selectedMeasurementId:
              null,
          }),

      setSelectedStairId:
        (id) =>
          set({
            selectedStairId:
              id,

            selectedWallId:
              null,

            selectedDoorId:
              null,

            selectedWindowId:
              null,

            selectedRoomId:
              null,

            selectedFurnitureId:
              null,

            selectedMeasurementId:
              null,
          }),

      setSelectedFurnitureId:
        (id) =>
          set({
            selectedFurnitureId:
              id,

            selectedWallId:
              null,

            selectedDoorId:
              null,

            selectedWindowId:
              null,

            selectedRoomId:
              null,

            selectedStairId:
              null,

            selectedMeasurementId:
              null,
          }),

      setSelectedMeasurementId:
        (id) =>
          set({
            selectedMeasurementId:
              id,

            selectedWallId:
              null,

            selectedDoorId:
              null,

            selectedWindowId:
              null,

            selectedRoomId:
              null,

            selectedStairId:
              null,

            selectedFurnitureId:
              null,
          }),

      addWall:
        (wall) =>
          set(
            (state) =>
              commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    walls: [
                      ...state.walls,
                      wall,
                    ],
                  }
                )
              )
          ),

      updateWall:
        (
          id,
          updates
        ) =>
          set(
            (state) => {
              if (
                !state.walls.some(
                  (wall) =>
                    wall.id ===
                    id
                )
              ) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    walls:
                      state.walls.map(
                        (wall) =>
                          wall.id ===
                          id
                            ? {
                                ...wall,
                                ...updates,
                              }
                            : wall
                      ),
                  }
                )
              );
            }
          ),

      moveWallEndpoint:
        (
          wallId,
          endpoint,
          point
        ) =>
          set(
            (state) => {
              const target =
                state.walls.find(
                  (wall) =>
                    wall.id ===
                    wallId
                );

              if (!target) {
                return {};
              }

              const oldPoint =
                endpoint ===
                "start"
                  ? target.start
                  : target.end;

              const nextWalls =
                state.walls.map(
                  (wall) => {
                    let start =
                      wall.start;

                    let end =
                      wall.end;

                    if (
                      pointsEqual(
                        wall.start,
                        oldPoint
                      )
                    ) {
                      start = {
                        ...point,
                      };
                    }

                    if (
                      pointsEqual(
                        wall.end,
                        oldPoint
                      )
                    ) {
                      end = {
                        ...point,
                      };
                    }

                    return {
                      ...wall,
                      start,
                      end,
                    };
                  }
                );

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    walls:
                      nextWalls,
                  }
                )
              );
            }
          ),

      removeWall:
        (id) =>
          set(
            (state) => {
              if (
                !state.walls.some(
                  (wall) =>
                    wall.id ===
                    id
                )
              ) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    walls:
                      state.walls.filter(
                        (wall) =>
                          wall.id !==
                          id
                      ),

                    doors:
                      state.doors.filter(
                        (door) =>
                          door.wallId !==
                          id
                      ),

                    windows:
                      state.windows.filter(
                        (
                          windowItem
                        ) =>
                          windowItem.wallId !==
                          id
                      ),

                    rooms:
                      state.rooms.filter(
                        (room) =>
                          !room.wallIds.includes(
                            id
                          )
                      ),
                  }
                ),

                {
                  selectedWallId:
                    null,

                  selectedDoorId:
                    null,

                  selectedWindowId:
                    null,

                  selectedRoomId:
                    null,
                }
              );
            }
          ),

      addDoor:
        (door) =>
          set(
            (state) =>
              commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    doors: [
                      ...state.doors,
                      door,
                    ],
                  }
                )
              )
          ),

      updateDoor:
        (
          id,
          updates
        ) =>
          set(
            (state) => {
              if (
                !state.doors.some(
                  (door) =>
                    door.id ===
                    id
                )
              ) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    doors:
                      state.doors.map(
                        (door) =>
                          door.id ===
                          id
                            ? {
                                ...door,
                                ...updates,
                              }
                            : door
                      ),
                  }
                )
              );
            }
          ),

      removeDoor:
        (id) =>
          set(
            (state) => {
              if (
                !state.doors.some(
                  (door) =>
                    door.id ===
                    id
                )
              ) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    doors:
                      state.doors.filter(
                        (door) =>
                          door.id !==
                          id
                      ),
                  }
                ),

                {
                  selectedDoorId:
                    null,
                }
              );
            }
          ),

      addWindow:
        (windowItem) =>
          set(
            (state) =>
              commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    windows: [
                      ...state.windows,
                      windowItem,
                    ],
                  }
                )
              )
          ),

      updateWindow:
        (
          id,
          updates
        ) =>
          set(
            (state) => {
              if (
                !state.windows.some(
                  (
                    windowItem
                  ) =>
                    windowItem.id ===
                    id
                )
              ) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    windows:
                      state.windows.map(
                        (
                          windowItem
                        ) =>
                          windowItem.id ===
                          id
                            ? {
                                ...windowItem,
                                ...updates,
                              }
                            : windowItem
                      ),
                  }
                )
              );
            }
          ),

      removeWindow:
        (id) =>
          set(
            (state) => {
              if (
                !state.windows.some(
                  (
                    windowItem
                  ) =>
                    windowItem.id ===
                    id
                )
              ) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    windows:
                      state.windows.filter(
                        (
                          windowItem
                        ) =>
                          windowItem.id !==
                          id
                      ),
                  }
                ),

                {
                  selectedWindowId:
                    null,
                }
              );
            }
          ),

      ensureRoom:
        (
          id,
          wallIds
        ) =>
          set(
            (state) => {
              const exists =
                state.rooms.some(
                  (room) =>
                    room.id ===
                    id
                );

              if (exists) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    rooms: [
                      ...state.rooms,

                      {
                        id,
                        wallIds,
                        name:
                          "Room",
                      },
                    ],
                  }
                )
              );
            }
          ),

      setRoomName:
        (
          id,
          name
        ) =>
          set(
            (state) => {
              const room =
                state.rooms.find(
                  (item) =>
                    item.id ===
                    id
                );

              if (
                !room ||
                room.name ===
                  name
              ) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    rooms:
                      state.rooms.map(
                        (item) =>
                          item.id ===
                          id
                            ? {
                                ...item,
                                name,
                              }
                            : item
                      ),
                  }
                )
              );
            }
          ),

      addStair:
        (stair) =>
          set(
            (state) =>
              commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    stairs: [
                      ...state.stairs,
                      stair,
                    ],
                  }
                )
              )
          ),

      updateStair:
        (
          id,
          updates
        ) =>
          set(
            (state) => {
              if (
                !state.stairs.some(
                  (stair) =>
                    stair.id ===
                    id
                )
              ) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    stairs:
                      state.stairs.map(
                        (stair) =>
                          stair.id ===
                          id
                            ? {
                                ...stair,
                                ...updates,
                              }
                            : stair
                      ),
                  }
                )
              );
            }
          ),

      removeStair:
        (id) =>
          set(
            (state) => {
              if (
                !state.stairs.some(
                  (stair) =>
                    stair.id ===
                    id
                )
              ) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    stairs:
                      state.stairs.filter(
                        (stair) =>
                          stair.id !==
                          id
                      ),
                  }
                ),

                {
                  selectedStairId:
                    null,
                }
              );
            }
          ),

      addFurniture:
        (item) =>
          set(
            (state) =>
              commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    furniture: [
                      ...state.furniture,
                      item,
                    ],
                  }
                )
              )
          ),

      updateFurniture:
        (
          id,
          updates
        ) =>
          set(
            (state) => {
              if (
                !state.furniture.some(
                  (item) =>
                    item.id ===
                    id
                )
              ) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    furniture:
                      state.furniture.map(
                        (item) =>
                          item.id ===
                          id
                            ? {
                                ...item,
                                ...updates,
                              }
                            : item
                      ),
                  }
                )
              );
            }
          ),

      removeFurniture:
        (id) =>
          set(
            (state) => {
              if (
                !state.furniture.some(
                  (item) =>
                    item.id ===
                    id
                )
              ) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    furniture:
                      state.furniture.filter(
                        (item) =>
                          item.id !==
                          id
                      ),
                  }
                ),

                {
                  selectedFurnitureId:
                    null,
                }
              );
            }
          ),

      addMeasurement:
        (measurement) =>
          set(
            (state) =>
              commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    measurements: [
                      ...state.measurements,
                      measurement,
                    ],
                  }
                )
              )
          ),

      removeMeasurement:
        (id) =>
          set(
            (state) => {
              if (
                !state.measurements.some(
                  (
                    measurement
                  ) =>
                    measurement.id ===
                    id
                )
              ) {
                return {};
              }

              return commitFloorChange(
                state,

                currentFloor(
                  state,
                  {
                    measurements:
                      state.measurements.filter(
                        (
                          measurement
                        ) =>
                          measurement.id !==
                          id
                      ),
                  }
                ),

                {
                  selectedMeasurementId:
                    null,
                }
              );
            }
          ),

      clearHouse: () =>
        set(
          (state) => {
            const hasContent =
              state.walls.length >
                0 ||
              state.doors.length >
                0 ||
              state.windows.length >
                0 ||
              state.rooms.length >
                0 ||
              state.stairs.length >
                0 ||
              state.furniture.length >
                0 ||
              state.measurements.length >
                0;

            if (
              !hasContent
            ) {
              return {};
            }

            return commitFloorChange(
              state,

              createEmptyFloorData(),

              {
                selectedWallId:
                  null,

                selectedDoorId:
                  null,

                selectedWindowId:
                  null,

                selectedRoomId:
                  null,

                selectedStairId:
                  null,

                selectedFurnitureId:
                  null,

                selectedMeasurementId:
                  null,
              }
            );
          }
        ),
    })
  );