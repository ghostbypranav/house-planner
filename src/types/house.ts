export type Point = {
  x: number;
  y: number;
};

export type Wall = {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  height: number;
};

export type Door = {
  id: string;
  wallId: string;
  position: number;
  width: number;
  height: number;
};

export type WindowItem = {
  id: string;
  wallId: string;
  position: number;
  width: number;
  height: number;
  sillHeight: number;
};

export type Room = {
  id: string;
  wallIds: string[];
  name: string;
};

export type Stair = {
  id: string;
  start: Point;
  end: Point;
  width: number;
  stepCount: number;
};

export type FurnitureType =
  | "bed"
  | "sofa"
  | "dining"
  | "wardrobe"
  | "table"
  | "chair";

export type FurnitureItem = {
  id: string;
  type: FurnitureType;
  position: Point;
  width: number;
  depth: number;
  height: number;
  rotation: number;
};

export type Measurement = {
  id: string;
  start: Point;
  end: Point;
};