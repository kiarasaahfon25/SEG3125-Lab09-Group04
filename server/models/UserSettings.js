import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    weekly_study_goal_hours: { type: Number, default: 10 },
    study_reminders: { type: Boolean, default: true },
    daily_summary_reminders: { type: Boolean, default: true },
    deadline_reminders: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

export default mongoose.model('UserSettings', userSettingsSchema);
