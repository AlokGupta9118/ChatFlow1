
import express from "express";
import {
  getUnsolvedQuestions,
  markQuestionSolved,
  correctQuestion,
  getRandomContestQuestions,
} from "../controllers/QuizController.js"; // your controller file

import { protect } from "../middleware/authMiddleware.js"; // auth middleware

const router = express.Router();

router.get("/random-questions", protect, getRandomContestQuestions);
// GET all unsolved questions grouped by difficulty
router.get("/unsolved", protect, getUnsolvedQuestions);

// POST mark a question as solved
router.post("/mark-solved", protect, markQuestionSolved);

// POST submit correct question/score and add EcoPoints
router.post("/correct", protect, correctQuestion);



export default router;
