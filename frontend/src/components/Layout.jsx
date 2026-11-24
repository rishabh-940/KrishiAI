import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import wheatLogo from "../assets/wheat-logo.jpeg";
import LanguageToggle from "./LanguageToggle";
import {
  LayoutDashboard,
  ScanLine,
  Landmark,
  FlaskConical,
  TrendingUp,
  CloudSun,
  Sprout,
  BookOpen,
  Cpu,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", labelKey: "nav.dashboard", defaultLabel: "Dashboard", sectionKey: "sections.overview", defaultSection: "Overview", icon: LayoutDashboard },
  { id: "disease", labelKey: "nav.disease", defaultLabel: "Crop Disease AI", sectionKey: "sections.aiModules", defaultSection: "AI / DL / ML Modules", icon: ScanLine },
  { id: "schemes", labelKey: "nav.schemes", defaultLabel: "Govt Schemes", sectionKey: "sections.aiModules", defaultSection: "AI / DL / ML Modules", icon: Landmark },
  { id: "chemicals", labelKey: "nav.chemicals", defaultLabel: "Chemicals & NPK Chat", sectionKey: "sections.aiModules", defaultSection: "AI / DL / ML Modules", icon: FlaskConical },
  { id: "prices", labelKey: "nav.prices", defaultLabel: "Mandi Price Forecast", sectionKey: "sections.aiModules", defaultSection: "AI / DL / ML Modules", icon: TrendingUp },
  { id: "recommender", labelKey: "nav.recommender", defaultLabel: "Smart Crop ML", sectionKey: "sections.aiModules", defaultSection: "AI / DL / ML Modules", icon: Sprout },
  { id: "weather", labelKey: "nav.weather", defaultLabel: "Weather Advisory", sectionKey: "sections.fieldKnowledge", defaultSection: "Field & Knowledge", icon: CloudSun },
  { id: "encyclopedia", labelKey: "nav.encyclopedia", defaultLabel: "Indian Crops Guide", sectionKey: "sections.fieldKnowledge", defaultSection: "Field & Knowledge", icon: BookOpen },
  { id: "modern", labelKey: "nav.modern", defaultLabel: "Modern Farming & Tech", sectionKey: "sections.fieldKnowledge", defaultSection: "Field & Knowledge", icon: Cpu },
];

export default function Layout({ activeTab, setActiveTab, aiHealthy, children }) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const currentMeta = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  const sectionList = [
    { key: "sections.overview", fallback: "Overview" },
    { key: "sections.aiModules", fallback: "AI / DL / ML Modules" },
    { key: "sections.fieldKnowledge", fallback: "Field & Knowledge" },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <img
            src={wheatLogo}
            alt="KrishiAI Wheat Logo"
            className="brand-logo-img"
          />
          <div>
            <h1>{t("brand.name", "KrishiAI")}</h1>
            <span>{t("brand.tagline", "100% Free Agri AI/ML/DL Suite")}</span>
          </div>
        </div>

        {sectionList.map((sec) => (
          <div key={sec.key}>
            <div className="nav-section">{t(sec.key, sec.fallback)}</div>
            {NAV_ITEMS.filter((i) => i.sectionKey === sec.key).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-btn ${activeTab === item.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMenuOpen(false);
                  }}
                >
                  <Icon size={18} />
                  <span>{t(item.labelKey, item.defaultLabel)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="btn btn-secondary mobile-menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle Menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="topbar-title">
              <h2>{t(currentMeta.labelKey, currentMeta.defaultLabel)}</h2>
              <p>{t("brand.subtitle", "Precision Agriculture Platform — React + Express + Python FastAPI")}</p>
            </div>
          </div>

          <div className="topbar-right">
            <LanguageToggle onLanguageChange={setIsTransitioning} />

            <div className={`status-pill ${aiHealthy ? "" : "offline"}`}>
              <span className="dot" />
              <span className="status-pill-text">
                {aiHealthy
                  ? t("status.online", "AI/ML Engine Online")
                  : t("status.connecting", "AI Engine Connecting...")}
              </span>
            </div>
          </div>
        </header>

        <main className={`content ${isTransitioning ? "lang-crossfade" : "lang-settled"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
