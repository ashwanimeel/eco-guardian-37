import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trophy, Plus, Check } from "lucide-react";

export default function Challenges() {
  const [list, setList] = useState([]);

  const load = async () => {
    const r = await api.get("/challenges");
    setList(r.data);
  };
  useEffect(() => { load(); }, []);

  const join = async (id) => {
    await api.post("/challenges/join", { challenge_id: id });
    toast.success("Joined challenge");
    load();
  };
  const progress = async (id) => {
    const r = await api.post("/challenges/progress", { challenge_id: id, increment: 1 });
    if (r.data.completed && r.data.points_earned) {
      toast.success(`Completed! +${r.data.points_earned} points`);
    } else {
      toast.success("Progress logged");
    }
    load();
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="label-small mb-2"><Trophy className="inline h-3 w-3 mr-1"/> Gamification</div>
      <h1 className="font-serif text-4xl md:text-5xl mb-2">Eco <em className="text-accent">challenges.</em></h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">Small commitments, compounding into climate action.</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map(c => {
          const pct = (c.progress / c.target) * 100;
          return (
            <Card key={c.challenge_id} className="p-6 relative" data-testid={`challenge-${c.challenge_id}`}>
              <div className="flex items-start justify-between mb-3">
                <Badge variant="outline" className="uppercase text-[10px] tracking-widest">{c.category}</Badge>
                {c.completed && <Check className="h-5 w-5 text-accent"/>}
              </div>
              <h3 className="font-serif text-2xl mb-2">{c.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{c.description}</p>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="label-small text-[10px]">Progress</span>
                  <span className="font-mono-eco">{c.progress}/{c.target} {c.unit}</span>
                </div>
                <Progress value={pct} className="h-1.5"/>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="label-small text-[10px]">Reward</div>
                  <div className="text-sm">{c.reward_points} pts · <span className="text-accent">{c.badge}</span></div>
                </div>
                {c.joined ? (
                  <Button size="sm" disabled={c.completed} onClick={()=>progress(c.challenge_id)} className="rounded-full" data-testid={`challenge-progress-${c.challenge_id}`}>
                    <Plus className="h-3 w-3 mr-1"/> Log
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={()=>join(c.challenge_id)} className="rounded-full" data-testid={`challenge-join-${c.challenge_id}`}>
                    Join
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
