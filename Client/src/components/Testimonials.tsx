import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Alex Rivera",
    role: "Content Creator",
    content: "This is hands down the best messaging app I've ever used. The AI features are game-changing!",
    rating: 5,
    avatar: "AR",
  },
  {
    name: "Maya Patel",
    role: "Small Business Owner",
    content: "Perfect for staying connected with my team. The group features and file sharing are incredible.",
    rating: 5,
    avatar: "MP",
  },
  {
    name: "Jordan Kim",
    role: "Student",
    content: "Love the clean interface and how fast everything is. Plus, the privacy features give me peace of mind.",
    rating: 5,
    avatar: "JK",
  },
];

const Testimonials = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container px-4 mx-auto relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Loved by{" "}
            <span className="bg-gradient-accent bg-clip-text text-transparent">
              Millions
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See what our users have to say about their experience.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-card/40 backdrop-blur-glass border border-primary/10 hover:border-primary/30 hover:shadow-glow transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              
              {/* Content */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center font-semibold text-primary-foreground">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;