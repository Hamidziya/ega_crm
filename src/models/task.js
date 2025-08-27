import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    name: { type: String, },
    email: { type: String, },
    mobile: { type: String, },
    title: { type: String, required: true },
    description: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId },
    status: { type: String, default: 'Pending' },
    frontendUrl: { type: String },
    backendUrl: { type: String },
    createdAt: { type: Date, default: Date.now() },
    updatedAt: { type: Date, default: Date.now() },

    // New fields
    isDelete: { type: Boolean, default: false },
    inActive: { type: Boolean, default: true }
});

const Task = mongoose.model('Tasks', taskSchema);
export default Task;
