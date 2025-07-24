// Global array to store subrecipes during modal editing
let activeSubrecipes = [];
// Generate unique IDs for recipes and subrecipes
function generateRecipeId() {
    return 'r_' + Math.random().toString(36).slice(2, 12) + '_' + Date.now();
}
/**
 * Add or update a sub-recipe in activeSubrecipes.
 * If idx is a number, replaces at that index; otherwise pushes a new entry.
 */
function setSubrecipe(idx, subrecipe) {
  if (typeof idx === 'number') {
    activeSubrecipes[idx] = subrecipe;
  } else {
    activeSubrecipes.push(subrecipe);
  }
  renderSubrecipesPreview();
}

/**
 * Remove a sub-recipe by index and re-render.
 */
function removeSubrecipe(idx) {
  activeSubrecipes.splice(idx, 1);
  renderSubrecipesPreview();
}
let subrecipeEditorTemplate;


// Open the editor for an existing sub-recipe
function openSubrecipeEditor(idx) {
    console.log("🛠️ openSubrecipeEditor called with idx:", idx, "activeSubrecipes:", activeSubrecipes);
    const modal = document.getElementById("recipe-modal");
    console.log("🛠️ modal element:", modal);
    const clone = subrecipeEditorTemplate.cloneNode(true);
    console.log("🛠️ clone created:", clone);
    if (modal.querySelector(`#subrecipe-edit-${idx}`)) return; // prevent duplicates
    clone.id = `subrecipe-edit-${idx}`;
    clone.classList.add("subrecipe-modal-card");
    // Update header
    const title = activeSubrecipes[idx].title;
    clone.querySelector("#recipe-modal-title").textContent = `Edit: ${title}`;
    // Prefill inputs
    clone.querySelector("#recipe-title").value = title;
    clone.querySelector("#recipe-category").value = activeSubrecipes[idx].category;

    // Define lists before wiring and using
    const ingList = clone.querySelector("#recipe-ingredients-list");
    const instList = clone.querySelector("#recipe-instructions-list");

    // Populate lists
    ingList.innerHTML = "";
    (activeSubrecipes[idx].ingredients || []).forEach(i => {
        const li = document.createElement("li");
        li.textContent = i;
        li.style.listStyleType = "circle";
        li.addEventListener("click", () => {
            li.contentEditable = "true";
            li.focus();
        });
        li.addEventListener("blur", () => {
            li.contentEditable = "false";
        });
        ingList.appendChild(li);
    });
    instList.innerHTML = "";
    (activeSubrecipes[idx].instructions || []).forEach(i => {
        const li = document.createElement("li");
        li.textContent = i;
        li.style.listStyleType = "circle";
        li.addEventListener("click", () => {
            li.contentEditable = "true";
            li.focus();
        });
        li.addEventListener("blur", () => {
            li.contentEditable = "false";
        });
        instList.appendChild(li);
    });
    // Wire add-item buttons (clone and replace to avoid stale event bindings)
    const ingBtn = clone.querySelector("#add-recipe-ingredient");
    const instBtn = clone.querySelector("#add-recipe-instruction");
    const ingInput = clone.querySelector("#recipe-ingredient-input");
    const instInput = clone.querySelector("#recipe-instruction-input");

    if (ingBtn && ingInput) {
        const newIngBtn = ingBtn.cloneNode(true);
        ingBtn.replaceWith(newIngBtn);
        newIngBtn.addEventListener("click", () => addSimpleItem(ingInput, ingList));
    }

    if (instBtn && instInput) {
        const newInstBtn = instBtn.cloneNode(true);
        instBtn.replaceWith(newInstBtn);
        newInstBtn.addEventListener("click", () => addSimpleItem(instInput, instList));
    }
    // Override Save (replace button and wire fresh listener)
    let oldSave = clone.querySelector("#save-recipe");
    let newSave = oldSave.cloneNode(true);
    oldSave.replaceWith(newSave);
    newSave.addEventListener("click", () => {
        console.log("🛠️ saving subrecipe idx:", idx);
        setSubrecipe(idx, {
            title: clone.querySelector("#recipe-title").value.trim(),
            category: clone.querySelector("#recipe-category").value.trim(),
            ingredients: extractListItems(ingList),
            instructions: extractListItems(instList)
        });
        clone.remove();
    });
    // Override Delete button (replace cancel) for subrecipe editing
    {
        const oldCancelBtn = clone.querySelector("#cancel-recipe");
        const deleteBtn = oldCancelBtn.cloneNode(true);
        deleteBtn.id = "delete-subrecipe-btn";
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "Remove";
        oldCancelBtn.replaceWith(deleteBtn);
        deleteBtn.addEventListener("click", () => {
            console.log("🛠️ delete subrecipe idx:", idx);
            removeSubrecipe(idx);
            clone.remove();
        });
    }
    // Override Close (X button) to only close the editor modal
    {
        const oldCloseBtn = clone.querySelector("#close-recipe-modal");
        const newCloseBtn = oldCloseBtn.cloneNode(true);
        oldCloseBtn.replaceWith(newCloseBtn);
        newCloseBtn.addEventListener("click", () => {
            console.log("🛠️ close editor for subrecipe idx:", idx);
            clone.remove();
        });
    }
    // Append after all listeners are wired
    modal.appendChild(clone);
    makeDraggable(clone);
}

/**
 * Renders the current list of subrecipes under the main recipe instruction list.
 */
function renderSubrecipesPreview() {
  console.log("🛠️ renderSubrecipesPreview(), activeSubrecipes:", activeSubrecipes);
  const list = document.getElementById("recipe-instructions-list");
  if (!list) return;
  // Remove any old sub-recipe lines
  list.querySelectorAll("li.subrecipe-li").forEach(li => li.remove());
  // Inject exactly one <li> per sub-recipe, styled just like a normal instruction
  activeSubrecipes.forEach((sub, idx) => {
    const li = document.createElement("li");
    li.classList.add("subrecipe-li");
    li.dataset.idx = idx;
    li.innerHTML = `Make: <span class="clickable-title">${sub.title}</span>`;
    list.appendChild(li);
  });
}

// Add a simple item to a list (no subheading, just <li>), remove on click
function addSimpleItem(inputEl, listEl) {
    const value = inputEl.value.trim();
    if (!value) return;
    const itemEl = document.createElement("li");
    itemEl.textContent = value;
    itemEl.style.listStyleType = "circle";
    itemEl.addEventListener("click", () => {
        itemEl.contentEditable = "true";
        itemEl.focus();
    });
    itemEl.addEventListener("blur", () => {
        itemEl.contentEditable = "false";
    });
    // Append to the UL inside the container, if it exists, otherwise to the container itself
    const parentList = listEl.tagName === "UL" ? listEl : listEl.querySelector("ul");
    if (parentList) {
        parentList.appendChild(itemEl);
    } else {
        listEl.appendChild(itemEl);
    }
    inputEl.value = "";
}

// Extracts an array of textContent values from each <li> in the list
function extractListItems(listEl) {
    return [...listEl.querySelectorAll("li")].map(li => li.textContent.trim());
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("🟢 DOMContentLoaded: script initialized");
    const modal = document.getElementById("recipe-modal");
    subrecipeEditorTemplate = modal.querySelector(".edit-recipe-card");
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
            // Try fallback to flat ingredients array
            if (Array.isArray(sections?.ingredients)) {
                return `
                    <ul>${sections.ingredients.map(item => `<li>${item}</li>`).join("")}</ul>
                `;
            }
            console.error("❌ renderRecipeSection() expected an array but got:", sections);
            return "";
        }

        return sections.map(({ subheading, items }) => `
            ${subheading ? `<p class="subheading"><strong>${subheading}</strong></p>` : ""}
            <ul>${items.map(item => `<li>${item}</li>`).join("")}</ul>
        `).join("");
    }

    // Render all recipes, including subrecipes as first-class items
    function renderRecipes() {
        console.log("🔄 Rendering recipes...");
        // Collect all recipes, including subrecipes as first-class
        const allRecipes = [];
        const recipeMap = {};
        recipeData.recipes.forEach(r => {
            allRecipes.push(r);
            recipeMap[r.id] = r;
        });
        // Add subrecipes as top-level recipes if not already present
        recipeData.recipes.forEach(r => {
            if (r.subrecipeIds && Array.isArray(r.subrecipeIds)) {
                r.subrecipeIds.forEach(subId => {
                    const sub = recipeMap[subId];
                    if (sub && !allRecipes.includes(sub)) {
                        allRecipes.push(sub);
                    }
                });
            }
        });
        // Apply search and category filters
        const query = searchInput.value.trim().toLowerCase();
        const selectedCategory = categoryFilter.value;
        const recipesToRender = allRecipes.filter(recipe => {
            if (selectedCategory && selectedCategory !== "all" && recipe.category !== selectedCategory) {
                return false;
            }
            if (query && !recipe.title.toLowerCase().includes(query) && !recipe.category.toLowerCase().includes(query)) {
                return false;
            }
            return true;
        });
        recipeListEl.innerHTML = "";
        recipesToRender.forEach((recipe, index) => {
            const recipeCard = document.createElement("div");
            recipeCard.classList.add("recipe-card");
            recipeCard.dataset.index = index;
            recipeCard.innerHTML = `
            <div class="render-title">
                <h3>${recipe.title}</h3>
                <p>${recipe.category}</p>
            </div>
            <p id="ingredients-title"><b>Ingredients:</b></p>
            <div class="ingredients-container">
              ${renderRecipeSection(recipe.sections || [
                { subheading: "", items: recipe.ingredients || [] }
              ])}
            </div>
            <button class="edit-btn">
                <span class="material-symbols-outlined">edit</span> Edit
            </button>
            <button class="delete-btn">
                <span class="material-symbols-outlined">delete</span> Delete
            </button>
            `;
            recipeListEl.appendChild(recipeCard);
        });
        console.log("✅ Updated Recipe List:", allRecipes);
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
        addSimpleItem(
            document.getElementById("recipe-ingredient-input"),
            recipeIngredientsList
        )
    );

    addRecipeInstructionBtn.addEventListener("click", () =>
        addSimpleItem(
            document.getElementById("recipe-instruction-input"),
            recipeInstructionsList
        )
    );

    function updateCategoryFilter() {
        const categories = ["all", ...new Set(recipeData.recipes.map(r => r.category))];
        categoryFilter.innerHTML = categories
            .map(cat => `<option value="${cat}">${cat}</option>`)
            .join("");
    }


    // Open Modal (Handles both New and Edit)
    function openRecipeModal(index = null) {
        editIndex = index;
        // Reset subrecipes for new or edit
        activeSubrecipes = [];

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

            // Patch: Ensure recipe.sections is always an array for editing, and its first element has an items array
            if (
                !Array.isArray(recipe.sections) ||
                !Array.isArray(recipe.sections[0]?.items)
            ) {
                recipe.sections = [
                    { subheading: "", items: Array.isArray(recipe.ingredients) ? recipe.ingredients : [] }
                ];
            }

            // Patch: Ensure recipe.instructions is always an array for editing, and its first element has an items array
            if (
                !Array.isArray(recipe.instructions) ||
                !Array.isArray(recipe.instructions[0]?.items)
            ) {
                recipe.instructions = [
                    { subheading: "", items: Array.isArray(recipe.instructions) ? recipe.instructions : [] }
                ];
            }

            recipeTitleEl.value = recipe.title;
            recipeCategoryEl.value = recipe.category;
            // Populate ingredients list manually for consistent styling
            recipeIngredientsList.innerHTML = "";
            (recipe.sections?.[0]?.items || []).forEach(i => {
                const li = document.createElement("li");
                li.textContent = i;
                li.style.listStyleType = "circle";
                li.addEventListener("click", () => {
                    li.contentEditable = "true";
                    li.focus();
                });
                li.addEventListener("blur", () => {
                    li.contentEditable = "false";
                });
                recipeIngredientsList.appendChild(li);
            });

            // Populate instructions list manually for consistent styling, skipping sub-recipe placeholders
            recipeInstructionsList.innerHTML = "";
            (recipe.instructions?.[0]?.items || []).forEach(i => {
                // Skip sub-recipe placeholders when rendering normal instructions
                if (/^Make:\s*/.test(i)) return;
                const li = document.createElement("li");
                li.textContent = i;
                li.style.listStyleType = "circle";
                li.addEventListener("click", () => {
                    li.contentEditable = "true";
                    li.focus();
                });
                li.addEventListener("blur", () => {
                    li.contentEditable = "false";
                });
                recipeInstructionsList.appendChild(li);
            });
            // If editing, load linked sub-recipes by ID
            if (Array.isArray(recipe.subrecipeIds)) {
                activeSubrecipes = recipe.subrecipeIds
                    .map(id => recipeData.recipes.find(r => r.id === id))
                    .filter(r => r);
            } else {
                activeSubrecipes = [];
            }
            // Render sub-recipes preview under instructions list
            renderSubrecipesPreview();
        }

        // Removed: manual sub-recipe toggle click handlers (now handled by event delegation)

        recipeModal.classList.remove("hidden");
    }

    // Helper function to render the edit list with subheadings
    function renderEditList(sections) {
        return sections
            .filter(({ items }) => Array.isArray(items) && items.length > 0)
            .map(({ subheading, items }) => `
            <div class="subheading-container" data-subheading="${subheading}">
                ${subheading ? `<p class="subheading"><strong>${subheading}</strong></p><br>` : ""}
                <ul>${items.map(item => `<li>${item}</li>`).join("")}</ul>
            </div>
        `).join("");
    }

    function closeRecipeModal() {
        recipeModal.classList.add("hidden");
    }

    // Save a recipe and its subrecipes as first-class recipes with linking
    function saveRecipe() {
        // Assign IDs to subrecipes if missing, and collect their IDs
        const subrecipesWithIds = activeSubrecipes.map(sub => {
            if (!sub.id) sub.id = generateRecipeId();
            return sub;
        });
        const subrecipeIds = subrecipesWithIds.map(sub => sub.id);
        // Assign ID to main recipe if editing, else new
        let mainRecipe;
        if (editIndex !== null && recipeData.recipes[editIndex]) {
            mainRecipe = recipeData.recipes[editIndex];
        } else {
            mainRecipe = { id: generateRecipeId() };
        }
        // Update main recipe fields
        mainRecipe.title = recipeTitleEl.value.trim();
        mainRecipe.category = recipeCategoryEl.value.trim();
        mainRecipe.sections = [
            { subheading: "", items: extractListItems(recipeIngredientsList) || [] }
        ];
        mainRecipe.instructions = [
            { subheading: "", items: extractListItems(recipeInstructionsList) || [] }
        ];
        mainRecipe.subrecipeIds = subrecipeIds;
        // Remove subrecipes array from main recipe (now linked by id)
        delete mainRecipe.subrecipes;
        // Insert or update main recipe
        if (editIndex !== null && recipeData.recipes[editIndex]) {
            recipeData.recipes[editIndex] = mainRecipe;
        } else {
            recipeData.recipes.push(mainRecipe);
        }
        // Add or update subrecipes as first-class recipes
        subrecipesWithIds.forEach(sub => {
            const idx = recipeData.recipes.findIndex(r => r.id === sub.id);
            if (idx !== -1) {
                recipeData.recipes[idx] = sub;
            } else {
                recipeData.recipes.push(sub);
            }
        });
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
        const list = isDeleted ? deletedRecipes : recipeData.recipes;
        console.log(`Opening modal for ${isDeleted ? "deleted" : "active"} recipe at index: ${index}`);

        if (!list[index]) {
            console.error("❌ Invalid index access in view modal:", index);
            return;
        }

        const recipe = list[index];
        // Fallback logic to support both structured and unstructured recipe formats
        const sections = recipe.sections || [
          { subheading: "", items: recipe.ingredients || [] }
        ];
        // Patch: Ensure instructions always has [{ subheading, items }] shape
        const instructions = Array.isArray(recipe.instructions?.[0]?.items)
            ? recipe.instructions
            : [{ subheading: "", items: recipe.instructions || [] }];

        let modal = document.getElementById("view-recipe-modal");
        // Clear modal
        modal.innerHTML = "";

        // Create modal-wrapper container
        let wrapper = document.createElement("div");
        wrapper.className = "modal-wrapper";

        // Create modal-main
        let modalMain = document.createElement("div");
        modalMain.className = "modal-main";
        modalMain.innerHTML = `
          <div class="view-recipe-card">
            <h2 id="view-title"></h2>
            <p id="view-category"></p>
            <h3>Ingredients</h3>
            <div id="view-ingredients-list"></div>
            <h3>Instructions</h3>
            <div id="view-instructions-list"></div>
            <button id="close-view-recipe" class="close-btn">&times;</button>
          </div>
        `;
        wrapper.appendChild(modalMain);
        wrapper.appendChild(document.createElement("div")).id = "view-subrecipes";
        modal.appendChild(wrapper);

        // Set modal content
        modalMain.querySelector("#view-title").textContent = recipe.title;
        modalMain.querySelector("#view-category").textContent = recipe.category;
        modalMain.querySelector("#view-ingredients-list").innerHTML = renderViewList(sections);
        modalMain.querySelector("#view-instructions-list").innerHTML = renderViewList(instructions);

        // Enable dragging for all view cards
        const cards = wrapper.querySelectorAll('.view-recipe-card');
        cards.forEach(card => makeDraggable(card));

        // --- Subrecipe view logic ---
        const viewList = modalMain.querySelector("#view-instructions-list");
        Array.from(viewList.querySelectorAll("li")).forEach((li, idx) => {
            const text = li.textContent.trim();
            if (text.startsWith("Make:")) {
                const title = text.replace(/^Make:\s*/, "");
                li.innerHTML = `Make: <span class="clickable-title">${title}</span>`;
                li.style.cursor = "pointer";
                li.addEventListener("click", () => {
                    const subId = recipe.subrecipeIds?.[idx];
                    if (!subId) return;
                    const sub = recipeData.recipes.find(r => r.id === subId);
                    if (!sub) return;
                    const subList = document.getElementById("view-subrecipes");
                    // Toggle: remove if already shown
                    const existing = subList.querySelector(`#subrecipe-card-${sub.id}`);
                    if (existing) {
                        existing.remove();
                        return;
                    }
                    // Create and append sub-recipe card
                    const subCard = document.createElement("div");
                    subCard.className = "view-recipe-card";
                    subCard.id = `subrecipe-card-${sub.id}`;
                    subCard.innerHTML = `
                        <h2>${sub.title}</h2>
                        <p>${sub.category || ""}</p>
                        <h3>Ingredients</h3>
                        <div>${renderViewList(sub.sections || [{ subheading: "", items: sub.ingredients || [] }])}</div>
                        <h3>Instructions</h3>
                        <div>${renderViewList(sub.instructions || [{ subheading: "", items: sub.instructions || [] }])}</div>
                        <button class="close-btn" onclick="this.parentElement.remove()">×</button>
                    `;
                    subList.appendChild(subCard);
                    makeDraggable(subCard);
                });
            }
        });

        // Wire up close button in modal-main
        modalMain.querySelector("#close-view-recipe").addEventListener("click", () => {
            modal.classList.add("hidden");
        });

        modal.classList.remove("hidden");
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

        const index = Number(card.dataset.index);

        if (e.target.closest(".edit-btn")) {
            openRecipeModal(index);
        } else if (e.target.closest(".delete-btn")) {
            deleteRecipe(index); // ✅ Make sure the correct index is passed
        } else {
            openViewRecipeModal(index);
        }
    });

    // The close button is now dynamically created inside modal-main in openViewRecipeModal.

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

    // Subrecipe modal logic (clone inner card to flex container)
    const subBtn = document.getElementById("add-sub-recipe-btn");
    console.log("🔍 add-sub-recipe-btn element:", subBtn);
    if (subBtn) {
        subBtn.addEventListener("click", () => {
            const modal = document.getElementById("recipe-modal");
            if (!modal) return;
            console.log("🔥 add-sub-recipe-btn clicked");
            const cloneCard = subrecipeEditorTemplate.cloneNode(true);
            if (!cloneCard) return;
            cloneCard.id = "subrecipe-card-" + Date.now();
            cloneCard.classList.add("subrecipe-modal-card");
            // Update header
            const header = cloneCard.querySelector("#recipe-modal-title");
            if (header) header.textContent = "Add Sub-Recipe";
            // Clear inputs and lists in clone
            [
              "#recipe-title",
              "#recipe-category",
              "#recipe-ingredient-input",
              "#recipe-instruction-input"
            ].forEach(sel => {
              const el = cloneCard.querySelector(sel);
              if (el) el.value = "";
            });
            const ingList = cloneCard.querySelector("#recipe-ingredients-list");
            const instList = cloneCard.querySelector("#recipe-instructions-list");
            if (ingList) ingList.innerHTML = "";
            if (instList) instList.innerHTML = "";
            // Wire up add-item buttons inside cloned card
            const ingBtn = cloneCard.querySelector("#add-recipe-ingredient");
            const instBtn = cloneCard.querySelector("#add-recipe-instruction");
            const ingInput = cloneCard.querySelector("#recipe-ingredient-input");
            const instInput = cloneCard.querySelector("#recipe-instruction-input");
            if (ingBtn && ingInput && ingList) {
              ingBtn.addEventListener("click", () => addSimpleItem(ingInput, ingList));
            }
            if (instBtn && instInput && instList) {
              instBtn.addEventListener("click", () => addSimpleItem(instInput, instList));
            }
            // Override save/cancel for this sub-card
            const saveBtn = cloneCard.querySelector("#save-recipe");
            const deleteBtn = cloneCard.querySelector("#cancel-recipe");
            if (saveBtn) {
              const newSave = saveBtn.cloneNode(true);
              saveBtn.parentNode.replaceChild(newSave, saveBtn);
              // REFACTORED: Use shared preview renderer and no manual li/event wiring here
              newSave.addEventListener("click", () => {
                  const title = cloneCard.querySelector("#recipe-title")?.value.trim() || "";
                  const category = cloneCard.querySelector("#recipe-category")?.value.trim() || "";
                  const ingredients = extractListItems(cloneCard.querySelector("#recipe-ingredients-list")) || [];
                  const instructions = extractListItems(cloneCard.querySelector("#recipe-instructions-list")) || [];
                  if (title) {
                      setSubrecipe(undefined, { title, category, ingredients, instructions });
                  }
                  cloneCard.remove();
              });
            }
            // --- PATCH: Replace deleteBtn logic to ensure correct labeling and full removal from activeSubrecipes ---
            const cancelBtn = cloneCard.querySelector("#cancel-recipe");
            if (cancelBtn) {
                const deleteBtn = cancelBtn.cloneNode(true);
                deleteBtn.id = "delete-subrecipe-btn";
                deleteBtn.className = "delete-btn";
                deleteBtn.textContent = "Remove";
                cancelBtn.replaceWith(deleteBtn);
                deleteBtn.addEventListener("click", () => {
                    const title = cloneCard.querySelector("#recipe-title")?.value.trim();
                    const category = cloneCard.querySelector("#recipe-category")?.value.trim();
                    const ingredients = extractListItems(cloneCard.querySelector("#recipe-ingredients-list"));
                    const instructions = extractListItems(cloneCard.querySelector("#recipe-instructions-list"));
                    const idx = activeSubrecipes.findIndex(sub =>
                        sub.title === title &&
                        sub.category === category &&
                        JSON.stringify(sub.ingredients) === JSON.stringify(ingredients) &&
                        JSON.stringify(sub.instructions) === JSON.stringify(instructions)
                    );
                    if (idx !== -1) {
                        removeSubrecipe(idx);
                    }
                    cloneCard.remove();
                });
            }
            // Toggle logic: remove existing card with same id, or add
            const existing = modal.querySelector(`#${cloneCard.id}`);
            if (existing) {
                // Extract and save subrecipe data if title is present before removing
                const title = existing.querySelector("#recipe-title")?.value.trim() || "";
                const category = existing.querySelector("#recipe-category")?.value.trim() || "";
                const ingredients = extractListItems(existing.querySelector("#recipe-ingredients-list")) || [];
                const instructions = extractListItems(existing.querySelector("#recipe-instructions-list")) || [];
                if (title) {
                    setSubrecipe(undefined, { title, category, ingredients, instructions });
                }
                existing.remove();
                return;
            }
    // Append cloned card to modal flex container
    modal.appendChild(cloneCard);
    makeDraggable(cloneCard);
        });
    }

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

    // Centralized toggle logic for sub-recipe items in edit mode (capture phase)
    const instructionsList = document.getElementById("recipe-instructions-list");
    if (instructionsList) {
      instructionsList.addEventListener('click', (event) => {
        const li = event.target.closest('li.subrecipe-li');
        if (!li) return;
        const idx = Number(li.dataset.idx);
        if (isNaN(idx)) return;
        const modal = document.getElementById("recipe-modal");
        const existing = modal.querySelector(`#subrecipe-edit-${idx}`);
        if (existing) {
          // Save edits before closing
          const clone = existing;
          const title = clone.querySelector("#recipe-title")?.value.trim() || "";
          const category = clone.querySelector("#recipe-category")?.value.trim() || "";
          const ingredients = extractListItems(clone.querySelector("#recipe-ingredients-list")) || [];
          const instructions = extractListItems(clone.querySelector("#recipe-instructions-list")) || [];
          if (title) {
            activeSubrecipes[idx] = { title, category, ingredients, instructions };
            renderSubrecipesPreview();
          }
          existing.remove();
        } else {
          // Inline edit: open a sub-recipe editor card for this linked recipe
          const sub = activeSubrecipes[idx];
          if (sub && sub.id) {
            openSubrecipeEditor(idx);
            return;
          }
          // Fallback: inline edit of a new sub-recipe draft
          openSubrecipeEditor(idx);
        }
      }, true);
    }
});

// --- Add CSS for subrecipe card and modal side-by-side layout ---
// This block injects styles only once
// Helper to make elements draggable
function makeDraggable(el) {
    el.style.position = 'absolute';
    let isDragging = false;
    let offsetX = 0, offsetY = 0;
    el.addEventListener('mousedown', e => {
        isDragging = true;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
        el.style.cursor = 'move';
        el.style.zIndex = '1000';
    });
    document.addEventListener('mousemove', e => {
        if (!isDragging) return;
        el.style.left = (e.clientX - offsetX) + 'px';
        el.style.top = (e.clientY - offsetY) + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            el.style.cursor = '';
            el.style.zIndex = '';
        }
    });
}

if (!document.getElementById("subrecipe-card-style")) {
    const style = document.createElement("style");
    style.id = "subrecipe-card-style";
    style.textContent = `
#view-recipe-modal .modal-wrapper {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 32px;
}
#view-subrecipes {
    flex: 1;
    padding: 24px 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 32px;
    justify-items: center;
}
.subrecipe-card {
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    padding: 20px 24px;
    margin: 40px auto 0 auto;
    font-size: 1rem;
    max-width: 600px;
    width: 100%;
    opacity: 0;
    transform: translateX(0);
    transition: opacity 0.3s ease, transform 0.3s ease;
}
.subrecipe-card.show {
    opacity: 1;
    transform: translateX(40px);
}
.subrecipe-card h4 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 1.2em;
}
.subrecipe-card ul {
    padding-left: 20px;
    margin-bottom: 16px;
}
.subrecipe-card p {
    margin-bottom: 6px;
}
.subrecipe-back-arrow {
    color: #888;
    margin-right: 6px;
    cursor: pointer;
    font-weight: 700;
    transition: color 0.15s;
}
.subrecipe-back-arrow:hover {
    color: #333;
}
/* Consistent indent for edit modal lists */
.edit-recipe-card #recipe-ingredients-list,
.edit-recipe-card #recipe-instructions-list {
    padding-left: 30px;
    margin-left: 0;
    list-style-position: outside;
}
.edit-recipe-card ul {
    margin: 0 0 16px 40px !important;
}
/* Ensure sub-recipe ingredients don't overlap */
.recipe-card .ingredients-container {
    overflow: visible;
}
.recipe-card .subrecipe-ingredients {
    margin-top: 4px;
    clear: both;
}
.recipe-card .subrecipe-ingredients .subheading {
    margin-bottom: 4px;
}
/* Reduce gap below main Ingredients title */
.recipe-card #ingredients-title {
    margin-bottom: 4px;
}
/* Thumbnail view ingredient lists consistency */
.recipe-card .ingredients-container ul,
.recipe-card .subrecipe-ingredients ul {
    list-style-type: disc;
    margin: 4px 0 0 20px;
    padding-left: 0;
}
/* Add space under main Ingredients heading */
.recipe-card #ingredients-title {
    margin-bottom: 8px !important;
}
/* Add space under Sub-Recipe heading */
.recipe-card .subrecipe-ingredients .subheading {
    margin-bottom: 8px !important;
}
/* Space above thumbnail card buttons */
.recipe-card .edit-btn,
.recipe-card .delete-btn {
    margin-top: 16px;
}
/* Clickable style for subrecipe titles (edit and view) */
.clickable-title {
    background-color: #f0f0f0;
    color: #333;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    text-decoration: none;
    font-weight: 500;
}
.clickable-title:hover {
    background-color: #e0e0e0;
}
`;
    document.head.appendChild(style);
}