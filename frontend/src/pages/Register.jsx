import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Leaf } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success("Welcome to EcoTrack");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Sign up failed");
    } finally { setLoading(false); }
  };
  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-8 order-2 md:order-1">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8">
            <Link to="/" className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-accent" />
              <span className="font-serif text-2xl">EcoTrack <em className="text-accent">AI</em></span>
            </Link>
          </div>
          <div className="label-small mb-4">Create your account</div>
          <h1 className="font-serif text-4xl mb-8">Begin <em className="text-accent">today.</em></h1>

          <Button type="button" variant="outline" className="w-full h-11 rounded-full mb-6" onClick={handleGoogle} data-testid="google-register-btn">
            Continue with Google
          </Button>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"/></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-3 text-muted-foreground tracking-widest">Or</span></div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label className="label-small">Name</Label>
              <Input value={name} onChange={(e)=>setName(e.target.value)} required className="mt-2 h-11" data-testid="register-name-input"/>
            </div>
            <div>
              <Label className="label-small">Email</Label>
              <Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="mt-2 h-11" data-testid="register-email-input"/>
            </div>
            <div>
              <Label className="label-small">Password</Label>
              <Input type="password" minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} required className="mt-2 h-11" data-testid="register-password-input"/>
            </div>
            <Button type="submit" className="w-full h-11 rounded-full" disabled={loading} data-testid="register-submit-btn">
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            Already a member? <Link to="/login" className="text-accent underline-offset-4 hover:underline" data-testid="register-to-login-link">Sign in</Link>
          </p>
        </div>
      </div>
      <div className="hidden md:block relative order-1 md:order-2">
        <img src="https://images.pexels.com/photos/5029853/pexels-photo-5029853.jpeg?w=1200" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-background/20" />
        <div className="relative h-full flex flex-col justify-end p-12">
          <blockquote className="font-serif text-3xl text-foreground/90 max-w-md leading-snug">
            "We do not inherit the earth from our ancestors; we borrow it from our children."
            <footer className="text-sm mt-4 label-small">— Native proverb</footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
