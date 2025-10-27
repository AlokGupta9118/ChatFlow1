import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Dices, Heart, Users, Sparkles, ArrowLeft } from "lucide-react";

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
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-secondary p-4 md:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all border border-white/30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Chat</span>
        </button>
      </div>

      <div className="max-w-6xl mx-auto relative z-10 pt-16 md:pt-8">
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center mb-4 animate-bounce">
            <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-white drop-shadow-lg" />
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold mb-4 text-white drop-shadow-lg animate-fade-in">
            Party Games Hub
          </h1>
          <p className="text-base md:text-xl text-white/90 max-w-2xl mx-auto animate-fade-in px-4" style={{ animationDelay: '100ms' }}>
            Get the party started with our collection of fun, interactive games!
            Perfect for friends, dates, and breaking the ice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-2">
          {games.map((game, index) => {
            const Icon = game.icon;
            return (
              <Link key={game.id} to={game.path} className="block h-full">
                <Card 
                  className="p-6 md:p-8 bg-card/95 backdrop-blur-lg border-0 shadow-xl hover:scale-105 hover:shadow-glow transition-all duration-300 cursor-pointer group h-full animate-fade-in"
                  style={{ animationDelay: `${index * 100 + 200}ms` }}
                >
                  <div
                    className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg`}
                  >
                    <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {game.title}
                  </h2>
                  <p className="text-muted-foreground text-sm md:text-base">{game.description}</p>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card className="mt-8 md:mt-12 p-6 md:p-8 bg-card/95 backdrop-blur-lg border-0 shadow-xl text-center animate-fade-in mx-2" style={{ animationDelay: '500ms' }}>
          <h3 className="text-xl md:text-2xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            How to Play
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
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