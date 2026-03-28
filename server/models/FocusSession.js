import mongoose from 'mongoose';

const focusSessionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    duration_minutes: { type: Number, default: 25 },
    actual_minutes: { type: Number, default: null },
    start_time: { type: Date, default: null },
    end_time: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    session_date: { type: Date, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export default mongoose.model('FocusSession', focusSessionSchema);
