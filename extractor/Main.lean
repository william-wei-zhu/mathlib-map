import Extractor

open Lean

/-- `lake exe extractor --out FILE [--modules Mathlib,Other] [--decl-prefix Mathlib]` -/
unsafe def main (args : List String) : IO UInt32 := do
  let get (flag : String) (default : String) : String :=
    match args.dropWhile (· != flag) with
    | _ :: v :: _ => v
    | _ => default
  let out := get "--out" "extract.ndjson"
  let modules := (get "--modules" "Mathlib").splitOn "," |>.map String.toName |>.toArray
  let declPrefix := get "--decl-prefix" "Mathlib"
  IO.eprintln s!"mathlibmap extractor {MathlibMap.version}: importing {modules} → {out}"
  initSearchPath (← findSysroot)
  enableInitializersExecution
  -- `withImportModules` imports with `loadExts := false`, which leaves the instance and
  -- structure tables empty; import directly with extensions loaded instead.
  let env ← importModules (loadExts := true) (modules.map ({ module := · })) {} (trustLevel := 1024)
  MathlibMap.extract env out declPrefix
  return 0
