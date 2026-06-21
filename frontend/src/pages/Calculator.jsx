import { useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Car, Bus, Train, Plane, Zap, Beef, Salad, Droplet, ShoppingBag, Trash2 } from "lucide-react";

const FIELDS = [
  { key: "transport_km_car", label: "Car km today", icon: Car, max: 200 },
  { key: "transport_km_bus", label: "Bus km", icon: Bus, max: 100 },
  { key: "transport_km_train", label: "Train km", icon: Train, max: 300 },
  { key: "transport_km_flight", label: "Flight km", icon: Plane, max: 2000 },
  { key: "electricity_kwh", label: "Electricity (kWh)", icon: Zap, max: 50 },
  { key: "food_meat_meals", label: "Meat meals", icon: Beef, max: 5, step: 1 },
  { key: "food_veg_meals", label: "Plant meals", icon: Salad, max: 5, step: 1 },
  { key: "water_liters", label: "Water (L)", icon: Droplet, max: 500 },
  { key: "shopping_usd", label: "Shopping ($)", icon: ShoppingBag, max: 500 },
  { key: "waste_kg", label: "Waste (kg)", icon: Trash2, max: 10 },
];

export default function Calculator() {
  const initial = Object.fromEntries(FIELDS.map(f => [f.key, 0]));
  const [data, setData] = useState(initial);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const r = await api.post("/carbon/entry", data);
      setResult(r.data);
      toast.success(`Logged · +${r.data.points_earned} points`);
    } catch {
      toast.error("Failed to log");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="label-small mb-2">Daily log</div>
      <h1 className="font-serif text-4xl md:text-5xl mb-2">Carbon <em className="text-accent">calculator.</em></h1>
      <p className="text-muted-foreground mb-8 max-w-xl">Today's lifestyle, weighed in CO₂. Adjust each lever and see the impact crystallize.</p>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 p-8">
          <div className="grid sm:grid-cols-2 gap-6">
            {FIELDS.map(f => (
              <div key={f.key}>
                <Label className="flex items-center gap-2 mb-2">
                  <f.icon className="h-4 w-4 text-accent"/> <span className="text-sm">{f.label}</span>
                </Label>
                <div className="flex items-center gap-3">
                  <Slider value={[data[f.key]]} max={f.max} step={f.step || 0.5}
                          onValueChange={(v)=>setData(d=>({...d, [f.key]: v[0]}))}
                          className="flex-1"
                          data-testid={`slider-${f.key}`}/>
                  <Input type="number" value={data[f.key]} step={f.step || 0.5} min={0} max={f.max}
                         onChange={(e)=>setData(d=>({...d, [f.key]: parseFloat(e.target.value)||0}))}
                         className="w-20 h-9 text-sm font-mono-eco"
                         data-testid={`input-${f.key}`}/>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={submit} disabled={loading} className="rounded-full mt-8 px-8" data-testid="calculator-submit-btn">
            {loading ? "Calculating…" : "Save today's entry"}
          </Button>
        </Card>

        <Card className="p-8 sticky top-6 h-fit">
          <div className="label-small mb-2">Result</div>
          <h3 className="font-serif text-2xl mb-6">Today's footprint</h3>
          {result ? (
            <>
              <div className="font-serif text-6xl text-accent">{result.entry.emissions.total} <span className="text-base text-muted-foreground">kg</span></div>
              <div className="mt-2 text-sm">Points earned: <span className="font-semibold text-accent">+{result.points_earned}</span></div>
              <div className="mt-1 text-sm">Level: <span className="font-semibold">{result.new_level}</span></div>
              <div className="mt-6 space-y-2 border-t border-border pt-4">
                {Object.entries(result.entry.emissions).filter(([k])=>k!=="total").map(([k,v])=>(
                  <div key={k} className="flex justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{k}</span>
                    <span className="font-mono-eco">{v} kg</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Fill the form to compute your footprint.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
