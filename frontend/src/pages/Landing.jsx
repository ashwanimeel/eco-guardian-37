import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf, Sparkles, Trophy, Users, BarChart3, Compass } from "lucide-react";

const HERO_BG = "https://images.unsplash.com/photo-1488330890490-c291ecf62571?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHwxfHxhZXJpYWwlMjBmb3Jlc3QlMjBmb2d8ZW58MHx8fHwxNzgyMDExNzMwfDA&ixlib=rb-4.1.0&q=85";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="nav-home-link">
            <Leaf className="h-5 w-5 text-accent" />
            <span className="font-serif text-2xl">EcoTrack <span className="text-accent italic">AI</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" data-testid="nav-login-link"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/register" data-testid="nav-register-link"><Button size="sm" className="rounded-full px-5">Get started</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={HERO_BG} alt="forest" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-10 items-end">
          <div className="md:col-span-7">
            <div className="label-small mb-6" data-testid="hero-tagline">Climate action · Issue 01</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
              Measure your<br/>
              <em className="text-accent">carbon shadow.</em><br/>
              Outgrow it.
            </h1>
            <p className="mt-8 text-lg max-w-xl text-muted-foreground leading-relaxed">
              EcoTrack AI is your climate compass — an intelligent companion that calculates,
              predicts, and gently rewires your everyday choices into a lighter footprint.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register" data-testid="hero-cta-start">
                <Button size="lg" className="rounded-full px-8 h-12">Start tracking free</Button>
              </Link>
              <Link to="/login" data-testid="hero-cta-demo">
                <Button size="lg" variant="outline" className="rounded-full px-8 h-12">Try demo →</Button>
              </Link>
            </div>
          </div>
          <div className="md:col-span-5">
            <div className="eco-card p-8 bg-card/80 backdrop-blur-md">
              <div className="label-small mb-4">Live planetary signal</div>
              <div className="space-y-5">
                <Stat label="Atmospheric CO₂" value="422.7" unit="ppm" />
                <Stat label="Global temperature rise" value="+1.2" unit="°C" />
                <Stat label="Forest loss 2024" value="11M" unit="hectares" />
                <Stat label="Trees to offset avg person" value="190" unit="/year" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features tetris */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="label-small mb-4">What it does</div>
        <h2 className="font-serif text-4xl sm:text-5xl mb-16 max-w-3xl">
          Six lenses to see your impact — and the levers that move it.
        </h2>
        <div className="grid md:grid-cols-12 gap-6">
          <Feature span="md:col-span-7" icon={<BarChart3/>} title="Carbon Calculator"
            text="Six lifestyle categories, instant emissions math, daily / weekly / monthly views." />
          <Feature span="md:col-span-5" icon={<Sparkles/>} title="AI Sustainability Coach"
            text="Claude-powered guidance reading your real data — not a chatbot, a coach." />
          <Feature span="md:col-span-5" icon={<Trophy/>} title="Challenges & Streaks"
            text="No-plastic week. Meatless Monday. Bike-to-work. Earn badges that mean something." />
          <Feature span="md:col-span-7" icon={<Users/>} title="Community Leaderboard"
            text="Compete with friends and campuses. Watch your collective offset grow into forests." />
          <Feature span="md:col-span-4" icon={<Compass/>} title="Green Twin"
            text="An evolving avatar that mirrors your sustainability journey." />
          <Feature span="md:col-span-8" icon={<Leaf/>} title="What-If Simulator"
            text="See the planetary impact if 10,000 people copied your one change." />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <h2 className="font-serif text-4xl sm:text-5xl mb-6">
            The earth is keeping receipts.<br/>
            <em className="text-accent">Make yours lighter.</em>
          </h2>
          <Link to="/register" data-testid="footer-cta-start">
            <Button size="lg" className="rounded-full px-10 h-12 mt-4">Begin your journey</Button>
          </Link>
          <p className="mt-8 label-small">Free forever · No credit card · Demo: demo@ecotrack.ai / demo1234</p>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 EcoTrack AI · Built for the planet
      </footer>
    </div>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/50 pb-3">
      <div className="text-sm">{label}</div>
      <div className="font-mono-eco"><span className="text-2xl font-semibold">{value}</span> <span className="text-xs text-muted-foreground">{unit}</span></div>
    </div>
  );
}
function Feature({ span, icon, title, text }) {
  return (
    <div className={`eco-card p-8 ${span} relative overflow-hidden`}>
      <div className="text-accent mb-4">{icon}</div>
      <h3 className="font-serif text-2xl mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
