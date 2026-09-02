import { fetchShard } from "@/lib/data";
import { type MapIndex } from "@/lib/map-data";
import { AreaTable } from "@/components/site/area-table";

export default async function HomePage() {
  const index = await fetchShard<MapIndex>("map/index.json");
  if (!index) return null;

  return (
    <div className="p-5">
      <h1 className="font-display text-2xl leading-tight text-foreground">Explore Mathlib</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every area of mathematics, sized by how much Mathlib formalizes it. Click a region on the
        map, search above, or pick an area below.
      </p>
      <h2 className="eyebrow mt-6 text-muted-foreground">Areas by declarations</h2>
      <div className="mt-2">
        <AreaTable areas={index.areas} />
      </div>
    </div>
  );
}
