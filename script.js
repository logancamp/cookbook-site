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
        localStorage.setItem("recipeData", JSON.stringify(recipeData));
    }

    function saveDeletedRecipes() {
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
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categoryFilter.value.toLowerCase();

        recipeListEl.innerHTML = ""; // Clear list before rendering

        recipeData.recipes
            .filter(recipe =>
                (selectedCategory === "all" || recipe.category.toLowerCase() === selectedCategory) &&
                (recipe.title.toLowerCase().includes(searchTerm) ||
                    recipe.sections.some(section => section.items.some(item => item.toLowerCase().includes(searchTerm))))
            )
            .forEach((recipe, index) => {
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

                // Add event listeners for edit and delete
                recipeCard.querySelector(".edit-btn").addEventListener("click", () => openEditModal(index));
                recipeCard.querySelector(".delete-btn").addEventListener("click", () => deleteRecipe(index));

                recipeListEl.appendChild(recipeCard);
            });

        console.log("✅ Rendered Recipes:", recipeData.recipes);
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

    function addItemWithSubheading(inputEl, subheadingEl, listEl) {
        const value = inputEl.value.trim();
        const subheading = subheadingEl.value.trim();

        if (!value) return; // Don't add empty values

        // Find or create a section for the subheading
        let section = [...listEl.children].find(div =>
            div.dataset.subheading === subheading && subheading !== ""
        );

        if (!section && subheading) {
            console.log(`Adding new subheading: ${subheading}`);

            section = document.createElement("div");
            section.dataset.subheading = subheading;
            section.classList.add("subheading-container");

            section.innerHTML = `
            <p class="subheading"><strong>${subheading}</strong></p>
            <ul></ul>
        `;

            listEl.appendChild(section);
        }

        // Use the section's list or the main list if no subheading
        const targetList = section ? section.querySelector("ul") : listEl;

        const itemEl = document.createElement("li");
        itemEl.textContent = value;
        itemEl.addEventListener("click", () => {
            itemEl.remove();
            updateRecipeData();
        });

        targetList.appendChild(itemEl);
        inputEl.value = ""; // Clear input after adding
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

    addNewIngredientBtn.addEventListener("click", () =>
        addItemWithSubheading(newIngredientInput, document.getElementById("new-ingredient-subheading"), newIngredientsList)
    );
    addNewInstructionBtn.addEventListener("click", () =>
        addItemWithSubheading(newInstructionInput, document.getElementById("new-instruction-subheading"), newInstructionsList)
    );

    addEditIngredientBtn.addEventListener("click", () =>
        addItemWithSubheading(editIngredientInput, document.getElementById("edit-ingredient-subheading"), editIngredientsList)
    );
    addEditInstructionBtn.addEventListener("click", () =>
        addItemWithSubheading(editInstructionInput, document.getElementById("edit-instruction-subheading"), editInstructionsList)
    );

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
        const categories = ["all", ...new Set(recipeData.recipes.map(r => r.category))];
        categoryFilter.innerHTML = categories
            .map(cat => `<option value="${cat}">${cat}</option>`)
            .join("");
    }

    function extractSubheadingData(listEl, fallbackData = []) {
        let sections = fallbackData.length ? [...fallbackData] : [];

        [...listEl.children].forEach(section => {
            console.log("🔍 Section HTML:", section.innerHTML);

            let subheading = "Untitled";
            let subheadingEl = section.querySelector(".subheading strong") || section.querySelector("strong");

            if (subheadingEl) {
                subheading = subheadingEl.textContent.trim();
            }

            console.log("🔵 Extracted Subheading:", subheading);

            const items = [...section.querySelectorAll("ul li")].map(li => li.textContent.trim());

            let existingSection = sections.find(s => s.subheading.toLowerCase() === subheading.toLowerCase());

            if (!items.length && !existingSection) {
                console.warn(`⚠️ Skipping empty section: ${subheading}`);
                return;
            }

            if (existingSection) {
                existingSection.items = [...new Set([...existingSection.items, ...items])];
            } else {
                sections.push({ subheading, items });
            }
        });

        if (sections.length === 0 && fallbackData.length > 0) {
            console.warn("⚠️ No sections found in UI, keeping fallback data.");
            return fallbackData;
        }

        console.log("✅ Extracted Sections (Corrected):", sections);
        return sections;
    }

    function saveNewRecipe() {
        const newRecipe = {
            title: newTitleEl.value.trim(),
            category: newCategoryEl.value.trim(),
            sections: extractSubheadingData(newIngredientsList),
            instructions: extractSubheadingData(newInstructionsList)
        };

        recipeData.recipes.push(newRecipe);
        saveRecipes();
        renderRecipes();
        closeNewRecipeModal();
    }

    function openEditModal(index) {
        editIndex = index;
        const recipe = recipeData.recipes[index];

        if (!recipe) {
            console.error("❌ Error: No recipe found at index", index);
            return;
        }

        console.log("🛠 Opening edit modal for:", recipe.title);

        editTitleEl.value = recipe.title;
        editCategoryEl.value = recipe.category;

        // ✅ Ensure ingredients and instructions exist
        const ingredientsList = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
        const instructionsList = Array.isArray(recipe.instructions) ? recipe.instructions : [];

        editIngredientsList.innerHTML = renderEditList(ingredientsList);
        editInstructionsList.innerHTML = renderEditList(instructionsList);

        editModal.classList.remove("hidden");
    }

    // Helper function to render the edit list with subheadings
    function renderEditList(sections) {
        if (!Array.isArray(sections)) {
            console.error("❌ renderEditList() expected an array but got:", sections);
            sections = []; // ✅ Fallback to an empty array
        }

        return sections.map(({ subheading, items }) => `
        ${subheading ? `<p class="subheading"><strong>${subheading}</strong></p>` : ""}
        <ul>${items.map(item => `<li>${item}</li>`).join("")}</ul>
    `).join("");
    }

    function closeEditModal() {
        editModal.classList.add("hidden");
    }

    function saveEdit() {
        if (editIndex !== null && recipeData.recipes[editIndex]) {
            console.log("Editing recipe at index:", editIndex);

            const editedRecipe = {
                title: editTitleEl.value.trim(),
                category: editCategoryEl.value.trim(),
                sections: extractSubheadingData(editIngredientsList, recipeData.recipes[editIndex].sections),
                instructions: extractSubheadingData(editInstructionsList, recipeData.recipes[editIndex].instructions),
            };

            console.log("🟡 Extracted Sections Before Merge:", editedRecipe.sections);

            recipeData.recipes[editIndex].sections = mergeSubheadingUpdates(recipeData.recipes[editIndex].sections, editedRecipe.sections);
            recipeData.recipes[editIndex].instructions = mergeSubheadingUpdates(recipeData.recipes[editIndex].instructions, editedRecipe.instructions);

            console.log("✅ Final Sections After Merge (Corrected):", recipeData.recipes[editIndex].sections);

            saveRecipes();
            renderRecipes();
            closeEditModal();
        } else {
            console.error("❌ Error: editIndex is null or recipe does not exist.");
        }
    }

    function mergeSubheadingUpdates(originalSections, newSections) {
        if (!originalSections || !Array.isArray(originalSections)) {
            console.warn("⚠️ Original sections were undefined, using new sections.");
            return newSections;
        }

        let mergedSections = [...originalSections];

        newSections.forEach(newSection => {
            let existingSection = mergedSections.find(s => s.subheading.toLowerCase() === newSection.subheading.toLowerCase());

            if (existingSection) {
                existingSection.items = [...new Set([...existingSection.items, ...newSection.items])];
            } else {
                mergedSections.push(newSection);
            }
        });

        console.log("✅ Merged Sections:", mergedSections);
        return mergedSections;
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
            console.error("Invalid index access in view modal:", index);
            return;
        }

        const recipe = list[index];

        document.getElementById("view-title").textContent = recipe.title;
        document.getElementById("view-category").textContent = recipe.category;
        document.getElementById("view-ingredients-list").innerHTML = renderViewList(recipe.ingredients);
        document.getElementById("view-instructions-list").innerHTML = renderViewList(recipe.instructions);

        document.getElementById("view-recipe-modal").classList.remove("hidden");
    }

    // Helper function to render view list with subheadings
    function renderViewList(sections) {
        return sections.map(({ subheading, items }) => `
        <p class="subheading"><strong>${subheading}</strong></p>
        <ul>${items.map(item => `<li>${item}</li>`).join("")}</ul>
    `).join("");
    }

    function deleteRecipe(index) {
        console.log(`Deleting index: ${index}, Recipe title: ${recipeData.recipes[index]?.title}`);

        let deletedRecipe = { ...recipeData.recipes[index], deletedAt: Date.now() };
        deletedRecipes.push(deletedRecipe);
        recipeData.recipes.splice(index, 1);

        saveDeletedRecipes();
        saveRecipes();

        console.log("Updated recipes after deletion:", recipeData.recipes.map(r => r.title));

        renderRecipes(); // Force full re-render
        renderDeletedRecipes(); // Ensure deleted recipes update
    }

    // Event Delegation for Edit & Delete
    recipeListEl.addEventListener("click", (e) => {
        const card = e.target.closest(".recipe-card");
        if (!card) return;

        const index = [...recipeListEl.children].indexOf(card);
        console.log(`Clicked card index: ${index}, Title: ${recipeData.recipes[index]?.title}`);

        if (e.target.closest(".edit-btn")) {
            openEditModal(index);
        } else if (e.target.closest(".delete-btn")) {
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
            // First click: Start confirmation mode
            isConfirming = true;
            clearTrashBtn.classList.add("active");
            clearTrashIcon.classList.remove("hidden");

            // Set a timeout to reset confirmation if second click doesn’t happen
            confirmTimeout = setTimeout(() => {
                isConfirming = false;
                clearTrashBtn.classList.remove("active");
                clearTrashIcon.classList.add("hidden");
            }, 2500); // Reset after 2.5s (matches CSS transition)

        } else {
            // Second click: Confirm and delete all
            clearTimeout(confirmTimeout); // Prevent timeout from resetting it
            deletedRecipes = [];
            saveDeletedRecipes();
            renderDeletedRecipes();

            // Reset everything
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

    removeOldRecipes();
    renderDeletedRecipes();

    // Initial Render
    updateCategoryFilter();
    renderRecipes();
});