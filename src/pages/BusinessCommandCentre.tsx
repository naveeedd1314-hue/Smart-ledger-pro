import BusinessStrategyDashboard from "../components/BusinessStrategyDashboard";
import PriceMovementAnalysis from "../components/PriceMovementAnalysis";
import MarketRateIntelligence from "../components/MarketRateIntelligence";
import ReorderAdvisor from "../components/ReorderAdvisor";

export default function BusinessCommandCentre() {
  return (
    <main data-sl-page="true" style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, opacity: .65 }}>SMARTLEDGER INTELLIGENCE</div>
        <h1 style={{ fontSize: 28, margin: "7px 0" }}>Business Command Centre</h1>
        <p style={{ opacity: .7, margin: 0, fontSize: 14 }}>
          Business calculations, performance insights, pricing analysis and decision support.
        </p>
      </header>
      <ReorderAdvisor />
      <MarketRateIntelligence />
    <PriceMovementAnalysis />
<BusinessStrategyDashboard />
</main>
  );
}
