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
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setLogoPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

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

  const activeAccentHex = (profile.accentHex || BRAND_ACCENT_SWATCHES[0].hex).toUpperCase().replace(/^#/, "");

  return (
    <form onSubmit={(event) => void handleSave(event)}>
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 className="section-title">Organisation</h2>
        <div className="field">
          <label className="field-label" htmlFor="brand-org-name">
            Organisation name
          </label>
          <input
            id="brand-org-name"
            type="text"
            required
            placeholder="Your Practice Pty Ltd"
            value={profile.organisationName}
            onChange={(event) => updateField("organisationName", event.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="brand-logo">
            Logo
          </label>
          <input id="brand-logo" type="file" accept="image/*" onChange={handleLogoChange} />
          {logoPreview ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem" }}>
              <img
                src={logoPreview}
                alt="Logo preview"
                style={{ width: "48px", height: "48px", objectFit: "contain", border: "1px solid var(--border-hairline)", borderRadius: "8px", background: "#fff" }}
              />
              <p className="field-note" style={{ margin: 0 }}>
                Preview only — logo storage is coming soon.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 className="section-title">Document template style</h2>
        <p className="field-note" style={{ marginTop: "-0.5rem", marginBottom: "1.125rem" }}>
          Applied to every exported DOCX and printed document — referral, triage, register and support
          plan templates all pick this up automatically.
        </p>
        <div className="field">
          <label className="field-label" htmlFor="brand-heading-font">
            Heading font
          </label>
          <select
            id="brand-heading-font"
            value={profile.headingFont ?? DEFAULT_HEADING_FONT}
            onChange={(event) => updateField("headingFont", event.target.value)}
          >
            {BRAND_HEADING_FONTS.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label" style={{ display: "block" }}>
            Brand colour
          </span>
          <div role="radiogroup" aria-label="Brand colour" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {BRAND_ACCENT_SWATCHES.map((swatch) => {
              const active = activeAccentHex === swatch.hex;
              return (
                <button
                  key={swatch.hex}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={swatch.label}
                  onClick={() => updateField("accentHex", swatch.hex)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    minHeight: "auto",
                    minWidth: "auto",
                    padding: "6px",
                    border: active ? "1.5px solid var(--ink)" : "1.5px solid var(--border-hairline)",
                    borderRadius: "10px",
                    background: "#fff",
                    boxShadow: "none",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: "1.75rem", height: "1.75rem", borderRadius: "999px", background: `#${swatch.hex}` }}
                  />
                  <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: "10px" }}>#{swatch.hex}</span>
                </button>
              );
            })}
          </div>
          <details style={{ marginTop: "1rem" }}>
            <summary className="field-note" style={{ cursor: "pointer" }}>
              Advanced: ink and paper colours
            </summary>
            <div className="field" style={{ marginTop: "0.75rem" }}>
              <label className="field-label" htmlFor="brand-ink-hex">
                Ink colour (hex)
              </label>
              <input
                id="brand-ink-hex"
                type="text"
                value={profile.inkHex ?? ""}
                onChange={(event) => updateField("inkHex", event.target.value)}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor="brand-paper-hex">
                Paper colour (hex)
              </label>
              <input
                id="brand-paper-hex"
                type="text"
                value={profile.paperHex ?? ""}
                onChange={(event) => updateField("paperHex", event.target.value)}
              />
            </div>
          </details>
        </div>
      </div>

      <details style={{ marginBottom: "1.25rem" }}>
        <summary className="field-note" style={{ cursor: "pointer" }}>
          Advanced: letter contact details
        </summary>
        <div className="field" style={{ marginTop: "0.75rem" }}>
          <label className="field-label" htmlFor="brand-contact-line">
            Contact line
          </label>
          <input
            id="brand-contact-line"
            type="text"
            value={profile.contactLine ?? ""}
            onChange={(event) => updateField("contactLine", event.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="brand-footer-text">
            Footer text
          </label>
          <input
            id="brand-footer-text"
            type="text"
            value={profile.footerText ?? ""}
            onChange={(event) => updateField("footerText", event.target.value)}
          />
        </div>
      </details>

      {error && (
        <p role="alert" style={{ margin: "0 0 0.75rem" }}>
          {error}
        </p>
      )}
      {status === "saved" && (
        <p role="status" style={{ margin: "0 0 0.75rem" }}>
          Brand profile saved.
        </p>
      )}
      <button type="submit" className="primary" disabled={status === "loading"}>
        Save brand profile
      </button>
    </form>
  );
}
