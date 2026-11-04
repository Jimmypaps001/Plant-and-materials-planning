import { useEffect, useRef, useState } from "react";
import { markUrl } from "@/lib/crops";

/** The Crop Material Planning mark: the crop's own scene when it has one, else the generic mark. The SVG is
 *  pure CSS and plays once when it loads; hovering re-plays it by pointing the <img> at a fresh blob URL. */
export function PlanningMark({ size = 48, crop = "all", title = "Crop Material Planning" }: { size?: number; crop?: string; title?: string }) {
  const [src, setSrc] = useState(markUrl(crop));
  const [generic, setGeneric] = useState(false);
  const blob = useRef<string | null>(null);
  useEffect(() => {
    setGeneric(false);
    setSrc(markUrl(crop));
  }, [crop]);
  useEffect(
    () => () => {
      if (blob.current) URL.revokeObjectURL(blob.current);
    },
    [],
  );
  const url = generic ? markUrl("all") : markUrl(crop);
  const replay = () => {
    fetch(url, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
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
      onError={() => {
        if (!generic) {
          setGeneric(true);
          setSrc(markUrl("all"));
        }
      }}
      onMouseEnter={replay}
      onFocus={replay}
      draggable={false}
      style={{ width: size, height: size }}
    />
  );
}
