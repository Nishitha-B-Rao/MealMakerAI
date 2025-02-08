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
        this.setupMobileIngredientInput();
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
    }

    setupMobileIngredientInput() {
        const inputContainer = document.getElementById('ingredientInput').parentElement;
        
        // Create and add the Add button
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'ml-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition focus:outline-none focus:ring-2 focus:ring-rose-500';
        addButton.innerHTML = '<i class="fas fa-plus"></i> Add';
        
        // Wrap input and button in a flex container
        const flexContainer = document.createElement('div');
        flexContainer.className = 'flex items-center';
        
        // Move the input to the flex container
        const input = document.getElementById('ingredientInput');
        input.parentNode.insertBefore(flexContainer, input);
        flexContainer.appendChild(input);
        flexContainer.appendChild(addButton);

        // Add button click handler
        addButton.addEventListener('click', () => {
            const input = document.getElementById('ingredientInput');
            const ingredient = input.value.trim();
            if (ingredient) {
                this.addIngredientTag(ingredient);
                input.value = '';
                input.focus();
            }
        });

        // Add form submission prevention on input
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addButton.click();
            }
        });
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
        
        if (ingredients.length === 0) {
            this.showError('Please add at least one ingredient');
            return;
        }
        
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
        const dietary = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        return {
            dietary,
            difficulty: document.querySelector('input[name="difficulty"]:checked').value,
            maxTime: parseInt(document.getElementById('maxTime').value) || 60
        };
    }

    handleIngredientInput(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const ingredient = event.target.value.trim();
            if (ingredient) {
                this.addIngredientTag(ingredient);
                event.target.value = '';
            }
        }
    }

    addIngredientTag(ingredient) {
        const tagsContainer = document.getElementById('ingredientTags');
        const tag = document.createElement('div');
        tag.className = 'ingredient-tag inline-flex items-center bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-sm';
        tag.innerHTML = `
            ${this.escapeHtml(ingredient)}
            <button type="button" class="remove-tag ml-2 text-rose-600 hover:text-rose-800 focus:outline-none">
                <i class="fas fa-times"></i>
            </button>
        `;
        tag.querySelector('.remove-tag').addEventListener('click', () => {
            tag.remove();
            document.getElementById('ingredientInput').focus();
        });
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
            <h2 class="text-2xl font-bold text-gray-800 mb-4">${this.escapeHtml(recipe.name)}</h2>
            
            <div class="recipe-info flex gap-4 text-gray-600 mb-6">
                <span class="flex items-center">
                    <i class="fas fa-clock mr-2"></i>
                    ${this.escapeHtml(recipe.cookingTime)} minutes
                </span>
                <span class="flex items-center">
                    <i class="fas fa-chart-line mr-2"></i>
                    ${this.escapeHtml(recipe.difficulty)}
                </span>
            </div>
            
            <div class="recipe-section mb-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">Ingredients</h3>
                <ul class="list-disc list-inside space-y-2">
                    ${recipe.ingredients.map(ing => `<li>${this.escapeHtml(ing)}</li>`).join('')}
                </ul>
            </div>
            
            <div class="recipe-section mb-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">Instructions</h3>
                <ol class="list-decimal list-inside space-y-3">
                    ${recipe.instructions.map(step => `<li class="pl-2">${this.escapeHtml(step)}</li>`).join('')}
                </ol>
            </div>
            
            <div class="recipe-section mb-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">Nutrition Information</h3>
                <p class="text-gray-700">${this.escapeHtml(recipe.nutritionalInfo)}</p>
            </div>
            
            <div class="recipe-section">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">Substitutions</h3>
                <ul class="list-disc list-inside space-y-2">
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
            error.className = 'mt-4 text-red-500 bg-red-50 p-3 rounded-lg';
            setTimeout(() => {
                error.style.display = 'none';
                error.className = 'mt-4 text-red-500';
            }, 3000);
        }
    }

    updateFilters() {
        // Method stub for future filter updates
        console.log('Filters updated');
    }
}

// Initialize the handler when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('recipeForm')) {
        new RecipeHandler();
    }
});