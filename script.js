document.addEventListener("DOMContentLoaded", () => {
    const recipeListEl = document.getElementById("recipe-list");
    const searchInput = document.getElementById("search");
    const categoryFilter = document.getElementById("category-filter");
    const addRecipeBtn = document.getElementById("add-recipe-btn");

    // Modals
    const newRecipeModal = document.getElementById("new-recipe-modal");
    const editModal = document.getElementById("edit-recipe-modal");

    // New Recipe Inputs
    const newTitleEl = document.getElementById("new-title");
    const newCategoryEl = document.getElementById("new-category");
    const newIngredientsList = document.getElementById("new-ingredients-list");
    const newIngredientInput = document.getElementById("new-ingredient-input");
    const addNewIngredientBtn = document.getElementById("add-new-ingredient");
    const newInstructionsList = document.getElementById("new-instructions-list");
    const newInstructionInput = document.getElementById("new-instruction-input");
    const addNewInstructionBtn = document.getElementById("add-new-instruction");
    const saveNewBtn = document.getElementById("save-new");
    const cancelNewBtn = document.getElementById("cancel-new");

    // Edit Recipe Inputs
    const editTitleEl = document.getElementById("edit-title");
    const editCategoryEl = document.getElementById("edit-category");
    const editIngredientsList = document.getElementById("edit-ingredients-list");
    const editIngredientInput = document.getElementById("edit-ingredient-input");
    const addEditIngredientBtn = document.getElementById("add-edit-ingredient");
    const editInstructionsList = document.getElementById("edit-instructions-list");
    const editInstructionInput = document.getElementById("edit-instruction-input");
    const addEditInstructionBtn = document.getElementById("add-edit-instruction");
    const saveEditBtn = document.getElementById("save-edit");
    const cancelEditBtn = document.getElementById("cancel-edit");

    let recipes = JSON.parse(localStorage.getItem("recipes")) || [];
    let editIndex = null;

    const openTrashBtn = document.getElementById("open-trash-btn");
    const recentlyDeleted = document.getElementById("recently-deleted");
    const deletedListEl = document.getElementById("deleted-recipes-list");
    const clearTrashBtn = document.getElementById("clear-trash");
    const confirmModal = document.getElementById("confirm-modal");
    const confirmText = document.getElementById("confirm-text");
    const restoreBtn = document.getElementById("restore-btn");
    const deleteBtn = document.getElementById("delete-btn");

    let deletedRecipes = JSON.parse(localStorage.getItem("deletedRecipes")) || [];
    confirmModal.classList.add("hidden");

    function saveRecipes() {
        localStorage.setItem("recipes", JSON.stringify(recipes));
    }

    function saveDeletedRecipes() {
        localStorage.setItem("deletedRecipes", JSON.stringify(deletedRecipes));
    }

    function renderRecipes() {
        recipeListEl.innerHTML = recipes
            .map(recipe => `
        <div class="recipe-card">
            <div class="render-title">
                <h3>${recipe.title}</h3>
                <p>${recipe.category}</p>
            </div>
            <p id="ingredients-title"><b>Ingredients:</b></p>
            <ul>${recipe.ingredients.list.map(ing => `<li>${ing}</li>`).join("")}</ul>
            <button class="edit-btn">
                <span class="material-symbols-outlined">edit</span> Edit
            </button>
            <button class="delete-btn">
                <span class="material-symbols-outlined">delete</span> Delete
            </button>
        </div>
    `)
            .join("");

        console.log("Rendered recipes:", recipes.map(r => r.title));
    }

    function removeOldRecipes() {
        const now = Date.now();
        deletedRecipes = deletedRecipes.filter(recipe => now - recipe.deletedAt < 30 * 24 * 60 * 60 * 1000);
        saveDeletedRecipes();
    }

    function renderDeletedRecipes() {
        deletedListEl.innerHTML = deletedRecipes
            .map(recipe => `<li class="deleted-item">${recipe.title}</li>`)
            .join("");

        console.log("Recently deleted recipes:", deletedRecipes.map(r => r.title));

        // Add hover event to show the view modal
        document.querySelectorAll(".deleted-item").forEach((item, i) => {
            item.addEventListener("mouseenter", () => openViewRecipeModal(i, true)); // Use new function
            item.addEventListener("mouseleave", () => {
                document.getElementById("view-recipe-modal").classList.add("hidden");
            });
        });

        recentlyDeleted.addEventListener("mouseleave", () => {
            document.getElementById("view-recipe-modal").classList.add("hidden");
        });
    }

    function addItem(inputEl, listEl) {
        const value = inputEl.value.trim();
        if (value) {
            const li = document.createElement("li");
            li.textContent = value;
            li.addEventListener("click", () => li.remove());
            listEl.appendChild(li);
            inputEl.value = "";
        }
    }

    addNewIngredientBtn.addEventListener("click", () => addItem(newIngredientInput, newIngredientsList));
    addNewInstructionBtn.addEventListener("click", () => addItem(newInstructionInput, newInstructionsList));

    addEditIngredientBtn.addEventListener("click", () => addItem(editIngredientInput, editIngredientsList));
    addEditInstructionBtn.addEventListener("click", () => addItem(editInstructionInput, editInstructionsList));

    function openNewRecipeModal() {
        newTitleEl.value = "";
        newCategoryEl.value = "";
        newIngredientsList.innerHTML = "";
        newInstructionsList.innerHTML = "";
        newRecipeModal.classList.remove("hidden");
    }

    function closeNewRecipeModal() {
        newRecipeModal.classList.add("hidden");
    }

    function updateCategoryFilter() {
        const categories = ["all", ...new Set(recipes.map(r => r.category))];
        categoryFilter.innerHTML = categories
            .map(cat => `<option value="${cat}">${cat}</option>`)
            .join("");
    }

    function saveNewRecipe() {
        const newRecipe = {
            title: newTitleEl.value.trim(),
            category: newCategoryEl.value.trim(),
            ingredients: { list: [...newIngredientsList.querySelectorAll("li")].map(li => li.textContent) },
            instructions: { list: [...newInstructionsList.querySelectorAll("li")].map(li => li.textContent) }
        };

        if (newRecipe.title && newRecipe.category && newRecipe.ingredients.list.length && newRecipe.instructions.list.length) {
            recipes.push(newRecipe);
            saveRecipes();
            renderRecipes();
            updateCategoryFilter(); // <-- Update filter dropdown
            closeNewRecipeModal();
        }
    }

    function openEditModal(index) {
        editIndex = index;
        const recipe = recipes[index];

        editTitleEl.value = recipe.title;
        editCategoryEl.value = recipe.category;
        editIngredientsList.innerHTML = recipe.ingredients.list.map(ing => `<li>${ing}</li>`).join("");
        editInstructionsList.innerHTML = recipe.instructions.list.map(ins => `<li>${ins}</li>`).join("");

        editModal.classList.remove("hidden");
    }

    function closeEditModal() {
        editModal.classList.add("hidden");
    }

    function saveEdit() {
        if (editIndex !== null) {
            recipes[editIndex] = {
                title: editTitleEl.value.trim(),
                category: editCategoryEl.value.trim(),
                ingredients: { list: [...editIngredientsList.querySelectorAll("li")].map(li => li.textContent) },
                instructions: { list: [...editInstructionsList.querySelectorAll("li")].map(li => li.textContent) }
            };
            saveRecipes();
            renderRecipes();
            closeEditModal();
        }
    }

    function confirmAction(index) {
        restoreBtn.dataset.index = index; // Store index for restore
        deleteBtn.dataset.index = index; // Store index for delete
        confirmText.textContent = `Do you want to restore or delete "${deletedRecipes[index].title}"?`;

        confirmModal.classList.remove("hidden");
        recentlyDeleted.classList.remove("open");
    }

    function openViewRecipeModal(index, isDeleted = false) {
        const list = isDeleted ? deletedRecipes : recipes; // Choose the correct list
        console.log(`Opening modal for ${isDeleted ? "deleted" : "active"} recipe at index: ${index}`);
        console.log(`${isDeleted ? "Deleted" : "Active"} recipes list:`, list.map(r => r.title));

        if (!list[index]) {
            console.error("Invalid index access in view modal:", index);
            return;
        }

        const recipe = list[index];

        document.getElementById("view-title").textContent = recipe.title;
        document.getElementById("view-category").textContent = recipe.category;
        document.getElementById("view-ingredients-list").innerHTML =
            recipe.ingredients.list.map(ing => `<li>${ing}</li>`).join("");
        document.getElementById("view-instructions-list").innerHTML =
            recipe.instructions.list.map(ins => `<li>${ins}</li>`).join("");

        document.getElementById("view-recipe-modal").classList.remove("hidden");
    }

    function deleteRecipe(index) {
        console.log(`Deleting index: ${index}, Recipe title: ${recipes[index]?.title}`);

        let deletedRecipe = { ...recipes[index], deletedAt: Date.now() };
        deletedRecipes.push(deletedRecipe);
        recipes.splice(index, 1); // Remove the item

        saveDeletedRecipes();
        saveRecipes();

        console.log("Updated recipes after deletion:", recipes.map(r => r.title));

        renderRecipes(); // Force full re-render
        renderDeletedRecipes(); // Ensure deleted recipes update
    }

    // Event Delegation for Edit & Delete
    recipeListEl.addEventListener("click", (e) => {
        const card = e.target.closest(".recipe-card");
        if (!card) return;

        const index = [...recipeListEl.children].indexOf(card); // Find correct index dynamically
        console.log(`Clicked card index: ${index}, Title: ${recipes[index]?.title}`);

        if (e.target.classList.contains("edit-btn")) {
            openEditModal(index);
        } else if (e.target.classList.contains("delete-btn")) {
            deleteRecipe(index);
        } else {
            openViewRecipeModal(index);
        }
    });

    document.getElementById("close-view-recipe").addEventListener("click", () => {
        document.getElementById("view-recipe-modal").classList.add("hidden");
    });

    document.getElementById("view-recipe-modal").addEventListener("click", (e) => {
        if (e.target === document.getElementById("view-recipe-modal")) {
            document.getElementById("view-recipe-modal").classList.add("hidden");
        }
    });

    // Search & Filter Events
    searchInput.addEventListener("input", renderRecipes);
    categoryFilter.addEventListener("change", renderRecipes);

    // Modal Button Events
    saveEditBtn.addEventListener("click", saveEdit);
    cancelEditBtn.addEventListener("click", closeEditModal);

    addRecipeBtn.addEventListener("click", openNewRecipeModal);
    saveNewBtn.addEventListener("click", saveNewRecipe);
    cancelNewBtn.addEventListener("click", closeNewRecipeModal);

    document.getElementById("close-edit-modal").addEventListener("click", closeEditModal);
    document.getElementById("close-new-modal").addEventListener("click", closeNewRecipeModal);

    openTrashBtn.addEventListener("click", (event) => {
        event.stopPropagation(); // Prevent this click from triggering the outside click event
        recentlyDeleted.classList.toggle("open");
        console.log("Trash menu toggled:", recentlyDeleted.classList.contains("open"));
    });

    // Click outside to close menu
    document.addEventListener("click", (event) => {
        if (!recentlyDeleted.contains(event.target)) {
            recentlyDeleted.classList.remove("open");
            console.log("Clicked outside, closing menu.");
        }
    });

    // Prevent clicks inside the menu from closing it
    recentlyDeleted.addEventListener("click", (event) => {
        event.stopPropagation(); // Stops the click from bubbling up
    });

    clearTrashBtn.addEventListener("click", () => {
        deletedRecipes = [];
        saveDeletedRecipes();
        renderDeletedRecipes();
    });

    deletedListEl.addEventListener("click", (event) => {
        const items = [...deletedListEl.children]; // Get fresh list of deleted items
        const index = items.indexOf(event.target); // Find the real index

        console.log(`Clicked deleted recipe index: ${index}, Title: ${deletedRecipes[index]?.title}`);

        if (index !== -1) confirmAction(index);
    });

    document.getElementById("close-confirm-modal").addEventListener("click", function () {
        document.getElementById("confirm-modal").classList.add("hidden");
    });

    restoreBtn.addEventListener("click", () => {
        const index = Number(restoreBtn.dataset.index); // Convert to number
        if (!isNaN(index)) {
            recipes.push(deletedRecipes[index]);
            deletedRecipes.splice(index, 1);
            saveDeletedRecipes();
            saveRecipes();
            renderRecipes();
            renderDeletedRecipes();
            confirmModal.classList.add("hidden");
        }
    });

    deleteBtn.addEventListener("click", () => {
        const index = Number(deleteBtn.dataset.index); // Convert to number
        if (!isNaN(index)) {
            deletedRecipes.splice(index, 1);
            saveDeletedRecipes();
            renderDeletedRecipes();
            confirmModal.classList.add("hidden");
        }
    });

    removeOldRecipes();
    renderDeletedRecipes();

    // Initial Render
    updateCategoryFilter();
    renderRecipes();
});