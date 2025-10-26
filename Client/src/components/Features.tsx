import { Shield, Zap, Video, Bot, Globe, Heart } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "End-to-End Encryption",
    description: "Your messages are completely private with military-grade encryption. Only you and your recipient can read them.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Messages delivered instantly with our optimized infrastructure. Experience zero lag in conversations.",
  },
  {
    icon: Video,
    title: "HD Video Calls",
    description: "Crystal-clear voice and video calls with screen sharing. Connect face-to-face from anywhere.",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description: "Smart replies, auto-translate, and chat summaries powered by advanced AI technology.",
  },
  {
    icon: Globe,
    title: "Cross-Platform",
    description: "Seamlessly sync across all your devices. Start on mobile, continue on desktop.",
  },
  {
    icon: Heart,
    title: "Community First",
    description: "Join thousands of communities and group chats. Find your tribe and connect with like-minded people.",
  },
];

const Features = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container px-4 mx-auto relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to{" "}
            <span className="bg-gradient-accent bg-clip-text text-transparent">
              Stay Connected
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Packed with powerful features to make your conversations more engaging, secure, and fun.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-card/40 backdrop-blur-glass border border-primary/10 hover:border-primary/30 hover:shadow-glow transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full blur-[128px]" />
      </div>
    </section>
  );
};

export default Features;
