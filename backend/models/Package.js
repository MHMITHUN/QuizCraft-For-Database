const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Package name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Package description is required'],
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [1, 'Duration must be at least 1 day']
    },
    features: {
        type: [String],
        default: []
    },
    targetRole: {
        type: String,
        required: [true, 'Target role is required'],
        enum: ['student', 'teacher'],
        lowercase: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    quizLimit: {
        type: Number,
        default: null // null = unlimited
    },
    classLimit: {
        type: Number,
        default: null // null = unlimited, only for teacher packages
    },
    order: {
        type: Number,
        default: 0 // For sorting packages in display
    }
}, {
    timestamps: true
});

// Index for efficient queries
packageSchema.index({ targetRole: 1, isActive: 1 });

const Package = mongoose.model('Package', packageSchema);

module.exports = Package;
