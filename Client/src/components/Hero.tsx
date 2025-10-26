import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-chat.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[128px] opacity-20 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent rounded-full blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container relative z-10 px-4 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <div className="text-center lg:text-left space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-glass border border-primary/20">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Next-gen messaging platform</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              Connect{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Instantly
              </span>
              <br />
              Chat Smarter
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl">
              Experience the future of communication with AI-powered features, 
              crystal-clear calls, and unmatched privacy. Your conversations, elevated.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="group bg-gradient-primary hover:shadow-glow transition-all duration-300" onClick={() => window.location.href = '/signup'}>
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="border-primary/20 backdrop-blur-glass bg-card/50 hover:bg-card/80" onClick={() => window.location.href = '/login'}>
                <MessageCircle className="mr-2 w-4 h-4" />
                Sign In
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8">
              <div>
                <div className="text-3xl font-bold text-accent">10M+</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">500M+</div>
                <div className="text-sm text-muted-foreground">Messages Daily</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
            </div>
          </div>
          
          {/* Hero image */}
          <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative rounded-3xl overflow-hidden shadow-card border border-primary/10">
              <img 
                src={heroImage} 
                alt="Modern chat interface" 
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-primary opacity-20 mix-blend-overlay" />
            </div>
            
            {/* Floating cards */}
            <div className="absolute -top-6 -right-6 p-4 rounded-2xl bg-card/60 backdrop-blur-glass border border-primary/20 shadow-glow animate-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-accent" />
                <div>
                  <div className="text-sm font-semibold">Sarah Chen</div>
                  <div className="text-xs text-muted-foreground">is typing...</div>
                </div>
              </div>
            </div>
            
            <div className="absolute -bottom-6 -left-6 p-4 rounded-2xl bg-card/60 backdrop-blur-glass border border-accent/20 shadow-glow animate-float" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center gap-2 text-accent">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">1.2K new messages</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;