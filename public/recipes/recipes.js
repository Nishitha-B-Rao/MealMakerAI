class RecipeHandler {
    constructor() {
        this.token = localStorage.getItem('token');
        if (!this.token) {
            window.location.href = '/auth/index.html';
            return;
        }

        if (!this.checkRequiredElements()) {
            console.error('Required DOM elements not found');
            return;
        }

        this.setupEventListeners();
    }

    checkRequiredElements() {
        const required = [
            'recipeForm',
            'ingredientInput',
            'ingredientTags',
            'loader',
            'errorDisplay'
        ];
        return required.every(id => document.getElementById(id) !== null);
    }

    setupEventListeners() {
        document.getElementById('recipeForm').addEventListener('submit', this.handleSubmit.bind(this));
        document.getElementById('ingredientInput').addEventListener('keypress', this.handleIngredientInput.bind(this));
        this.setupDietaryFilters();

        // Event delegation for recipe actions
        
    }

    setupDietaryFilters() {
        const filters = document.querySelectorAll('.dietary-filter');
        filters.forEach(filter => {
            filter.addEventListener('change', this.updateFilters.bind(this));
        });
    }

    async handleSubmit(event) {
        event.preventDefault();
        const ingredients = this.getIngredientsList();
        const preferences = this.getPreferences();

        try {
            this.showLoader();
            const response = await fetch('/api/recipes/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ ingredients, preferences })
            });

            if (!response.ok) throw new Error('Failed to generate recipe');

            const recipe = await response.json();
            this.displayRecipe(recipe);
        } catch (error) {
            this.showError(error.message);
            console.error('Error generating recipe:', error);
        } finally {
            this.hideLoader();
        }
    }

    getIngredientsList() {
        const ingredientTags = document.querySelectorAll('.ingredient-tag');
        return Array.from(ingredientTags).map(tag => tag.textContent.trim());
    }

    getPreferences() {
        const dietary = Array.from(document.querySelectorAll('.dietary-filter:checked'))
            .map(checkbox => checkbox.value);

        return {
            dietary,
            difficulty: document.querySelector('input[name="difficulty"]:checked').value,
            maxTime: parseInt(document.getElementById('maxTime').value) || 60
        };
    }

    handleIngredientInput(event) {
        if (event.key === 'Enter' && event.target.value.trim()) {
            event.preventDefault();
            this.addIngredientTag(event.target.value.trim());
            event.target.value = '';
        }
    }

    addIngredientTag(ingredient) {
        const tagsContainer = document.getElementById('ingredientTags');
        const tag = document.createElement('span');
        tag.className = 'ingredient-tag';
        tag.innerHTML = `
            ${this.escapeHtml(ingredient)}
            <button type="button" class="remove-tag">&times;</button>
        `;
        tag.querySelector('.remove-tag').addEventListener('click', () => tag.remove());
        tagsContainer.appendChild(tag);
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#039;');
    }

    displayRecipe(recipe) {
        const display = document.getElementById('recipeDisplay');
        display.innerHTML = `
            <h2>${this.escapeHtml(recipe.name)}</h2>
            
            <div class="recipe-info">
                <span>🕒 ${this.escapeHtml(recipe.cookingTime)} minutes</span>
                <span>📊 ${this.escapeHtml(recipe.difficulty)}</span>
            </div>
            
            <div class="recipe-section">
                <h3>Ingredients</h3>
                <ul>
                    ${recipe.ingredients.map(ing => `<li>${this.escapeHtml(ing)}</li>`).join('')}
                </ul>
            </div>
            
            <div class="recipe-section">
                <h3>Instructions</h3>
                <ol>
                    ${recipe.instructions.map(step => `<li>${this.escapeHtml(step)}</li>`).join('')}
                </ol>
            </div>
            
            <div class="recipe-section">
                <h3>Nutrition Information</h3>
                <p>${this.escapeHtml(recipe.nutritionalInfo)}</p>
            </div>
            
            <div class="recipe-section">
                <h3>Substitutions</h3>
                <ul>
                    ${recipe.substitutions.map(sub => `<li>${this.escapeHtml(sub)}</li>`).join('')}
                </ul>
            </div>
        `;
        display.scrollIntoView({ behavior: 'smooth' });
    }

    showLoader() {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'flex';
    }

    hideLoader() {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }

    showError(message) {
        const error = document.getElementById('errorDisplay');
        if (error) {
            error.textContent = message;
            error.style.display = 'block';
            setTimeout(() => error.style.display = 'none', 3000);
        }
    }
}

// Initialize the handler when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('recipeForm')) {
        new RecipeHandler();
    }
});