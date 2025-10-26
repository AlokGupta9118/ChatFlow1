// models/Question.js
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"], // restricts values
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String], // array of strings
    required: true,
    validate: [arr => arr.length > 0, "Options cannot be empty"],
  },
  answer: {
    type: String,
    required: true,
  },
  isUsedQuiz: {
    type: Boolean,
    default: false,
  },
},
{
  timestamps: true, // adds createdAt & updatedAt
});

const Question = mongoose.model("question", questionSchema );


export default Question;
