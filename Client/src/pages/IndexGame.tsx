import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Dices, Heart, Users, Sparkles } from "lucide-react";

const games = [
  {
    id: 1,
    title: "Truth or Dare",
    description: "Spin the wheel and answer truthfully or take on a dare!",
    icon: Dices,
    color: "from-primary to-accent",
    path: "/truth-or-dare",
  },
  {
    id: 2,
    title: "Compatibility Quiz",
    description: "Take the quiz and discover your compatibility percentage!",
    icon: Heart,
    color: "from-accent to-secondary",
    path: "/compatibility-quiz",
  },
  {
    id: 3,
    title: "Who's Most Likely?",
    description: "Point at who's most likely to do hilarious scenarios!",
    icon: Users,
    color: "from-secondary to-primary",
    path: "/whos-most-likely",
  },
];

const IndexGames = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-secondary p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12 pt-8">
          <div className="flex items-center justify-center mb-4 animate-bounce">
            <Sparkles className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 text-white drop-shadow-lg animate-fade-in">
            Party Games Hub
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
            Get the party started with our collection of fun, interactive games!
            Perfect for friends, dates, and breaking the ice.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game, index) => {
            const Icon = game.icon;
            return (
              <Link key={game.id} to={game.path}>
                <Card 
                  className="p-8 bg-card/95 backdrop-blur-lg border-0 shadow-[var(--shadow-xl)] hover:scale-105 hover:shadow-[var(--shadow-glow)] transition-all duration-300 cursor-pointer group h-full animate-fade-in"
                  style={{ animationDelay: `${index * 100 + 200}ms` }}
                >
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {game.title}
                  </h2>
                  <p className="text-muted-foreground">{game.description}</p>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card className="mt-12 p-8 bg-card/95 backdrop-blur-lg border-0 shadow-[var(--shadow-xl)] text-center animate-fade-in" style={{ animationDelay: '500ms' }}>
          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            How to Play
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Simply click on any game card above to start playing! Gather your friends,
            follow the instructions, and let the fun begin. Each game is designed to
            bring people together and create memorable moments.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default IndexGames;
