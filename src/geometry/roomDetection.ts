import type { Point, Wall } from "../types/house";

export type DetectedRoom = {
  id: string;
  wallIds: string[];
  polygon: Point[];
  area: number;
  centroid: Point;
};

type HalfEdge = {
  id: string;
  wallId: string;

  fromKey: string;
  toKey: string;

  reverseId: string;

  angle: number;
};

const EPSILON = 0.0001;

function pointKey(point: Point) {
  return `${point.x.toFixed(4)},${point.y.toFixed(4)}`;
}

function polygonArea(points: Point[]) {
  let total = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];

    total += current.x * next.y - next.x * current.y;
  }

  return total / 2;
}

function polygonCentroid(points: Point[], signedArea: number): Point {
  if (Math.abs(signedArea) < EPSILON) {
    const total = points.reduce(
      (sum, point) => ({
        x: sum.x + point.x,
        y: sum.y + point.y,
      }),
      { x: 0, y: 0 }
    );

    return {
      x: total.x / points.length,
      y: total.y / points.length,
    };
  }

  let x = 0;
  let y = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];

    const cross = current.x * next.y - next.x * current.y;

    x += (current.x + next.x) * cross;
    y += (current.y + next.y) * cross;
  }

  const divisor = 6 * signedArea;

  return {
    x: x / divisor,
    y: y / divisor,
  };
}

function normalizeAngle(angle: number) {
  const fullTurn = Math.PI * 2;

  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

export function detectRooms(walls: Wall[]): DetectedRoom[] {
  if (walls.length < 3) {
    return [];
  }

  const vertices = new Map<string, Point>();
  const outgoing = new Map<string, string[]>();
  const halfEdges = new Map<string, HalfEdge>();

  function addOutgoing(vertexKey: string, edgeId: string) {
    const current = outgoing.get(vertexKey) ?? [];
    current.push(edgeId);
    outgoing.set(vertexKey, current);
  }

  for (const wall of walls) {
    const startKey = pointKey(wall.start);
    const endKey = pointKey(wall.end);

    if (startKey === endKey) {
      continue;
    }

    vertices.set(startKey, wall.start);
    vertices.set(endKey, wall.end);

    const forwardId = `${wall.id}:forward`;
    const reverseId = `${wall.id}:reverse`;

    const forwardAngle = Math.atan2(
      wall.end.y - wall.start.y,
      wall.end.x - wall.start.x
    );

    const reverseAngle = Math.atan2(
      wall.start.y - wall.end.y,
      wall.start.x - wall.end.x
    );

    halfEdges.set(forwardId, {
      id: forwardId,
      wallId: wall.id,
      fromKey: startKey,
      toKey: endKey,
      reverseId,
      angle: forwardAngle,
    });

    halfEdges.set(reverseId, {
      id: reverseId,
      wallId: wall.id,
      fromKey: endKey,
      toKey: startKey,
      reverseId: forwardId,
      angle: reverseAngle,
    });

    addOutgoing(startKey, forwardId);
    addOutgoing(endKey, reverseId);
  }

  const nextEdge = new Map<string, string>();

  for (const edge of halfEdges.values()) {
    const candidates = outgoing.get(edge.toKey) ?? [];

    const reverse = halfEdges.get(edge.reverseId);

    if (!reverse) {
      continue;
    }

    const usableCandidates = candidates.filter(
      (candidateId) => candidateId !== edge.reverseId
    );

    if (usableCandidates.length === 0) {
      nextEdge.set(edge.id, edge.reverseId);
      continue;
    }

    let bestCandidate = usableCandidates[0];
    let bestTurn = Number.POSITIVE_INFINITY;

    for (const candidateId of usableCandidates) {
      const candidate = halfEdges.get(candidateId);

      if (!candidate) {
        continue;
      }

      let clockwiseTurn = normalizeAngle(
        reverse.angle - candidate.angle
      );

      if (clockwiseTurn < EPSILON) {
        clockwiseTurn = Math.PI * 2;
      }

      if (clockwiseTurn < bestTurn) {
        bestTurn = clockwiseTurn;
        bestCandidate = candidateId;
      }
    }

    nextEdge.set(edge.id, bestCandidate);
  }

  const visited = new Set<string>();
  const rooms: DetectedRoom[] = [];

  for (const initialEdge of halfEdges.values()) {
    if (visited.has(initialEdge.id)) {
      continue;
    }

    const localVisited = new Set<string>();
    const polygon: Point[] = [];
    const wallIds: string[] = [];

    let currentId = initialEdge.id;
    let closed = false;

    while (!localVisited.has(currentId)) {
      const edge = halfEdges.get(currentId);

      if (!edge) {
        break;
      }

      localVisited.add(currentId);
      visited.add(currentId);

      const point = vertices.get(edge.fromKey);

      if (!point) {
        break;
      }

      polygon.push({
        x: point.x,
        y: point.y,
      });

      wallIds.push(edge.wallId);

      const nextId = nextEdge.get(currentId);

      if (!nextId) {
        break;
      }

      currentId = nextId;

      if (currentId === initialEdge.id) {
        closed = true;
        break;
      }
    }

    if (!closed || polygon.length < 3) {
      continue;
    }

    const signedArea = polygonArea(polygon);

    /*
      With our screen coordinate system (+Y downward),
      bounded room faces are positive.
      The outer face is negative.
    */
    if (signedArea <= EPSILON) {
      continue;
    }

    const uniqueWallIds = Array.from(new Set(wallIds)).sort();

    if (uniqueWallIds.length < 3) {
      continue;
    }

    const id = `room:${uniqueWallIds.join("|")}`;

    if (rooms.some((room) => room.id === id)) {
      continue;
    }

    rooms.push({
      id,
      wallIds: uniqueWallIds,
      polygon,
      area: Math.abs(signedArea),
      centroid: polygonCentroid(polygon, signedArea),
    });
  }

  return rooms;
}