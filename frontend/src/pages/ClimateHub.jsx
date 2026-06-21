import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Globe, BookOpen, Brain, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ClimateHub() {
  const [facts, setFacts] = useState([]);
  const [articles, setArticles] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState(null);
  const [openArticle, setOpenArticle] = useState(null);
  const [openQuiz, setOpenQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/climate/facts"), api.get("/climate/articles"),
                 api.get("/climate/quizzes"), api.get("/climate/global-stats")])
      .then(([f,a,q,s]) => { setFacts(f.data); setArticles(a.data); setQuizzes(q.data); setStats(s.data); });
  }, []);

  const startQuiz = (q) => { setOpenQuiz(q); setAnswers(Array(q.questions.length).fill(-1)); setResult(null); };
  const submitQuiz = async () => {
    const r = await api.post("/climate/quiz/submit", { quiz_id: openQuiz.quiz_id, answers });
    setResult(r.data);
    toast.success(`Score: ${r.data.score}/${r.data.total} · +${r.data.points_earned} pts`);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="label-small mb-2"><BookOpen className="inline h-3 w-3 mr-1"/> Climate Hub</div>
      <h1 className="font-serif text-4xl md:text-5xl mb-2">Learn the <em className="text-accent">science.</em></h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">A growing library of articles, facts, and quizzes to sharpen your climate literacy.</p>

      {/* Global stats */}
      {stats && (
        <Card className="p-6 md:p-8 mb-8 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2 mb-4"><Globe className="h-4 w-4"/><span className="label-small text-primary-foreground/60">Live planetary dashboard</span></div>
          <div className="grid sm:grid-cols-4 gap-6">
            <StatBig label="CO₂" value={stats.global_co2_ppm} unit="ppm"/>
            <StatBig label="Temp rise" value={`+${stats.temp_rise_c}`} unit="°C"/>
            <StatBig label="Arctic ice" value={`-${stats.arctic_ice_loss_pct_decade}%`} unit="/decade"/>
            <StatBig label="Sea level" value={`+${stats.sea_level_rise_mm_year}`} unit="mm/yr"/>
          </div>
        </Card>
      )}

      {/* Articles */}
      <h2 className="font-serif text-3xl mb-4">Featured reads</h2>
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {articles.map(a => (
          <Card key={a.article_id} className="overflow-hidden cursor-pointer" onClick={()=>setOpenArticle(a)} data-testid={`article-${a.article_id}`}>
            <img src={a.image} alt="" className="w-full h-48 object-cover"/>
            <div className="p-5">
              <Badge variant="outline" className="text-[10px] tracking-widest uppercase">{a.category}</Badge>
              <h3 className="font-serif text-xl mt-3 mb-2">{a.title}</h3>
              <p className="text-sm text-muted-foreground">{a.excerpt}</p>
              <div className="label-small mt-4">{a.read_min} min read</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quizzes */}
      <h2 className="font-serif text-3xl mb-4">Test yourself</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {quizzes.map(q => (
          <Card key={q.quiz_id} className="p-6 flex items-center justify-between" data-testid={`quiz-card-${q.quiz_id}`}>
            <div>
              <div className="label-small mb-2"><Brain className="inline h-3 w-3"/> Quiz</div>
              <h3 className="font-serif text-xl">{q.title}</h3>
              <p className="text-sm text-muted-foreground">{q.description}</p>
            </div>
            <Button onClick={()=>startQuiz(q)} className="rounded-full" data-testid={`quiz-start-${q.quiz_id}`}>Start</Button>
          </Card>
        ))}
      </div>

      {/* Facts */}
      <h2 className="font-serif text-3xl mb-4">Climate facts</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {facts.map(f => (
          <Card key={f.fact_id} className="p-5">
            <Sparkles className="h-4 w-4 text-accent mb-2"/>
            <h4 className="font-serif text-lg mb-1">{f.title}</h4>
            <p className="text-sm text-muted-foreground">{f.text}</p>
          </Card>
        ))}
      </div>

      {/* Article modal */}
      <Dialog open={!!openArticle} onOpenChange={()=>setOpenArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {openArticle && (
            <>
              <img src={openArticle.image} alt="" className="w-full h-56 object-cover rounded"/>
              <DialogHeader>
                <Badge variant="outline" className="w-fit text-[10px] tracking-widest uppercase">{openArticle.category}</Badge>
                <DialogTitle className="font-serif text-3xl">{openArticle.title}</DialogTitle>
              </DialogHeader>
              <p className="leading-relaxed text-foreground/90">{openArticle.content}</p>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quiz modal */}
      <Dialog open={!!openQuiz} onOpenChange={()=>{setOpenQuiz(null); setResult(null);}}>
        <DialogContent className="max-w-xl">
          {openQuiz && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">{openQuiz.title}</DialogTitle>
              </DialogHeader>
              {!result ? (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                  {openQuiz.questions.map((q, qi) => (
                    <div key={qi}>
                      <div className="font-medium mb-3 text-sm">{qi+1}. {q.q}</div>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => (
                          <button key={oi}
                            onClick={()=>{const c=[...answers]; c[qi]=oi; setAnswers(c);}}
                            className={`block w-full text-left text-sm px-4 py-2 rounded border transition ${answers[qi]===oi ? "border-accent bg-accent/10" : "border-border hover:bg-secondary/40"}`}
                            data-testid={`quiz-opt-${qi}-${oi}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button onClick={submitQuiz} disabled={answers.includes(-1)} className="w-full rounded-full" data-testid="quiz-submit-btn">Submit answers</Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="font-serif text-6xl text-accent">{result.score}<span className="text-2xl text-muted-foreground">/{result.total}</span></div>
                  <p className="mt-4">Earned <strong>+{result.points_earned} points</strong></p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBig({ label, value, unit }) {
  return (
    <div>
      <div className="label-small text-primary-foreground/60">{label}</div>
      <div className="font-serif text-4xl mt-1">{value}<span className="text-base ml-1 opacity-60">{unit}</span></div>
    </div>
  );
}
