import Lean

/-!
# Mathlib Map extractor

Walks a Lean environment (normally all of Mathlib) and writes newline-delimited JSON:

* `class` records: every typeclass, its `extends` parents, its own fields, its arity.
* `instance` records: every registered instance, the class it produces, the heads of the
  arguments (so `Field ℝ` yields `["Real"]`), and the classes it assumes.
* `decl` records: every declaration in the chosen module prefix with its typeclass
  assumptions and, if deprecated, the replacement name.

No elaboration is performed; everything is read off declaration types, so the whole of
Mathlib takes a few minutes.
-/

open Lean Meta

namespace MathlibMap

def version : String := "0.2.0"

structure ParentRec where
  name : String
  projFn : String
  subobject : Bool
  deriving ToJson

structure ClassRec where
  kind : String := "class"
  name : String
  module : Option String
  doc : Option String
  isStructure : Bool
  numExplicitArgs : Nat
  numInstArgs : Nat
  parents : Array ParentRec
  ownFields : Array String
  deriving ToJson

structure InstanceRec where
  kind : String := "instance"
  name : String
  module : Option String
  priority : Nat
  attrKind : String
  target : Option String
  args : Array String
  sources : Array String
  fromExtends : Bool
  deriving ToJson

structure DeclRec where
  kind : String := "decl"
  name : String
  module : Option String
  declKind : String
  assumes : Array String
  deprecatedTo : Option String
  deprecatedSince : Option String
  deriving ToJson

/-- Module (source file) that defines a constant, if it is imported rather than local. -/
def moduleOf (env : Environment) (n : Name) : Option String :=
  env.getModuleIdxFor? n |>.map fun idx => (env.header.moduleNames[idx.toNat]!).toString

/-- The constant at the head of an expression, looking through binders and metadata. -/
partial def headConst : Expr → Option Name
  | .forallE _ _ b _ => headConst b
  | .lam _ _ b _ => headConst b
  | .mdata _ e => headConst e
  | .letE _ _ _ b _ => headConst b
  | e => e.getAppFn.constName?

/-- Walk the binders of a type: count explicit ones, collect the class heads of
instance-implicit ones, and return the conclusion. -/
partial def analyzeType (ty : Expr) : Nat × Array Name × Expr :=
  go ty 0 #[]
where
  go : Expr → Nat → Array Name → Nat × Array Name × Expr
    | .forallE _ d b bi, ne, insts =>
      let insts := if bi == .instImplicit then
        (match headConst d with | some c => insts.push c | none => insts) else insts
      let ne := if bi == .default then ne + 1 else ne
      go b ne insts
    | .mdata _ e, ne, insts => go e ne insts
    | e, ne, insts => (ne, insts, e)

/-- Is `n` the projection Lean generated for an `extends` clause (e.g. `Field.toCommRing`)? -/
def isExtendsProjection (env : Environment) (n : Name) : Bool :=
  match n with
  | .str p _ => isStructure env p && (getStructureParentInfo env p).any (·.projFn == n)
  | _ => false

def declKindOf : ConstantInfo → String
  | .axiomInfo _ => "axiom"
  | .defnInfo _ => "definition"
  | .thmInfo _ => "theorem"
  | .opaqueInfo _ => "opaque"
  | .quotInfo _ => "quotient"
  | .inductInfo _ => "inductive"
  | .ctorInfo _ => "constructor"
  | .recInfo _ => "recursor"

def attrKindStr : AttributeKind → String
  | .global => "global"
  | .local => "local"
  | .scoped => "scoped"

/-- Names Lean or Mathlib generate for internal use: `_private`, `_auxLemma`, `match_1`,
`proof_2`, `_eq_3`, numeric components, and so on. -/
def isNoise (n : Name) : Bool :=
  n.isInternal || n.isInternalDetail || n.components.any fun c =>
    match c with
    | .num .. => true
    | .str _ s =>
      s.startsWith "match_" || s.startsWith "proof_" ||
        (s.startsWith "eq_" && (s.toList.drop 3).all Char.isDigit)
    | _ => false

def classRecord (env : Environment) (n : Name) (ci : ConstantInfo) : IO ClassRec := do
  let doc ← findDocString? env n
  let (ne, insts, _) := analyzeType ci.type
  let isStruct := isStructure env n
  let parents := if isStruct then
      (getStructureParentInfo env n).map fun p =>
        { name := p.structName.toString, projFn := p.projFn.toString, subobject := p.subobject }
    else #[]
  let ownFields := if isStruct then
      (getStructureFields env n).filter (fun f => (isSubobjectField? env n f).isNone) |>.map toString
    else #[]
  return { name := n.toString, module := moduleOf env n, doc, isStructure := isStruct,
           numExplicitArgs := ne, numInstArgs := insts.size, parents, ownFields }

def instanceRecord (env : Environment) (n : Name) (entry : InstanceEntry) : Option InstanceRec := do
  let ci ← env.find? n
  let (_, insts, concl) := analyzeType ci.type
  let target := concl.getAppFn.constName?.map toString
  let args := concl.getAppArgs.map fun a => (headConst a).map toString |>.getD "_"
  return { name := n.toString, module := moduleOf env n, priority := entry.priority,
           attrKind := attrKindStr entry.attrKind, target, args,
           sources := insts.map toString, fromExtends := isExtendsProjection env n }

def declRecord (env : Environment) (n : Name) (ci : ConstantInfo) : DeclRec :=
  let (_, insts, _) := analyzeType ci.type
  let dep := Linter.deprecatedAttr.getParam? env n
  { name := n.toString, module := moduleOf env n, declKind := declKindOf ci,
    assumes := insts.map toString,
    deprecatedTo := dep.bind (·.newName?) |>.map toString,
    deprecatedSince := dep.bind (·.since?) }

/-- Write every record for `env` to `out`. `declPrefix` restricts `decl` records to modules
under that prefix (classes and instances are always emitted for the whole environment). -/
def extract (env : Environment) (out : System.FilePath) (declPrefix : String) : IO Unit := do
  let h ← IO.FS.Handle.mk out .write
  let mut nClasses := 0
  let mut nDecls := 0
  let consts := env.constants.toList
  for (n, ci) in consts do
    if isClass env n then
      h.putStrLn (toJson (← classRecord env n ci)).compress
      nClasses := nClasses + 1
    if !(isNoise n) then
      if let some m := moduleOf env n then
        if m.startsWith declPrefix then
          h.putStrLn (toJson (declRecord env n ci)).compress
          nDecls := nDecls + 1
  let mut nInst := 0
  for (n, entry) in (instanceExtension.getState env).instanceNames.toList do
    if let some rec := instanceRecord env n entry then
      h.putStrLn (toJson rec).compress
      nInst := nInst + 1
  h.flush
  IO.eprintln s!"classes={nClasses} instances={nInst} decls={nDecls} constants={consts.length}"

end MathlibMap
