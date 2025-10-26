import Challenge from "../models/Challenge.js";
import User from "../models/User.js"; // was User, fix
import Question from "../models/Question.js";

export const getChallengeQuestions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { numQuestions } = req.query; // get number of questions from query

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const solvedIds = user.solvedList || [];

    // Aggregate to get random questions excluding solved ones
    const randomQuestions = await Question.aggregate([
      { $match: { _id: { $nin: solvedIds.map(id => new mongoose.Types.ObjectId(id)) } } },
      { $sample: { size: parseInt(numQuestions) || 5 } }, // default 5
    ]);

    res.status(200).json({ success: true, questions: randomQuestions });
  } catch (err) {
    console.error("Error fetching challenge questions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const sendInvite = async (req, res) => {
  try {
    const { friendId, numQuestions } = req.body;
    const fromUser = req.user._id;

    const friend = await User.findById(friendId); // was User
    if (!friend) return res.status(404).json({ success: false, message: "Friend not found" });

    const invite = new Challenge({ fromUser, toUser: friendId, numQuestions });
    await invite.save();

    res.json({ success: true, message: "Challenge invite sent!", invite });
  } catch (err) {
    console.error("Error sending invite:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const acceptInvite = async (req, res) => {
  try {
    const { inviteId } = req.body;
    const userId = req.user._id;

    const invite = await Challenge.findById(inviteId);
    if (!invite) return res.status(404).json({ success: false, message: "Invite not found" });
    if (!invite.toUser.equals(userId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    invite.status = "accepted";
    await invite.save();

    res.json({ success: true, message: "Challenge accepted!", invite });
  } catch (err) {
    console.error("Error accepting invite:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyInvites = async (req, res) => {
  try {
    const userId = req.user._id;
    const invites = await Challenge.find({ toUser: userId, status: "pending" })
      .populate("fromUser", "name");

    res.json({ success: true, invites });
  } catch (err) {
    console.error("Error fetching invites:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
 export const getchallengeQuestion = async (req, res) => {
  try {
    const userId = req.user._id; // populated by auth middleware
    const user = await User.findById(userId);

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

export const submitChallenge = async (req, res) => {
  try {
    const { challengeId, answers, timeTaken } = req.body;
    const userId = req.user._id;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ success: false, message: "Challenge not found" });

    // Save user's submission
    if (!challenge.submissions) challenge.submissions = [];
    challenge.submissions = challenge.submissions.filter(s => s.user.toString() !== userId.toString());
    challenge.submissions.push({ user: userId, answers, score: answers.filter(a => a.correct).length, timeTaken });
    await challenge.save();

    // Check if both have submitted
    if (challenge.submissions.length === 2) {
      const [a, b] = challenge.submissions;
      let winner = null;
      if (a.score > b.score) winner = a.user;
      else if (b.score > a.score) winner = b.user;
      else winner = a.timeTaken < b.timeTaken ? a.user : b.user; // tie breaker: faster

      challenge.winner = winner;
      challenge.status = "completed";
      await challenge.save();

      // Update ecoPoints
      const winnerUser = await Users.findById(winner);
      winnerUser.ecoPoints += 10; // example
      await winnerUser.save();

      res.json({ success: true, winner: winnerUser.name });
    } else {
      res.json({ success: true, message: "Submission saved. Waiting for opponent." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



// controllers/challengeController.js
export const startChallenge = async (req, res) => {
  try {
    const { challengeId } = req.body;
    const userId = req.user._id;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ success: false, message: "Challenge not found" });

    // Add started status per user
    if (!challenge.startedUsers) challenge.startedUsers = [];
    if (!challenge.startedUsers.includes(userId.toString())) {
      challenge.startedUsers.push(userId.toString());
      await challenge.save();
    }

    res.json({ success: true, message: "Challenge started" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

