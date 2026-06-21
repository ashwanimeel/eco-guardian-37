import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Award, Sparkles, TreePine } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const initials = (user.name||"U").split(" ").map(s=>s[0]).slice(0,2).join("");

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="label-small mb-2">Profile</div>
      <h1 className="font-serif text-4xl md:text-5xl mb-8">Your <em className="text-accent">journey.</em></h1>

      <Card className="p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar className="h-24 w-24"><AvatarImage src={user.picture}/><AvatarFallback className="text-2xl">{initials}</AvatarFallback></Avatar>
          <div className="flex-1">
            <h2 className="font-serif text-3xl">{user.name}</h2>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge>{user.level}</Badge>
              <Badge variant="outline">{user.points} points</Badge>
              <Badge variant="outline">{user.streak} day streak</Badge>
              <Badge variant="outline">{user.auth_provider}</Badge>
            </div>
          </div>
          <Button variant="outline" onClick={async()=>{await logout(); navigate("/");}} className="rounded-full" data-testid="profile-logout-btn">
            <LogOut className="h-4 w-4 mr-2"/>Sign out
          </Button>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6">
          <Award className="h-5 w-5 text-accent mb-3"/>
          <div className="label-small">Badges earned</div>
          <div className="font-serif text-4xl mb-3">{user.badges?.length || 0}</div>
          <div className="flex flex-wrap gap-1">
            {user.badges?.map(b => <Badge key={b} variant="outline" className="text-xs">{b}</Badge>)}
            {(!user.badges || user.badges.length === 0) && <p className="text-sm text-muted-foreground">Complete challenges to earn badges.</p>}
          </div>
        </Card>
        <Card className="p-6">
          <TreePine className="h-5 w-5 text-accent mb-3"/>
          <div className="label-small">Trees planted</div>
          <div className="font-serif text-4xl">{user.trees_planted}</div>
          <p className="text-sm text-muted-foreground mt-2">Through completed offset challenges.</p>
        </Card>
        <Card className="p-6">
          <Sparkles className="h-5 w-5 text-accent mb-3"/>
          <div className="label-small">Green Twin</div>
          <div className="font-serif text-4xl">{user.green_twin}<span className="text-base text-muted-foreground">/100</span></div>
          <p className="text-sm text-muted-foreground mt-2">Avatar grows greener with each entry.</p>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h3 className="font-serif text-2xl mb-4">Level path</h3>
        <div className="grid sm:grid-cols-5 gap-3">
          {["Eco Beginner","Green Explorer","Climate Hero","Planet Protector","Earth Guardian"].map(l => (
            <div key={l} className={`p-3 rounded border text-center text-xs ${user.level===l ? "border-accent bg-accent/10" : "border-border"}`}>
              {l}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
