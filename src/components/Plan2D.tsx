import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Circle,
  Group,
  Layer,
  Line,
  Stage,
  Text,
} from "react-konva";

import type {
  KonvaEventObject,
} from "konva/lib/Node";

import {
  detectRooms,
} from "../geometry/roomDetection";

import {
  useHouseStore,
  type ToolMode,
  type WallEndpoint,
} from "../store/houseStore";

import type {
  Door,
  Point,
  Stair,
  Wall,
  WindowItem,
} from "../types/house";

const PIXELS_PER_METER = 70;
const GRID_METERS = 0.5;

const ENDPOINT_SNAP_DISTANCE = 0.3;

const DEFAULT_DOOR_WIDTH = 0.9;
const DEFAULT_DOOR_HEIGHT = 2.1;

const DEFAULT_WINDOW_WIDTH = 1.2;
const DEFAULT_WINDOW_HEIGHT = 1.2;
const DEFAULT_WINDOW_SILL = 0.9;

const DEFAULT_STAIR_WIDTH = 1;
const DEFAULT_STAIR_STEPS = 16;

function snapValue(
  value: number
) {
  return (
    Math.round(
      value /
        GRID_METERS
    ) *
    GRID_METERS
  );
}

function screenToWorld(
  x: number,
  y: number
): Point {
  return {
    x: snapValue(
      x /
        PIXELS_PER_METER
    ),

    y: snapValue(
      y /
        PIXELS_PER_METER
    ),
  };
}

function screenToWorldRaw(
  x: number,
  y: number
): Point {
  return {
    x:
      x /
      PIXELS_PER_METER,

    y:
      y /
      PIXELS_PER_METER,
  };
}

function worldToScreen(
  point: Point
) {
  return {
    x:
      point.x *
      PIXELS_PER_METER,

    y:
      point.y *
      PIXELS_PER_METER,
  };
}

function getDistance(
  start: Point,
  end: Point
) {
  return Math.hypot(
    end.x -
      start.x,

    end.y -
      start.y
  );
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

function lockOrthogonal(
  start: Point,
  end: Point
): Point {
  const dx =
    Math.abs(
      end.x -
        start.x
    );

  const dy =
    Math.abs(
      end.y -
        start.y
    );

  if (dx >= dy) {
    return {
      x: end.x,
      y: start.y,
    };
  }

  return {
    x: start.x,
    y: end.y,
  };
}

function getTextAngle(
  start: Point,
  end: Point
) {
  let angle =
    (
      Math.atan2(
        end.y -
          start.y,

        end.x -
          start.x
      ) *
      180
    ) /
    Math.PI;

  if (
    angle > 90 ||
    angle < -90
  ) {
    angle += 180;
  }

  return angle;
}

function projectPointToWall(
  point: Point,
  wall: Wall
) {
  const dx =
    wall.end.x -
    wall.start.x;

  const dy =
    wall.end.y -
    wall.start.y;

  const lengthSquared =
    dx * dx +
    dy * dy;

  if (
    lengthSquared <= 0
  ) {
    return 0;
  }

  const position =
    (
      (
        point.x -
        wall.start.x
      ) *
        dx +
      (
        point.y -
        wall.start.y
      ) *
        dy
    ) /
    lengthSquared;

  return Math.max(
    0,
    Math.min(
      1,
      position
    )
  );
}

function clampOpeningPosition(
  position: number,
  wall: Wall,
  width: number
) {
  const wallLength =
    getDistance(
      wall.start,
      wall.end
    );

  if (
    wallLength <= width
  ) {
    return 0.5;
  }

  const margin =
    width /
    2 /
    wallLength;

  return Math.max(
    margin,
    Math.min(
      1 - margin,
      position
    )
  );
}

function getOpeningGeometry(
  position: number,
  width: number,
  wall: Wall
) {
  const wallLength =
    getDistance(
      wall.start,
      wall.end
    );

  if (
    wallLength <= 0
  ) {
    return null;
  }

  const unitX =
    (
      wall.end.x -
      wall.start.x
    ) /
    wallLength;

  const unitY =
    (
      wall.end.y -
      wall.start.y
    ) /
    wallLength;

  const safePosition =
    clampOpeningPosition(
      position,
      wall,
      width
    );

  const centerDistance =
    safePosition *
    wallLength;

  const center = {
    x:
      wall.start.x +
      unitX *
        centerDistance,

    y:
      wall.start.y +
      unitY *
        centerDistance,
  };

  const halfWidth =
    width / 2;

  return {
    center,

    start: {
      x:
        center.x -
        unitX *
          halfWidth,

      y:
        center.y -
        unitY *
          halfWidth,
    },

    end: {
      x:
        center.x +
        unitX *
          halfWidth,

      y:
        center.y +
        unitY *
          halfWidth,
    },

    unitX,
    unitY,
  };
}

function getStairGeometry(
  stair: Stair
) {
  const length =
    getDistance(
      stair.start,
      stair.end
    );

  if (
    length <= 0
  ) {
    return null;
  }

  const unitX =
    (
      stair.end.x -
      stair.start.x
    ) /
    length;

  const unitY =
    (
      stair.end.y -
      stair.start.y
    ) /
    length;

  const normalX =
    -unitY;

  const normalY =
    unitX;

  const halfWidth =
    stair.width / 2;

  return {
    length,
    unitX,
    unitY,
    normalX,
    normalY,

    corners: [
      {
        x:
          stair.start.x +
          normalX *
            halfWidth,

        y:
          stair.start.y +
          normalY *
            halfWidth,
      },

      {
        x:
          stair.end.x +
          normalX *
            halfWidth,

        y:
          stair.end.y +
          normalY *
            halfWidth,
      },

      {
        x:
          stair.end.x -
          normalX *
            halfWidth,

        y:
          stair.end.y -
          normalY *
            halfWidth,
      },

      {
        x:
          stair.start.x -
          normalX *
            halfWidth,

        y:
          stair.start.y -
          normalY *
            halfWidth,
      },
    ],
  };
}

function getPreviewStairGeometry(
  start: Point,
  end: Point
) {
  return getStairGeometry({
    id: "preview",
    start,
    end,
    width:
      DEFAULT_STAIR_WIDTH,
    stepCount:
      DEFAULT_STAIR_STEPS,
  });
}

function Plan2D() {
  const containerRef =
    useRef<HTMLDivElement>(
      null
    );

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

  const activeTool =
    useHouseStore(
      (state) =>
        state.activeTool
    );

  const addWall =
    useHouseStore(
      (state) =>
        state.addWall
    );

  const addDoor =
    useHouseStore(
      (state) =>
        state.addDoor
    );

  const addWindow =
    useHouseStore(
      (state) =>
        state.addWindow
    );

  const addStair =
    useHouseStore(
      (state) =>
        state.addStair
    );

  const updateDoor =
    useHouseStore(
      (state) =>
        state.updateDoor
    );

  const updateWindow =
    useHouseStore(
      (state) =>
        state.updateWindow
    );

  const moveWallEndpoint =
    useHouseStore(
      (state) =>
        state.moveWallEndpoint
    );

  const ensureRoom =
    useHouseStore(
      (state) =>
        state.ensureRoom
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

  const setSelectedWallId =
    useHouseStore(
      (state) =>
        state.setSelectedWallId
    );

  const setSelectedDoorId =
    useHouseStore(
      (state) =>
        state.setSelectedDoorId
    );

  const setSelectedWindowId =
    useHouseStore(
      (state) =>
        state.setSelectedWindowId
    );

  const setSelectedRoomId =
    useHouseStore(
      (state) =>
        state.setSelectedRoomId
    );

  const setSelectedStairId =
    useHouseStore(
      (state) =>
        state.setSelectedStairId
    );

  const detectedRooms =
    useMemo(
      () =>
        detectRooms(
          walls
        ),
      [walls]
    );

  const [
    size,
    setSize,
  ] =
    useState({
      width: 500,
      height: 500,
    });

  const [
    startPoint,
    setStartPoint,
  ] =
    useState<Point | null>(
      null
    );

  const [
    currentPoint,
    setCurrentPoint,
  ] =
    useState<Point | null>(
      null
    );

  const [
    shiftPressed,
    setShiftPressed,
  ] =
    useState(false);

  useEffect(() => {
    const element =
      containerRef.current;

    if (!element) {
      return;
    }

    const observer =
      new ResizeObserver(
        (entries) => {
          const entry =
            entries[0];

          if (!entry) {
            return;
          }

          setSize({
            width:
              entry
                .contentRect
                .width,

            height:
              entry
                .contentRect
                .height,
          });
        }
      );

    observer.observe(
      element
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Shift"
      ) {
        setShiftPressed(
          true
        );
      }
    }

    function handleKeyUp(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Shift"
      ) {
        setShiftPressed(
          false
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    window.addEventListener(
      "keyup",
      handleKeyUp
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      window.removeEventListener(
        "keyup",
        handleKeyUp
      );
    };
  }, []);

  function clearSelection() {
    setSelectedWallId(
      null
    );

    setSelectedDoorId(
      null
    );

    setSelectedWindowId(
      null
    );

    setSelectedRoomId(
      null
    );

    setSelectedStairId(
      null
    );
  }

  function snapToExistingEndpoint(
    point: Point
  ) {
    let result = {
      ...point,
    };

    let closest =
      ENDPOINT_SNAP_DISTANCE;

    for (
      const wall
      of walls
    ) {
      const endpoints = [
        wall.start,
        wall.end,
      ];

      for (
        const endpoint
        of endpoints
      ) {
        const distance =
          getDistance(
            point,
            endpoint
          );

        if (
          distance <
          closest
        ) {
          closest =
            distance;

          result = {
            ...endpoint,
          };
        }
      }
    }

    return result;
  }

  function getPointerWorld(
    event:
      KonvaEventObject<MouseEvent>,
    snap = true
  ) {
    const stage =
      event.target.getStage();

    if (!stage) {
      return null;
    }

    const pointer =
      stage.getPointerPosition();

    if (!pointer) {
      return null;
    }

    if (snap) {
      return screenToWorld(
        pointer.x,
        pointer.y
      );
    }

    return screenToWorldRaw(
      pointer.x,
      pointer.y
    );
  }

  function handleStageMouseDown(
    event:
      KonvaEventObject<MouseEvent>
  ) {
    if (
      activeTool ===
      "select"
    ) {
      const stage =
        event.target.getStage();

      if (
        stage &&
        event.target ===
          stage
      ) {
        clearSelection();
      }

      return;
    }

    if (
      activeTool !==
        "wall" &&
      activeTool !==
        "stairs"
    ) {
      return;
    }

    const pointer =
      getPointerWorld(
        event
      );

    if (!pointer) {
      return;
    }

    const start =
      activeTool ===
      "wall"
        ? snapToExistingEndpoint(
            pointer
          )
        : pointer;

    setStartPoint(
      start
    );

    setCurrentPoint(
      start
    );
  }

  function handleStageMouseMove(
    event:
      KonvaEventObject<MouseEvent>
  ) {
    if (
      !startPoint
    ) {
      return;
    }

    if (
      activeTool !==
        "wall" &&
      activeTool !==
        "stairs"
    ) {
      return;
    }

    const pointer =
      getPointerWorld(
        event
      );

    if (!pointer) {
      return;
    }

    let nextPoint =
      pointer;

    if (
      shiftPressed
    ) {
      nextPoint =
        lockOrthogonal(
          startPoint,
          nextPoint
        );
    }

    if (
      activeTool ===
      "wall"
    ) {
      nextPoint =
        snapToExistingEndpoint(
          nextPoint
        );
    }

    setCurrentPoint(
      nextPoint
    );
  }

  function handleStageMouseUp() {
    if (
      !startPoint ||
      !currentPoint
    ) {
      return;
    }

    const distance =
      getDistance(
        startPoint,
        currentPoint
      );

    if (
      activeTool ===
        "wall" &&
      distance >= 0.5
    ) {
      addWall({
        id:
          crypto.randomUUID(),

        start: {
          ...startPoint,
        },

        end: {
          ...currentPoint,
        },

        thickness:
          0.15,

        height:
          3,
      });
    }

    if (
      activeTool ===
        "stairs" &&
      distance >= 1.5
    ) {
      addStair({
        id:
          crypto.randomUUID(),

        start: {
          ...startPoint,
        },

        end: {
          ...currentPoint,
        },

        width:
          DEFAULT_STAIR_WIDTH,

        stepCount:
          DEFAULT_STAIR_STEPS,
      });
    }

    setStartPoint(
      null
    );

    setCurrentPoint(
      null
    );
  }

  function placeOpening(
    event:
      KonvaEventObject<MouseEvent>,
    wall: Wall,
    width: number,
    createOpening: (
      position: number
    ) => void
  ) {
    const wallLength =
      getDistance(
        wall.start,
        wall.end
      );

    if (
      wallLength <
      width + 0.2
    ) {
      return;
    }

    const pointer =
      getPointerWorld(
        event,
        false
      );

    if (!pointer) {
      return;
    }

    const projected =
      projectPointToWall(
        pointer,
        wall
      );

    const position =
      clampOpeningPosition(
        projected,
        wall,
        width
      );

    createOpening(
      position
    );
  }

  function placeDoor(
    event:
      KonvaEventObject<MouseEvent>,
    wall: Wall
  ) {
    placeOpening(
      event,
      wall,
      DEFAULT_DOOR_WIDTH,
      (position) => {
        addDoor({
          id:
            crypto.randomUUID(),

          wallId:
            wall.id,

          position,

          width:
            DEFAULT_DOOR_WIDTH,

          height:
            DEFAULT_DOOR_HEIGHT,
        });
      }
    );
  }

  function placeWindow(
    event:
      KonvaEventObject<MouseEvent>,
    wall: Wall
  ) {
    placeOpening(
      event,
      wall,
      DEFAULT_WINDOW_WIDTH,
      (position) => {
        addWindow({
          id:
            crypto.randomUUID(),

          wallId:
            wall.id,

          position,

          width:
            DEFAULT_WINDOW_WIDTH,

          height:
            DEFAULT_WINDOW_HEIGHT,

          sillHeight:
            DEFAULT_WINDOW_SILL,
        });
      }
    );
  }

  function finishEndpointDrag(
    wallId: string,
    endpoint:
      WallEndpoint,
    screenX: number,
    screenY: number
  ) {
    let point =
      screenToWorld(
        screenX,
        screenY
      );

    point =
      snapToExistingEndpoint(
        point
      );

    moveWallEndpoint(
      wallId,
      endpoint,
      point
    );
  }

  function finishOpeningDrag(
    wall: Wall,
    width: number,
    screenX: number,
    screenY: number,
    update: (
      position: number
    ) => void
  ) {
    const worldPoint =
      screenToWorldRaw(
        screenX,
        screenY
      );

    const projected =
      projectPointToWall(
        worldPoint,
        wall
      );

    const position =
      clampOpeningPosition(
        projected,
        wall,
        width
      );

    update(
      position
    );
  }

  const gridLines = [];

  const gridPixels =
    GRID_METERS *
    PIXELS_PER_METER;

  for (
    let x = 0;
    x <= size.width;
    x += gridPixels
  ) {
    gridLines.push(
      <Line
        key={`grid-x-${x}`}
        points={[
          x,
          0,
          x,
          size.height,
        ]}
        stroke="#e4e8ec"
        strokeWidth={1}
        listening={false}
      />
    );
  }

  for (
    let y = 0;
    y <= size.height;
    y += gridPixels
  ) {
    gridLines.push(
      <Line
        key={`grid-y-${y}`}
        points={[
          0,
          y,
          size.width,
          y,
        ]}
        stroke="#e4e8ec"
        strokeWidth={1}
        listening={false}
      />
    );
  }

  return (
    <div
      ref={
        containerRef
      }
      style={{
        width:
          "100%",

        height:
          "100%",

        overflow:
          "hidden",
      }}
    >
      <Stage
        width={
          size.width
        }
        height={
          size.height
        }
        onMouseDown={
          handleStageMouseDown
        }
        onMouseMove={
          handleStageMouseMove
        }
        onMouseUp={
          handleStageMouseUp
        }
        style={{
          background:
            "#fafafa",

          cursor:
            activeTool ===
                "wall" ||
            activeTool ===
                "stairs"
              ? "crosshair"
              : activeTool ===
                    "door" ||
                  activeTool ===
                    "window"
                ? "copy"
                : activeTool ===
                    "room"
                  ? "pointer"
                  : "default",
        }}
      >
        <Layer
          listening={
            false
          }
        >
          {gridLines}
        </Layer>

        <Layer>
          {detectedRooms.map(
            (room) => {
              const savedRoom =
                rooms.find(
                  (saved) =>
                    saved.id ===
                    room.id
                );

              const selected =
                selectedRoomId ===
                room.id;

              const polygonPoints =
                room.polygon.flatMap(
                  (point) => [
                    point.x *
                      PIXELS_PER_METER,

                    point.y *
                      PIXELS_PER_METER,
                  ]
                );

              const interactive =
                activeTool ===
                  "select" ||
                activeTool ===
                  "room";

              return (
                <Group
                  key={
                    room.id
                  }
                >
                  <Line
                    points={
                      polygonPoints
                    }
                    closed
                    fill={
                      selected
                        ? "rgba(46,125,86,0.18)"
                        : "rgba(46,125,86,0.07)"
                    }
                    stroke={
                      selected
                        ? "#2e7d56"
                        : "rgba(46,125,86,0.22)"
                    }
                    strokeWidth={
                      selected
                        ? 2
                        : 1
                    }
                    listening={
                      interactive
                    }
                    onMouseDown={(
                      event
                    ) => {
                      event.cancelBubble =
                        true;
                    }}
                    onClick={(
                      event
                    ) => {
                      event.cancelBubble =
                        true;

                      if (
                        !interactive
                      ) {
                        return;
                      }

                      ensureRoom(
                        room.id,
                        room.wallIds
                      );

                      setSelectedRoomId(
                        room.id
                      );
                    }}
                  />

                  <Text
                    x={
                      room.centroid.x *
                        PIXELS_PER_METER -
                      60
                    }
                    y={
                      room.centroid.y *
                        PIXELS_PER_METER -
                      19
                    }
                    width={
                      120
                    }
                    align="center"
                    text={`${savedRoom?.name ?? "Room"}\n${room.area.toFixed(2)} m²`}
                    fontSize={
                      12
                    }
                    fontStyle="bold"
                    fill="#315b48"
                    listening={
                      false
                    }
                  />
                </Group>
              );
            }
          )}
        </Layer>

        <Layer>
          {stairs.map(
            (stair) => (
              <Stair2D
                key={
                  stair.id
                }
                stair={
                  stair
                }
                selected={
                  selectedStairId ===
                  stair.id
                }
                activeTool={
                  activeTool
                }
                onSelect={() =>
                  setSelectedStairId(
                    stair.id
                  )
                }
              />
            )
          )}

          {walls.map(
            (wall) => {
              const start =
                worldToScreen(
                  wall.start
                );

              const end =
                worldToScreen(
                  wall.end
                );

              const length =
                getDistance(
                  wall.start,
                  wall.end
                );

              const selected =
                selectedWallId ===
                wall.id;

              const wallInteractive =
                activeTool ===
                  "select" ||
                activeTool ===
                  "door" ||
                activeTool ===
                  "window";

              return (
                <Group
                  key={
                    wall.id
                  }
                >
                  <Line
                    points={[
                      start.x,
                      start.y,
                      end.x,
                      end.y,
                    ]}
                    stroke={
                      selected
                        ? "#167a4d"
                        : "#263238"
                    }
                    strokeWidth={
                      Math.max(
                        wall.thickness *
                          PIXELS_PER_METER,
                        8
                      )
                    }
                    hitStrokeWidth={
                      30
                    }
                    lineCap="square"
                    listening={
                      wallInteractive
                    }
                    onMouseDown={(
                      event
                    ) => {
                      event.cancelBubble =
                        true;
                    }}
                    onClick={(
                      event
                    ) => {
                      event.cancelBubble =
                        true;

                      if (
                        activeTool ===
                        "select"
                      ) {
                        setSelectedWallId(
                          wall.id
                        );
                      }

                      if (
                        activeTool ===
                        "door"
                      ) {
                        placeDoor(
                          event,
                          wall
                        );
                      }

                      if (
                        activeTool ===
                        "window"
                      ) {
                        placeWindow(
                          event,
                          wall
                        );
                      }
                    }}
                  />

                  <Text
                    x={
                      (
                        start.x +
                        end.x
                      ) /
                      2
                    }
                    y={
                      (
                        start.y +
                        end.y
                      ) /
                      2
                    }
                    text={`${length.toFixed(2)} m`}
                    fontSize={
                      12
                    }
                    fill={
                      selected
                        ? "#167a4d"
                        : "#4b5563"
                    }
                    rotation={
                      getTextAngle(
                        wall.start,
                        wall.end
                      )
                    }
                    offsetX={
                      28
                    }
                    offsetY={
                      22
                    }
                    listening={
                      false
                    }
                  />

                  {selected &&
                    activeTool ===
                      "select" && (
                      <>
                        <Circle
                          x={
                            start.x
                          }
                          y={
                            start.y
                          }
                          radius={
                            9
                          }
                          fill="#ffffff"
                          stroke="#167a4d"
                          strokeWidth={
                            3
                          }
                          draggable
                          onMouseDown={(
                            event
                          ) => {
                            event.cancelBubble =
                              true;
                          }}
                          onDragEnd={(
                            event
                          ) => {
                            event.cancelBubble =
                              true;

                            finishEndpointDrag(
                              wall.id,
                              "start",
                              event.target.x(),
                              event.target.y()
                            );
                          }}
                        />

                        <Circle
                          x={
                            end.x
                          }
                          y={
                            end.y
                          }
                          radius={
                            9
                          }
                          fill="#ffffff"
                          stroke="#167a4d"
                          strokeWidth={
                            3
                          }
                          draggable
                          onMouseDown={(
                            event
                          ) => {
                            event.cancelBubble =
                              true;
                          }}
                          onDragEnd={(
                            event
                          ) => {
                            event.cancelBubble =
                              true;

                            finishEndpointDrag(
                              wall.id,
                              "end",
                              event.target.x(),
                              event.target.y()
                            );
                          }}
                        />
                      </>
                    )}
                </Group>
              );
            }
          )}

          {doors.map(
            (door) => {
              const wall =
                walls.find(
                  (candidate) =>
                    candidate.id ===
                    door.wallId
                );

              if (!wall) {
                return null;
              }

              return (
                <Door2D
                  key={
                    door.id
                  }
                  door={
                    door
                  }
                  wall={
                    wall
                  }
                  selected={
                    selectedDoorId ===
                    door.id
                  }
                  activeTool={
                    activeTool
                  }
                  onSelect={() =>
                    setSelectedDoorId(
                      door.id
                    )
                  }
                  onMove={(
                    x,
                    y
                  ) =>
                    finishOpeningDrag(
                      wall,
                      door.width,
                      x,
                      y,
                      (position) =>
                        updateDoor(
                          door.id,
                          {
                            position,
                          }
                        )
                    )
                  }
                />
              );
            }
          )}

          {windows.map(
            (
              windowItem
            ) => {
              const wall =
                walls.find(
                  (candidate) =>
                    candidate.id ===
                    windowItem.wallId
                );

              if (!wall) {
                return null;
              }

              return (
                <Window2D
                  key={
                    windowItem.id
                  }
                  windowItem={
                    windowItem
                  }
                  wall={
                    wall
                  }
                  selected={
                    selectedWindowId ===
                    windowItem.id
                  }
                  activeTool={
                    activeTool
                  }
                  onSelect={() =>
                    setSelectedWindowId(
                      windowItem.id
                    )
                  }
                  onMove={(
                    x,
                    y
                  ) =>
                    finishOpeningDrag(
                      wall,
                      windowItem.width,
                      x,
                      y,
                      (position) =>
                        updateWindow(
                          windowItem.id,
                          {
                            position,
                          }
                        )
                    )
                  }
                />
              );
            }
          )}
        </Layer>

        <Layer
          listening={
            false
          }
        >
          {activeTool ===
            "wall" &&
            startPoint &&
            currentPoint &&
            !pointsEqual(
              startPoint,
              currentPoint
            ) && (
              <WallPreview
                start={
                  startPoint
                }
                end={
                  currentPoint
                }
              />
            )}

          {activeTool ===
            "stairs" &&
            startPoint &&
            currentPoint &&
            !pointsEqual(
              startPoint,
              currentPoint
            ) && (
              <StairPreview
                start={
                  startPoint
                }
                end={
                  currentPoint
                }
              />
            )}
        </Layer>
      </Stage>
    </div>
  );
}

function WallPreview({
  start,
  end,
}: {
  start: Point;
  end: Point;
}) {
  const startScreen =
    worldToScreen(
      start
    );

  const endScreen =
    worldToScreen(
      end
    );

  const length =
    getDistance(
      start,
      end
    );

  return (
    <>
      <Line
        points={[
          startScreen.x,
          startScreen.y,
          endScreen.x,
          endScreen.y,
        ]}
        stroke="#1f513c"
        strokeWidth={
          10
        }
        dash={[
          10,
          6,
        ]}
      />

      <Circle
        x={
          startScreen.x
        }
        y={
          startScreen.y
        }
        radius={
          5
        }
        fill="#1f513c"
      />

      <Circle
        x={
          endScreen.x
        }
        y={
          endScreen.y
        }
        radius={
          5
        }
        fill="#1f513c"
      />

      <Text
        x={
          (
            startScreen.x +
            endScreen.x
          ) /
          2
        }
        y={
          (
            startScreen.y +
            endScreen.y
          ) /
          2
        }
        text={`${length.toFixed(2)} m`}
        fontSize={
          13
        }
        fontStyle="bold"
        fill="#1f513c"
        rotation={
          getTextAngle(
            start,
            end
          )
        }
        offsetX={
          30
        }
        offsetY={
          25
        }
      />
    </>
  );
}

function Door2D({
  door,
  wall,
  selected,
  activeTool,
  onSelect,
  onMove,
}: {
  door: Door;
  wall: Wall;
  selected: boolean;
  activeTool: ToolMode;
  onSelect: () => void;
  onMove: (
    x: number,
    y: number
  ) => void;
}) {
  const geometry =
    getOpeningGeometry(
      door.position,
      door.width,
      wall
    );

  if (!geometry) {
    return null;
  }

  const start =
    worldToScreen(
      geometry.start
    );

  const end =
    worldToScreen(
      geometry.end
    );

  const center =
    worldToScreen(
      geometry.center
    );

  const normalX =
    -geometry.unitY;

  const normalY =
    geometry.unitX;

  const leafEnd = {
    x:
      center.x +
      normalX *
        door.width *
        PIXELS_PER_METER,

    y:
      center.y +
      normalY *
        door.width *
        PIXELS_PER_METER,
  };

  return (
    <Group>
      <Line
        points={[
          start.x,
          start.y,
          end.x,
          end.y,
        ]}
        stroke="#fafafa"
        strokeWidth={
          Math.max(
            wall.thickness *
              PIXELS_PER_METER +
              5,
            13
          )
        }
        listening={
          false
        }
      />

      <Line
        points={[
          center.x,
          center.y,
          leafEnd.x,
          leafEnd.y,
        ]}
        stroke={
          selected
            ? "#167a4d"
            : "#9a6338"
        }
        strokeWidth={
          4
        }
        hitStrokeWidth={
          18
        }
        listening={
          activeTool ===
          "select"
        }
        onMouseDown={(
          event
        ) => {
          event.cancelBubble =
            true;
        }}
        onClick={(
          event
        ) => {
          event.cancelBubble =
            true;

          if (
            activeTool ===
            "select"
          ) {
            onSelect();
          }
        }}
      />

      {selected &&
        activeTool ===
          "select" && (
          <Circle
            x={
              center.x
            }
            y={
              center.y
            }
            radius={
              8
            }
            fill="#ffffff"
            stroke="#167a4d"
            strokeWidth={
              3
            }
            draggable
            onMouseDown={(
              event
            ) => {
              event.cancelBubble =
                true;
            }}
            onDragEnd={(
              event
            ) => {
              event.cancelBubble =
                true;

              onMove(
                event.target.x(),
                event.target.y()
              );
            }}
          />
        )}
    </Group>
  );
}

function Window2D({
  windowItem,
  wall,
  selected,
  activeTool,
  onSelect,
  onMove,
}: {
  windowItem: WindowItem;
  wall: Wall;
  selected: boolean;
  activeTool: ToolMode;
  onSelect: () => void;
  onMove: (
    x: number,
    y: number
  ) => void;
}) {
  const geometry =
    getOpeningGeometry(
      windowItem.position,
      windowItem.width,
      wall
    );

  if (!geometry) {
    return null;
  }

  const start =
    worldToScreen(
      geometry.start
    );

  const end =
    worldToScreen(
      geometry.end
    );

  const center =
    worldToScreen(
      geometry.center
    );

  return (
    <Group>
      <Line
        points={[
          start.x,
          start.y,
          end.x,
          end.y,
        ]}
        stroke="#fafafa"
        strokeWidth={
          Math.max(
            wall.thickness *
              PIXELS_PER_METER +
              5,
            13
          )
        }
        listening={
          false
        }
      />

      <Line
        points={[
          start.x,
          start.y,
          end.x,
          end.y,
        ]}
        stroke={
          selected
            ? "#167a4d"
            : "#3b82b8"
        }
        strokeWidth={
          5
        }
        hitStrokeWidth={
          18
        }
        listening={
          activeTool ===
          "select"
        }
        onMouseDown={(
          event
        ) => {
          event.cancelBubble =
            true;
        }}
        onClick={(
          event
        ) => {
          event.cancelBubble =
            true;

          if (
            activeTool ===
            "select"
          ) {
            onSelect();
          }
        }}
      />

      <Line
        points={[
          start.x,
          start.y - 4,
          end.x,
          end.y - 4,
        ]}
        stroke="#8ec5df"
        strokeWidth={
          2
        }
        listening={
          false
        }
      />

      {selected &&
        activeTool ===
          "select" && (
          <Circle
            x={
              center.x
            }
            y={
              center.y
            }
            radius={
              8
            }
            fill="#ffffff"
            stroke="#167a4d"
            strokeWidth={
              3
            }
            draggable
            onMouseDown={(
              event
            ) => {
              event.cancelBubble =
                true;
            }}
            onDragEnd={(
              event
            ) => {
              event.cancelBubble =
                true;

              onMove(
                event.target.x(),
                event.target.y()
              );
            }}
          />
        )}
    </Group>
  );
}

function Stair2D({
  stair,
  selected,
  activeTool,
  onSelect,
}: {
  stair: Stair;
  selected: boolean;
  activeTool: ToolMode;
  onSelect: () => void;
}) {
  const geometry =
    getStairGeometry(
      stair
    );

  if (!geometry) {
    return null;
  }

  const polygonPoints =
    geometry.corners.flatMap(
      (point) => {
        const screen =
          worldToScreen(
            point
          );

        return [
          screen.x,
          screen.y,
        ];
      }
    );

  const start =
    worldToScreen(
      stair.start
    );

  const end =
    worldToScreen(
      stair.end
    );

  const stepLines = [];

  for (
    let index = 1;
    index <
    stair.stepCount;
    index += 1
  ) {
    const t =
      index /
      stair.stepCount;

    const center = {
      x:
        stair.start.x +
        (
          stair.end.x -
          stair.start.x
        ) *
          t,

      y:
        stair.start.y +
        (
          stair.end.y -
          stair.start.y
        ) *
          t,
    };

    const half =
      stair.width / 2;

    const a =
      worldToScreen({
        x:
          center.x +
          geometry.normalX *
            half,

        y:
          center.y +
          geometry.normalY *
            half,
      });

    const b =
      worldToScreen({
        x:
          center.x -
          geometry.normalX *
            half,

        y:
          center.y -
          geometry.normalY *
            half,
      });

    stepLines.push(
      <Line
        key={
          index
        }
        points={[
          a.x,
          a.y,
          b.x,
          b.y,
        ]}
        stroke={
          selected
            ? "#167a4d"
            : "#78848d"
        }
        strokeWidth={
          1
        }
        listening={
          false
        }
      />
    );
  }

  return (
    <Group>
      <Line
        points={
          polygonPoints
        }
        closed
        fill={
          selected
            ? "rgba(22,122,77,0.14)"
            : "rgba(100,116,139,0.12)"
        }
        stroke={
          selected
            ? "#167a4d"
            : "#64748b"
        }
        strokeWidth={
          selected
            ? 3
            : 2
        }
        hitStrokeWidth={
          12
        }
        listening={
          activeTool ===
          "select"
        }
        onMouseDown={(
          event
        ) => {
          event.cancelBubble =
            true;
        }}
        onClick={(
          event
        ) => {
          event.cancelBubble =
            true;

          if (
            activeTool ===
            "select"
          ) {
            onSelect();
          }
        }}
      />

      {stepLines}

      <Line
        points={[
          start.x,
          start.y,
          end.x,
          end.y,
        ]}
        stroke="#365b49"
        strokeWidth={
          2
        }
        dash={[
          6,
          4,
        ]}
        listening={
          false
        }
      />

      <Text
        x={
          (
            start.x +
            end.x
          ) /
            2 -
          20
        }
        y={
          (
            start.y +
            end.y
          ) /
            2 -
          10
        }
        width={
          40
        }
        align="center"
        text="UP"
        fontSize={
          11
        }
        fontStyle="bold"
        fill="#365b49"
        listening={
          false
        }
      />
    </Group>
  );
}

function StairPreview({
  start,
  end,
}: {
  start: Point;
  end: Point;
}) {
  const geometry =
    getPreviewStairGeometry(
      start,
      end
    );

  if (!geometry) {
    return null;
  }

  const points =
    geometry.corners.flatMap(
      (point) => {
        const screen =
          worldToScreen(
            point
          );

        return [
          screen.x,
          screen.y,
        ];
      }
    );

  return (
    <Line
      points={
        points
      }
      closed
      stroke="#1f513c"
      strokeWidth={
        2
      }
      dash={[
        8,
        5,
      ]}
      fill="rgba(31,81,60,0.08)"
    />
  );
}

export default Plan2D;