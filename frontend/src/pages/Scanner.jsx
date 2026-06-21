import { useRef, useState } from "react";
import { api, API } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, ScanLine, Sparkles, Zap, FileImage, X } from "lucide-react";
import { Link } from "react-router-dom";

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";

export default function Scanner() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);

  const pickFile = (f) => {
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type)) {
      toast.error("Use JPEG, PNG, or WEBP");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Image too large (max 8MB)");
      return;
    }
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const onScan = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("eco_token");
      const res = await fetch(`${API}/scanner/bill`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || "Scan failed");
        return;
      }
      setResult(data);
      if (data.entry_saved) {
        toast.success(`Logged ${data.emissions.total} kg CO₂ · +${data.points_earned} pts`);
      } else {
        toast.warning(data.message || "No kWh detected");
      }
    } catch (err) {
      toast.error("Scan failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="label-small mb-2"><ScanLine className="inline h-3 w-3 mr-1"/> AI · Claude vision</div>
      <h1 className="font-serif text-4xl md:text-5xl mb-2">Bill <em className="text-accent">scanner.</em></h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Upload an electricity bill — Claude reads the kWh, computes emissions, and logs it instantly.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload zone */}
        <Card className="p-6 md:p-8">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
            data-testid="scanner-file-input"
          />
          {!preview ? (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition
                ${dragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/60 hover:bg-secondary/30"}`}
              data-testid="scanner-dropzone"
            >
              <Upload className="h-10 w-10 mx-auto text-accent mb-4"/>
              <h3 className="font-serif text-xl mb-2">Drop a bill image here</h3>
              <p className="text-sm text-muted-foreground">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-4">JPEG · PNG · WEBP · max 8MB</p>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={reset}
                className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 hover:bg-background"
                data-testid="scanner-reset-btn"
                aria-label="Reset"
              >
                <X className="h-4 w-4"/>
              </button>
              <img src={preview} alt="Electricity bill upload preview" className="w-full rounded-lg border border-border max-h-96 object-contain bg-secondary/20"/>
              <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                <FileImage className="h-4 w-4"/>
                <span className="truncate">{file?.name}</span>
                <span className="ml-auto font-mono-eco">{(file?.size/1024).toFixed(0)} KB</span>
              </div>
              <Button onClick={onScan} disabled={loading} className="w-full mt-6 rounded-full h-11" data-testid="scanner-scan-btn">
                {loading ? (
                  <><Sparkles className="h-4 w-4 mr-2 animate-pulse"/> Reading bill…</>
                ) : (
                  <><ScanLine className="h-4 w-4 mr-2"/> Scan with Claude</>
                )}
              </Button>
            </div>
          )}
        </Card>

        {/* Result */}
        <Card className="p-6 md:p-8 bg-secondary/30">
          <div className="label-small mb-2"><Zap className="inline h-3 w-3 mr-1"/> Extracted data</div>
          <h3 className="font-serif text-2xl mb-6">Result</h3>

          {!result && !loading && (
            <div className="text-center py-16">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3"/>
              <p className="text-sm text-muted-foreground">Upload a bill to see extracted kWh & CO₂.</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <Sparkles className="h-8 w-8 mx-auto text-accent animate-pulse mb-3"/>
              <p className="text-sm text-muted-foreground">Claude is reading your bill…</p>
            </div>
          )}

          {result && (
            <div className="space-y-5" data-testid="scanner-result">
              <Row label="Energy used" value={result.extracted?.kwh ? `${result.extracted.kwh} kWh` : "—"}/>
              <Row label="Billing period" value={result.extracted?.period || "—"}/>
              <Row label="Provider" value={result.extracted?.provider || "—"}/>
              <Row label="Bill amount" value={result.extracted?.amount ? `${result.extracted.currency || ""} ${result.extracted.amount}` : "—"}/>
              <Row label="OCR confidence" value={<Badge variant="outline">{result.extracted?.confidence || "unknown"}</Badge>}/>

              {result.entry_saved ? (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="label-small mb-2">Carbon impact</div>
                  <div className="font-serif text-5xl text-accent">
                    {result.emissions.total}
                    <span className="text-base text-muted-foreground ml-1">kg CO₂</span>
                  </div>
                  <p className="text-sm mt-2">
                    Earned <strong className="text-accent">+{result.points_earned} points</strong> · Level: {result.new_level}
                  </p>
                  <Link to="/dashboard">
                    <Button variant="outline" className="rounded-full mt-4 w-full" data-testid="scanner-view-dashboard-btn">
                      View on dashboard →
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground">{result.message || "Try a clearer image showing total kWh."}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6 mt-8 bg-card">
        <div className="label-small mb-3">How it works</div>
        <ol className="grid sm:grid-cols-3 gap-4 text-sm">
          <Step n="1" title="Upload" text="Drag any electricity bill image. JPEG/PNG/WEBP."/>
          <Step n="2" title="Claude reads it" text="Vision model extracts kWh, period, provider, amount."/>
          <Step n="3" title="Auto-logged" text="Carbon entry created, points earned, dashboard updated."/>
        </ol>
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-baseline border-b border-border/40 pb-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono-eco text-sm">{value}</span>
    </div>
  );
}
function Step({ n, title, text }) {
  return (
    <li className="relative pl-10">
      <span className="absolute left-0 top-0 w-7 h-7 rounded-full bg-accent/15 text-accent font-serif text-base flex items-center justify-center">{n}</span>
      <div className="font-medium">{title}</div>
      <div className="text-muted-foreground">{text}</div>
    </li>
  );
}
