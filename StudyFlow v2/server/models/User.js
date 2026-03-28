import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, maxlength: 100 },
    password_hash: { type: String, required: true, maxlength: 255 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('User', userSchema);
