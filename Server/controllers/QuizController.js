
import Question from "../models/Question.js";
import Users from "../models/User.js";


// GET /api/contest/random-questions
 const getRandomContestQuestions = async (req, res) => {
  try {
    const userId = req.user._id; // populated by auth middleware
    const user = await Users.findById(userId);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const solvedIds = user.solvedList || [];

    // Aggregate to get 7 random questions excluding solved ones
    const randomQuestions = await Question.aggregate([
      { $match: { id: { $nin: solvedIds } } }, // exclude solved
      { $sample: { size: 7 } }, // get 7 random
    ]);

    res.status(200).json({ success: true, questions: randomQuestions });
  } catch (err) {
    console.error("Error fetching contest questions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/questions/unsolved
 const getUnsolvedQuestions = async (req, res) => {
  try {
    const userId = req.user._id; // populated by auth middleware
    const user = await Users.findById(userId);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const solvedIds = user.solvedList || [];

    // Fetch questions by difficulty excluding solved ones
    const [easyQuestions, mediumQuestions, hardQuestions] = await Promise.all([
      Question.find({ difficulty: "Easy", id: { $nin: solvedIds } }),
      Question.find({ difficulty: "Medium", id: { $nin: solvedIds } }),
      Question.find({ difficulty: "Hard", id: { $nin: solvedIds } }),
    ]);

    res.status(200).json({
      success: true,
      questions: {
        Easy: easyQuestions,
        Medium: mediumQuestions,
        Hard: hardQuestions,
      },
    });
  } catch (err) {
    console.error("Error fetching questions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


 const correctQuestion = async (req, res) => {
  try {
    const { userId, score } = req.body;
    const points = score > 80 ? 100 : 50; // reward based on score
    const result = await addEcoPoints(userId, points, "Quiz Completed");
    res.json({ message: "Quiz completed", ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ================== MARK QUESTION SOLVED ==================
const markQuestionSolved = async (req, res) => {
  try {
    const userId = req.user._id;
    const { questionId } = req.body;

    const user = await Users.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.solvedList) user.solvedList = [];
    if (!user.solvedList.includes(questionId)) {
      user.solvedList.push(questionId);
      await user.save();
    }

    res.status(200).json({ success: true, message: "Question marked as solved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};









export{
  markQuestionSolved,
  correctQuestion,
  getUnsolvedQuestions,
  getRandomContestQuestions,
};




