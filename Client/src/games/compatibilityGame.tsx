// games/compatibilityGame.js
export class AdvancedCompatibilityGame {
  constructor() {
    this.categories = {
      personality: {
        name: "Personality Traits",
        weight: 0.25,
        questions: [
          {
            id: 1,
            question: "When faced with a problem, you tend to:",
            type: "scenario",
            image: "🧩",
            options: [
              { text: "Analyze it logically and make a plan", value: "analytical" },
              { text: "Follow your intuition and gut feeling", value: "intuitive" },
              { text: "Ask others for advice and opinions", value: "collaborative" },
              { text: "Take immediate action and figure it out", value: "spontaneous" }
            ]
          },
          {
            id: 2,
            question: "Your ideal weekend involves:",
            type: "lifestyle",
            image: "🏖️",
            options: [
              { text: "Adventure and trying new activities", value: "adventurous" },
              { text: "Relaxing at home with hobbies", value: "homebody" },
              { text: "Socializing with friends and family", value: "social" },
              { text: "Getting organized and planning ahead", value: "productive" }
            ]
          }
        ]
      },
      values: {
        name: "Core Values",
        weight: 0.30,
        questions: [
          {
            id: 3,
            question: "What's most important in a relationship?",
            type: "values",
            image: "💝",
            options: [
              { text: "Honesty and trust above all", value: "honesty" },
              { text: "Shared goals and ambitions", value: "ambition" },
              { text: "Emotional connection and support", value: "emotional" },
              { text: "Freedom and independence", value: "freedom" }
            ]
          },
          {
            id: 4,
            question: "How do you view financial priorities?",
            type: "values",
            image: "💰",
            options: [
              { text: "Save for security and future goals", value: "saver" },
              { text: "Enjoy life and experiences now", value: "spender" },
              { text: "Balance saving and spending wisely", value: "balanced" },
              { text: "Invest in personal growth", value: "investor" }
            ]
          }
        ]
      },
      communication: {
        name: "Communication Style",
        weight: 0.20,
        questions: [
          {
            id: 5,
            question: "When you're upset, you usually:",
            type: "communication",
            image: "🎭",
            options: [
              { text: "Talk about it openly right away", value: "direct" },
              { text: "Need time alone to process feelings", value: "private" },
              { text: "Express through actions rather than words", value: "actions" },
              { text: "Use humor to lighten the mood", value: "humorous" }
            ]
          },
          {
            id: 6,
            question: "Your texting style is:",
            type: "communication",
            image: "📱",
            options: [
              { text: "Quick and to the point", value: "concise" },
              { text: "Detailed and expressive", value: "expressive" },
              { text: "Full of emojis and GIFs", value: "playful" },
              { text: "Respond when you have time", value: "deliberate" }
            ]
          }
        ]
      },
      interests: {
        name: "Interests & Hobbies",
        weight: 0.15,
        questions: [
          {
            id: 7,
            question: "Choose your perfect vacation:",
            type: "interests",
            image: "✈️",
            options: [
              { text: "Tropical beach relaxation", value: "beach" },
              { text: "Mountain hiking and nature", value: "adventure" },
              { text: "City exploration and culture", value: "city" },
              { text: "Road trip and spontaneity", value: "roadtrip" }
            ]
          },
          {
            id: 8,
            question: "Your entertainment preference:",
            type: "interests",
            image: "🎬",
            options: [
              { text: "Binge-watching series", value: "series" },
              { text: "Reading books", value: "reading" },
              { text: "Video games", value: "gaming" },
              { text: "Outdoor activities", value: "outdoor" }
            ]
          }
        ]
      },
      romance: {
        name: "Romance & Affection",
        weight: 0.10,
        questions: [
          {
            id: 9,
            question: "Your love language is:",
            type: "romance",
            image: "💘",
            options: [
              { text: "Words of affirmation", value: "words" },
              { text: "Quality time together", value: "time" },
              { text: "Physical touch and closeness", value: "touch" },
              { text: "Acts of service", value: "service" }
            ]
          },
          {
            id: 10,
            question: "Ideal date night involves:",
            type: "romance",
            image: "🌹",
            options: [
              { text: "Fancy dinner and dressing up", value: "elegant" },
              { text: "Cozy night in with movies", value: "cozy" },
              { text: "Trying something new together", value: "adventurous" },
              { text: "Simple walk and deep conversation", value: "simple" }
            ]
          }
        ]
      }
    };

    this.compatibilityAlgorithms = {
      basic: this.calculateBasicCompatibility,
      advanced: this.calculateAdvancedCompatibility,
      detailed: this.calculateDetailedCompatibility
    };
  }

  calculateBasicCompatibility(player1Answers, player2Answers) {
    let matches = 0;
    let total = 0;

    Object.keys(player1Answers).forEach(category => {
      player1Answers[category].forEach((answer1, index) => {
        const answer2 = player2Answers[category][index];
        if (answer1 === answer2) matches++;
        total++;
      });
    });

    return Math.round((matches / total) * 100);
  }

  calculateAdvancedCompatibility(player1Answers, player2Answers, categories) {
    let totalScore = 0;
    let maxScore = 0;

    Object.keys(categories).forEach(category => {
      const weight = categories[category].weight;
      const questions = categories[category].questions;
      
      questions.forEach((question, index) => {
        const answer1 = player1Answers[category][index];
        const answer2 = player2Answers[category][index];
        
        // More sophisticated matching based on compatibility matrices
        const compatibilityScore = this.getCompatibilityScore(
          answer1, 
          answer2, 
          category,
          question.id
        );
        
        totalScore += compatibilityScore * weight;
        maxScore += weight;
      });
    });

    return Math.round((totalScore / maxScore) * 100);
  }

  calculateDetailedCompatibility(player1Answers, player2Answers, categories) {
    const basicScore = this.calculateBasicCompatibility(player1Answers, player2Answers);
    const advancedScore = this.calculateAdvancedCompatibility(player1Answers, player2Answers, categories);
    
    // Combine with additional factors
    const synergyBonus = this.calculateSynergyBonus(player1Answers, player2Answers);
    const balanceScore = this.calculateBalanceScore(player1Answers, player2Answers);
    
    const finalScore = Math.round(
      (advancedScore * 0.6) + 
      (basicScore * 0.2) + 
      (synergyBonus * 0.15) + 
      (balanceScore * 0.05)
    );

    return Math.min(100, finalScore);
  }

  getCompatibilityScore(answer1, answer2, category, questionId) {
    // Define compatibility matrices for different question types
    const compatibilityMatrices = {
      personality: {
        analytical: { analytical: 1.0, intuitive: 0.6, collaborative: 0.8, spontaneous: 0.4 },
        intuitive: { analytical: 0.6, intuitive: 1.0, collaborative: 0.7, spontaneous: 0.9 },
        collaborative: { analytical: 0.8, intuitive: 0.7, collaborative: 1.0, spontaneous: 0.5 },
        spontaneous: { analytical: 0.4, intuitive: 0.9, collaborative: 0.5, spontaneous: 1.0 }
      },
      values: {
        honesty: { honesty: 1.0, ambition: 0.7, emotional: 0.9, freedom: 0.6 },
        ambition: { honesty: 0.7, ambition: 1.0, emotional: 0.8, freedom: 0.5 },
        emotional: { honesty: 0.9, ambition: 0.8, emotional: 1.0, freedom: 0.4 },
        freedom: { honesty: 0.6, ambition: 0.5, emotional: 0.4, freedom: 1.0 }
      },
      // Add more matrices for other categories...
    };

    const matrix = compatibilityMatrices[category];
    if (matrix && matrix[answer1] && matrix[answer1][answer2]) {
      return matrix[answer1][answer2];
    }
    
    return answer1 === answer2 ? 1.0 : 0.3; // Default fallback
  }

  calculateSynergyBonus(player1Answers, player2Answers) {
    // Calculate how well answers complement each other
    let synergy = 0;
    let totalPairs = 0;

    Object.keys(player1Answers).forEach(category => {
      player1Answers[category].forEach((answer1, index) => {
        const answer2 = player2Answers[category][index];
        
        // Some combinations are particularly synergistic
        const synergisticPairs = [
          ['analytical', 'intuitive'], // Logic + intuition
          ['saver', 'balanced'],       // Financial balance
          ['adventurous', 'cozy'],     // Adventure + comfort
          ['direct', 'expressive']     // Direct + expressive communication
        ];

        if (synergisticPairs.some(pair => 
          (pair.includes(answer1) && pair.includes(answer2) && answer1 !== answer2)
        )) {
          synergy += 1;
        }
        totalPairs++;
      });
    });

    return (synergy / totalPairs) * 100;
  }

  calculateBalanceScore(player1Answers, player2Answers) {
    // Check if players balance each other's extremes
    let balance = 0;
    let totalChecks = 0;

    // Define balancing pairs (opposites that work well together)
    const balancingPairs = [
      ['analytical', 'intuitive'],
      ['saver', 'spender'],
      ['adventurous', 'homebody'],
      ['direct', 'private']
    ];

    balancingPairs.forEach(pair => {
      const [trait1, trait2] = pair;
      if (
        (this.hasTrait(player1Answers, trait1) && this.hasTrait(player2Answers, trait2)) ||
        (this.hasTrait(player1Answers, trait2) && this.hasTrait(player2Answers, trait1))
      ) {
        balance += 1;
      }
      totalChecks++;
    });

    return (balance / totalChecks) * 100;
  }

  hasTrait(answers, trait) {
    for (const category in answers) {
      if (answers[category].includes(trait)) {
        return true;
      }
    }
    return false;
  }

  generateCompatibilityReport(player1Answers, player2Answers, player1Name, player2Name) {
    const score = this.calculateDetailedCompatibility(player1Answers, player2Answers, this.categories);
    
    const report = {
      overallScore: score,
      categoryScores: {},
      strengths: [],
      growthAreas: [],
      funFacts: [],
      relationshipType: this.getRelationshipType(score),
      advice: this.generateAdvice(player1Answers, player2Answers)
    };

    // Calculate category scores
    Object.keys(this.categories).forEach(category => {
      const categoryAnswers1 = player1Answers[category];
      const categoryAnswers2 = player2Answers[category];
      report.categoryScores[category] = this.calculateAdvancedCompatibility(
        { [category]: categoryAnswers1 },
        { [category]: categoryAnswers2 },
        { [category]: this.categories[category] }
      );
    });

    // Generate strengths
    this.generateStrengths(report, player1Answers, player2Answers);
    
    // Generate growth areas
    this.generateGrowthAreas(report, player1Answers, player2Answers);
    
    // Generate fun facts
    this.generateFunFacts(report, player1Answers, player2Answers, player1Name, player2Name);

    return report;
  }

  getRelationshipType(score) {
    if (score >= 90) return "Soulmate Connection 🌟";
    if (score >= 80) return "Perfect Match 💖";
    if (score >= 70) return "Great Compatibility 💕";
    if (score >= 60) return "Good Match 💗";
    if (score >= 50) return "Potential to Grow 🌱";
    return "Interesting Combination 🤔";
  }

  generateStrengths(report, player1Answers, player2Answers) {
    const highScoringCategories = Object.entries(report.categoryScores)
      .filter(([_, score]) => score >= 80)
      .map(([category, _]) => category);

    highScoringCategories.forEach(category => {
      switch(category) {
        case 'personality':
          report.strengths.push("Your personalities complement each other perfectly! 🎭");
          break;
        case 'values':
          report.strengths.push("You share core values and life priorities! 💎");
          break;
        case 'communication':
          report.strengths.push("Great communication understanding! 🗣️");
          break;
        case 'interests':
          report.strengths.push("You enjoy similar activities and hobbies! 🎯");
          break;
        case 'romance':
          report.strengths.push("Romantic compatibility is off the charts! 💘");
          break;
      }
    });
  }

  generateGrowthAreas(report, player1Answers, player2Answers) {
    const lowScoringCategories = Object.entries(report.categoryScores)
      .filter(([_, score]) => score < 60)
      .map(([category, _]) => category);

    lowScoringCategories.forEach(category => {
      switch(category) {
        case 'personality':
          report.growthAreas.push("Different approaches to problem-solving - learn from each other! 🧩");
          break;
        case 'values':
          report.growthAreas.push("Discuss your long-term goals and priorities 💭");
          break;
        case 'communication':
          report.growthAreas.push("Work on understanding each other's communication styles 📞");
          break;
        case 'interests':
          report.growthAreas.push("Explore new activities you can enjoy together 🎨");
          break;
        case 'romance':
          report.growthAreas.push("Discover each other's love languages and preferences 💞");
          break;
      }
    });
  }

  generateFunFacts(report, player1Answers, player2Answers, player1Name, player2Name) {
    // Find matching answers for fun facts
    const perfectMatches = [];
    Object.keys(player1Answers).forEach(category => {
      player1Answers[category].forEach((answer, index) => {
        if (answer === player2Answers[category][index]) {
          perfectMatches.push({ category, answer });
        }
      });
    });

    if (perfectMatches.length > 0) {
      const randomMatch = perfectMatches[Math.floor(Math.random() * perfectMatches.length)];
      report.funFacts.push(`You both chose "${randomMatch.answer}" for ${this.categories[randomMatch.category].name.toLowerCase()}!`);
    }

    // Add some random fun facts based on combinations
    const funCombinations = [
      "Your energy together is electric! ⚡",
      "You balance each other like yin and yang ☯️",
      "When you're together, magic happens ✨",
      "Your connection has great potential for growth 🌱",
      "You bring out the best in each other 🌟"
    ];
    
    report.funFacts.push(funCombinations[Math.floor(Math.random() * funCombinations.length)]);
  }

  generateAdvice(player1Answers, player2Answers) {
    const adviceList = [
      "Keep communicating openly and honestly 💬",
      "Make time for regular date nights 📅",
      "Support each other's individual growth 🌱",
      "Celebrate your differences as strengths 🎉",
      "Always maintain trust and respect 🤝",
      "Keep the romance alive with small gestures 💝",
      "Learn each other's love languages 💞",
      "Create shared goals and dreams together 🎯"
    ];

    return adviceList[Math.floor(Math.random() * adviceList.length)];
  }

  getAllQuestions() {
    const allQuestions = [];
    Object.values(this.categories).forEach(category => {
      allQuestions.push(...category.questions);
    });
    return allQuestions;
  }

  getQuestionsByCategory(category) {
    return this.categories[category]?.questions || [];
  }
}

export default new AdvancedCompatibilityGame();