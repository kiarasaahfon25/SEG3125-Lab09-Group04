import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    task_name: { type: String, required: true, maxlength: 150 },
    deadline: { type: Date, default: null },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    notes: { type: String, default: '' },
    completed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Task', taskSchema);
