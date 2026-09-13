import { useState } from "react";
import { Shell } from "./components/Shell";

const UNITS = [
  "", "cup", "cups", "tbsp", "tsp", "ml", "l", "g", "kg", "oz", "lb",
  "pinch", "slice", "slices", "piece", "pieces", "clove", "cloves", "can", "cans",
];

const PEOPLE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 20, 24, 30, 40, 50];

interface Ingredient {
  id: string;
  amount: string;
  unit: string;
  name: string;
}

function scaleAmount(raw: string, factor: number): string {
  const num = parseFloat(raw);
  if (!raw.trim() || isNaN(num)) return raw;
  const result = num * factor;
  if (result === Math.floor(result)) return String(result);
  return parseFloat(result.toFixed(2)).toString();
}

function smartUnit(unit: string, scaledAmt: string): string {
  if (!unit) return "";
  const n = parseFloat(scaledAmt);
  const singles: Record<string, string> = { cups: "cup", slices: "slice", pieces: "piece", cloves: "clove", cans: "can" };
  const plurals: Record<string, string> = { cup: "cups", slice: "slices", piece: "pieces", clove: "cloves", can: "cans" };
  if (n === 1) return singles[unit] ?? unit;
  return plurals[unit] ?? unit;
}

export default function App() {
  const [recipeName, setRecipeName] = useState("");
  const [originalPortions, setOriginalPortions] = useState(1);
  const [targetPortions, setTargetPortions] = useState(4);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", amount: "", unit: "", name: "" },
    { id: "2", amount: "", unit: "", name: "" },
    { id: "3", amount: "", unit: "", name: "" },
  ]);
  const [showResult, setShowResult] = useState(false);

  const factor = originalPortions > 0 ? targetPortions / originalPortions : 1;
  const filledIngredients = ingredients.filter((i) => i.name.trim() !== "");

  function addIngredient() {
    setIngredients((prev) => [...prev, { id: String(Date.now()), amount: "", unit: "", name: "" }]);
    setShowResult(false);
  }

  function removeIngredient(id: string) {
    if (ingredients.length === 1) return;
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    setShowResult(false);
  }

  function updateIngredient(id: string, field: keyof Ingredient, value: string) {
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
    setShowResult(false);
  }

  function handleCalculate() {
    if (filledIngredients.length === 0) return;
    setShowResult(true);
  }

  function handleReset() {
    setRecipeName("");
    setOriginalPortions(1);
    setTargetPortions(4);
    setIngredients([
      { id: "1", amount: "", unit: "", name: "" },
      { id: "2", amount: "", unit: "", name: "" },
      { id: "3", amount: "", unit: "", name: "" },
    ]);
    setShowResult(false);
  }

  const navItems = [
    { id: "scaler", icon: "🔢", label: "Scaler", active: true, onClick: () => {} },
  ];

  return (
    <Shell navItems={navItems} title="Recipe Scaler">
      <div style={{ width: "100%", maxWidth: "38rem", margin: "0 auto", paddingBottom: "3rem" }}>

        {/* Title */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}>
            Recipe Scaler 🍽️
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Enter your recipe, set how many portions it makes, then pick how many people you're cooking for.
          </p>
        </div>

        {/* Recipe name */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={labelStyle}>Recipe Name</label>
          <input
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="e.g. Fluffy Pancakes"
            style={inputStyle}
          />
        </div>

        {/* Portions row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <label style={labelStyle}>Recipe makes</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="number"
                min={1}
                max={100}
                value={originalPortions}
                onChange={(e) => { setOriginalPortions(Math.max(1, parseInt(e.target.value) || 1)); setShowResult(false); }}
                style={{ ...inputStyle, textAlign: "center" }}
              />
              <span style={{ color: "var(--muted)", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                {originalPortions === 1 ? "portion" : "portions"}
              </span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>I'm cooking for</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <select
                value={targetPortions}
                onChange={(e) => { setTargetPortions(parseInt(e.target.value)); setShowResult(false); }}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {PEOPLE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span style={{ color: "var(--muted)", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                {targetPortions === 1 ? "person" : "people"}
              </span>
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={labelStyle}>Ingredients</label>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "5rem 6rem 1fr 1.5rem", gap: "0.4rem", marginBottom: "0.4rem", paddingLeft: "0.25rem" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Amount</span>
            <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Unit</span>
            <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Ingredient</span>
            <span />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {ingredients.map((ing) => (
              <div key={ing.id} style={{ display: "grid", gridTemplateColumns: "5rem 6rem 1fr 1.5rem", gap: "0.4rem", alignItems: "center" }}>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={ing.amount}
                  onChange={(e) => updateIngredient(ing.id, "amount", e.target.value)}
                  placeholder="1"
                  style={{ ...inputStyle, textAlign: "center", padding: "0.5rem 0.4rem" }}
                />
                <select
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, "unit", e.target.value)}
                  style={{ ...inputStyle, padding: "0.5rem 0.4rem", cursor: "pointer" }}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u === "" ? "— none —" : u}</option>
                  ))}
                </select>
                <input
                  value={ing.name}
                  onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
                  placeholder="e.g. flour, eggs…"
                  style={{ ...inputStyle, padding: "0.5rem 0.75rem" }}
                />
                <button
                  onClick={() => removeIngredient(ing.id)}
                  disabled={ingredients.length === 1}
                  style={{ background: "none", border: "none", cursor: ingredients.length === 1 ? "default" : "pointer", color: "var(--muted)", fontSize: "1.1rem", lineHeight: 1, opacity: ingredients.length === 1 ? 0.2 : 0.6, padding: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addIngredient}
            style={{ marginTop: "0.75rem", width: "100%", background: "none", border: "1px dashed var(--line)", borderRadius: "0.75rem", padding: "0.5rem", fontSize: "0.875rem", cursor: "pointer", color: "var(--muted)" }}
          >
            + Add another ingredient
          </button>
        </div>

        {/* Calculate button */}
        <button
          onClick={handleCalculate}
          disabled={filledIngredients.length === 0}
          style={{
            width: "100%", background: "var(--accent)", color: "#fff", borderRadius: "0.75rem",
            padding: "0.9rem", fontWeight: 700, fontSize: "1.05rem", border: "none",
            cursor: filledIngredients.length === 0 ? "not-allowed" : "pointer",
            opacity: filledIngredients.length === 0 ? 0.4 : 1,
            marginBottom: "1.5rem",
            fontFamily: "inherit",
          }}
        >
          Calculate Ingredients 🔢
        </button>

        {/* Result */}
        {showResult && filledIngredients.length > 0 && (
          <div style={{ background: "var(--panel)", border: "2px solid var(--accent)", borderRadius: "1.25rem", padding: "1.5rem" }}>
            {/* Result header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div>
                {recipeName && (
                  <h2 style={{ fontFamily: "Fraunces, serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    {recipeName}
                  </h2>
                )}
                <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
                  For <strong style={{ color: "var(--accent)" }}>{targetPortions} {targetPortions === 1 ? "person" : "people"}</strong>
                  {" "}— scaled ×{parseFloat(factor.toFixed(2))} from {originalPortions} {originalPortions === 1 ? "portion" : "portions"}
                </p>
              </div>
              <span style={{ fontSize: "2rem" }}>🍳</span>
            </div>

            {/* Scaled ingredients */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
              {filledIngredients.map((ing) => {
                const scaledAmt = scaleAmount(ing.amount, factor);
                const unit = smartUnit(ing.unit, scaledAmt);
                return (
                  <div
                    key={ing.id}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "var(--paper)", borderRadius: "0.75rem", padding: "0.65rem 1rem" }}
                  >
                    <span style={{ width: "0.45rem", height: "0.45rem", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, color: "var(--accent)", minWidth: "3rem", fontSize: "1rem" }}>
                      {scaledAmt || "—"}
                    </span>
                    {unit && (
                      <span style={{ color: "var(--muted)", fontSize: "0.875rem", minWidth: "3.5rem" }}>
                        {unit}
                      </span>
                    )}
                    <span style={{ fontSize: "0.95rem" }}>{ing.name}</span>
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", marginBottom: "1rem" }}>
              💡 Cooking times may need slight adjustment for larger batches.
            </p>

            <button
              onClick={handleReset}
              style={{ width: "100%", background: "none", border: "1px solid var(--line)", borderRadius: "0.75rem", padding: "0.6rem", fontSize: "0.875rem", cursor: "pointer", color: "var(--muted)", fontFamily: "inherit" }}
            >
              Start a new recipe
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 600,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: "0.4rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.75rem",
  padding: "0.6rem 0.75rem",
  fontSize: "0.9rem",
  outline: "none",
  boxSizing: "border-box",
  background: "var(--panel)",
  border: "1px solid var(--line)",
  color: "var(--ink)",
  fontFamily: "inherit",
};
