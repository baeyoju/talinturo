import { PageTitle } from "@/components/layout/PageTitle";
import { Icon } from "@/components/ui/Icon";
import { SettingRow } from "../components/SettingRow";

export function SettingsPage({ settings, setSettings, onSave, onToast }) {
  const toggle = (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    localStorage.setItem("talinturo-settings", JSON.stringify(next));
  };
  const updateTheme = (themeMode) => {
    const next = { ...settings, themeMode };
    setSettings(next);
    localStorage.setItem("talinturo-settings", JSON.stringify(next));
  };
  return <><PageTitle eyebrow="MAKE IT YOUR OWN" title="Settings" description="A few little choices to make learning feel just right for you." /><div className="settings-layout"><section className="panel settings-panel theme-panel"><p className="eyebrow">YOUR LOOK & FEEL</p><h2>Appearance</h2><p className="theme-description">Choose light or dark. Save your preferences to sync this choice across devices.</p><div className="appearance-options" role="group" aria-label="Color theme"><button type="button" className={`appearance-option ${settings.themeMode === "light" ? "appearance-option-active" : ""}`} aria-pressed={settings.themeMode === "light"} onClick={() => updateTheme("light")}><Icon name="sun" size={21} /><span><strong>Light</strong><small>Bright and welcoming</small></span></button><button type="button" className={`appearance-option ${settings.themeMode === "dark" ? "appearance-option-active" : ""}`} aria-pressed={settings.themeMode === "dark"} onClick={() => updateTheme("dark")}><Icon name="moon" size={21} /><span><strong>Dark</strong><small>Easy on the eyes</small></span></button></div></section><section className="panel settings-panel"><p className="eyebrow">YOUR EXPERIENCE</p><h2>Learning preferences</h2><SettingRow title="Sound effects" text="Play a little sound when you finish an activity." checked={settings.sound} onChange={() => toggle("sound")} /><SettingRow title="Reduce motion" text="Use fewer animations throughout the app." checked={settings.reducedMotion} onChange={() => toggle("reducedMotion")} /></section><section className="panel settings-panel"><p className="eyebrow">KEEP IN THE LOOP</p><h2>Email updates</h2><SettingRow title="Weekly learning summary" text="A quick recap of your progress and little wins." checked={settings.weekly} onChange={() => toggle("weekly")} /><div className="setting-danger"><div><strong>Need a fresh start?</strong><small>Reset your local practice activity. Your account stays safe.</small></div><button onClick={() => onToast("Progress reset is not available in this demo.")}>Reset practice data</button></div></section><div className="settings-footer"><span>Save to your account to sync preferences across devices.</span><button className="button button-outline" onClick={() => onSave(settings)}>Save preferences</button></div></div></>;
}
