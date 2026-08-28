import { useEffect, useState } from "react";
import {
  fetchVectorBrandProfile,
  saveVectorBrandProfile,
  uploadVectorBrandLogo,
  VECTOR_BRAND_LOGO_PATH,
} from "./billing.js";
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

// Mirrors the Worker's validation (worker/brandLogo.mjs) so a bad file is
// rejected instantly client-side — the Worker remains the source of truth
// and re-validates on upload regardless.
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function describeSaveError(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  switch (code) {
    case "unsupported_logo_type":
      return "Logo must be a PNG or JPEG image.";
    case "logo_too_large":
      return "Logo must be smaller than 2 MB.";
    case "logo_storage_not_configured":
      return "Logo storage isn't set up yet — organisation name, font and colour were still saved.";
    case "organisation_name_required":
      return "Organisation name is required.";
    default:
      return "Could not save organisation branding.";
  }
}

export function BrandProfileEditor() {
  const [profile, setProfile] = useState<BrandProfileInput>(EMPTY_PROFILE);
  const [hasPersistedLogo, setHasPersistedLogo] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saved" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const saved = await fetchVectorBrandProfile();
        if (cancelled) return;
        if (saved) {
          setProfile({ ...EMPTY_PROFILE, ...saved });
          setHasPersistedLogo(saved.hasLogo);
        }
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

  // The pending file's preview is a local blob URL, revoked whenever a
  // different file is chosen or the component unmounts.
  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setLogoError(null);
    if (!file) {
      setLogoFile(null);
      return;
    }
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      setLogoError("Logo must be a PNG or JPEG image.");
      event.target.value = "";
      setLogoFile(null);
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be smaller than 2 MB.");
      event.target.value = "";
      setLogoFile(null);
      return;
    }
    setLogoFile(file);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      if (logoFile) {
        await uploadVectorBrandLogo(logoFile);
      }
      const saved = await saveVectorBrandProfile(profile);
      setProfile({ ...EMPTY_PROFILE, ...saved });
      setHasPersistedLogo(saved.hasLogo || !!logoFile);
      setLogoFile(null);
      setLogoVersion((version) => version + 1);
      setStatus("saved");
      window.dispatchEvent(new CustomEvent("vector:brand-profile-saved"));
    } catch (err) {
      setStatus("error");
      setError(describeSaveError(err));
    }
  }

  function updateField(field: keyof BrandProfileInput, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    setStatus("ready");
  }

  const activeAccentHex = (profile.accentHex || BRAND_ACCENT_SWATCHES[0].hex).toUpperCase().replace(/^#/, "");
  const logoDisplayUrl = logoPreviewUrl ?? (hasPersistedLogo ? `${VECTOR_BRAND_LOGO_PATH}?v=${logoVersion}` : null);

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
          <input id="brand-logo" type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} />
          <p className="field-note" style={{ marginTop: "0.375rem" }}>
            PNG or JPEG, up to 2 MB.
          </p>
          {logoError && (
            <p role="alert" className="field-note" style={{ color: "#8a4b13" }}>
              {logoError}
            </p>
          )}
          {logoDisplayUrl ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem" }}>
              <img
                src={logoDisplayUrl}
                alt="Organisation logo"
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                  border: "1px solid var(--border-hairline)",
                  borderRadius: "8px",
                  background: "#fff",
                }}
              />
              <p className="field-note" style={{ margin: 0 }}>
                {logoPreviewUrl ? "New logo — saved when you click Save brand profile." : "Current logo."}
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
