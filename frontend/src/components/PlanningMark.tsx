import { useEffect, useRef, useState } from "react";

/** The Crop Material Planning mark. The SVG is pure CSS and plays once when it loads; hovering re-plays it
 *  by pointing the <img> at a fresh blob URL (the same trick the desk tile uses). */
const LOGO = "/assets/upande_crop_material_planning/images/crop_material_planning_logo.svg";

export function PlanningMark({ size = 48, title = "Crop Material Planning" }: { size?: number; title?: string }) {
  const [src, setSrc] = useState(LOGO);
  const blob = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (blob.current) URL.revokeObjectURL(blob.current);
    },
    [],
  );
  const replay = () => {
    fetch(LOGO, { credentials: "same-origin" })
      .then((r) => r.blob())
      .then((b) => {
        const next = URL.createObjectURL(new Blob([b], { type: "image/svg+xml" }));
        if (blob.current) URL.revokeObjectURL(blob.current);
        blob.current = next;
        setSrc(next);
      })
      .catch(() => {});
  };
  return (
    <img
      src={src}
      alt={title}
      width={size}
      height={size}
      onMouseEnter={replay}
      onFocus={replay}
      draggable={false}
      style={{ width: size, height: size }}
    />
  );
}
