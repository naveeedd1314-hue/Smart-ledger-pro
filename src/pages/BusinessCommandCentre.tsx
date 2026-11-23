import BusinessStrategyDashboard from "../components/BusinessStrategyDashboard";
import PriceMovementAnalysis from "../components/PriceMovementAnalysis";
import MarketRateIntelligence from "../components/MarketRateIntelligence";
import ReorderAdvisor from "../components/ReorderAdvisor";

export default function BusinessCommandCentre() {
  return (
    <main data-sl-page="true" className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <header className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
        <div className="text-xs font-bold tracking-[0.18em] text-[var(--indigo)]">SMARTLEDGER INTELLIGENCE</div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Business Command Centre</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-2)]">
          Demand signals, stock planning, price movement and business performance in one workspace.
        </p>
      </header>
      <div className="space-y-5">
        <ReorderAdvisor />
        <MarketRateIntelligence />
        <PriceMovementAnalysis />
        <BusinessStrategyDashboard />
      </div>
    </main>
  );
}
