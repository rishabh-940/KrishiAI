import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import DiseaseDetector from "./pages/DiseaseDetector";
import SchemesAdvisor from "./pages/SchemesAdvisor";
import ChemicalChat from "./pages/ChemicalChat";
import PricePredictor from "./pages/PricePredictor";
import WeatherAdvisory from "./pages/WeatherAdvisory";
import CropRecommender from "./pages/CropRecommender";
import CropEncyclopedia from "./pages/CropEncyclopedia";
import ModernFarming from "./pages/ModernFarming";
import { krishiApi } from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [aiHealthy, setAiHealthy] = useState(false);

  useEffect(() => {
    krishiApi
      .getDashboardSummary()
      .then((res) => setAiHealthy(res?.aiService?.status === "healthy"))
      .catch(() => setAiHealthy(false));
  }, []);

  function renderPage() {
    switch (activeTab) {
      case "disease":
        return <DiseaseDetector />;
      case "schemes":
        return <SchemesAdvisor />;
      case "chemicals":
        return <ChemicalChat />;
      case "prices":
        return <PricePredictor />;
      case "recommender":
        return <CropRecommender />;
      case "weather":
        return <WeatherAdvisory />;
      case "encyclopedia":
        return <CropEncyclopedia />;
      case "modern":
        return <ModernFarming />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} aiHealthy={aiHealthy}>
      {renderPage()}
    </Layout>
  );
}
