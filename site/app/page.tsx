import { fetchShard } from "@/lib/data";
import { type MapIndex } from "@/lib/map-data";
import { AtlasCanvas } from "@/components/atlas/atlas-canvas";
import { AreaTable } from "@/components/site/area-table";

export default async function HomePage() {
  const index = await fetchShard<MapIndex>("map/index.json");

  return (
    <div>
      {index && (
        <div className="relative h-[calc(100dvh-4.5rem)] min-h-[540px] w-full border-b border-border">
          <AtlasCanvas index={index} />
        </div>
      )}

      {index && (
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <section>
            <h2 className="eyebrow text-muted-foreground">Every area, ranked by declarations</h2>
            <div className="mt-3">
              <AreaTable areas={index.areas} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
