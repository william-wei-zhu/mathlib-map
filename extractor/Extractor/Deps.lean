import Lean

/-!
# Dependency extraction

For every constant in the environment, the constants used in its type (`t`), in its value (`v`,
excluding those already in `t`), and the subset of value constants that occur in an *explicit*
argument position (`e`). Simp-generated `_auxLemma`s are unfolded into the lemmas they wrap.

Explicitness is decided syntactically: at an application whose head is a constant, the head's
signature says which arguments are explicit; arguments of non-constant heads count as explicit.
This approximates "the name would appear in a pretty-printed term" without running the elaborator,
which is what makes it fast enough for the whole library.

Output: `<out>` holds one JSON object per line `{"i":id,"k":kind,"t":[ids],"v":[ids],"e":[ids]}`;
`<out>.names.txt` lists the constant name for each id, one per line.
-/

open Lean

namespace MathlibMap

def isAuxLemma : Name → Bool
  | .num (.str _ "_auxLemma") _ => true
  | _ => false

/-- Binder kinds of the leading Π-binders of a type. -/
partial def binderInfos (ty : Expr) (acc : Array BinderInfo := #[]) : Array BinderInfo :=
  match ty with
  | .forallE _ _ b bi => binderInfos b (acc.push bi)
  | .mdata _ e => binderInfos e acc
  | _ => acc

/-- Constants in explicit positions of `e`, visiting each shared subterm once. -/
unsafe def explicitConstsImpl (env : Environment) (root : Expr) : NameSet := Id.run do
  let mut visited : Std.HashSet USize := {}
  let mut acc : NameSet := {}
  let mut stack : Array Expr := #[root]
  while !stack.isEmpty do
    let e := stack.back!
    stack := stack.pop
    let addr := ptrAddrUnsafe e
    if visited.contains addr then continue
    visited := visited.insert addr
    match e with
    | .const n _ => acc := acc.insert n
    | .app .. =>
      let f := e.getAppFn
      let args := e.getAppArgs
      stack := stack.push f
      let infos := match f with
        | .const c _ => match env.find? c with
          | some ci => binderInfos ci.type
          | none => #[]
        | _ => #[]
      for i in [0:args.size] do
        let explicit := if h : i < infos.size then infos[i] == .default else true
        if explicit then stack := stack.push args[i]!
    | .lam _ t b _ => stack := stack.push t |>.push b
    | .forallE _ t b _ => stack := stack.push t |>.push b
    | .letE _ t v b _ => stack := stack.push t |>.push v |>.push b
    | .mdata _ x => stack := stack.push x
    | .proj _ _ x => stack := stack.push x
    | _ => pure ()
  return acc

@[implemented_by explicitConstsImpl]
opaque explicitConsts (env : Environment) (root : Expr) : NameSet

def kindOf : ConstantInfo → String
  | .axiomInfo _ => "axiom"
  | .defnInfo _ => "definition"
  | .thmInfo _ => "theorem"
  | .opaqueInfo _ => "opaque"
  | .quotInfo _ => "quotient"
  | .inductInfo _ => "inductive"
  | .ctorInfo _ => "constructor"
  | .recInfo _ => "recursor"

/-- Unfold simp `_auxLemma`s into the constants they use. -/
def unfoldAux (env : Environment) (s : NameSet) : NameSet := Id.run do
  let mut out : NameSet := {}
  for n in s do
    if isAuxLemma n then
      if let some ci := env.find? n then
        for m in ci.getUsedConstantsAsSet do
          if !isAuxLemma m then out := out.insert m
    else
      out := out.insert n
  return out

def extractDeps (env : Environment) (out : System.FilePath) : IO Unit := do
  let consts := env.constants.toList
  -- Stable ids: sorted names.
  let names := (consts.map (·.1)).toArray.qsort (fun a b => Name.lt a b)
  let mut ids : Std.HashMap Name Nat := {}
  for i in [0:names.size] do
    ids := ids.insert names[i]! i
  let namesFile : System.FilePath := out.toString ++ ".names.txt"
  IO.FS.withFile namesFile .write fun h => do
    for n in names do h.putStrLn n.toString
  let idOf (n : Name) : Option Nat := ids[n]?
  let toIds (s : NameSet) : Array Nat := Id.run do
    let mut a := #[]
    for n in s do
      if let some i := idOf n then a := a.push i
    return a.qsort (· < ·)
  let h ← IO.FS.Handle.mk out .write
  let mut count := 0
  for (n, ci) in consts do
    let tset := unfoldAux env ci.type.getUsedConstantsAsSet
    let vset := match ci.value? (allowOpaque := true) with
      | some v => unfoldAux env v.getUsedConstantsAsSet
      | none => {}
    let mut vOnly : NameSet := {}
    for m in vset do
      if !tset.contains m then vOnly := vOnly.insert m
    let eset := match ci.value? (allowOpaque := true) with
      | some v => unfoldAux env (explicitConsts env v)
      | none => {}
    let some i := idOf n | continue
    let record := Json.mkObj [
      ("i", toJson i), ("k", toJson (kindOf ci)),
      ("t", toJson (toIds tset)), ("v", toJson (toIds vOnly)), ("e", toJson (toIds eset))]
    h.putStrLn record.compress
    count := count + 1
    if count % 100000 == 0 then IO.eprintln s!"  {count} constants"
  h.flush
  IO.eprintln s!"deps: constants={count} names={names.size}"

end MathlibMap
