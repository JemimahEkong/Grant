"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useProjects } from "../../../components/providers";
import { PageHeader, Spinner } from "../../../components/ui";
import { createProject } from "../../../lib/ui/actions";
import type { Brief, Platform } from "../../../lib/licensing/schema";

const platformOptions: Array<{ value: Platform; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
];

const termOptions = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
];

const territoryOptions = [
  { value: "worldwide", label: "Worldwide", code: null },
  { value: "NG", label: "Nigeria", code: "NG" },
  { value: "US", label: "United States", code: "US" },
  { value: "GB", label: "United Kingdom", code: "GB" },
  { value: "CA", label: "Canada", code: "CA" },
];

export default function NewBriefPage() {
  const router = useRouter();
  const { refreshProjects, selectProjectId } = useProjects();
  const [clientName, setClientName] = useState("");
  const [publicLabel, setPublicLabel] = useState("");
  const [intendedUse, setIntendedUse] = useState<Brief["intendedUse"]>("organic");
  const [platforms, setPlatforms] = useState<Platform[]>(["instagram", "tiktok"]);
  const [termDays, setTermDays] = useState(90);
  const [territory, setTerritory] = useState("worldwide");
  const [clipDuration, setClipDuration] = useState(30);
  const [clientDelivery, setClientDelivery] = useState(true);
  const [reposting, setReposting] = useState(false);
  const [futureCampaigns, setFutureCampaigns] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedTerritory = territoryOptions.find(option => option.value === territory) ?? territoryOptions[0];

  const sentence = useMemo(() => {
    const platformText = platforms.length
      ? platforms.map(platform => platformOptions.find(option => option.value === platform)?.label ?? platform).join(" and ")
      : "no platforms";
    const useText = intendedUse === "paid_ad" ? "paid ad" : "organic";
    const territoryText = selectedTerritory.code ? selectedTerritory.label : "worldwide";
    return `${clipDuration} second ${useText} video, ${platformText}, ${termDays === 365 ? "1 year" : `${termDays} days`}, ${territoryText}, for ${clientName.trim() || "your client"}. ${clientDelivery ? "Client delivery allowed" : "Client delivery excluded"}. ${reposting ? "Reposting allowed" : "Reposting excluded"}. ${futureCampaigns ? "Future campaigns allowed" : "Future campaigns excluded"}.`;
  }, [clientDelivery, clientName, clipDuration, futureCampaigns, intendedUse, platforms, reposting, selectedTerritory, termDays]);

  function togglePlatform(platform: Platform) {
    setPlatforms(current => (current.includes(platform) ? current.filter(item => item !== platform) : [...current, platform]));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (platforms.length === 0) {
      setError("Choose at least one platform.");
      return;
    }
    if (!clientName.trim() || !publicLabel.trim()) {
      setError("Add a private client name and a public project label.");
      return;
    }
    const brief: Brief = {
      intendedUse,
      platforms,
      territory: selectedTerritory.code ? { worldwide: false, countries: [selectedTerritory.code] } : { worldwide: true, countries: [] },
      termDays,
      clipDurationSeconds: clipDuration,
      clientDelivery,
      reposting,
      futureCampaigns,
    };
    setBusy(true);
    try {
      const result = await createProject({
        clientPrivateName: clientName.trim(),
        publicDisplayLabel: publicLabel.trim(),
        brief,
      });
      await refreshProjects(result.project.id);
      selectProjectId(result.project.id);
      router.push("/app/catalog");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="What are you making?"
        lede="One sentence is enough. The chips are authoritative and go through the same coverage rules as every quote."
      />
      <form onSubmit={submit} className="stack">
        <div className="brief-sentence" aria-live="polite">
          <div className="q">Your brief</div>
          <p>{sentence}</p>
        </div>

        <div className="field">
          <label htmlFor="client">Client (private)</label>
          <input
            id="client"
            className="input"
            value={clientName}
            onChange={event => setClientName(event.target.value)}
            placeholder="Harbor Athletics"
            autoComplete="organization"
            required
          />
          <span className="form-hint">Used only for your records. It never appears on the public proof page.</span>
        </div>

        <div className="field">
          <label htmlFor="public-label">Public project label</label>
          <input
            id="public-label"
            className="input"
            value={publicLabel}
            onChange={event => setPublicLabel(event.target.value)}
            placeholder="Harbor Athletics — Spring Reel"
            required
          />
          <span className="form-hint">This label appears on the license and proof page.</span>
        </div>

        <div className="field">
          <div className="row-between">
            <span className="micro">Use</span>
            <span className="micro">Paid ads changes coverage</span>
          </div>
          <div className="chip-group">
            <button type="button" className={`chip-toggle${intendedUse === "organic" ? " on" : ""}`} aria-pressed={intendedUse === "organic"} onClick={() => setIntendedUse("organic")}>
              Organic
            </button>
            <button type="button" className={`chip-toggle${intendedUse === "paid_ad" ? " on" : ""}`} aria-pressed={intendedUse === "paid_ad"} onClick={() => setIntendedUse("paid_ad")}>
              Paid ads
            </button>
          </div>
        </div>

        <div className="field">
          <div className="row-between">
            <span className="micro">Platforms</span>
            <span className="muted" style={{ fontSize: 8.5 }}>{platforms.length} of 4</span>
          </div>
          <div className="chip-group">
            {platformOptions.map(option => (
              <button
                key={option.value}
                type="button"
                className={`chip-toggle${platforms.includes(option.value) ? " on" : ""}`}
                aria-pressed={platforms.includes(option.value)}
                onClick={() => togglePlatform(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="micro">Term</span>
          <div className="chip-group">
            {termOptions.map(option => (
              <button
                key={option.value}
                type="button"
                className={`chip-toggle${termDays === option.value ? " on" : ""}`}
                aria-pressed={termDays === option.value}
                onClick={() => setTermDays(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="micro">Territory</span>
          <div className="chip-group">
            {territoryOptions.map(option => (
              <button
                key={option.value}
                type="button"
                className={`chip-toggle${territory === option.value ? " on" : ""}`}
                aria-pressed={territory === option.value}
                onClick={() => setTerritory(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="micro">Clip duration</span>
          <div className="chip-group">
            {[15, 30, 60].map(seconds => (
              <button
                key={seconds}
                type="button"
                className={`chip-toggle${clipDuration === seconds ? " on" : ""}`}
                aria-pressed={clipDuration === seconds}
                onClick={() => setClipDuration(seconds)}
              >
                {seconds} seconds
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="micro">Permissions</span>
          <div className="chip-group">
            <button type="button" className={`chip-toggle${clientDelivery ? " on" : ""}`} aria-pressed={clientDelivery} onClick={() => setClientDelivery(value => !value)}>
              Client delivery
            </button>
            <button type="button" className={`chip-toggle${reposting ? " on" : ""}`} aria-pressed={reposting} onClick={() => setReposting(value => !value)}>
              Reposting
            </button>
            <button type="button" className={`chip-toggle${futureCampaigns ? " on" : ""}`} aria-pressed={futureCampaigns} onClick={() => setFutureCampaigns(value => !value)}>
              Future campaigns
            </button>
          </div>
        </div>

        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        <button className="btn btn-primary btn-wide" type="submit" disabled={busy}>
          <span>{busy ? "Creating project…" : "Find tracks"}</span>
          {busy ? <Spinner /> : <span aria-hidden="true">→</span>}
        </button>
        <p className="form-hint">
          Paid ads narrows the catalog. Some tracks won't offer them. You'll see that before you pay.
        </p>
      </form>
    </>
  );
}
