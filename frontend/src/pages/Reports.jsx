import { useEffect, useState } from "react";
import { api, API } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileBarChart, Sparkles } from "lucide-react";

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [whatif, setWhatif] = useState({ action:"Skipping one car commute", daily_savings_kg: 4, people: 100000 });
  const [result, setResult] = useState(null);

  useEffect(() => { api.get("/carbon/summary").then(r => setSummary(r.data)); }, []);

  const exportCsv = () => {
    const token = localStorage.getItem("eco_token");
    fetch(`${API}/reports/export`, { credentials:"include", headers: token ? {Authorization:`Bearer ${token}`}: {} })
      .then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "ecotrack_report.csv"; a.click();
      });
  };

  const runSim = async () => {
    const r = await api.post("/simulator/what-if", whatif);
    setResult(r.data);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="label-small mb-2"><FileBarChart className="inline h-3 w-3 mr-1"/> Reports & simulator</div>
      <h1 className="font-serif text-4xl md:text-5xl mb-2">Your <em className="text-accent">impact, exported.</em></h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">Take your data with you. Simulate collective change.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-8">
          <h3 className="font-serif text-2xl mb-2">Personal summary</h3>
          {summary && (
            <div className="space-y-3 my-6">
              <Row label="Today" value={`${summary.daily} kg CO₂`}/>
              <Row label="This week" value={`${summary.weekly} kg CO₂`}/>
              <Row label="This month" value={`${summary.monthly} kg CO₂`}/>
              <Row label="Carbon score" value={`${summary.score}/100`}/>
              <Row label="Trees to offset" value={`${summary.trees_to_offset} 🌲`}/>
              <Row label="Total entries" value={summary.total_entries}/>
            </div>
          )}
          <Button onClick={exportCsv} className="rounded-full" data-testid="export-csv-btn"><Download className="h-4 w-4 mr-2"/>Export CSV</Button>
          <Button variant="outline" onClick={()=>window.print()} className="rounded-full ml-2" data-testid="print-report-btn">Print report</Button>
        </Card>

        <Card className="p-8 bg-secondary/30">
          <div className="label-small mb-2"><Sparkles className="inline h-3 w-3 mr-1"/> What-if simulator</div>
          <h3 className="font-serif text-2xl mb-6">If everyone did this…</h3>

          <div className="space-y-4">
            <div>
              <Label className="label-small">Action</Label>
              <Input value={whatif.action} onChange={(e)=>setWhatif({...whatif, action:e.target.value})} className="mt-2" data-testid="sim-action-input"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="label-small">Daily savings (kg CO₂)</Label>
                <Input type="number" value={whatif.daily_savings_kg} onChange={(e)=>setWhatif({...whatif, daily_savings_kg: parseFloat(e.target.value)||0})} className="mt-2" data-testid="sim-savings-input"/>
              </div>
              <div>
                <Label className="label-small">Number of people</Label>
                <Input type="number" value={whatif.people} onChange={(e)=>setWhatif({...whatif, people: parseInt(e.target.value)||0})} className="mt-2" data-testid="sim-people-input"/>
              </div>
            </div>
            <Button onClick={runSim} className="rounded-full" data-testid="sim-run-btn">Simulate impact</Button>
          </div>

          {result && (
            <div className="mt-8 pt-6 border-t border-border space-y-3">
              <Row label="Annual CO₂ saved" value={`${(result.annual_co2_saved_kg/1000).toFixed(1)} tons`} highlight/>
              <Row label="Trees equivalent" value={`${result.trees_equivalent.toLocaleString()} 🌲`}/>
              <Row label="Cars off the road" value={`${result.cars_off_road_equivalent.toLocaleString()}`}/>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-baseline border-b border-border/50 pb-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono-eco ${highlight ? "text-2xl text-accent font-serif" : "text-base"}`}>{value}</span>
    </div>
  );
}
