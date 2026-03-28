import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    session_title: { type: String, required: true, maxlength: 150 },
    session_type: {
      type: String,
      enum: ['Study Session', 'Assignment'],
      required: true,
    },
    session_date: { type: Date, required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export default mongoose.model('StudySession', studySessionSchema);
