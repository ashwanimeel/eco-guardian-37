import { useEffect, useRef, useState } from "react";
import { api, API } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, User as UserIcon } from "lucide-react";

const SUGGESTIONS = [
  "Where do most of my emissions come from?",
  "Give me 3 actions to cut my footprint this week.",
  "Predict my next month and how to improve it.",
  "What's the highest-impact change I can make?",
];

export default function Coach() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      const r = await api.get("/coach/history");
      setMessages(r.data || []);
    })();
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({top: scrollRef.current.scrollHeight, behavior:"smooth"}); }, [messages]);

  const send = async (msg) => {
    const text = (msg || input).trim();
    if (!text || streaming) return;
    setInput("");
    setMessages(m => [...m, {role:"user", content:text, created_at:new Date().toISOString()},
                              {role:"assistant", content:"", created_at:new Date().toISOString()}]);
    setStreaming(true);

    try {
      const token = localStorage.getItem("eco_token");
      const res = await fetch(`${API}/coach/chat`, {
        method:"POST", credentials:"include",
        headers: { "Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{}) },
        body: JSON.stringify({ message: text })
      });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, {stream:true});
        const lines = buf.split("\n\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.delta) {
              setMessages(m => {
                const copy = [...m];
                copy[copy.length-1] = {...copy[copy.length-1], content: copy[copy.length-1].content + data.delta};
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (e) {
      setMessages(m => {
        const copy = [...m];
        copy[copy.length-1] = {...copy[copy.length-1], content: "[Error reaching coach]"};
        return copy;
      });
    } finally { setStreaming(false); }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="label-small mb-2"><Sparkles className="inline h-3 w-3 mr-1"/>AI Coach · Claude 4.5</div>
      <h1 className="font-serif text-4xl md:text-5xl mb-2">Your sustainability <em className="text-accent">coach.</em></h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">Trained on your data. Honest, specific, never preachy.</p>

      <Card className="flex flex-col h-[calc(100vh-280px)] min-h-[420px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6" data-testid="coach-messages">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <Sparkles className="h-8 w-8 mx-auto text-accent mb-4"/>
              <h3 className="font-serif text-2xl mb-2">Ask me anything about your footprint.</h3>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={()=>send(s)} className="px-4 py-2 text-sm border border-border rounded-full hover:bg-secondary/40 transition" data-testid={`coach-suggestion-${s.slice(0,10)}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role==="user" ? "justify-end" : ""}`}>
              {m.role!=="user" && <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0"><Sparkles className="h-4 w-4 text-accent"/></div>}
              <div className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role==="user" ? "bg-primary text-primary-foreground" : "bg-secondary/40"}`}>
                {m.content || (streaming && i===messages.length-1 ? "…" : "")}
              </div>
              {m.role==="user" && <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><UserIcon className="h-4 w-4"/></div>}
            </div>
          ))}
        </div>
        <div className="border-t border-border p-4 flex gap-2">
          <Input value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter" && send()}
                 placeholder="Ask your coach…" disabled={streaming} className="flex-1 h-11" data-testid="coach-input"/>
          <Button onClick={()=>send()} disabled={streaming || !input.trim()} className="rounded-full px-5" data-testid="coach-send-btn">
            <Send className="h-4 w-4"/>
          </Button>
        </div>
      </Card>
    </div>
  );
}
