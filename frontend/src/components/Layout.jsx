import React, { useState } from "react";
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
  { id: "dashboard", label: "Dashboard", section: "Overview", icon: LayoutDashboard },
  { id: "disease", label: "Crop Disease AI", section: "AI / DL / ML Modules", icon: ScanLine },
  { id: "schemes", label: "Govt Schemes (AgriParam)", section: "AI / DL / ML Modules", icon: Landmark },
  { id: "chemicals", label: "Chemicals & NPK Chat", section: "AI / DL / ML Modules", icon: FlaskConical },
  { id: "prices", label: "Mandi Price Forecast", section: "AI / DL / ML Modules", icon: TrendingUp },
  { id: "recommender", label: "Smart Crop ML", section: "AI / DL / ML Modules", icon: Sprout },
  { id: "weather", label: "Weather Advisory", section: "Field & Knowledge", icon: CloudSun },
  { id: "encyclopedia", label: "Indian Crops Guide", section: "Field & Knowledge", icon: BookOpen },
  { id: "modern", label: "Modern Farming & Tech", section: "Field & Knowledge", icon: Cpu },
];

export default function Layout({ activeTab, setActiveTab, aiHealthy, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const currentMeta = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];
  const sections = ["Overview", "AI / DL / ML Modules", "Field & Knowledge"];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">K</div>
          <div>
            <h1>KrishiAI</h1>
            <span>100% Free Agri AI/ML/DL Suite</span>
          </div>
        </div>

        {sections.map((sec) => (
          <div key={sec}>
            <div className="nav-section">{sec}</div>
            {NAV_ITEMS.filter((i) => i.section === sec).map((item) => {
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
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn btn-secondary mobile-menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle Menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="topbar-title">
              <h2>{currentMeta.label}</h2>
              <p>Precision Agriculture Platform — React + Express + Python FastAPI</p>
            </div>
          </div>

          <div className={`status-pill ${aiHealthy ? "" : "offline"}`}>
            <span className="dot" />
            {aiHealthy ? "AI/ML Engine Online" : "AI Engine Connecting..."}
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
