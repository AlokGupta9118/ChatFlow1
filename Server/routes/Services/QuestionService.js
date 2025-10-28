class QuestionService {
  constructor() {
    this.truthQuestions = [
      "What's the most embarrassing thing you've ever done?",
      "Have you ever lied to get out of trouble?",
      "What's your biggest fear?",
      "What's the worst date you've ever been on?",
      "What's a secret you've never told anyone?",
      "What's the most trouble you've ever gotten into?",
      "What's your most annoying habit?",
      "What's the silliest thing you've ever cried about?",
      "What's your biggest regret?",
      "What's the most childish thing you still do?"
    ];

    this.dareQuestions = [
      "Do 10 pushups right now!",
      "Sing a song at the top of your lungs",
      "Dance like nobody's watching for 30 seconds",
      "Speak in an accent for the next 3 rounds",
      "Show us your best impression of a celebrity",
      "Do a handstand against the wall",
      "Tell a funny joke and make everyone laugh",
      "Show us your phone's last photo (if appropriate)",
      "Do your best animal impression",
      "Balance a book on your head for 1 minute"
    ];
  }

  async getTruthOrDareQuestions(rounds) {
    const questions = [];
    
    // Mix truth and dare questions
    for (let i = 0; i < rounds; i++) {
      const truthIndex = i % this.truthQuestions.length;
      const dareIndex = i % this.dareQuestions.length;
      
      questions.push(
        {
          id: `truth_${i}`,
          type: 'truth',
          text: this.truthQuestions[truthIndex],
          intensity: 'medium'
        },
        {
          id: `dare_${i}`,
          type: 'dare',
          text: this.dareQuestions[dareIndex],
          intensity: 'medium'
        }
      );
    }

    // Shuffle questions
    return questions.sort(() => Math.random() - 0.5).slice(0, rounds * 2);
  }
}

export { QuestionService };