import { useEffect, useState } from "react";
import { fetchVectorBrandProfile, saveVectorBrandProfile } from "./billing.js";
import { BRAND_ACCENT_SWATCHES, BRAND_HEADING_FONTS, DEFAULT_HEADING_FONT, type BrandProfileInput } from "./brandProfile.js";

const EMPTY_PROFILE: BrandProfileInput = {
  organisationName: "",
  accentHex: "",
  inkHex: "",
  paperHex: "",
  contactLine: "",
  footerText: "",
  headingFont: DEFAULT_HEADING_FONT,
};

export function BrandProfileEditor() {
  const [profile, setProfile] = useState<BrandProfileInput>(EMPTY_PROFILE);
  const [status, setStatus] = useState<"loading" | "ready" | "saved" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const saved = await fetchVectorBrandProfile();
        if (cancelled) return;
        if (saved) setProfile({ ...EMPTY_PROFILE, ...saved });
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setError("Could not load organisation branding.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const saved = await saveVectorBrandProfile(profile);
      setProfile({ ...EMPTY_PROFILE, ...saved });
      setStatus("saved");
      window.dispatchEvent(new CustomEvent("vector:brand-profile-saved"));
    } catch {
      setStatus("error");
      setError("Could not save organisation branding.");
    }
  }

  function updateField(field: keyof BrandProfileInput, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    setStatus("ready");
  }

  return (
    <form onSubmit={(event) => void handleSave(event)} style={{ display: "grid", gap: "0.75rem" }}>
      <label>
        Organisation name
        <input
          required
          value={profile.organisationName}
          onChange={(event) => updateField("organisationName", event.target.value)}
        />
      </label>
      <label>
        Document heading font
        <select
          value={profile.headingFont ?? DEFAULT_HEADING_FONT}
          onChange={(event) => updateField("headingFont", event.target.value)}
        >
          {BRAND_HEADING_FONTS.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
      </label>
      <div>
        <span className="field-label" style={{ display: "block" }}>
          Accent colour
        </span>
        <div role="radiogroup" aria-label="Accent colour" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {BRAND_ACCENT_SWATCHES.map((swatch) => {
            const active = (profile.accentHex ?? "").toUpperCase().replace(/^#/, "") === swatch.hex;
            return (
              <button
                key={swatch.hex}
                type="button"
                role="radio"
                aria-checked={active}
                title={`${swatch.label} · #${swatch.hex}`}
                onClick={() => updateField("accentHex", swatch.hex)}
                style={{
                  width: "2.25rem",
                  height: "2.25rem",
                  borderRadius: "999px",
                  background: `#${swatch.hex}`,
                  border: active ? "3px solid var(--ink)" : "1px solid var(--muted)",
                  cursor: "pointer",
                }}
              />
            );
          })}
        </div>
        <p className="field-note" style={{ fontFamily: "monospace" }}>
          #{(profile.accentHex || BRAND_ACCENT_SWATCHES[0].hex).toUpperCase().replace(/^#/, "")}
        </p>
      </div>
      <details>
        <summary>Advanced: ink and paper colours</summary>
        <label>
          Ink colour (hex)
          <input value={profile.inkHex ?? ""} onChange={(event) => updateField("inkHex", event.target.value)} />
        </label>
        <label>
          Paper colour (hex)
          <input value={profile.paperHex ?? ""} onChange={(event) => updateField("paperHex", event.target.value)} />
        </label>
      </details>
      <label>
        Contact line
        <input value={profile.contactLine ?? ""} onChange={(event) => updateField("contactLine", event.target.value)} />
      </label>
      <label>
        Footer text
        <input value={profile.footerText ?? ""} onChange={(event) => updateField("footerText", event.target.value)} />
      </label>
      {error && (
        <p role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      {status === "saved" && <p role="status">Organisation branding saved.</p>}
      <button type="submit" disabled={status === "loading"}>
        Save organisation branding
      </button>
    </form>
  );
}
