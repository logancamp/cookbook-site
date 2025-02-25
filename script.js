document.addEventListener("DOMContentLoaded", () => {
    const recipeListEl = document.getElementById("recipe-list");
    const searchInput = document.getElementById("search");
    const categoryFilter = document.getElementById("category-filter");

    // Recipe Inputs
    const recipeModal = document.getElementById("recipe-modal");
    const modalTitle = document.getElementById("recipe-modal-title");
    const recipeTitleEl = document.getElementById("recipe-title");
    const recipeCategoryEl = document.getElementById("recipe-category");
    const recipeIngredientsList = document.getElementById("recipe-ingredients-list");
    const recipeInstructionsList = document.getElementById("recipe-instructions-list");
    const addRecipeIngredientBtn = document.getElementById("add-recipe-ingredient");
    const addRecipeInstructionBtn = document.getElementById("add-recipe-instruction");
    const saveRecipeBtn = document.getElementById("save-recipe");
    const cancelRecipeBtn = document.getElementById("cancel-recipe");

    let recipeData = JSON.parse(localStorage.getItem("recipeData")) || { recipes: [] };
    let editIndex = null;

    const openTrashBtn = document.getElementById("open-trash-btn");
    const recentlyDeleted = document.getElementById("recently-deleted");
    const deletedListEl = document.getElementById("deleted-recipes-list");
    const clearTrashBtn = document.getElementById("clear-trash");
    const clearTrashIcon = document.getElementById("check-icon");

    const confirmModal = document.getElementById("confirm-modal");
    const confirmText = document.getElementById("confirm-text");
    const restoreBtn = document.getElementById("restore-btn");
    const deleteBtn = document.getElementById("delete-btn");

    let deletedRecipes = JSON.parse(localStorage.getItem("deletedRecipes")) || [];
    confirmModal.classList.add("hidden");
    clearTrashBtn.classList.remove("active");

    function saveRecipes() {
        console.log("💾 Saving recipes to localStorage:", recipeData.recipes);
        localStorage.setItem("recipeData", JSON.stringify(recipeData));
    }

    function saveDeletedRecipes() {
        console.log("💾 Saving deleted recipes:", deletedRecipes);
        localStorage.setItem("deletedRecipes", JSON.stringify(deletedRecipes));
    }

    function renderRecipeSection(sections) {
        if (!Array.isArray(sections)) {
            console.error("❌ renderRecipeSection() expected an array but got:", sections);
            return "";
        }

        return sections.map(({ subheading, items }) => `
        <p class="subheading"><strong>${subheading || ""}</strong></p><br>
        <ul>${items.map(item => `<li>${item}</li>`).join("")}</ul>
    `).join("");
    }

    function renderRecipes() {
        console.log("🔄 Rendering recipes...");
        recipeListEl.innerHTML = ""; // ✅ Clear before re-rendering

        recipeData.recipes.forEach((recipe, index) => {
            const recipeCard = document.createElement("div");
            recipeCard.classList.add("recipe-card");

            recipeCard.innerHTML = `
            <div class="render-title">
                <h3>${recipe.title}</h3>
                <p>${recipe.category}</p>
            </div>
            <p id="ingredients-title"><b>Ingredients:</b></p>
            <div class="ingredients-container">${renderRecipeSection(recipe.sections)}</div>
            <button class="edit-btn">
                <span class="material-symbols-outlined">edit</span> Edit
            </button>
            <button class="delete-btn">
                <span class="material-symbols-outlined">delete</span> Delete
            </button>
        `;

            recipeCard.querySelector(".edit-btn").addEventListener("click", () => openRecipeModal(index));
            recipeCard.querySelector(".delete-btn").addEventListener("click", () => deleteRecipe(index));

            recipeListEl.appendChild(recipeCard);
        });

        console.log("✅ Updated Recipe List:", recipeData.recipes);
    }

    function renderDeletedRecipes() {
        deletedListEl.innerHTML = deletedRecipes
            .map(recipe => `<li class="deleted-item">${recipe.title}</li>`)
            .join("");

        console.log("🗑️ Recently Deleted Recipes:", deletedRecipes.map(r => r.title));

        // Add event listeners for viewing deleted recipes
        document.querySelectorAll(".deleted-item").forEach((item, i) => {
            item.addEventListener("mouseenter", () => openViewRecipeModal(i, true));
            item.addEventListener("mouseleave", () => {
                document.getElementById("view-recipe-modal").classList.add("hidden");
            });
        });

        recentlyDeleted.addEventListener("mouseleave", () => {
            document.getElementById("view-recipe-modal").classList.add("hidden");
        });
    }

    function addItemWithSubheading(inputEl, subheadingEl, listEl) {
        const value = inputEl.value.trim();
        const subheadingInput = subheadingEl.value.trim(); // Capture input

        if (!value) return;

        let subheading = subheadingInput; // Use user input as subheading

        // If no input, use the last existing subheading
        const sections = [...listEl.querySelectorAll(".subheading-container")];
        if (!subheading && sections.length > 0) {
            subheading = sections[sections.length - 1].dataset.subheading;
            console.log(`🔗 Using existing subheading: ${subheading}`);
        } else if (!subheading) {
            subheading = "General"; // Default if no previous subheading exists
            console.log(`🆕 Creating default subheading: ${subheading}`);
        }

        // Find or create the section
        let section = sections.find(div => div.dataset.subheading === subheading);

        if (!section) {
            console.log(`🆕 Creating new subheading: ${subheading}`);

            section = document.createElement("div");
            section.dataset.subheading = subheading;
            section.classList.add("subheading-container");

            section.innerHTML = `
            <p class="subheading"><strong>${subheading}</strong></p>
            <ul></ul>
        `;

            listEl.appendChild(section);
        }

        const targetList = section.querySelector("ul");

        // Create and append new item
        const itemEl = document.createElement("li");
        itemEl.textContent = value;

        // Enable removal on click
        itemEl.addEventListener("click", () => {
            itemEl.remove();
            updateRecipeData();
        });

        targetList.appendChild(itemEl);

        // Clear inputs after adding
        inputEl.value = "";
        subheadingEl.value = "";

        updateRecipeData(); // Save changes
    }

    // Helper function to update the recipe data
    function updateRecipeData() {
        recipeData.recipes = [...document.querySelectorAll(".recipe-card")].map(card => {
            return {
                title: card.querySelector("h3").textContent,
                category: card.querySelector(".render-title p").textContent,
                ingredients: [...card.querySelectorAll(".subheading-container")].map(subheading => ({
                    name: subheading.dataset.subheading,
                    items: [...subheading.querySelectorAll("li")].map(li => li.textContent)
                }))
            };
        });
        console.log("Updated Recipes:", recipeData.recipes);
    }

    addRecipeIngredientBtn.addEventListener("click", () =>
        addItemWithSubheading(
            document.getElementById("recipe-ingredient-input"),
            document.getElementById("recipe-ingredient-subheading"),
            recipeIngredientsList
        )
    );

    addRecipeInstructionBtn.addEventListener("click", () =>
        addItemWithSubheading(
            document.getElementById("recipe-instruction-input"),
            document.getElementById("recipe-instruction-subheading"),
            recipeInstructionsList
        )
    );

    function updateCategoryFilter() {
        const categories = ["all", ...new Set(recipeData.recipes.map(r => r.category))];
        categoryFilter.innerHTML = categories
            .map(cat => `<option value="${cat}">${cat}</option>`)
            .join("");
    }

    function extractSubheadingData(listEl) {
        let sections = [];

        [...listEl.querySelectorAll(".subheading-container")].forEach(section => {
            let subheading = section.dataset.subheading || "General";
            let items = [...section.querySelectorAll("li")].map(li => li.textContent.trim());

            if (items.length) {
                sections.push({ subheading, items });
            }
        });

        return sections;
    }

    // Open Modal (Handles both New and Edit)
    function openRecipeModal(index = null) {
        editIndex = index;

        if (index === null) {
            modalTitle.textContent = "Add Recipe";
            recipeTitleEl.value = "";
            recipeCategoryEl.value = "";
            recipeIngredientsList.innerHTML = "";
            recipeInstructionsList.innerHTML = "";
        } else {
            modalTitle.textContent = "Edit Recipe";

            const recipe = recipeData.recipes[index];

            if (!recipe) {
                console.error("❌ No recipe found at index", index);
                return;
            }

            recipeTitleEl.value = recipe.title;
            recipeCategoryEl.value = recipe.category;
            recipeIngredientsList.innerHTML = renderEditList(recipe.sections || []);
            recipeInstructionsList.innerHTML = renderEditList(recipe.instructions || []);
        }

        recipeModal.classList.remove("hidden");
    }

    // Helper function to render the edit list with subheadings
    function renderEditList(sections) {
        return sections.map(({ subheading, items }) => `
        <div class="subheading-container" data-subheading="${subheading}">
            <p class="subheading"><strong>${subheading || "General"}</strong></p>
            <ul>${items.map(item => `<li>${item}</li>`).join("")}</ul>
        </div>
    `).join("");
    }

    function closeRecipeModal() {
        recipeModal.classList.add("hidden");
    }

    function saveRecipe() {
        const newRecipe = {
            title: recipeTitleEl.value.trim(),
            category: recipeCategoryEl.value.trim(),
            sections: extractSubheadingData(recipeIngredientsList) || [],
            instructions: extractSubheadingData(recipeInstructionsList) || []
        };

        if (editIndex !== null && recipeData.recipes[editIndex]) {
            recipeData.recipes[editIndex] = newRecipe;
        } else {
            recipeData.recipes.push(newRecipe);
        }

        saveRecipes();
        renderRecipes();
        closeRecipeModal();
    }

    function confirmAction(index) {
        restoreBtn.dataset.index = index; // Store index for restore
        deleteBtn.dataset.index = index; // Store index for delete
        confirmText.textContent = `Do you want to restore or delete "${deletedRecipes[index].title}"?`;

        confirmModal.classList.remove("hidden");
        clearTrashBtn.classList.remove("active");
        recentlyDeleted.classList.remove("open");
    }

    function openViewRecipeModal(index, isDeleted = false) {
        const list = isDeleted ? deletedRecipes : recipeData.recipes; // Use deletedRecipes if viewing trash
        console.log(`Opening modal for ${isDeleted ? "deleted" : "active"} recipe at index: ${index}`);

        if (!list[index]) {
            console.error("❌ Invalid index access in view modal:", index);
            return;
        }

        const recipe = list[index];

        // ✅ Fix: Ensure sections exist before rendering to avoid `undefined.map` errors
        document.getElementById("view-title").textContent = recipe.title;
        document.getElementById("view-category").textContent = recipe.category;
        document.getElementById("view-ingredients-list").innerHTML = renderViewList(recipe.sections || []);
        document.getElementById("view-instructions-list").innerHTML = renderViewList(recipe.instructions || []);

        document.getElementById("view-recipe-modal").classList.remove("hidden");
    }

    // Helper function to render view list with subheadings
    function renderViewList(sections) {
        if (!Array.isArray(sections)) {
            console.error("❌ renderViewList() expected an array but got:", sections);
            return ""; // ✅ Prevents `undefined.map` crash
        }

        return sections.map(({ subheading, items }) => `
        <p class="subheading"><strong>${subheading || ""}</strong></p>
        <ul>${(items || []).map(item => `<li>${item}</li>`).join("")}</ul>
    `).join("");
    }

    function deleteRecipe(index) {
        if (index === undefined || index < 0 || index >= recipeData.recipes.length) {
            console.error("❌ Invalid index for deletion:", index);
            return;
        }

        console.log(`🗑️ Moving recipe to Recently Deleted: ${recipeData.recipes[index]?.title}`);

        // ✅ Move the deleted item to Recently Deleted
        deletedRecipes.push(recipeData.recipes[index]);

        // ✅ Remove only the selected recipe from the main list
        recipeData.recipes.splice(index, 1);

        // ✅ Save both lists after modification
        saveDeletedRecipes();
        saveRecipes();

        // ✅ Re-render both lists
        renderRecipes();
        renderDeletedRecipes();
    }

    // Event Delegation for Edit & Delete
    recipeListEl.addEventListener("click", (e) => {
        const card = e.target.closest(".recipe-card");
        if (!card) return;

        const index = [...recipeListEl.children].indexOf(card);

        if (e.target.closest(".edit-btn")) {
            openRecipeModal(index);
        } else if (e.target.closest(".delete-btn")) {
            deleteRecipe(index); // ✅ Make sure the correct index is passed
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

    document.getElementById("add-recipe-btn").addEventListener("click", () => openRecipeModal());
    saveRecipeBtn.addEventListener("click", saveRecipe);
    cancelRecipeBtn.addEventListener("click", closeRecipeModal);
    document.getElementById("close-recipe-modal").addEventListener("click", closeRecipeModal);

    openTrashBtn.addEventListener("click", (event) => {
        event.stopPropagation(); // Prevent this click from triggering the outside click event
        recentlyDeleted.classList.toggle("open");
        console.log("Trash menu toggled:", recentlyDeleted.classList.contains("open"));
    });

    // Click outside to close menu
    document.addEventListener("click", (event) => {
        if (!recentlyDeleted.contains(event.target) && !openTrashBtn.contains(event.target)) {
            recentlyDeleted.classList.remove("open");
            clearTrashBtn.classList.remove("active");
            console.log("Clicked outside, closing menu.");
        }
    });

    // Prevent clicks inside the menu from closing it
    recentlyDeleted.addEventListener("click", (event) => {
        event.stopPropagation(); // Stops the click from bubbling up
    });

    let isConfirming = false; // Track if we're waiting for confirmation
    let confirmTimeout; // Store timeout ID for reset

    clearTrashBtn.addEventListener("click", () => {
        if (!isConfirming && deletedRecipes.length !== 0) {
            isConfirming = true;
            clearTrashBtn.classList.add("active");
            clearTrashIcon.classList.remove("hidden");

            // Reset confirmation after timeout
            confirmTimeout = setTimeout(() => {
                isConfirming = false;
                clearTrashBtn.classList.remove("active");
                clearTrashIcon.classList.add("hidden");
            }, 2500);
        } else {
            // ✅ Permanently delete all recently deleted recipes
            deletedRecipes = [];
            saveDeletedRecipes();
            renderDeletedRecipes();

            isConfirming = false;
            clearTrashBtn.classList.remove("active");
            clearTrashIcon.classList.add("hidden");
        }
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
            recipeData.recipes.push(deletedRecipes[index]);
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
    renderDeletedRecipes();

    // Initial Render
    updateCategoryFilter();
    renderRecipes();
});