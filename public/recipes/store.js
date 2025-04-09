class StoredRecipesViewer {
    constructor() {
        this.token = localStorage.getItem('token');
        if (!this.token) {
            window.location.href = '/auth/index.html';
            return;
        }

        this.setupEventListeners();
        this.fetchStoredRecipes();
    }

    setupEventListeners() {
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('recipeModal').style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            const modal = document.getElementById('recipeModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    async fetchStoredRecipes() {
        try {
            this.showLoader();
            const response = await fetch('/api/recipes/my-recipes', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.displayRecipes(data);
        } catch (error) {
            if (error instanceof TypeError) {
                this.showError('Network error: Unable to connect to the server.');
            } else {
                this.showError(`Failed to fetch recipes: ${error.message}`);
            }
            console.error('Error:', error);
        } finally {
            this.hideLoader();
        }
    }

    displayRecipes(recipes) {
        const recipesList = document.getElementById('recipesList');
        
        if (!Array.isArray(recipes) || recipes.length === 0) {
            recipesList.innerHTML = `
                <div class="no-recipes">
                    <h2>No Recipes Found</h2>
                    <p>You haven't saved any recipes yet. Generate some recipes to see them here!</p>
                </div>
            `;
            return;
        }

        recipesList.innerHTML = recipes.map(recipe => this.createRecipeCard(recipe)).join('');
        
        // Add event listeners to buttons
        recipesList.querySelectorAll('.view-button').forEach(button => {
            button.addEventListener('click', () => this.viewRecipe(button.dataset.recipeId));
        });

        recipesList.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', () => this.deleteRecipe(button.dataset.recipeId));
        });
    }

    createRecipeCard(recipe) {
        return `
            <div class="recipe-card">
                <h3>${this.escapeHtml(recipe.name)}</h3>
                <div class="recipe-meta">
                    <span>🕒 ${this.escapeHtml(recipe.cookingTime)} minutes</span>
                    <span>📊 ${this.escapeHtml(recipe.difficulty)}</span>
                </div>
                <div class="recipe-content">
                    <p><strong>Ingredients:</strong> ${recipe.ingredients.length} items</p>
                    ${recipe.dietary?.length ? 
                        `<p><strong>Dietary:</strong> ${this.escapeHtml(recipe.dietary.join(', '))}</p>` 
                        : ''}
                </div>
                <div class="recipe-actions">
                    <button class="button view-button" data-recipe-id="${recipe._id}">View Recipe</button>
                    <button class="button delete-button" data-recipe-id="${recipe._id}">Delete</button>
                </div>
            </div>
        `;
    }

    async viewRecipe(recipeId) {
        try {
            const response = await fetch(`/api/recipes/my-recipes/${recipeId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch recipe details');

            const recipe = await response.json();
            this.displayRecipeModal(recipe);
        } catch (error) {
            this.showError('Failed to load recipe details');
            console.error('Error:', error);
        }
    }

    displayRecipeModal(recipe) {
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <h2>${this.escapeHtml(recipe.name)}</h2>
            <div class="recipe-meta">
                <span>🕒 ${this.escapeHtml(recipe.cookingTime)} minutes</span>
                <span>📊 ${this.escapeHtml(recipe.difficulty)}</span>
            </div>
            <div class="recipe-section">
                <h3>Ingredients</h3>
                <ul>${recipe.ingredients.map(ing => `<li>${this.escapeHtml(ing)}</li>`).join('')}</ul>
            </div>
            <div class="recipe-section">
                <h3>Instructions</h3>
                <ol>${recipe.instructions.map(step => `<li>${this.escapeHtml(step)}</li>`).join('')}</ol>
            </div>
            ${recipe.nutritionalInfo ? `
                <div class="recipe-section">
                    <h3>Nutrition Information</h3>
                    <p>${this.escapeHtml(recipe.nutritionalInfo)}</p>
                </div>
            ` : ''}
            ${recipe.substitutions?.length ? `
                <div class="recipe-section">
                    <h3>Substitutions</h3>
                    <ul>${recipe.substitutions.map(sub => `<li>${this.escapeHtml(sub)}</li>`).join('')}</ul>
                </div>
            ` : ''}
        `;
        document.getElementById('recipeModal').style.display = 'flex';
    }

    async deleteRecipe(recipeId) {
        if (!confirm('Are you sure you want to delete this recipe?')) return;

        try {
            const response = await fetch(`/api/recipes/my-recipes/${recipeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete recipe');

            await this.fetchStoredRecipes();
        } catch (error) {
            this.showError('Failed to delete recipe');
            console.error('Error:', error);
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#039;');
    }

    showLoader() {
        document.getElementById('loader').style.display = 'flex';
    }

    hideLoader() {
        document.getElementById('loader').style.display = 'none';
    }

    showError(message) {
        const error = document.getElementById('errorDisplay');
        error.textContent = message;
        error.style.display = 'block';
        setTimeout(() => error.style.display = 'none', 3000);
    }
}

// Initialize the viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new StoredRecipesViewer();
});