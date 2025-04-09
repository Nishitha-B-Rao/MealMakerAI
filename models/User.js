const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const recipeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    cookingTime: { type: String, required: true },
    difficulty: { type: String, required: true },
    ingredients: { type: [String], required: true },
    instructions: { type: [String], required: true },
    nutritionalInfo: { type: String, required: true },
    substitutions: { type: [String], required: true },
    createdAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    recipes: [recipeSchema], // Array of recipes
});

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

module.exports = mongoose.model('User', userSchema);