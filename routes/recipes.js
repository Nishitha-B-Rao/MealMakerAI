//routes/recipes.js
const express = require('express');
const authenticateToken = require('../middleware/authenticateToken');
const { generateRecipe } = require('../utils/recipeUtils');
const User = require('../models/User');
const router = express.Router();

// Generate Recipe
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { ingredients, preferences } = req.body;

        if (!ingredients || ingredients.length === 0) {
            return res.status(400).json({ error: 'No ingredients provided' });
        }

        const recipe = await generateRecipe(ingredients, preferences);

        // Save recipe to user's profile
        const user = await User.findById(req.user.id);
        user.recipes.push(recipe);
        await user.save();

        res.json(recipe);
    } catch (error) {
        console.error('Recipe generation error:', error);
        res.status(500).json({ error: 'Failed to generate recipe. Please try again.' });
    }
});


// Get User Recipes
router.get('/my-recipes', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user.recipes);
    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.status(500).json({ error: 'Failed to fetch recipes.' });
    }
});

// Get User Recipe
router.get('/my-recipes/:recipeId', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const recipe = user.recipes.find(r => r._id.toString() === req.params.recipeId);
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        res.json(recipe);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        res.status(500).json({ error: 'Failed to fetch recipe.' });
    }
});

// Delete User Recipe
router.delete('/my-recipes/:recipeId', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.recipes = user.recipes.filter(recipe => recipe._id.toString() !== req.params.recipeId);
        await user.save();
        res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({ error: 'Failed to delete recipe.' });
    }
});

module.exports = router;