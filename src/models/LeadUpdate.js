// models/LeadUpdate.js
import mongoose from 'mongoose';

const leadUpdateSchema = new mongoose.Schema({
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tasks', 
    required: true 
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'users', 
    required: true 
  },
  updateType: { 
    type: String, 
    enum: ['status_change', 'note', 'call', 'meeting', 'email', 'other'],
    required: true 
  },
  oldStatus: { type: String },
  newStatus: { type: String },
  notes: { type: String },
  nextFollowUp: { type: Date },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  createdAt: { type: Date, default: Date.now }
});

const LeadUpdate = mongoose.model('LeadUpdate', leadUpdateSchema);
export default LeadUpdate;