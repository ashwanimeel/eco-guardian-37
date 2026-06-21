import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Leaf } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) { navigate("/login"); return; }
    const sessionId = m[1];

    (async () => {
      try {
        const r = await api.post("/auth/google/session", { session_id: sessionId });
        setUser(r.data.user);
        window.history.replaceState(null, "", "/dashboard");
        navigate("/dashboard", { replace: true, state: { user: r.data.user } });
      } catch {
        navigate("/login");
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Leaf className="h-8 w-8 mx-auto text-accent animate-pulse mb-4" />
        <div className="label-small">Establishing session…</div>
      </div>
    </div>
  );
}
