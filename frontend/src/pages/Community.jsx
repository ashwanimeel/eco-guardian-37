import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TreePine } from "lucide-react";

export default function Community() {
  const [leaders, setLeaders] = useState([]);
  useEffect(() => { api.get("/community/leaderboard").then(r => setLeaders(r.data)); }, []);

  const medals = ["#D6A85A", "#94A684", "#6B4F3A"];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="label-small mb-2"><Trophy className="inline h-3 w-3 mr-1"/> Community</div>
      <h1 className="font-serif text-4xl md:text-5xl mb-2">Leaderboard.</h1>
      <p className="text-muted-foreground mb-8 max-w-xl">The people moving the needle, ranked by climate impact.</p>

      <Card className="overflow-hidden">
        {leaders.map((u, i) => (
          <div key={u.name + i} className={`flex items-center gap-4 p-5 ${i < leaders.length-1 ? "border-b border-border" : ""}`} data-testid={`leaderboard-row-${i}`}>
            <div className="font-serif text-3xl w-10 text-center" style={{color: i < 3 ? medals[i] : undefined}}>{i+1}</div>
            <Avatar><AvatarImage src={u.picture}/><AvatarFallback>{u.name.slice(0,2)}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{u.name}</div>
              <div className="label-small">{u.level}</div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-right">
                <div className="label-small text-[10px]">Points</div>
                <div className="font-mono-eco font-semibold">{u.points}</div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="label-small text-[10px]">Badges</div>
                <div className="font-mono-eco">{u.badges}</div>
              </div>
              <div className="text-right hidden sm:flex items-center gap-1 text-accent">
                <TreePine className="h-3 w-3"/> {u.trees}
              </div>
            </div>
          </div>
        ))}
        {leaders.length === 0 && <div className="p-10 text-center text-muted-foreground">No users yet — be the first!</div>}
      </Card>
    </div>
  );
}
