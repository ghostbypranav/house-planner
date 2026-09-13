import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Canvas,
  useThree,
} from "@react-three/fiber";

import {
  OrbitControls,
  Stars,
} from "@react-three/drei";

import {
  ACESFilmicToneMapping,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Shape,
} from "three";

import {
  detectRooms,
} from "../geometry/roomDetection";

import {
  useHouseStore,
  type LightingMode,
  type MaterialCategory,
  type MaterialStyle,
  type RoofStyle,
} from "../store/houseStore";

import type {
  Door,
  FurnitureItem,
  Point,
  Stair,
  Wall,
  WindowItem,
} from "../types/house";

const FLOOR_SLAB_GAP = 0.2;

const FLOOR_SLAB_THICKNESS = 0.12;

const CEILING_THICKNESS = 0.08;

const ROOF_SLAB_THICKNESS = 0.18;

const ROOF_PLANE_THICKNESS = 0.12;

const ROOF_OVERHANG = 0.35;

const ROOF_PITCH_DEGREES = 28;

const PARAPET_HEIGHT = 0.9;

const PARAPET_THICKNESS = 0.12;

const DEFAULT_FLOOR_HEIGHT = 3;

type Opening = {
  start: number;
  end: number;
  bottom: number;
  top: number;
};

type RoofBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;

  centerX: number;
  centerZ: number;

  width: number;
  depth: number;
};

type RoofVertex = [
  number,
  number,
  number,
];

type MaterialSpec = {
  label: string;
  color: string;
  roughness: number;
  metalness: number;
};

type LightingSettings = {
  background: string;
  ground: string;
  ambient: number;
  hemisphere: number;
  sunIntensity: number;
  sunColor: string;
  exposure: number;
  gridColor: string;
};

const MATERIAL_LIBRARY: Record<
  MaterialStyle,
  MaterialSpec
> = {
  white: {
    label: "White Paint",
    color: "#f3f1eb",
    roughness: 0.85,
    metalness: 0,
  },

  cream: {
    label: "Warm Cream",
    color: "#e6dccb",
    roughness: 0.85,
    metalness: 0,
  },

  concrete: {
    label: "Concrete",
    color: "#aaa9a4",
    roughness: 0.95,
    metalness: 0,
  },

  brick: {
    label: "Brick",
    color: "#985b47",
    roughness: 0.96,
    metalness: 0,
  },

  oak: {
    label: "Oak Wood",
    color: "#b88a5e",
    roughness: 0.72,
    metalness: 0,
  },

  walnut: {
    label: "Walnut Wood",
    color: "#674633",
    roughness: 0.72,
    metalness: 0,
  },

  tile: {
    label: "Light Tile",
    color: "#d8d4cc",
    roughness: 0.38,
    metalness: 0.02,
  },

  marble: {
    label: "White Marble",
    color: "#ebe9e3",
    roughness: 0.25,
    metalness: 0.06,
  },

  terracotta: {
    label: "Terracotta",
    color: "#a65339",
    roughness: 0.9,
    metalness: 0,
  },

  charcoal: {
    label: "Charcoal",
    color: "#3c4143",
    roughness: 0.72,
    metalness: 0.08,
  },

  sage: {
    label: "Sage Green",
    color: "#7f9482",
    roughness: 0.82,
    metalness: 0,
  },
};

const MATERIAL_OPTIONS: Record<
  MaterialCategory,
  MaterialStyle[]
> = {
  wall: [
    "white",
    "cream",
    "concrete",
    "brick",
    "sage",
    "charcoal",
  ],

  floor: [
    "tile",
    "marble",
    "oak",
    "concrete",
    "charcoal",
  ],

  roof: [
    "concrete",
    "terracotta",
    "charcoal",
    "sage",
  ],

  door: [
    "walnut",
    "oak",
    "white",
    "charcoal",
  ],

  furniture: [
    "oak",
    "walnut",
    "cream",
    "sage",
    "charcoal",
  ],
};

const LIGHTING_LIBRARY: Record<
  LightingMode,
  LightingSettings
> = {
  day: {
    background:
      "#dfeaf3",

    ground:
      "#d5d9d3",

    ambient:
      0.62,

    hemisphere:
      0.8,

    sunIntensity:
      3,

    sunColor:
      "#fff4d8",

    exposure:
      1.05,

    gridColor:
      "#89948d",
  },

  sunset: {
    background:
      "#c98667",

    ground:
      "#736c62",

    ambient:
      0.34,

    hemisphere:
      0.45,

    sunIntensity:
      3.8,

    sunColor:
      "#ffad68",

    exposure:
      1.05,

    gridColor:
      "#685f59",
  },

  night: {
    background:
      "#101721",

    ground:
      "#171d25",

    ambient:
      0.14,

    hemisphere:
      0.2,

    sunIntensity:
      0.8,

    sunColor:
      "#a7c5ff",

    exposure:
      0.72,

    gridColor:
      "#39424c",
  },
};

function getWallLength(
  wall: Wall
) {
  return Math.hypot(
    wall.end.x -
      wall.start.x,

    wall.end.y -
      wall.start.y
  );
}

function getFloorHeight(
  walls: Wall[]
) {
  if (
    walls.length ===
    0
  ) {
    return DEFAULT_FLOOR_HEIGHT;
  }

  return Math.max(
    ...walls.map(
      (wall) =>
        wall.height
    )
  );
}

function getSunPosition(
  azimuth:
    number,

  elevation:
    number
): [
  number,
  number,
  number,
] {
  const radius =
    22;

  const azimuthRadians =
    (
      azimuth *
      Math.PI
    ) /
    180;

  const elevationRadians =
    (
      elevation *
      Math.PI
    ) /
    180;

  const horizontalRadius =
    radius *
    Math.cos(
      elevationRadians
    );

  return [
    horizontalRadius *
      Math.cos(
        azimuthRadians
      ),

    radius *
      Math.sin(
        elevationRadians
      ),

    horizontalRadius *
      Math.sin(
        azimuthRadians
      ),
  ];
}

function RendererSettings({
  exposure,
}: {
  exposure:
    number;
}) {
  const gl =
    useThree(
      (state) =>
        state.gl
    );

  useEffect(
    () => {
      gl.toneMapping =
        ACESFilmicToneMapping;

      gl.toneMappingExposure =
        exposure;
    },
    [
      gl,
      exposure,
    ]
  );

  return null;
}

function FinishMaterial({
  material,
  active = true,
  opacity = 1,
  side,
}: {
  material:
    MaterialStyle;

  active?:
    boolean;

  opacity?:
    number;

  side?:
    typeof DoubleSide;
}) {
  const spec =
    MATERIAL_LIBRARY[
      material
    ];

  const finalOpacity =
    active
      ? opacity
      : opacity *
        0.48;

  return (
    <meshStandardMaterial
      color={
        spec.color
      }
      roughness={
        spec.roughness
      }
      metalness={
        spec.metalness
      }
      transparent={
        finalOpacity <
        1
      }
      opacity={
        finalOpacity
      }
      side={
        side
      }
    />
  );
}

function createOpenings(
  wall: Wall,
  doors: Door[],
  windows:
    WindowItem[]
): Opening[] {
  const length =
    getWallLength(
      wall
    );

  const openings:
    Opening[] = [];

  for (
    const door
    of doors
  ) {
    const half =
      door.width /
      2;

    const center =
      Math.max(
        half,

        Math.min(
          length -
            half,

          door.position *
            length
        )
      );

    openings.push({
      start:
        Math.max(
          0,
          center -
            half
        ),

      end:
        Math.min(
          length,
          center +
            half
        ),

      bottom:
        0,

      top:
        Math.min(
          wall.height,
          door.height
        ),
    });
  }

  for (
    const windowItem
    of windows
  ) {
    const half =
      windowItem.width /
      2;

    const center =
      Math.max(
        half,

        Math.min(
          length -
            half,

          windowItem.position *
            length
        )
      );

    openings.push({
      start:
        Math.max(
          0,
          center -
            half
        ),

      end:
        Math.min(
          length,
          center +
            half
        ),

      bottom:
        Math.max(
          0,
          windowItem.sillHeight
        ),

      top:
        Math.min(
          wall.height,

          windowItem.sillHeight +
            windowItem.height
        ),
    });
  }

  return openings;
}

function WallSegment({
  wall,
  startDistance,
  endDistance,
  bottom,
  height,
  floorBaseY,
  active,
  material,
}: {
  wall:
    Wall;

  startDistance:
    number;

  endDistance:
    number;

  bottom:
    number;

  height:
    number;

  floorBaseY:
    number;

  active:
    boolean;

  material:
    MaterialStyle;
}) {
  const wallLength =
    getWallLength(
      wall
    );

  const segmentLength =
    endDistance -
    startDistance;

  if (
    wallLength <=
      0 ||
    segmentLength <=
      0.001 ||
    height <=
      0
  ) {
    return null;
  }

  const unitX =
    (
      wall.end.x -
      wall.start.x
    ) /
    wallLength;

  const unitZ =
    (
      wall.end.y -
      wall.start.y
    ) /
    wallLength;

  const middleDistance =
    (
      startDistance +
      endDistance
    ) /
    2;

  const centerX =
    wall.start.x +
    unitX *
      middleDistance;

  const centerZ =
    wall.start.y +
    unitZ *
      middleDistance;

  const angle =
    Math.atan2(
      unitZ,
      unitX
    );

  return (
    <mesh
      position={[
        centerX,

        floorBaseY +
          bottom +
          height /
            2,

        centerZ,
      ]}
      rotation={[
        0,
        -angle,
        0,
      ]}
      castShadow={
        active
      }
      receiveShadow
    >
      <boxGeometry
        args={[
          segmentLength,
          height,
          wall.thickness,
        ]}
      />

      <FinishMaterial
        material={
          material
        }
        active={
          active
        }
      />
    </mesh>
  );
}

function DoorPanel({
  door,
  wall,
  floorBaseY,
  active,
  material,
}: {
  door:
    Door;

  wall:
    Wall;

  floorBaseY:
    number;

  active:
    boolean;

  material:
    MaterialStyle;
}) {
  const length =
    getWallLength(
      wall
    );

  if (
    length <=
    0
  ) {
    return null;
  }

  const unitX =
    (
      wall.end.x -
      wall.start.x
    ) /
    length;

  const unitZ =
    (
      wall.end.y -
      wall.start.y
    ) /
    length;

  const distance =
    door.position *
    length;

  const angle =
    Math.atan2(
      unitZ,
      unitX
    );

  return (
    <mesh
      position={[
        wall.start.x +
          unitX *
            distance,

        floorBaseY +
          door.height /
            2,

        wall.start.y +
          unitZ *
            distance,
      ]}
      rotation={[
        0,
        -angle,
        0,
      ]}
      castShadow={
        active
      }
      receiveShadow
    >
      <boxGeometry
        args={[
          Math.max(
            0.1,

            door.width -
              0.06
          ),

          Math.max(
            0.1,

            door.height -
              0.04
          ),

          0.05,
        ]}
      />

      <FinishMaterial
        material={
          material
        }
        active={
          active
        }
      />
    </mesh>
  );
}

function WindowPanel({
  windowItem,
  wall,
  floorBaseY,
  active,
}: {
  windowItem:
    WindowItem;

  wall:
    Wall;

  floorBaseY:
    number;

  active:
    boolean;
}) {
  const length =
    getWallLength(
      wall
    );

  if (
    length <=
    0
  ) {
    return null;
  }

  const unitX =
    (
      wall.end.x -
      wall.start.x
    ) /
    length;

  const unitZ =
    (
      wall.end.y -
      wall.start.y
    ) /
    length;

  const distance =
    windowItem.position *
    length;

  const angle =
    Math.atan2(
      unitZ,
      unitX
    );

  return (
    <mesh
      position={[
        wall.start.x +
          unitX *
            distance,

        floorBaseY +
          windowItem.sillHeight +
          windowItem.height /
            2,

        wall.start.y +
          unitZ *
            distance,
      ]}
      rotation={[
        0,
        -angle,
        0,
      ]}
      castShadow
    >
      <boxGeometry
        args={[
          Math.max(
            0.1,

            windowItem.width -
              0.05
          ),

          Math.max(
            0.1,

            windowItem.height -
              0.05
          ),

          0.04,
        ]}
      />

      <meshPhysicalMaterial
        color="#9cd8eb"
        transparent
        opacity={
          active
            ? 0.5
            : 0.24
        }
        roughness={
          0.08
        }
        transmission={
          0.3
        }
        metalness={
          0
        }
      />
    </mesh>
  );
}

function WallWithOpenings({
  wall,
  doors,
  windows,
  floorBaseY,
  active,
  wallMaterial,
  doorMaterial,
}: {
  wall:
    Wall;

  doors:
    Door[];

  windows:
    WindowItem[];

  floorBaseY:
    number;

  active:
    boolean;

  wallMaterial:
    MaterialStyle;

  doorMaterial:
    MaterialStyle;
}) {
  const wallLength =
    getWallLength(
      wall
    );

  if (
    wallLength <=
    0
  ) {
    return null;
  }

  const openings =
    createOpenings(
      wall,
      doors,
      windows
    );

  if (
    openings.length ===
    0
  ) {
    return (
      <WallSegment
        wall={
          wall
        }
        startDistance={
          0
        }
        endDistance={
          wallLength
        }
        bottom={
          0
        }
        height={
          wall.height
        }
        floorBaseY={
          floorBaseY
        }
        active={
          active
        }
        material={
          wallMaterial
        }
      />
    );
  }

  const horizontalPoints =
    new Set<number>([
      0,
      wallLength,
    ]);

  for (
    const opening
    of openings
  ) {
    horizontalPoints.add(
      opening.start
    );

    horizontalPoints.add(
      opening.end
    );
  }

  const horizontal =
    Array.from(
      horizontalPoints
    ).sort(
      (a, b) =>
        a - b
    );

  const pieces:
    ReactNode[] = [];

  for (
    let index = 0;
    index <
    horizontal.length -
      1;
    index += 1
  ) {
    const start =
      horizontal[
        index
      ];

    const end =
      horizontal[
        index + 1
      ];

    const middle =
      (
        start +
        end
      ) /
      2;

    const activeOpenings =
      openings.filter(
        (opening) =>
          middle >
            opening.start -
              0.0001 &&
          middle <
            opening.end +
              0.0001
      );

    if (
      activeOpenings.length ===
      0
    ) {
      pieces.push(
        <WallSegment
          key={`full-${wall.id}-${index}`}
          wall={
            wall
          }
          startDistance={
            start
          }
          endDistance={
            end
          }
          bottom={
            0
          }
          height={
            wall.height
          }
          floorBaseY={
            floorBaseY
          }
          active={
            active
          }
          material={
            wallMaterial
          }
        />
      );

      continue;
    }

    const verticalPoints =
      new Set<number>([
        0,
        wall.height,
      ]);

    for (
      const opening
      of activeOpenings
    ) {
      verticalPoints.add(
        Math.max(
          0,
          opening.bottom
        )
      );

      verticalPoints.add(
        Math.min(
          wall.height,
          opening.top
        )
      );
    }

    const vertical =
      Array.from(
        verticalPoints
      ).sort(
        (a, b) =>
          a - b
      );

    for (
      let v = 0;
      v <
      vertical.length -
        1;
      v += 1
    ) {
      const bottom =
        vertical[v];

      const top =
        vertical[
          v + 1
        ];

      const middleY =
        (
          bottom +
          top
        ) /
        2;

      const insideOpening =
        activeOpenings.some(
          (opening) =>
            middleY >
              opening.bottom +
                0.0001 &&
            middleY <
              opening.top -
                0.0001
        );

      if (
        insideOpening
      ) {
        continue;
      }

      pieces.push(
        <WallSegment
          key={`piece-${wall.id}-${index}-${v}`}
          wall={
            wall
          }
          startDistance={
            start
          }
          endDistance={
            end
          }
          bottom={
            bottom
          }
          height={
            top -
            bottom
          }
          floorBaseY={
            floorBaseY
          }
          active={
            active
          }
          material={
            wallMaterial
          }
        />
      );
    }
  }

  return (
    <>
      {pieces}

      {doors.map(
        (door) => (
          <DoorPanel
            key={
              door.id
            }
            door={
              door
            }
            wall={
              wall
            }
            floorBaseY={
              floorBaseY
            }
            active={
              active
            }
            material={
              doorMaterial
            }
          />
        )
      )}

      {windows.map(
        (
          windowItem
        ) => (
          <WindowPanel
            key={
              windowItem.id
            }
            windowItem={
              windowItem
            }
            wall={
              wall
            }
            floorBaseY={
              floorBaseY
            }
            active={
              active
            }
          />
        )
      )}
    </>
  );
}

function createRoomShape(
  polygon:
    Point[]
) {
  const shape =
    new Shape();

  if (
    polygon.length ===
    0
  ) {
    return shape;
  }

  shape.moveTo(
    polygon[0].x,
    polygon[0].y
  );

  for (
    let index = 1;
    index <
    polygon.length;
    index += 1
  ) {
    shape.lineTo(
      polygon[index].x,
      polygon[index].y
    );
  }

  shape.closePath();

  return shape;
}

function HorizontalSlab({
  polygon,
  topY,
  thickness,
  material,
  opacity,
  active,
}: {
  polygon:
    Point[];

  topY:
    number;

  thickness:
    number;

  material:
    MaterialStyle;

  opacity:
    number;

  active:
    boolean;
}) {
  const shape =
    useMemo(
      () =>
        createRoomShape(
          polygon
        ),
      [
        polygon,
      ]
    );

  const options =
    useMemo(
      () => ({
        depth:
          thickness,

        bevelEnabled:
          false,

        steps:
          1,
      }),
      [
        thickness,
      ]
    );

  return (
    <mesh
      position={[
        0,
        topY,
        0,
      ]}
      rotation={[
        Math.PI /
          2,
        0,
        0,
      ]}
      receiveShadow
      castShadow={
        active
      }
    >
      <extrudeGeometry
        args={[
          shape,
          options,
        ]}
      />

      <FinishMaterial
        material={
          material
        }
        active={
          active
        }
        opacity={
          opacity
        }
      />
    </mesh>
  );
}

function FloorSurfaces({
  walls,
  floorBaseY,
  floorHeight,
  active,
  showCeiling,
  floorMaterial,
}: {
  walls:
    Wall[];

  floorBaseY:
    number;

  floorHeight:
    number;

  active:
    boolean;

  showCeiling:
    boolean;

  floorMaterial:
    MaterialStyle;
}) {
  const rooms =
    useMemo(
      () =>
        detectRooms(
          walls
        ),
      [
        walls,
      ]
    );

  if (
    rooms.length ===
    0
  ) {
    return null;
  }

  return (
    <>
      {rooms.map(
        (room) => (
          <HorizontalSlab
            key={`floor-${room.id}`}
            polygon={
              room.polygon
            }
            topY={
              floorBaseY
            }
            thickness={
              FLOOR_SLAB_THICKNESS
            }
            material={
              floorMaterial
            }
            opacity={
              1
            }
            active={
              active
            }
          />
        )
      )}

      {showCeiling &&
        rooms.map(
          (room) => (
            <HorizontalSlab
              key={`ceiling-${room.id}`}
              polygon={
                room.polygon
              }
              topY={
                floorBaseY +
                floorHeight +
                CEILING_THICKNESS
              }
              thickness={
                CEILING_THICKNESS
              }
              material="white"
              opacity={
                0.16
              }
              active={
                active
              }
            />
          )
        )}
    </>
  );
}

function getRoofBounds(
  walls:
    Wall[]
): RoofBounds | null {
  const rooms =
    detectRooms(
      walls
    );

  const points =
    rooms.flatMap(
      (room) =>
        room.polygon
    );

  if (
    points.length ===
    0
  ) {
    return null;
  }

  const xs =
    points.map(
      (point) =>
        point.x
    );

  const zs =
    points.map(
      (point) =>
        point.y
    );

  const minX =
    Math.min(
      ...xs
    );

  const maxX =
    Math.max(
      ...xs
    );

  const minZ =
    Math.min(
      ...zs
    );

  const maxZ =
    Math.max(
      ...zs
    );

  return {
    minX,
    maxX,
    minZ,
    maxZ,

    centerX:
      (
        minX +
        maxX
      ) /
      2,

    centerZ:
      (
        minZ +
        maxZ
      ) /
      2,

    width:
      maxX -
      minX,

    depth:
      maxZ -
      minZ,
  };
}

function getExteriorWalls(
  walls:
    Wall[]
) {
  const rooms =
    detectRooms(
      walls
    );

  const counts =
    new Map<
      string,
      number
    >();

  for (
    const room
    of rooms
  ) {
    for (
      const wallId
      of room.wallIds
    ) {
      counts.set(
        wallId,

        (
          counts.get(
            wallId
          ) ??
          0
        ) +
          1
      );
    }
  }

  return walls.filter(
    (wall) =>
      counts.get(
        wall.id
      ) ===
      1
  );
}

function ParapetSegment({
  wall,
  roofY,
  active,
  material,
}: {
  wall:
    Wall;

  roofY:
    number;

  active:
    boolean;

  material:
    MaterialStyle;
}) {
  const length =
    getWallLength(
      wall
    );

  if (
    length <=
    0
  ) {
    return null;
  }

  const centerX =
    (
      wall.start.x +
      wall.end.x
    ) /
    2;

  const centerZ =
    (
      wall.start.y +
      wall.end.y
    ) /
    2;

  const angle =
    Math.atan2(
      wall.end.y -
        wall.start.y,

      wall.end.x -
        wall.start.x
    );

  return (
    <mesh
      position={[
        centerX,

        roofY +
          PARAPET_HEIGHT /
            2,

        centerZ,
      ]}
      rotation={[
        0,
        -angle,
        0,
      ]}
      castShadow={
        active
      }
      receiveShadow
    >
      <boxGeometry
        args={[
          length,

          PARAPET_HEIGHT,

          Math.max(
            PARAPET_THICKNESS,
            wall.thickness
          ),
        ]}
      />

      <FinishMaterial
        material={
          material
        }
        active={
          active
        }
      />
    </mesh>
  );
}

function FlatRoof({
  walls,
  roofBaseY,
  active,
  parapetEnabled,
  roofMaterial,
  wallMaterial,
}: {
  walls:
    Wall[];

  roofBaseY:
    number;

  active:
    boolean;

  parapetEnabled:
    boolean;

  roofMaterial:
    MaterialStyle;

  wallMaterial:
    MaterialStyle;
}) {
  const rooms =
    useMemo(
      () =>
        detectRooms(
          walls
        ),
      [
        walls,
      ]
    );

  const exteriorWalls =
    useMemo(
      () =>
        getExteriorWalls(
          walls
        ),
      [
        walls,
      ]
    );

  if (
    rooms.length ===
    0
  ) {
    return null;
  }

  const roofTop =
    roofBaseY +
    ROOF_SLAB_THICKNESS;

  return (
    <>
      {rooms.map(
        (room) => (
          <HorizontalSlab
            key={`roof-${room.id}`}
            polygon={
              room.polygon
            }
            topY={
              roofTop
            }
            thickness={
              ROOF_SLAB_THICKNESS
            }
            material={
              roofMaterial
            }
            opacity={
              1
            }
            active={
              active
            }
          />
        )
      )}

      {parapetEnabled &&
        exteriorWalls.map(
          (wall) => (
            <ParapetSegment
              key={`parapet-${wall.id}`}
              wall={
                wall
              }
              roofY={
                roofTop
              }
              active={
                active
              }
              material={
                wallMaterial
              }
            />
          )
        )}
    </>
  );
}

function GableRoof({
  walls,
  roofBaseY,
  active,
  material,
}: {
  walls:
    Wall[];

  roofBaseY:
    number;

  active:
    boolean;

  material:
    MaterialStyle;
}) {
  const bounds =
    useMemo(
      () =>
        getRoofBounds(
          walls
        ),
      [
        walls,
      ]
    );

  if (
    !bounds
  ) {
    return null;
  }

  const pitch =
    (
      ROOF_PITCH_DEGREES *
      Math.PI
    ) /
    180;

  if (
    bounds.width >=
    bounds.depth
  ) {
    const halfSpan =
      bounds.depth /
        2 +
      ROOF_OVERHANG;

    const length =
      bounds.width +
      ROOF_OVERHANG *
        2;

    const rise =
      halfSpan *
      Math.tan(
        pitch
      );

    const slopeLength =
      Math.hypot(
        halfSpan,
        rise
      );

    const centerY =
      roofBaseY +
      rise /
        2 +
      0.05;

    return (
      <>
        <mesh
          position={[
            bounds.centerX,
            centerY,
            bounds.centerZ -
              halfSpan /
                2,
          ]}
          rotation={[
            -pitch,
            0,
            0,
          ]}
          castShadow={
            active
          }
          receiveShadow
        >
          <boxGeometry
            args={[
              length,
              ROOF_PLANE_THICKNESS,
              slopeLength,
            ]}
          />

          <FinishMaterial
            material={
              material
            }
            active={
              active
            }
          />
        </mesh>

        <mesh
          position={[
            bounds.centerX,
            centerY,
            bounds.centerZ +
              halfSpan /
                2,
          ]}
          rotation={[
            pitch,
            0,
            0,
          ]}
          castShadow={
            active
          }
          receiveShadow
        >
          <boxGeometry
            args={[
              length,
              ROOF_PLANE_THICKNESS,
              slopeLength,
            ]}
          />

          <FinishMaterial
            material={
              material
            }
            active={
              active
            }
          />
        </mesh>
      </>
    );
  }

  const halfSpan =
    bounds.width /
      2 +
    ROOF_OVERHANG;

  const length =
    bounds.depth +
    ROOF_OVERHANG *
      2;

  const rise =
    halfSpan *
    Math.tan(
      pitch
    );

  const slopeLength =
    Math.hypot(
      halfSpan,
      rise
    );

  const centerY =
    roofBaseY +
    rise /
      2 +
    0.05;

  return (
    <>
      <mesh
        position={[
          bounds.centerX -
            halfSpan /
              2,

          centerY,

          bounds.centerZ,
        ]}
        rotation={[
          0,
          0,
          pitch,
        ]}
        castShadow={
          active
        }
        receiveShadow
      >
        <boxGeometry
          args={[
            slopeLength,
            ROOF_PLANE_THICKNESS,
            length,
          ]}
        />

        <FinishMaterial
          material={
            material
          }
          active={
            active
          }
        />
      </mesh>

      <mesh
        position={[
          bounds.centerX +
            halfSpan /
              2,

          centerY,

          bounds.centerZ,
        ]}
        rotation={[
          0,
          0,
          -pitch,
        ]}
        castShadow={
          active
        }
        receiveShadow
      >
        <boxGeometry
          args={[
            slopeLength,
            ROOF_PLANE_THICKNESS,
            length,
          ]}
        />

        <FinishMaterial
          material={
            material
          }
          active={
            active
          }
        />
      </mesh>
    </>
  );
}

function createPolygonGeometry(
  vertices:
    RoofVertex[]
) {
  const geometry =
    new BufferGeometry();

  geometry.setAttribute(
    "position",

    new Float32BufferAttribute(
      vertices.flat(),
      3
    )
  );

  if (
    vertices.length ===
    3
  ) {
    geometry.setIndex([
      0,
      1,
      2,
    ]);
  } else {
    geometry.setIndex([
      0,
      1,
      2,

      0,
      2,
      3,
    ]);
  }

  geometry.computeVertexNormals();

  return geometry;
}

function RoofPolygon({
  vertices,
  active,
  material,
}: {
  vertices:
    RoofVertex[];

  active:
    boolean;

  material:
    MaterialStyle;
}) {
  const geometry =
    useMemo(
      () =>
        createPolygonGeometry(
          vertices
        ),
      [
        vertices,
      ]
    );

  return (
    <mesh
      geometry={
        geometry
      }
      castShadow={
        active
      }
      receiveShadow
    >
      <FinishMaterial
        material={
          material
        }
        active={
          active
        }
        side={
          DoubleSide
        }
      />
    </mesh>
  );
}

function HipRoof({
  walls,
  roofBaseY,
  active,
  material,
}: {
  walls:
    Wall[];

  roofBaseY:
    number;

  active:
    boolean;

  material:
    MaterialStyle;
}) {
  const bounds =
    useMemo(
      () =>
        getRoofBounds(
          walls
        ),
      [
        walls,
      ]
    );

  if (
    !bounds
  ) {
    return null;
  }

  const pitch =
    (
      ROOF_PITCH_DEGREES *
      Math.PI
    ) /
    180;

  const minX =
    bounds.minX -
    ROOF_OVERHANG;

  const maxX =
    bounds.maxX +
    ROOF_OVERHANG;

  const minZ =
    bounds.minZ -
    ROOF_OVERHANG;

  const maxZ =
    bounds.maxZ +
    ROOF_OVERHANG;

  const width =
    maxX -
    minX;

  const depth =
    maxZ -
    minZ;

  const eaveY =
    roofBaseY +
    0.04;

  if (
    width >=
    depth
  ) {
    const span =
      depth /
      2;

    const rise =
      span *
      Math.tan(
        pitch
      );

    const ridgeY =
      eaveY +
      rise;

    const ridgeHalf =
      Math.max(
        0,

        width /
            2 -
          span
      );

    const left =
      bounds.centerX -
      ridgeHalf;

    const right =
      bounds.centerX +
      ridgeHalf;

    if (
      ridgeHalf <
      0.001
    ) {
      return (
        <>
          <RoofPolygon
            active={
              active
            }
            material={
              material
            }
            vertices={[
              [
                minX,
                eaveY,
                minZ,
              ],

              [
                maxX,
                eaveY,
                minZ,
              ],

              [
                bounds.centerX,
                ridgeY,
                bounds.centerZ,
              ],
            ]}
          />

          <RoofPolygon
            active={
              active
            }
            material={
              material
            }
            vertices={[
              [
                maxX,
                eaveY,
                maxZ,
              ],

              [
                minX,
                eaveY,
                maxZ,
              ],

              [
                bounds.centerX,
                ridgeY,
                bounds.centerZ,
              ],
            ]}
          />

          <RoofPolygon
            active={
              active
            }
            material={
              material
            }
            vertices={[
              [
                minX,
                eaveY,
                maxZ,
              ],

              [
                minX,
                eaveY,
                minZ,
              ],

              [
                bounds.centerX,
                ridgeY,
                bounds.centerZ,
              ],
            ]}
          />

          <RoofPolygon
            active={
              active
            }
            material={
              material
            }
            vertices={[
              [
                maxX,
                eaveY,
                minZ,
              ],

              [
                maxX,
                eaveY,
                maxZ,
              ],

              [
                bounds.centerX,
                ridgeY,
                bounds.centerZ,
              ],
            ]}
          />
        </>
      );
    }

    return (
      <>
        <RoofPolygon
          active={
            active
          }
          material={
            material
          }
          vertices={[
            [
              minX,
              eaveY,
              minZ,
            ],

            [
              maxX,
              eaveY,
              minZ,
            ],

            [
              right,
              ridgeY,
              bounds.centerZ,
            ],

            [
              left,
              ridgeY,
              bounds.centerZ,
            ],
          ]}
        />

        <RoofPolygon
          active={
            active
          }
          material={
            material
          }
          vertices={[
            [
              maxX,
              eaveY,
              maxZ,
            ],

            [
              minX,
              eaveY,
              maxZ,
            ],

            [
              left,
              ridgeY,
              bounds.centerZ,
            ],

            [
              right,
              ridgeY,
              bounds.centerZ,
            ],
          ]}
        />

        <RoofPolygon
          active={
            active
          }
          material={
            material
          }
          vertices={[
            [
              minX,
              eaveY,
              maxZ,
            ],

            [
              minX,
              eaveY,
              minZ,
            ],

            [
              left,
              ridgeY,
              bounds.centerZ,
            ],
          ]}
        />

        <RoofPolygon
          active={
            active
          }
          material={
            material
          }
          vertices={[
            [
              maxX,
              eaveY,
              minZ,
            ],

            [
              maxX,
              eaveY,
              maxZ,
            ],

            [
              right,
              ridgeY,
              bounds.centerZ,
            ],
          ]}
        />
      </>
    );
  }

  const span =
    width /
    2;

  const rise =
    span *
    Math.tan(
      pitch
    );

  const ridgeY =
    eaveY +
    rise;

  const ridgeHalf =
    Math.max(
      0,

      depth /
          2 -
        span
    );

  const near =
    bounds.centerZ -
    ridgeHalf;

  const far =
    bounds.centerZ +
    ridgeHalf;

  if (
    ridgeHalf <
    0.001
  ) {
    return (
      <>
        <RoofPolygon
          active={
            active
          }
          material={
            material
          }
          vertices={[
            [
              minX,
              eaveY,
              minZ,
            ],

            [
              maxX,
              eaveY,
              minZ,
            ],

            [
              bounds.centerX,
              ridgeY,
              bounds.centerZ,
            ],
          ]}
        />

        <RoofPolygon
          active={
            active
          }
          material={
            material
          }
          vertices={[
            [
              maxX,
              eaveY,
              maxZ,
            ],

            [
              minX,
              eaveY,
              maxZ,
            ],

            [
              bounds.centerX,
              ridgeY,
              bounds.centerZ,
            ],
          ]}
        />

        <RoofPolygon
          active={
            active
          }
          material={
            material
          }
          vertices={[
            [
              minX,
              eaveY,
              maxZ,
            ],

            [
              minX,
              eaveY,
              minZ,
            ],

            [
              bounds.centerX,
              ridgeY,
              bounds.centerZ,
            ],
          ]}
        />

        <RoofPolygon
          active={
            active
          }
          material={
            material
          }
          vertices={[
            [
              maxX,
              eaveY,
              minZ,
            ],

            [
              maxX,
              eaveY,
              maxZ,
            ],

            [
              bounds.centerX,
              ridgeY,
              bounds.centerZ,
            ],
          ]}
        />
      </>
    );
  }

  return (
    <>
      <RoofPolygon
        active={
          active
        }
        material={
          material
        }
        vertices={[
          [
            minX,
            eaveY,
            minZ,
          ],

          [
            minX,
            eaveY,
            maxZ,
          ],

          [
            bounds.centerX,
            ridgeY,
            far,
          ],

          [
            bounds.centerX,
            ridgeY,
            near,
          ],
        ]}
      />

      <RoofPolygon
        active={
          active
        }
        material={
          material
        }
        vertices={[
          [
            maxX,
            eaveY,
            maxZ,
          ],

          [
            maxX,
            eaveY,
            minZ,
          ],

          [
            bounds.centerX,
            ridgeY,
            near,
          ],

          [
            bounds.centerX,
            ridgeY,
            far,
          ],
        ]}
      />

      <RoofPolygon
        active={
          active
        }
        material={
          material
        }
        vertices={[
          [
            maxX,
            eaveY,
            minZ,
          ],

          [
            minX,
            eaveY,
            minZ,
          ],

          [
            bounds.centerX,
            ridgeY,
            near,
          ],
        ]}
      />

      <RoofPolygon
        active={
          active
        }
        material={
          material
        }
        vertices={[
          [
            minX,
            eaveY,
            maxZ,
          ],

          [
            maxX,
            eaveY,
            maxZ,
          ],

          [
            bounds.centerX,
            ridgeY,
            far,
          ],
        ]}
      />
    </>
  );
}

function Roof({
  walls,
  roofBaseY,
  active,
  roofStyle,
  parapetEnabled,
  roofMaterial,
  wallMaterial,
}: {
  walls:
    Wall[];

  roofBaseY:
    number;

  active:
    boolean;

  roofStyle:
    RoofStyle;

  parapetEnabled:
    boolean;

  roofMaterial:
    MaterialStyle;

  wallMaterial:
    MaterialStyle;
}) {
  if (
    roofStyle ===
    "none"
  ) {
    return null;
  }

  if (
    roofStyle ===
    "flat"
  ) {
    return (
      <FlatRoof
        walls={
          walls
        }
        roofBaseY={
          roofBaseY
        }
        active={
          active
        }
        parapetEnabled={
          parapetEnabled
        }
        roofMaterial={
          roofMaterial
        }
        wallMaterial={
          wallMaterial
        }
      />
    );
  }

  if (
    roofStyle ===
    "gable"
  ) {
    return (
      <GableRoof
        walls={
          walls
        }
        roofBaseY={
          roofBaseY
        }
        active={
          active
        }
        material={
          roofMaterial
        }
      />
    );
  }

  return (
    <HipRoof
      walls={
        walls
      }
      roofBaseY={
        roofBaseY
      }
      active={
        active
      }
      material={
        roofMaterial
      }
    />
  );
}

function Staircase3D({
  stair,
  floorBaseY,
  floorRise,
  active,
}: {
  stair:
    Stair;

  floorBaseY:
    number;

  floorRise:
    number;

  active:
    boolean;
}) {
  const dx =
    stair.end.x -
    stair.start.x;

  const dz =
    stair.end.y -
    stair.start.y;

  const length =
    Math.hypot(
      dx,
      dz
    );

  if (
    length <=
      0 ||
    stair.stepCount <=
      0
  ) {
    return null;
  }

  const unitX =
    dx /
    length;

  const unitZ =
    dz /
    length;

  const angle =
    Math.atan2(
      unitZ,
      unitX
    );

  const tread =
    length /
    stair.stepCount;

  const riser =
    floorRise /
    stair.stepCount;

  return (
    <group>
      {Array.from({
        length:
          stair.stepCount,
      }).map(
        (
          _,
          index
        ) => {
          const distance =
            (
              index +
              0.5
            ) *
            tread;

          const height =
            (
              index +
              1
            ) *
            riser;

          return (
            <mesh
              key={
                index
              }
              position={[
                stair.start.x +
                  unitX *
                    distance,

                floorBaseY +
                  height /
                    2,

                stair.start.y +
                  unitZ *
                    distance,
              ]}
              rotation={[
                0,
                -angle,
                0,
              ]}
              castShadow={
                active
              }
              receiveShadow
            >
              <boxGeometry
                args={[
                  tread +
                    0.01,
                  height,
                  stair.width,
                ]}
              />

              <FinishMaterial
                material="concrete"
                active={
                  active
                }
              />
            </mesh>
          );
        }
      )}
    </group>
  );
}

function Furniture3D({
  item,
  floorBaseY,
  active,
  material,
}: {
  item:
    FurnitureItem;

  floorBaseY:
    number;

  active:
    boolean;

  material:
    MaterialStyle;
}) {
  const rotation =
    -(
      item.rotation *
      Math.PI
    ) /
    180;

  if (
    item.type ===
    "sofa"
  ) {
    return (
      <group
        position={[
          item.position.x,
          floorBaseY,
          item.position.y,
        ]}
        rotation={[
          0,
          rotation,
          0,
        ]}
      >
        <mesh
          position={[
            0,

            item.height *
              0.23,

            0,
          ]}
          castShadow={
            active
          }
          receiveShadow
        >
          <boxGeometry
            args={[
              item.width,

              item.height *
                0.46,

              item.depth,
            ]}
          />

          <FinishMaterial
            material={
              material
            }
            active={
              active
            }
          />
        </mesh>

        <mesh
          position={[
            0,

            item.height *
              0.65,

            item.depth *
              0.38,
          ]}
          castShadow={
            active
          }
        >
          <boxGeometry
            args={[
              item.width,

              item.height *
                0.7,

              item.depth *
                0.22,
            ]}
          />

          <FinishMaterial
            material={
              material
            }
            active={
              active
            }
          />
        </mesh>
      </group>
    );
  }

  if (
    item.type ===
    "bed"
  ) {
    return (
      <group
        position={[
          item.position.x,
          floorBaseY,
          item.position.y,
        ]}
        rotation={[
          0,
          rotation,
          0,
        ]}
      >
        <mesh
          position={[
            0,

            item.height /
              2,

            0,
          ]}
          castShadow={
            active
          }
          receiveShadow
        >
          <boxGeometry
            args={[
              item.width,
              item.height,
              item.depth,
            ]}
          />

          <FinishMaterial
            material={
              material
            }
            active={
              active
            }
          />
        </mesh>

        <mesh
          position={[
            0,

            item.height +
              0.35,

            item.depth /
                2 -
              0.06,
          ]}
          castShadow={
            active
          }
        >
          <boxGeometry
            args={[
              item.width,
              0.7,
              0.12,
            ]}
          />

          <FinishMaterial
            material={
              material
            }
            active={
              active
            }
          />
        </mesh>
      </group>
    );
  }

  return (
    <mesh
      position={[
        item.position.x,

        floorBaseY +
          item.height /
            2,

        item.position.y,
      ]}
      rotation={[
        0,
        rotation,
        0,
      ]}
      castShadow={
        active
      }
      receiveShadow
    >
      <boxGeometry
        args={[
          item.width,
          item.height,
          item.depth,
        ]}
      />

      <FinishMaterial
        material={
          material
        }
        active={
          active
        }
      />
    </mesh>
  );
}

function HouseFloor({
  walls,
  doors,
  windows,
  stairs,
  furniture,
  floorBaseY,
  stairRise,
  active,
  isTopFloor,
  wallMaterial,
  floorMaterial,
  doorMaterial,
  furnitureMaterial,
}: {
  walls:
    Wall[];

  doors:
    Door[];

  windows:
    WindowItem[];

  stairs:
    Stair[];

  furniture:
    FurnitureItem[];

  floorBaseY:
    number;

  stairRise:
    number;

  active:
    boolean;

  isTopFloor:
    boolean;

  wallMaterial:
    MaterialStyle;

  floorMaterial:
    MaterialStyle;

  doorMaterial:
    MaterialStyle;

  furnitureMaterial:
    MaterialStyle;
}) {
  const floorHeight =
    getFloorHeight(
      walls
    );

  return (
    <>
      <FloorSurfaces
        walls={
          walls
        }
        floorBaseY={
          floorBaseY
        }
        floorHeight={
          floorHeight
        }
        active={
          active
        }
        showCeiling={
          !isTopFloor
        }
        floorMaterial={
          floorMaterial
        }
      />

      {walls.map(
        (wall) => (
          <WallWithOpenings
            key={
              wall.id
            }
            wall={
              wall
            }
            doors={
              doors.filter(
                (door) =>
                  door.wallId ===
                  wall.id
              )
            }
            windows={
              windows.filter(
                (
                  windowItem
                ) =>
                  windowItem.wallId ===
                  wall.id
              )
            }
            floorBaseY={
              floorBaseY
            }
            active={
              active
            }
            wallMaterial={
              wallMaterial
            }
            doorMaterial={
              doorMaterial
            }
          />
        )
      )}

      {stairs.map(
        (stair) => (
          <Staircase3D
            key={
              stair.id
            }
            stair={
              stair
            }
            floorBaseY={
              floorBaseY
            }
            floorRise={
              stairRise
            }
            active={
              active
            }
          />
        )
      )}

      {furniture.map(
        (item) => (
          <Furniture3D
            key={
              item.id
            }
            item={
              item
            }
            floorBaseY={
              floorBaseY
            }
            active={
              active
            }
            material={
              furnitureMaterial
            }
          />
        )
      )}
    </>
  );
}

function HouseModel() {
  const floorData =
    useHouseStore(
      (state) =>
        state.floorData
    );

  const activeFloorId =
    useHouseStore(
      (state) =>
        state.activeFloorId
    );

  const roofStyle =
    useHouseStore(
      (state) =>
        state.roofStyle
    );

  const parapetEnabled =
    useHouseStore(
      (state) =>
        state.parapetEnabled
    );

  const materials =
    useHouseStore(
      (state) =>
        state.materials
    );

  const ground =
    floorData.ground;

  const first =
    floorData.first;

  const groundHeight =
    getFloorHeight(
      ground.walls
    );

  const firstHeight =
    getFloorHeight(
      first.walls
    );

  const firstBase =
    groundHeight +
    FLOOR_SLAB_GAP;

  const hasFirstFloor =
    first.walls.length >
    0;

  const roofWalls =
    hasFirstFloor
      ? first.walls
      : ground.walls;

  const roofBaseY =
    hasFirstFloor
      ? firstBase +
        firstHeight
      : groundHeight;

  const roofActive =
    hasFirstFloor
      ? activeFloorId ===
        "first"
      : activeFloorId ===
        "ground";

  return (
    <>
      <HouseFloor
        walls={
          ground.walls
        }
        doors={
          ground.doors
        }
        windows={
          ground.windows
        }
        stairs={
          ground.stairs
        }
        furniture={
          ground.furniture
        }
        floorBaseY={
          0
        }
        stairRise={
          firstBase
        }
        active={
          activeFloorId ===
          "ground"
        }
        isTopFloor={
          !hasFirstFloor
        }
        wallMaterial={
          materials.wall
        }
        floorMaterial={
          materials.floor
        }
        doorMaterial={
          materials.door
        }
        furnitureMaterial={
          materials.furniture
        }
      />

      <HouseFloor
        walls={
          first.walls
        }
        doors={
          first.doors
        }
        windows={
          first.windows
        }
        stairs={
          first.stairs
        }
        furniture={
          first.furniture
        }
        floorBaseY={
          firstBase
        }
        stairRise={
          firstHeight +
          FLOOR_SLAB_GAP
        }
        active={
          activeFloorId ===
          "first"
        }
        isTopFloor={
          hasFirstFloor
        }
        wallMaterial={
          materials.wall
        }
        floorMaterial={
          materials.floor
        }
        doorMaterial={
          materials.door
        }
        furnitureMaterial={
          materials.furniture
        }
      />

      <Roof
        walls={
          roofWalls
        }
        roofBaseY={
          roofBaseY
        }
        active={
          roofActive
        }
        roofStyle={
          roofStyle
        }
        parapetEnabled={
          parapetEnabled
        }
        roofMaterial={
          materials.roof
        }
        wallMaterial={
          materials.wall
        }
      />
    </>
  );
}

function MaterialSelect({
  label,
  category,
}: {
  label:
    string;

  category:
    MaterialCategory;
}) {
  const materials =
    useHouseStore(
      (state) =>
        state.materials
    );

  const setMaterial =
    useHouseStore(
      (state) =>
        state.setMaterial
    );

  const value =
    materials[
      category
    ];

  return (
    <label
      style={{
        display:
          "grid",

        gridTemplateColumns:
          "70px 14px 1fr",

        alignItems:
          "center",

        gap:
          7,
      }}
    >
      <span>
        {label}
      </span>

      <span
        style={{
          width:
            12,

          height:
            12,

          borderRadius:
            4,

          background:
            MATERIAL_LIBRARY[
              value
            ].color,

          border:
            "1px solid rgba(0,0,0,.18)",
        }}
      />

      <select
        value={
          value
        }
        onChange={(
          event
        ) =>
          setMaterial(
            category,

            event.target
              .value as MaterialStyle
          )
        }
      >
        {MATERIAL_OPTIONS[
          category
        ].map(
          (material) => (
            <option
              key={
                material
              }
              value={
                material
              }
            >
              {
                MATERIAL_LIBRARY[
                  material
                ].label
              }
            </option>
          )
        )}
      </select>
    </label>
  );
}

function ViewControls() {
  const [
    materialsOpen,
    setMaterialsOpen,
  ] =
    useState(
      false
    );

  const [
    lightingOpen,
    setLightingOpen,
  ] =
    useState(
      false
    );

  const roofStyle =
    useHouseStore(
      (state) =>
        state.roofStyle
    );

  const setRoofStyle =
    useHouseStore(
      (state) =>
        state.setRoofStyle
    );

  const parapetEnabled =
    useHouseStore(
      (state) =>
        state.parapetEnabled
    );

  const setParapetEnabled =
    useHouseStore(
      (state) =>
        state.setParapetEnabled
    );

  const lightingMode =
    useHouseStore(
      (state) =>
        state.lightingMode
    );

  const setLightingMode =
    useHouseStore(
      (state) =>
        state.setLightingMode
    );

  const sunAzimuth =
    useHouseStore(
      (state) =>
        state.sunAzimuth
    );

  const setSunAzimuth =
    useHouseStore(
      (state) =>
        state.setSunAzimuth
    );

  const sunElevation =
    useHouseStore(
      (state) =>
        state.sunElevation
    );

  const setSunElevation =
    useHouseStore(
      (state) =>
        state.setSunElevation
    );

  return (
    <div
      style={{
        position:
          "absolute",

        top:
          12,

        right:
          12,

        zIndex:
          20,

        display:
          "flex",

        flexDirection:
          "column",

        alignItems:
          "flex-end",

        gap:
          8,
      }}
    >
      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          gap:
            7,

          padding:
            "8px 10px",

          background:
            "rgba(255,255,255,.96)",

          border:
            "1px solid #d9e0dc",

          borderRadius:
            10,

          boxShadow:
            "0 4px 16px rgba(0,0,0,.08)",

          fontSize:
            12,
        }}
      >
        <strong>
          Roof
        </strong>

        <select
          value={
            roofStyle
          }
          onChange={(
            event
          ) =>
            setRoofStyle(
              event.target
                .value as RoofStyle
            )
          }
        >
          <option value="flat">
            Flat
          </option>

          <option value="gable">
            Gable
          </option>

          <option value="hip">
            Hip
          </option>

          <option value="none">
            No Roof
          </option>
        </select>

        <label>
          <input
            type="checkbox"
            checked={
              parapetEnabled
            }
            disabled={
              roofStyle !==
              "flat"
            }
            onChange={(
              event
            ) =>
              setParapetEnabled(
                event.target
                  .checked
              )
            }
          />{" "}
          Parapet
        </label>

        <button
          type="button"
          onClick={() =>
            setMaterialsOpen(
              (value) =>
                !value
            )
          }
        >
          Materials
        </button>

        <button
          type="button"
          onClick={() =>
            setLightingOpen(
              (value) =>
                !value
            )
          }
        >
          Lighting
        </button>
      </div>

      {materialsOpen && (
        <div
          style={{
            display:
              "grid",

            gap:
              9,

            minWidth:
              245,

            padding:
              12,

            background:
              "rgba(255,255,255,.97)",

            border:
              "1px solid #d9e0dc",

            borderRadius:
              10,

            boxShadow:
              "0 8px 24px rgba(0,0,0,.10)",

            fontSize:
              12,
          }}
        >
          <strong>
            Building finishes
          </strong>

          <MaterialSelect
            label="Walls"
            category="wall"
          />

          <MaterialSelect
            label="Floor"
            category="floor"
          />

          <MaterialSelect
            label="Roof"
            category="roof"
          />

          <MaterialSelect
            label="Doors"
            category="door"
          />

          <MaterialSelect
            label="Furniture"
            category="furniture"
          />
        </div>
      )}

      {lightingOpen && (
        <div
          style={{
            display:
              "grid",

            gap:
              12,

            minWidth:
              255,

            padding:
              12,

            background:
              "rgba(255,255,255,.97)",

            border:
              "1px solid #d9e0dc",

            borderRadius:
              10,

            boxShadow:
              "0 8px 24px rgba(0,0,0,.10)",

            fontSize:
              12,
          }}
        >
          <strong>
            Sun & lighting
          </strong>

          <label
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "80px 1fr",

              alignItems:
                "center",

              gap:
                8,
            }}
          >
            <span>
              Scene
            </span>

            <select
              value={
                lightingMode
              }
              onChange={(
                event
              ) =>
                setLightingMode(
                  event.target
                    .value as LightingMode
                )
              }
            >
              <option value="day">
                Day
              </option>

              <option value="sunset">
                Sunset
              </option>

              <option value="night">
                Night
              </option>
            </select>
          </label>

          <label>
            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                marginBottom:
                  4,
              }}
            >
              <span>
                Sun direction
              </span>

              <strong>
                {Math.round(
                  sunAzimuth
                )}
                °
              </strong>
            </div>

            <input
              type="range"
              min="0"
              max="359"
              step="1"
              value={
                sunAzimuth
              }
              onChange={(
                event
              ) =>
                setSunAzimuth(
                  Number(
                    event.target
                      .value
                  )
                )
              }
              style={{
                width:
                  "100%",
              }}
            />
          </label>

          <label>
            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                marginBottom:
                  4,
              }}
            >
              <span>
                Sun height
              </span>

              <strong>
                {Math.round(
                  sunElevation
                )}
                °
              </strong>
            </div>

            <input
              type="range"
              min="5"
              max="85"
              step="1"
              value={
                sunElevation
              }
              onChange={(
                event
              ) =>
                setSunElevation(
                  Number(
                    event.target
                      .value
                  )
                )
              }
              style={{
                width:
                  "100%",
              }}
            />
          </label>

          <div
            style={{
              padding:
                "8px 9px",

              borderRadius:
                7,

              background:
                "#f3f6f4",

              lineHeight:
                1.4,

              color:
                "#52605a",
            }}
          >
            Lower sun height creates longer architectural shadows.
          </div>
        </div>
      )}
    </div>
  );
}

function LightingScene() {
  const lightingMode =
    useHouseStore(
      (state) =>
        state.lightingMode
    );

  const sunAzimuth =
    useHouseStore(
      (state) =>
        state.sunAzimuth
    );

  const sunElevation =
    useHouseStore(
      (state) =>
        state.sunElevation
    );

  const lighting =
    LIGHTING_LIBRARY[
      lightingMode
    ];

  const sunPosition =
    getSunPosition(
      sunAzimuth,
      sunElevation
    );

  return (
    <>
      <RendererSettings
        exposure={
          lighting.exposure
        }
      />

      <color
        attach="background"
        args={[
          lighting.background,
        ]}
      />

      <fog
        attach="fog"
        args={[
          lighting.background,
          30,
          85,
        ]}
      />

      {lightingMode ===
        "night" && (
        <Stars
          radius={
            80
          }
          depth={
            40
          }
          count={
            2500
          }
          factor={
            3
          }
          saturation={
            0
          }
          fade
          speed={
            0.35
          }
        />
      )}

      <ambientLight
        intensity={
          lighting.ambient
        }
      />

      <hemisphereLight
        intensity={
          lighting.hemisphere
        }
        color={
          lightingMode ===
          "night"
            ? "#7893bd"
            : "#f4f7ff"
        }
        groundColor={
          lighting.ground
        }
      />

      <directionalLight
        position={
          sunPosition
        }
        intensity={
          lighting.sunIntensity
        }
        color={
          lighting.sunColor
        }
        castShadow
        shadow-mapSize-width={
          2048
        }
        shadow-mapSize-height={
          2048
        }
        shadow-camera-left={
          -30
        }
        shadow-camera-right={
          30
        }
        shadow-camera-top={
          30
        }
        shadow-camera-bottom={
          -30
        }
        shadow-camera-near={
          0.5
        }
        shadow-camera-far={
          80
        }
        shadow-bias={
          -0.0004
        }
        shadow-normalBias={
          0.025
        }
      />

      <mesh
        rotation={[
          -Math.PI /
            2,
          0,
          0,
        ]}
        position={[
          0,
          -0.17,
          0,
        ]}
        receiveShadow
      >
        <planeGeometry
          args={[
            80,
            80,
          ]}
        />

        <meshStandardMaterial
          color={
            lighting.ground
          }
          roughness={
            1
          }
        />
      </mesh>

      <gridHelper
        args={[
          40,
          40,
          lighting.gridColor,
          lighting.gridColor,
        ]}
        position={[
          0,
          -0.15,
          0,
        ]}
      />
    </>
  );
}

export default function Model3D() {
  return (
    <div
      style={{
        width:
          "100%",

        height:
          "100%",

        position:
          "relative",
      }}
    >
      <ViewControls />

      <Canvas
        shadows
        dpr={[
          1,
          2,
        ]}
        gl={{
          antialias:
            true,
        }}
        camera={{
          position: [
            11,
            10,
            13,
          ],

          fov:
            45,

          near:
            0.1,

          far:
            1000,
        }}
      >
        <LightingScene />

        <HouseModel />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={
            0.08
          }
          minDistance={
            3
          }
          maxDistance={
            50
          }
          maxPolarAngle={
            Math.PI /
            2.02
          }
        />
      </Canvas>
    </div>
  );
}