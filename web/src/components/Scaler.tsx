import { useState } from "react";

interface Ingredient {
  id: string;
  amount: string;
  unit: string;
  name: string;
}

const UNITS = ["", "cup", "cups", "tbsp", "tsp", "ml", "l", "g", "kg", "oz", "lb", "pinch", "slice", "slices", "piece", "pieces", "clove", "cloves", "can", "cans"];

const PEOPLE_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];

function scaleAmount(raw: string, factor: number): string {
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;
  const result = num * factor;
  // Nice fractions for small numbers
  if (result === Math.floor(result)) return String(result);
  // Round to 2 decimal places then strip trailing zeros
  return parseFloat(result.toFixed(2)).toString();
}

function unitLabel(unit: string, amount: number): string {
  if (!unit) return "";
  // Pluralise simple units
  const singles: Record<string, string> = {
    cups: "cup", slices: "slice", pieces: "piece", cloves: "clove", cans: "can",
  };
  const plurals: Record<string, string> = {
    cup: "cups", slice: "slices", piece: "pieces", clove: "cloves", can: "cans",
  };
  if (amount === 1) {
    return singles[unit] ?? unit;
  }
  return plurals[unit] ?? unit;
}

export function Scaler() {
  const [recipeName, setRecipeName] = useState("");
  const [originalPortions, setOriginalPortions] = useState(1);
  const [targetPortions, setTargetPortions] = useState(4);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", amount: "", unit: "", name: "" },
  ]);
  const [scaled, setScaled] = useState(false);

  function addIngredient() {
    setIngredients((prev) => [...prev, { id: String(Date.now()), amount: "", unit: "", name: "" }]);
    setScaled(false);
  }

  function removeIngredient(id: string) {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    setScaled(false);
  }

  function updateIngredient(id: string, field: keyof Ingredient, value: string) {
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
    setScaled(false);
  }

  const factor = originalPortions > 0 ? targetPortions / originalPortions : 1;

  const scaledIngredients = ingredients.map((ing) => {
    const scaledAmt = scaleAmount(ing.amount, factor);
    const num = parseFloat(scaledAmt);
    const label = unitLabel(ing.unit, num);
    return { ...ing, scaledAmt, unitLabel: label };
  });

  const hasIngredients = ingredients.some((i) => i.name.trim() !== "");

  return (
    <div style={{ maxWidth: "36rem", margin: "0 auto", width: "100%", overflowY: "auto", paddingBottom: "2rem" }}>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}>
        Recipe Scaler
      </h1>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Enter your recipe and I'll scale the ingredients to any number of people.
      </p>

      {/* Recipe name */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
          Recipe Name
        </label>
        <input
          value={recipeName}
          onChange={(e) => setRecipeName(e.target.value)}
          placeholder="e.g. Fluffy Pancakes"
          style={{
            width: "100%", borderRadius: "0.75rem", padding: "0.6rem 1rem",
            fontSize: "0.95rem", outline: "none", boxSizing: "border-box",
            background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Portions row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
            Recipe makes (portions)
          </label>
          <input
            type="number"
            min={1}
            value={originalPortions}
            onChange={(e) => { setOriginalPortions(Math.max(1, parseInt(e.target.value) || 1)); setScaled(false); }}
            style={{
              width: "100%", borderRadius: "0.75rem", padding: "0.6rem 1rem",
              fontSize: "0.95rem", outline: "none", boxSizing: "border-box",
              background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)",
              fontFamily: "inherit",
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
            I want to make it for
          </label>
          <select
            value={targetPortions}
            onChange={(e) => { setTargetPortions(parseInt(e.target.value)); setScaled(false); }}
            style={{
              width: "100%", borderRadius: "0.75rem", padding: "0.6rem 1rem",
              fontSize: "0.95rem", outline: "none", boxSizing: "border-box",
              background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)",
              fontFamily: "inherit", cursor: "pointer",
            }}
          >
            {PEOPLE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ingredients */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.5rem" }}>
          Ingredients
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {ingredients.map((ing, idx) => (
            <div key={ing.id} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              {/* Amount */}
              <input
                type="number"
                min={0}
                step="any"
                value={ing.amount}
                onChange={(e) => updateIngredient(ing.id, "amount", e.target.value)}
                placeholder="1"
                style={{
                  width: "4.5rem", flexShrink: 0, borderRadius: "0.75rem", padding: "0.5rem 0.6rem",
                  fontSize: "0.875rem", outline: "none", textAlign: "center",
                  background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)",
                  fontFamily: "inherit",
                }}
              />
              {/* Unit */}
              <select
                value={ing.unit}
                onChange={(e) => updateIngredient(ing.id, "unit", e.target.value)}
                style={{
                  width: "5.5rem", flexShrink: 0, borderRadius: "0.75rem", padding: "0.5rem 0.4rem",
                  fontSize: "0.875rem", outline: "none",
                  background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)",
                  fontFamily: "inherit", cursor: "pointer",
                }}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u === "" ? "— unit —" : u}</option>
                ))}
              </select>
              {/* Name */}
              <input
                value={ing.name}
                onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
                placeholder={`Ingredient ${idx + 1}`}
                style={{
                  flex: 1, borderRadius: "0.75rem", padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem", outline: "none",
                  background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)",
                  fontFamily: "inherit",
                }}
              />
              {/* Remove */}
              {ingredients.length > 1 && (
                <button
                  onClick={() => removeIngredient(ing.id)}
                  style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--error)", fontSize: "1.1rem", lineHeight: 1, padding: "0.25rem" }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addIngredient}
          style={{ marginTop: "0.75rem", background: "none", border: "1px dashed var(--line-strong)", borderRadius: "0.75rem", padding: "0.5rem 1rem", fontSize: "0.875rem", cursor: "pointer", color: "var(--muted)", width: "100%" }}
        >
          + Add ingredient
        </button>
      </div>

      {/* Scale button */}
      <button
        onClick={() => setScaled(true)}
        disabled={!hasIngredients}
        style={{
          width: "100%", background: "var(--accent)", color: "#fff", borderRadius: "0.75rem",
          padding: "0.85rem", fontWeight: 700, fontSize: "1rem", border: "none",
          cursor: hasIngredients ? "pointer" : "not-allowed", opacity: hasIngredients ? 1 : 0.4,
          marginBottom: "1.5rem",
        }}
      >
        Scale Recipe 🔢
      </button>

      {/* Result */}
      {scaled && hasIngredients && (
        <div style={{ background: "var(--panel)", border: "2px solid var(--accent)", borderRadius: "1.25rem", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              {recipeName && (
                <h2 style={{ fontFamily: "Fraunces, serif", fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.1rem" }}>
                  {recipeName}
                </h2>
              )}
              <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
                Scaled for <strong style={{ color: "var(--accent)" }}>{targetPortions} {targetPortions === 1 ? "person" : "people"}</strong>
                {" "}(×{parseFloat(factor.toFixed(2))} from {originalPortions} {originalPortions === 1 ? "portion" : "portions"})
              </p>
            </div>
            <span style={{ fontSize: "2rem" }}>🍽️</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {scaledIngredients
              .filter((i) => i.name.trim() !== "")
              .map((ing) => (
                <div
                  key={ing.id}
                  style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "var(--paper)", borderRadius: "0.75rem", padding: "0.6rem 1rem" }}
                >
                  <span style={{ width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, color: "var(--accent)", minWidth: "3rem" }}>
                    {ing.scaledAmt}
                  </span>
                  {ing.unitLabel && (
                    <span style={{ color: "var(--muted)", fontSize: "0.875rem", minWidth: "3rem" }}>
                      {ing.unitLabel}
                    </span>
                  )}
                  <span style={{ fontSize: "0.95rem" }}>{ing.name}</span>
                </div>
              ))}
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "1rem", textAlign: "center" }}>
            💡 Tip: cooking time may vary slightly when making larger batches.
          </p>
        </div>
      )}
    </div>
  );
}
