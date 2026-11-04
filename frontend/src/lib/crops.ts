import { useEffect, useState } from "react";
import { getList, isError } from "@/lib/api";

export interface Crop {
  name: string;
  crop_key: string;
  accent_color: string | null;
}

export interface CropMap {
  crops: Crop[];
  /** Item code (lower case) -> crop_key, from Production Variety */
  byItem: Map<string, string>;
  loaded: boolean;
}

/** "ATHENA-60CM" -> "athena"; "Rose - Candid" -> "candid": the forms a variety turns up in. */
function forms(v: string): string[] {
  const s = (v || "").trim().toLowerCase();
  const noLen = s.replace(/\s*-\s*\d+\s*cm$/, "");
  const tail = noLen.includes(" - ") ? noLen.split(" - ").pop()! : noLen;
  return [s, noLen, tail];
}

/** The crop a variety (an Item code) belongs to, or null when no Production Variety names it. */
export function cropOfVariety(map: Pick<CropMap, "byItem">, variety: string): string | null {
  for (const f of forms(variety)) {
    const hit = map.byItem.get(f);
    if (hit) return hit;
  }
  // an Item "Rose - Candid" is known by its tail too
  for (const [item, key] of map.byItem) if (forms(item)[2] === forms(variety)[2] && forms(variety)[2]) return key;
  return null;
}

export const inCrop = (map: Pick<CropMap, "byItem">, crop: string, variety: string) =>
  crop === "all" || cropOfVariety(map, variety) === crop;

export function buildMap(crops: Crop[], varieties: { item: string | null; crop: string | null }[]): CropMap {
  const keyOf = new Map(crops.map((c) => [c.name, c.crop_key]));
  const byItem = new Map<string, string>();
  varieties.forEach((v) => {
    const key = v.crop ? keyOf.get(v.crop) : undefined;
    if (v.item && key) byItem.set(v.item.trim().toLowerCase(), key);
  });
  return { crops, byItem, loaded: true };
}

/** Production Crop and Production Variety, read once with frappe.client.get_list. */
export function useCropMap(): CropMap {
  const [map, setMap] = useState<CropMap>({ crops: [], byItem: new Map(), loaded: false });
  useEffect(() => {
    void Promise.all([
      getList<Crop>("Production Crop", ["name", "crop_key", "accent_color"], { filters: { enabled: 1 }, order_by: "sort_order asc, name asc" }),
      getList<{ item: string | null; crop: string | null }>("Production Variety", ["item", "crop"]),
    ]).then(([c, v]) => {
      setMap(buildMap(isError(c) ? [] : (c as Crop[]), isError(v) ? [] : (v as { item: string | null; crop: string | null }[])));
    });
  }, []);
  return map;
}

/** The per-crop mark's file; the generic one for All crops or a crop without a file. */
export const markUrl = (crop: string, loader = false) =>
  `/assets/upande_crop_material_planning/images/crop_material_planning_logo${crop && crop !== "all" ? "_" + crop : ""}${loader ? "_loader" : ""}.svg`;
