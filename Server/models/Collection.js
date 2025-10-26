import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  plantation: [{ type: String }],       // images of planted trees
  wasteSegregation: [{ type: String }], // images of waste segregation
}, { timestamps: true });

const CollectionModel = mongoose.model("Collection", collectionSchema);

export default CollectionModel;
