import { Button } from "@/components/ui/button";
import { Download, Users, ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full opacity-20">
        <div className="absolute inset-0 bg-primary rounded-full blur-[128px]" />
      </div>
      
      <div className="container px-4 mx-auto relative z-10">
        {/* Download App Section */}
        <div className="max-w-4xl mx-auto text-center mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-glass border border-accent/20 mb-6">
            <Download className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Available on all platforms</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Download our app and join millions of users experiencing the future of messaging.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="group bg-gradient-primary hover:shadow-glow transition-all duration-300">
              Download for iOS
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" className="group bg-gradient-primary hover:shadow-glow transition-all duration-300">
              Download for Android
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-6">
            Also available on Windows, Mac, and Linux
          </p>
        </div>
        
        {/* Join Community Section */}
        <div className="max-w-4xl mx-auto p-8 md:p-12 rounded-3xl bg-card/40 backdrop-blur-glass border border-primary/10 shadow-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-accent/10 border border-accent/20 mb-4">
                <Users className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">Join 10M+ users</span>
              </div>
              
              <h3 className="text-3xl md:text-4xl font-bold mb-4">
                Be Part of Our{" "}
                <span className="bg-gradient-accent bg-clip-text text-transparent">
                  Community
                </span>
              </h3>
              <p className="text-muted-foreground mb-6">
                Connect with communities that share your interests. From tech enthusiasts to book clubs, there's a space for everyone.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card/60 backdrop-blur-glass border border-primary/10">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-semibold">
                  TC
                </div>
                <div>
                  <div className="font-semibold">Tech Community</div>
                  <div className="text-sm text-muted-foreground">50.2K members</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card/60 backdrop-blur-glass border border-primary/10">
                <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-sm font-semibold text-accent-foreground">
                  GC
                </div>
                <div>
                  <div className="font-semibold">Gaming Central</div>
                  <div className="text-sm text-muted-foreground">123.5K members</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card/60 backdrop-blur-glass border border-primary/10">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-semibold">
                  BC
                </div>
                <div>
                  <div className="font-semibold">Book Club</div>
                  <div className="text-sm text-muted-foreground">28.9K members</div>
                </div>
              </div>
              
              <Button className="w-full bg-gradient-accent hover:shadow-glow transition-all duration-300">
                Explore Communities
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;