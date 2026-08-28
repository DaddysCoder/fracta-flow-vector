import { useEffect, useState } from "react";
import { fetchVectorBrandProfile, saveVectorBrandProfile } from "./billing.js";
import type { BrandProfileInput } from "./brandProfile.js";

const EMPTY_PROFILE: BrandProfileInput = {
  organisationName: "",
  accentHex: "",
  inkHex: "",
  paperHex: "",
  contactLine: "",
  footerText: "",
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
        Accent colour (hex)
        <input value={profile.accentHex ?? ""} onChange={(event) => updateField("accentHex", event.target.value)} />
      </label>
      <label>
        Ink colour (hex)
        <input value={profile.inkHex ?? ""} onChange={(event) => updateField("inkHex", event.target.value)} />
      </label>
      <label>
        Paper colour (hex)
        <input value={profile.paperHex ?? ""} onChange={(event) => updateField("paperHex", event.target.value)} />
      </label>
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
