import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  DEFAULT_MATERIALS,
  useHouseStore,
  type BuildingMaterials,
  type FloorId,
  type LightingMode,
  type MaterialStyle,
  type RoofStyle,
} from "../store/houseStore";

import type {
  Door,
  FurnitureItem,
  FurnitureType,
  Measurement,
  Room,
  Stair,
  Wall,
  WindowItem,
} from "../types/house";

const AUTOSAVE_KEY =
  "house-planner-autosave-v1";

type SavedFloor = {
  walls: Wall[];
  doors: Door[];
  windows: WindowItem[];
  rooms: Room[];
  stairs: Stair[];
  furniture: FurnitureItem[];
  measurements: Measurement[];
};

type SavedProject = {
  version: 3;
  savedAt: string;

  activeFloorId: FloorId;

  activeFurnitureType: FurnitureType;

  roofStyle: RoofStyle;

  parapetEnabled: boolean;

  materials: BuildingMaterials;

  lightingMode: LightingMode;

  sunAzimuth: number;

  sunElevation: number;

  floorData: {
    ground: SavedFloor;
    first: SavedFloor;
  };
};

function emptyFloor(): SavedFloor {
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

function safeArray<T>(
  value: unknown
): T[] {
  return Array.isArray(value)
    ? (value as T[])
    : [];
}

function normalizeFloor(
  value: unknown
): SavedFloor {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return emptyFloor();
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  return {
    walls:
      safeArray<Wall>(
        source.walls
      ),

    doors:
      safeArray<Door>(
        source.doors
      ),

    windows:
      safeArray<WindowItem>(
        source.windows
      ),

    rooms:
      safeArray<Room>(
        source.rooms
      ),

    stairs:
      safeArray<Stair>(
        source.stairs
      ),

    furniture:
      safeArray<FurnitureItem>(
        source.furniture
      ),

    measurements:
      safeArray<Measurement>(
        source.measurements
      ),
  };
}

function normalizeFurnitureType(
  value: unknown
): FurnitureType {
  const allowed:
    FurnitureType[] = [
      "bed",
      "sofa",
      "dining",
      "wardrobe",
      "table",
      "chair",
    ];

  if (
    typeof value ===
      "string" &&
    allowed.includes(
      value as FurnitureType
    )
  ) {
    return value as FurnitureType;
  }

  return "sofa";
}

function normalizeRoofStyle(
  value: unknown
): RoofStyle {
  const allowed:
    RoofStyle[] = [
      "flat",
      "gable",
      "hip",
      "none",
    ];

  if (
    typeof value ===
      "string" &&
    allowed.includes(
      value as RoofStyle
    )
  ) {
    return value as RoofStyle;
  }

  return "flat";
}

function normalizeLightingMode(
  value: unknown
): LightingMode {
  if (
    value === "day" ||
    value === "sunset" ||
    value === "night"
  ) {
    return value;
  }

  return "day";
}

function normalizeMaterial(
  value: unknown,
  fallback: MaterialStyle
): MaterialStyle {
  const allowed:
    MaterialStyle[] = [
      "white",
      "cream",
      "concrete",
      "brick",
      "oak",
      "walnut",
      "tile",
      "marble",
      "terracotta",
      "charcoal",
      "sage",
    ];

  if (
    typeof value ===
      "string" &&
    allowed.includes(
      value as MaterialStyle
    )
  ) {
    return value as MaterialStyle;
  }

  return fallback;
}

function normalizeMaterials(
  value: unknown
): BuildingMaterials {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return {
      ...DEFAULT_MATERIALS,
    };
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  return {
    wall:
      normalizeMaterial(
        source.wall,
        DEFAULT_MATERIALS.wall
      ),

    floor:
      normalizeMaterial(
        source.floor,
        DEFAULT_MATERIALS.floor
      ),

    roof:
      normalizeMaterial(
        source.roof,
        DEFAULT_MATERIALS.roof
      ),

    door:
      normalizeMaterial(
        source.door,
        DEFAULT_MATERIALS.door
      ),

    furniture:
      normalizeMaterial(
        source.furniture,
        DEFAULT_MATERIALS.furniture
      ),
  };
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function createProject(): SavedProject {
  const state =
    useHouseStore.getState();

  return {
    version: 3,

    savedAt:
      new Date().toISOString(),

    activeFloorId:
      state.activeFloorId,

    activeFurnitureType:
      state.activeFurnitureType,

    roofStyle:
      state.roofStyle,

    parapetEnabled:
      state.parapetEnabled,

    materials: {
      ...state.materials,
    },

    lightingMode:
      state.lightingMode,

    sunAzimuth:
      state.sunAzimuth,

    sunElevation:
      state.sunElevation,

    floorData: {
      ground: {
        walls:
          state.floorData.ground.walls,

        doors:
          state.floorData.ground.doors,

        windows:
          state.floorData.ground.windows,

        rooms:
          state.floorData.ground.rooms,

        stairs:
          state.floorData.ground.stairs,

        furniture:
          state.floorData.ground.furniture,

        measurements:
          state.floorData.ground.measurements,
      },

      first: {
        walls:
          state.floorData.first.walls,

        doors:
          state.floorData.first.doors,

        windows:
          state.floorData.first.windows,

        rooms:
          state.floorData.first.rooms,

        stairs:
          state.floorData.first.stairs,

        furniture:
          state.floorData.first.furniture,

        measurements:
          state.floorData.first.measurements,
      },
    },
  };
}

function parseProject(
  raw: string
): SavedProject {
  const parsed:
    unknown =
    JSON.parse(raw);

  if (
    typeof parsed !== "object" ||
    parsed === null
  ) {
    throw new Error(
      "Invalid project file."
    );
  }

  const source =
    parsed as Record<
      string,
      unknown
    >;

  const floorDataSource =
    typeof source.floorData ===
        "object" &&
      source.floorData !== null
      ? (
          source.floorData as Record<
            string,
            unknown
          >
        )
      : {};

  const activeFloorId:
    FloorId =
    source.activeFloorId ===
    "first"
      ? "first"
      : "ground";

  let sunAzimuth =
    normalizeNumber(
      source.sunAzimuth,
      315,
      0,
      360
    );

  if (
    sunAzimuth >= 360
  ) {
    sunAzimuth = 0;
  }

  return {
    version: 3,

    savedAt:
      typeof source.savedAt ===
      "string"
        ? source.savedAt
        : new Date().toISOString(),

    activeFloorId,

    activeFurnitureType:
      normalizeFurnitureType(
        source.activeFurnitureType
      ),

    roofStyle:
      normalizeRoofStyle(
        source.roofStyle
      ),

    parapetEnabled:
      typeof source.parapetEnabled ===
      "boolean"
        ? source.parapetEnabled
        : true,

    materials:
      normalizeMaterials(
        source.materials
      ),

    lightingMode:
      normalizeLightingMode(
        source.lightingMode
      ),

    sunAzimuth,

    sunElevation:
      normalizeNumber(
        source.sunElevation,
        50,
        5,
        85
      ),

    floorData: {
      ground:
        normalizeFloor(
          floorDataSource.ground
        ),

      first:
        normalizeFloor(
          floorDataSource.first
        ),
    },
  };
}

function applyProject(
  project: SavedProject
) {
  const activeFloor =
    project.floorData[
      project.activeFloorId
    ];

  useHouseStore.setState({
    floorData:
      project.floorData,

    activeFloorId:
      project.activeFloorId,

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

    activeFurnitureType:
      project.activeFurnitureType,

    roofStyle:
      project.roofStyle,

    parapetEnabled:
      project.parapetEnabled,

    materials:
      project.materials,

    lightingMode:
      project.lightingMode,

    sunAzimuth:
      project.sunAzimuth,

    sunElevation:
      project.sunElevation,

    activeTool:
      "select",

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
  });

  useHouseStore
    .getState()
    .clearHistory();
}

function saveAutosave() {
  try {
    const project =
      createProject();

    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify(
        project
      )
    );

    return true;
  } catch {
    return false;
  }
}

function downloadProject() {
  const project =
    createProject();

  const json =
    JSON.stringify(
      project,
      null,
      2
    );

  const blob =
    new Blob(
      [json],
      {
        type:
          "application/json",
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      "a"
    );

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  anchor.href =
    url;

  anchor.download =
    `house-plan-${year}-${month}-${day}.json`;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(
    url
  );
}

function ProjectControls() {
  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    status,
    setStatus,
  ] =
    useState<
      | "ready"
      | "saved"
      | "restored"
      | "error"
    >("ready");

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(
          AUTOSAVE_KEY
        );

      if (raw) {
        const project =
          parseProject(
            raw
          );

        applyProject(
          project
        );

        setStatus(
          "restored"
        );
      }
    } catch {
      localStorage.removeItem(
        AUTOSAVE_KEY
      );

      setStatus(
        "error"
      );
    }

    let timeout:
      number | undefined;

    const unsubscribe =
      useHouseStore.subscribe(
        () => {
          if (
            timeout !==
            undefined
          ) {
            window.clearTimeout(
              timeout
            );
          }

          timeout =
            window.setTimeout(
              () => {
                const success =
                  saveAutosave();

                setStatus(
                  success
                    ? "saved"
                    : "error"
                );
              },
              350
            );
        }
      );

    return () => {
      unsubscribe();

      if (
        timeout !==
        undefined
      ) {
        window.clearTimeout(
          timeout
        );
      }
    };
  }, []);

  function handleSave() {
    try {
      saveAutosave();

      downloadProject();

      setStatus(
        "saved"
      );
    } catch {
      setStatus(
        "error"
      );
    }
  }

  async function handleFile(
    file:
      File | undefined
  ) {
    if (!file) {
      return;
    }

    try {
      const text =
        await file.text();

      const project =
        parseProject(
          text
        );

      applyProject(
        project
      );

      localStorage.setItem(
        AUTOSAVE_KEY,
        JSON.stringify(
          project
        )
      );

      setStatus(
        "restored"
      );
    } catch {
      setStatus(
        "error"
      );

      window.alert(
        "This project file could not be loaded."
      );
    }

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          fileInputRef.current?.click()
        }
      >
        Load
      </button>

      <button
        type="button"
        className="save-btn"
        onClick={
          handleSave
        }
      >
        Save
      </button>

      <input
        ref={
          fileInputRef
        }
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(
          event
        ) => {
          void handleFile(
            event.target.files?.[
              0
            ]
          );
        }}
      />

      <span
        style={{
          fontSize: 11,
          whiteSpace:
            "nowrap",
          opacity: 0.7,
        }}
      >
        {status ===
        "saved"
          ? "✓ Autosaved"
          : status ===
              "restored"
            ? "✓ Restored"
            : status ===
                "error"
              ? "Save error"
              : "Autosave"}
      </span>
    </>
  );
}

export default ProjectControls;