import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { TrendingDown, TreePine, Award, Flame, Sparkles } from "lucide-react";

const PALETTE = ["#1A2F24", "#94A684", "#C0573E", "#5C7345", "#D6A85A", "#6B4F3A"];

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [tip, setTip] = useState("");

  useEffect(() => {
    (async () => {
      const [s, p, t] = await Promise.all([
        api.get("/carbon/summary"),
        api.get("/carbon/predict"),
        api.get("/coach/tip"),
      ]);
      setSummary(s.data); setPrediction(p.data); setTip(t.data.tip);
    })();
  }, []);

  if (!summary) return <div className="p-10 text-muted-foreground">Loading dashboard…</div>;

  const catData = Object.entries(summary.categories).map(([k,v]) => ({name: k, value: v}));

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="label-small mb-2">Welcome back, {user.name}</div>
          <h1 className="font-serif text-4xl md:text-5xl">Your climate <em className="text-accent">compass.</em></h1>
        </div>
        <div className="flex gap-2">
          <Link to="/calculator"><Button className="rounded-full" data-testid="dashboard-log-btn"><Sparkles className="h-4 w-4 mr-2"/>Log today</Button></Link>
        </div>
      </div>

      {/* Top stat row */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <ScoreCard score={summary.score} />
        <KpiCard icon={<TrendingDown/>} label="Daily CO₂" value={`${summary.daily} kg`} sub="today" testid="kpi-daily"/>
        <KpiCard icon={<TreePine/>} label="Trees to offset" value={summary.trees_to_offset} sub="this month" testid="kpi-trees"/>
        <KpiCard icon={<Flame/>} label="Streak" value={`${user.streak} days`} sub={`Lvl: ${user.level}`} testid="kpi-streak"/>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Trend chart */}
        <Card className="md:col-span-2 p-6">
          <div className="flex justify-between items-baseline mb-4">
            <div>
              <div className="label-small">14-day trend</div>
              <h3 className="font-serif text-2xl">CO₂ emissions, kg</h3>
            </div>
            <span className="text-xs text-muted-foreground">{prediction?.trend} · {prediction?.confidence}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={summary.trend}>
              <XAxis dataKey="date" tickFormatter={(d)=>d.slice(5)} stroke="#94A684" fontSize={11}/>
              <YAxis stroke="#94A684" fontSize={11}/>
              <Tooltip contentStyle={{background:"#1A2F24", border:"none", borderRadius:8, color:"#F7F5F0"}}/>
              <Line type="monotone" dataKey="co2" stroke="#C0573E" strokeWidth={2.5} dot={{r:3}}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Green Twin */}
        <Card className="p-6 relative overflow-hidden">
          <div className="label-small mb-2">Your Green Twin</div>
          <h3 className="font-serif text-2xl mb-4">{twinName(user.green_twin)}</h3>
          <div className="flex items-center justify-center my-6">
            <TwinAvatar score={user.green_twin}/>
          </div>
          <Progress value={user.green_twin} className="h-2" data-testid="green-twin-progress"/>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Seedling</span><span>{user.green_twin}/100</span><span>Forest</span>
          </div>
        </Card>
      </div>

      {/* Categories + Prediction + Tip */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card className="p-6">
          <div className="label-small mb-2">Category breakdown</div>
          <h3 className="font-serif text-xl mb-4">Where it comes from</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {catData.map((_,i)=> <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
              </Pie>
              <Tooltip contentStyle={{background:"#1A2F24", border:"none", borderRadius:8, color:"#F7F5F0"}}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-4 text-xs">
            {catData.map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{background: PALETTE[i % PALETTE.length]}}/>
                <span className="capitalize">{c.name}</span>
                <span className="ml-auto font-mono-eco">{c.value}kg</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="label-small mb-2">Predictive model</div>
          <h3 className="font-serif text-xl mb-4">Next month forecast</h3>
          <div className="text-5xl font-serif text-accent" data-testid="prediction-value">{prediction?.predicted_monthly} <span className="text-base">kg</span></div>
          <p className="text-sm text-muted-foreground mt-3">Avg daily: {prediction?.daily_avg ?? "—"} kg · trend: {prediction?.trend}</p>
          <Link to="/coach"><Button variant="outline" className="rounded-full mt-6 w-full" data-testid="dashboard-coach-cta">Ask coach for plan</Button></Link>
        </Card>

        <Card className="p-6 bg-secondary/30">
          <div className="label-small mb-2"><Award className="inline h-3 w-3"/> Daily eco-tip</div>
          <h3 className="font-serif text-xl mt-2 leading-tight" data-testid="daily-tip">{tip || "Loading…"}</h3>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Mini label="Points" value={user.points}/>
            <Mini label="Badges" value={user.badges?.length || 0}/>
            <Mini label="Trees" value={user.trees_planted || 0}/>
            <Mini label="Entries" value={summary.total_entries}/>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ScoreCard({ score }) {
  const color = score >= 70 ? "#5C7345" : score >= 40 ? "#D6A85A" : "#C0573E";
  return (
    <Card className="p-6 relative overflow-hidden" data-testid="kpi-score">
      <div className="label-small mb-2">Carbon score</div>
      <div className="flex items-baseline gap-2">
        <div className="font-serif text-5xl" style={{color}}>{score}</div>
        <div className="text-sm text-muted-foreground">/100</div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{score >= 70 ? "Living lightly" : score >= 40 ? "Room to improve" : "High footprint"}</p>
    </Card>
  );
}
function KpiCard({ icon, label, value, sub, testid }) {
  return (
    <Card className="p-6" data-testid={testid}>
      <div className="text-accent mb-3">{icon}</div>
      <div className="label-small">{label}</div>
      <div className="font-serif text-3xl mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </Card>
  );
}
function Mini({ label, value }) {
  return (
    <div className="p-2 rounded bg-background/50">
      <div className="label-small text-[10px]">{label}</div>
      <div className="font-serif text-2xl">{value}</div>
    </div>
  );
}
function twinName(s) {
  if (s < 25) return "Seedling";
  if (s < 50) return "Sapling";
  if (s < 75) return "Young Tree";
  return "Mighty Oak";
}
function TwinAvatar({ score }) {
  const size = 100 + score * 0.4;
  const opacity = 0.4 + score / 200;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <defs>
        <radialGradient id="leaf" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#94A684" stopOpacity={opacity}/>
          <stop offset="100%" stopColor="#1A2F24" stopOpacity={opacity}/>
        </radialGradient>
      </defs>
      <circle cx="70" cy="70" r={size/2} fill="url(#leaf)" />
      <path d="M70 30 C 60 50, 40 60, 50 80 Q 70 100, 90 80 C 100 60, 80 50, 70 30 Z" fill="#5C7345" opacity={0.7}/>
      <rect x="68" y="80" width="4" height="20" fill="#6B4F3A"/>
    </svg>
  );
}
