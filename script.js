// Global array to store subrecipes during modal editing

let activeSubrecipes = [];
let subrecipeEditorTemplate;


// Open the editor for an existing sub-recipe
function openSubrecipeEditor(idx) {
    console.log("🛠️ openSubrecipeEditor called with idx:", idx, "activeSubrecipes:", activeSubrecipes);
    const modal = document.getElementById("recipe-modal");
    console.log("🛠️ modal element:", modal);
    const clone = subrecipeEditorTemplate.cloneNode(true);
    console.log("🛠️ clone created:", clone);
    clone.id = "subrecipe-edit-" + idx;
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
    activeSubrecipes[idx].ingredients.forEach(i => {
        const li = document.createElement("li");
        li.textContent = i;
        li.addEventListener("click", () => li.remove());
        ingList.appendChild(li);
    });
    instList.innerHTML = "";
    activeSubrecipes[idx].instructions.forEach(i => {
        const li = document.createElement("li");
        li.textContent = i;
        li.addEventListener("click", () => li.remove());
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
        activeSubrecipes[idx] = {
            title: clone.querySelector("#recipe-title").value.trim(),
            category: clone.querySelector("#recipe-category").value.trim(),
            ingredients: extractListItems(ingList),
            instructions: extractListItems(instList)
        };
        renderSubrecipesPreview();
        clone.remove();
    });
    // Override Cancel/Close (replace buttons and wire fresh listeners)
    ["#cancel-recipe", "#close-recipe-modal"].forEach(sel => {
        const oldBtn = clone.querySelector(sel);
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.replaceWith(newBtn);
        newBtn.addEventListener("click", () => {
            console.log("🛠️ cancel/close clicked for subrecipe idx:", idx);
            clone.remove();
        });
    });
    // Append after all listeners are wired
    modal.appendChild(clone);
}

/**
 * Renders the current list of subrecipes under the main recipe instruction list.
 */
function renderSubrecipesPreview() {
    console.log("🛠️ renderSubrecipesPreview(), activeSubrecipes:", activeSubrecipes);
    const list = document.getElementById("recipe-instructions-list");
    if (!list) return;
    // Remove existing subrecipe items
    list.querySelectorAll("li.subrecipe-li").forEach(li => li.remove());
    // Re-populate with updated subrecipes
    activeSubrecipes.forEach((sub, idx) => {
        console.log("🛠️ rendering subrecipe at idx:", idx, "title:", sub.title);
        const li = document.createElement("li");
        li.classList.add("subrecipe-li");
        li.textContent = `Sub-Recipe: ${sub.title}`;
        li.dataset.idx = idx;
        // Inline edit on double-click
        li.addEventListener("dblclick", () => {
            li.contentEditable = "true";
            li.focus();
        });
        // Save title on blur
        li.addEventListener("blur", () => {
            const text = li.textContent.trim();
            const newTitle = text.replace(/^Sub-Recipe:\s*/, "");
            activeSubrecipes[idx].title = newTitle;
            li.textContent = `Sub-Recipe: ${newTitle}`;
        });
        // Open full editor on click
        li.addEventListener("click", () => openSubrecipeEditor(idx));
        list.appendChild(li);
    });
}

// Add a simple item to a list (no subheading, just <li>), remove on click
function addSimpleItem(inputEl, listEl) {
    const value = inputEl.value.trim();
    if (!value) return;
    const itemEl = document.createElement("li");
    itemEl.textContent = value;
    itemEl.addEventListener("click", () => {
        itemEl.remove();
    });
    listEl.appendChild(itemEl);
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

            recipeTitleEl.value = recipe.title;
            recipeCategoryEl.value = recipe.category;
            recipeIngredientsList.innerHTML = renderEditList(recipe.sections || []);
            recipeInstructionsList.innerHTML = renderEditList(recipe.instructions || []);
            // If editing, load subrecipes if present
            if (recipe.subrecipes && Array.isArray(recipe.subrecipes)) {
                activeSubrecipes = recipe.subrecipes.slice();
            }
        }

        recipeModal.classList.remove("hidden");
        // Render existing subrecipes as special instruction items
        activeSubrecipes.forEach((sub, idx) => {
            const li = document.createElement("li");
            li.classList.add("subrecipe-li");
            li.textContent = `Sub-Recipe: ${sub.title}`;
            li.dataset.idx = idx;
            // Inline edit on double-click
            li.addEventListener("dblclick", () => {
                li.contentEditable = "true";
                li.focus();
            });
            // Save title on blur
            li.addEventListener("blur", () => {
                const text = li.textContent.trim();
                const newTitle = text.replace(/^Sub-Recipe:\s*/, "");
                activeSubrecipes[idx].title = newTitle;
                li.textContent = `Sub-Recipe: ${newTitle}`;
            });
            // Open full editor on click
            li.addEventListener("click", () => openSubrecipeEditor(idx));
            recipeInstructionsList.appendChild(li);
        });
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
            ingredients: extractListItems(recipeIngredientsList) || [],
            instructions: extractListItems(recipeInstructionsList) || [],
            subrecipes: activeSubrecipes.slice()
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
            const cancelBtn = cloneCard.querySelector("#cancel-recipe");
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
                      activeSubrecipes.push({ title, category, ingredients, instructions });
                      renderSubrecipesPreview();
                  }
                  cloneCard.remove();
              });
            }
            if (cancelBtn) {
              const newCancel = cancelBtn.cloneNode(true);
              cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
              newCancel.addEventListener("click", () => {
                cloneCard.remove();
              });
            }
            // Append cloned card to modal flex container
            modal.appendChild(cloneCard);
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
});