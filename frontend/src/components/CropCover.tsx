import { useEffect, useRef, useState } from "react";
import { markUrl } from "@/lib/crops";

/** The cover shown when a crop is chosen inside the app: that crop's loader (the generic one when it has no
 *  file), held briefly and faded out. The first load is covered by the page's own splash (www/planning_app.html). */
export function CropCover({ crop }: { crop: string }) {
  const first = useRef(true);
  const [shown, setShown] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [src, setSrc] = useState(markUrl(crop, true));
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSrc(markUrl(crop, true));
    setLeaving(false);
    setShown(crop);
    const a = window.setTimeout(() => setLeaving(true), 1500);
    const b = window.setTimeout(() => setShown(null), 1800);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [crop]);
  if (!shown) return null;
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-white transition-opacity duration-300"
      style={{ opacity: leaving ? 0 : 1, pointerEvents: leaving ? "none" : "auto" }}
    >
      <img src={src} alt="" width={106} onError={() => setSrc(markUrl("all", true))} />
    </div>
  );
}
