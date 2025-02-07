const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Constants for configuration and validation
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

class RecipeGenerationError extends Error {
    constructor(message, type = 'GENERAL_ERROR') {
        super(message);
        this.name = 'RecipeGenerationError';
        this.type = type;
    }
}

async function generateRecipe(ingredients, preferences) {
    let lastError;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Validate inputs before making API call
            validateInputs(ingredients, preferences);
            
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            const prompt = constructPrompt(ingredients, preferences);
            const result = await model.generateContent({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.8,
                    maxOutputTokens: 1000,
                },
            });

            if (!result.response) {
                throw new RecipeGenerationError('Empty response from API', 'API_ERROR');
            }

            const text = result.response.text();
            const recipe = parseRecipeResponse(text);
            
            // Validate the generated recipe
            validateRecipe(recipe);
            
            return recipe;
        } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt} failed:`, error);

            if (error.name === 'RecipeGenerationError' && error.type !== 'API_ERROR') {
                // Don't retry validation errors
                throw error;
            }

            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
                continue;
            }
        }
    }

    throw new RecipeGenerationError(
        `Failed after ${MAX_RETRIES} attempts: ${lastError.message}`,
        'MAX_RETRIES_EXCEEDED'
    );
}

function validateInputs(ingredients, preferences) {
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        throw new RecipeGenerationError('At least one ingredient is required', 'VALIDATION_ERROR');
    }

    if (!preferences || typeof preferences !== 'object') {
        throw new RecipeGenerationError('Invalid preferences object', 'VALIDATION_ERROR');
    }

    if (!Array.isArray(preferences.dietary)) {
        throw new RecipeGenerationError('Dietary preferences must be an array', 'VALIDATION_ERROR');
    }

    if (!VALID_DIFFICULTIES.includes(preferences.difficulty)) {
        throw new RecipeGenerationError(
            `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
            'VALIDATION_ERROR'
        );
    }

    const maxTime = parseInt(preferences.maxTime);
    if (isNaN(maxTime) || maxTime <= 0 || maxTime > 480) { // 8 hours max
        throw new RecipeGenerationError('Invalid cooking time. Must be between 1 and 480 minutes', 'VALIDATION_ERROR');
    }
}

function constructPrompt(ingredients, preferences) {
    return `
    Create a recipe using these ingredients: ${ingredients.join(', ')}
    
    Requirements:
    - Dietary restrictions: ${preferences.dietary.join(', ')}
    - Cooking level: ${preferences.difficulty}
    - Maximum cooking time: ${preferences.maxTime} minutes

    Return ONLY a JSON object with no additional text, markdown, or code blocks. Use this structure:
    {
        "name": "Recipe Name",
        "cookingTime": "30",
        "difficulty": "beginner/intermediate/advanced",
        "ingredients": ["item 1", "item 2"],
        "instructions": ["step 1", "step 2"],
        "nutritionalInfo": "nutrition details",
        "substitutions": ["substitution 1", "substitution 2"]
    }`;
}

function parseRecipeResponse(response) {
    try {
        // Remove any potential markdown or code block indicators
        let cleanText = response
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .replace(/`/g, '')
            .trim();

        // Extract JSON object
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new RecipeGenerationError('No valid JSON object found in response', 'PARSE_ERROR');
        }

        const recipe = JSON.parse(jsonMatch[0]);
        return recipe;
    } catch (error) {
        if (error.name === 'RecipeGenerationError') throw error;
        console.error('Parse error:', error, '\nResponse:', response);
        throw new RecipeGenerationError('Failed to parse recipe response', 'PARSE_ERROR');
    }
}

function validateRecipe(recipe) {
    const requiredFields = {
        name: 'string',
        cookingTime: ['string', 'number'],
        difficulty: value => VALID_DIFFICULTIES.includes(value),
        ingredients: value => Array.isArray(value) && value.length > 0,
        instructions: value => Array.isArray(value) && value.length > 0,
        nutritionalInfo: 'string',
        substitutions: value => Array.isArray(value)
    };

    for (const [field, validator] of Object.entries(requiredFields)) {
        const value = recipe[field];
        
        if (value === undefined || value === null || value === '') {
            throw new RecipeGenerationError(`Missing required field: ${field}`, 'VALIDATION_ERROR');
        }

        if (typeof validator === 'string') {
            if (typeof value !== validator) {
                throw new RecipeGenerationError(
                    `Invalid type for ${field}: expected ${validator}, got ${typeof value}`,
                    'VALIDATION_ERROR'
                );
            }
        } else if (Array.isArray(validator)) {
            if (!validator.includes(typeof value)) {
                throw new RecipeGenerationError(
                    `Invalid type for ${field}: expected one of ${validator.join('/')}, got ${typeof value}`,
                    'VALIDATION_ERROR'
                );
            }
        } else if (!validator(value)) {
            throw new RecipeGenerationError(`Invalid value for ${field}`, 'VALIDATION_ERROR');
        }
    }

    return true;
}

module.exports = { 
    generateRecipe, 
    parseRecipeResponse, 
    validateRecipe,
    RecipeGenerationError 
};