import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course_name: { type: String, required: true, maxlength: 100 },
    course_code: { type: String, maxlength: 20 },
    color_tag: { type: String, maxlength: 20 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export default mongoose.model('Course', courseSchema);
