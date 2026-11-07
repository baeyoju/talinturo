import { useEffect, useState } from "react";
import { api } from "@/adapters/http/api";

const STORAGE_KEY = "talinturo-settings";

function loadSettings() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const savedSettings = saved ? JSON.parse(saved) : {};
  return {
    sound: true,
    reducedMotion: false,
    weekly: false,
    themeMode: savedSettings.themeMode === "dark" ? "dark" : "light",
    ...(typeof savedSettings.sound === "boolean" ? { sound: savedSettings.sound } : {}),
    ...(typeof savedSettings.reducedMotion === "boolean" ? { reducedMotion: savedSettings.reducedMotion } : {}),
    ...(typeof savedSettings.weekly === "boolean" ? { weekly: savedSettings.weekly } : {}),
  };
}

export function useSettings({ isAuthenticated, userId, onToast }) {
  const [settings, setSettings] = useState(loadSettings);

  // Pull saved account preferences after sign-in.
  useEffect(() => {
    if (!isAuthenticated || !userId) return undefined;
    let active = true;
    api("/preferences")
      .then(({ preferences }) => {
        if (!active) return;
        const savedSettings = {
          themeMode: preferences.theme_mode === "dark" ? "dark" : "light",
          sound: Boolean(preferences.sound),
          reducedMotion: Boolean(preferences.reduced_motion),
          weekly: Boolean(preferences.weekly_summary),
        };
        setSettings(savedSettings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSettings));
      })
      .catch((error) => {
        if (active) onToast(`Couldn't load your saved preferences: ${error.message}`);
      });
    return () => { active = false; };
  }, [isAuthenticated, userId]);

  const savePreferences = async (nextSettings) => {
    try {
      const result = await api("/preferences", {
        method: "PUT",
        body: JSON.stringify({
          theme_mode: nextSettings.themeMode,
          sound: nextSettings.sound,
          reduced_motion: nextSettings.reducedMotion,
          weekly_summary: nextSettings.weekly,
        }),
      });
      const savedSettings = {
        themeMode: result.preferences.theme_mode,
        sound: Boolean(result.preferences.sound),
        reducedMotion: Boolean(result.preferences.reduced_motion),
        weekly: Boolean(result.preferences.weekly_summary),
      };
      setSettings(savedSettings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSettings));
      onToast("Your preferences have been saved to your account.");
    } catch (error) {
      onToast(`Couldn't save your preferences: ${error.message}`);
    }
  };

  return { settings, setSettings, savePreferences };
}
