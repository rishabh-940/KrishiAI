import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages, Loader2 } from "lucide-react";

export default function LanguageToggle({ className = "", onLanguageChange }) {
  const { i18n, t } = useTranslation();
  const [isSwitching, setIsSwitching] = useState(false);
  const currentLang = i18n.language?.startsWith("hi") ? "hi" : "en";

  const handleSelect = (lang) => {
    if (lang === currentLang || isSwitching) return;
    
    setIsSwitching(true);
    if (onLanguageChange) onLanguageChange(true);

    // Micro-delay gives a realistic, buttery smooth transition + skeleton flash
    setTimeout(() => {
      i18n.changeLanguage(lang);
      setTimeout(() => {
        setIsSwitching(false);
        if (onLanguageChange) onLanguageChange(false);
      }, 220);
    }, 180);
  };

  return (
    <div className={`lang-toggle-wrapper ${className}`}>
      <div className="lang-toggle-track" role="group" aria-label="Language selection">
        {/* Animated Sliding Background Indicator */}
        <div
          className={`lang-slider ${currentLang === "hi" ? "is-hindi" : "is-english"}`}
          aria-hidden="true"
        />

        <div className="lang-icon-slot">
          {isSwitching ? (
            <Loader2 size={13} className="lang-spinner" />
          ) : (
            <Languages size={14} className="lang-icon" />
          )}
        </div>

        <button
          type="button"
          className={`lang-btn ${currentLang === "en" ? "active" : ""}`}
          onClick={() => handleSelect("en")}
          disabled={isSwitching}
          aria-label="Switch to English"
        >
          EN
        </button>

        <button
          type="button"
          className={`lang-btn ${currentLang === "hi" ? "active" : ""}`}
          onClick={() => handleSelect("hi")}
          disabled={isSwitching}
          aria-label="Switch to Hindi (हिन्दी)"
        >
          हिन्दी
        </button>
      </div>
    </div>
  );
}
