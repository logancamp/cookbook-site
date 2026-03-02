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
    const prev = activeSubrecipes[idx] || {};
    activeSubrecipes[idx] = { ...prev, ...subrecipe, id: subrecipe.id || prev.id };
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
    const modal = document.getElementById("recipe-modal");
    if (!modal || !subrecipeEditorTemplate) return;

    const current = activeSubrecipes[idx];
    if (!current) return;

    // prevent duplicates
    if (modal.querySelector(`#subrecipe-edit-${idx}`)) return;

    const store = window.CookbookStore;
    const recipeData = store?.data;
    const saveRecipes = store?.saveRecipes;

    const clone = subrecipeEditorTemplate.cloneNode(true);

    // Remove the “X” close button
    const closeBtn = clone.querySelector("#close-recipe-modal");
    if (closeBtn) closeBtn.remove();

    clone.id = `subrecipe-edit-${idx}`;
    clone.classList.add("subrecipe-modal-card");

    // Header + inputs
    clone.querySelector("#recipe-modal-title").textContent = `Edit: ${current.title || ""}`;

    const titleInput = clone.querySelector("#recipe-title");
    const catInput = clone.querySelector("#recipe-category");
    titleInput.value = current.title || "";
    catInput.value = current.category || "";

    // Lists
    const ingList = clone.querySelector("#recipe-ingredients-list");
    const instList = clone.querySelector("#recipe-instructions-list");

    // Populate ingredients
    ingList.innerHTML = "";
    (current.ingredients || []).forEach(i => {
        const li = document.createElement("li");
        li.textContent = i;
        li.style.listStyleType = "circle";
        li.addEventListener("click", () => { li.contentEditable = "true"; li.focus(); });
        li.addEventListener("blur", () => { li.contentEditable = "false"; });
        ingList.appendChild(li);
    });

    // Populate instructions (skip Make: placeholders; nested preview renders those)
    instList.innerHTML = "";
    (current.instructions || []).forEach(i => {
        if (/^Make:\s*/.test(i)) return;
        const li = document.createElement("li");
        li.textContent = i;
        li.style.listStyleType = "circle";
        li.addEventListener("click", () => { li.contentEditable = "true"; li.focus(); });
        li.addEventListener("blur", () => { li.contentEditable = "false"; });
        instList.appendChild(li);
    });

    // Wire add-item buttons (fresh)
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

    // -------- nested subrecipes for THIS subrecipe --------
    let nested = [];
    if (recipeData && Array.isArray(current.subrecipeIds)) {
        nested = current.subrecipeIds
            .map(id => recipeData.recipes.find(r => r.id === id))
            .filter(Boolean);
    }

    function renderNestedPreview() {
        instList.querySelectorAll("li.nested-subrecipe-li").forEach(li => li.remove());
        nested.forEach((sub, nidx) => {
            const li = document.createElement("li");
            li.classList.add("nested-subrecipe-li");
            li.dataset.nidx = String(nidx);
            li.innerHTML = `Make: <span class="clickable-title">${sub.title}</span>`;
            instList.appendChild(li);
        });
    }

    function upsertRecipe(r) {
        if (!recipeData) return;
        if (!r.id) r.id = generateRecipeId();
        if (!Array.isArray(r.subrecipeIds)) r.subrecipeIds = [];

        const i = recipeData.recipes.findIndex(x => x.id === r.id);
        if (i !== -1) recipeData.recipes[i] = r;
        else recipeData.recipes.push(r);
    }

    function openNestedEditor(nidx) {
        const sub = nested[nidx];
        if (!sub) return;

        // ensure it exists in store for id linking
        upsertRecipe(sub);

        // quick recursion: reuse activeSubrecipes as a working set
        const tempIdx = activeSubrecipes.push(sub) - 1;
        openSubrecipeEditor(tempIdx);
    }

    renderNestedPreview();

    instList.addEventListener("click", (event) => {
        const li = event.target.closest("li.nested-subrecipe-li");
        if (!li) return;
        const nidx = Number(li.dataset.nidx);
        if (isNaN(nidx)) return;
        openNestedEditor(nidx);
    }, true);

    // Add nested subrecipe button
    const addNestedBtn = document.createElement("button");
    addNestedBtn.type = "button";
    addNestedBtn.className = "edit-btn";
    addNestedBtn.style.marginTop = "12px";
    addNestedBtn.textContent = "Add Sub-Recipe";
    instList.parentElement.insertBefore(addNestedBtn, instList.nextSibling);

    addNestedBtn.addEventListener("click", () => {
        const newSub = { id: null, title: "New Sub-Recipe", category: "", ingredients: [], instructions: [], subrecipeIds: [] };
        nested.push(newSub);
        renderNestedPreview();
        openNestedEditor(nested.length - 1);
    });

    // Save
    const oldSave = clone.querySelector("#save-recipe");
    const newSave = oldSave.cloneNode(true);
    oldSave.replaceWith(newSave);

    newSave.addEventListener("click", () => {
        current.title = titleInput.value.trim();
        current.category = catInput.value.trim();
        current.ingredients = extractListItems(ingList) || [];

        // keep only real instructions; Make: lines are derived from nested[]
        current.instructions = (extractListItems(instList) || []).filter(t => !/^Make:\s*/.test(t));

        // persist nested + link ids
        nested.forEach(r => upsertRecipe(r));
        current.subrecipeIds = nested.map(r => r.id).filter(Boolean);

        // persist current too
        upsertRecipe(current);
        if (saveRecipes) saveRecipes();

        setSubrecipe(idx, current);
        clone.remove();
    });

    // Remove
    const oldCancelBtn = clone.querySelector("#cancel-recipe");
    const deleteBtn = oldCancelBtn.cloneNode(true);
    deleteBtn.id = "delete-subrecipe-btn";
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Remove";
    oldCancelBtn.replaceWith(deleteBtn);
    deleteBtn.addEventListener("click", () => {
        removeSubrecipe(idx);
        clone.remove();
    });

    modal.appendChild(clone);
    makeDraggable(clone);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            centerOpenCards(modal, ".edit-recipe-card, .subrecipe-modal-card");
        });
    });
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
    // Make the main recipe dialog draggable (not the overlay)
    const mainRecipeCard = recipeModal.querySelector(".edit-recipe-card");
    if (mainRecipeCard) {
        makeDraggable(mainRecipeCard);
    }
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
    window.CookbookStore = window.CookbookStore || {};
    window.CookbookStore.data = recipeData;
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

    window.CookbookStore.data = recipeData;
    window.CookbookStore.saveRecipes = saveRecipes;

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

    function wireViewSubrecipeClicks(cardEl, recipeObj) {
        if (!cardEl || !recipeObj) return;

        const instructionsRoot =
            cardEl.querySelector("#view-instructions-list") ||
            cardEl.querySelector(".view-instructions") ||
            cardEl;

        const lis = Array.from(instructionsRoot.querySelectorAll("li"));

        lis.forEach(li => {
            const text = li.textContent.trim();
            if (!text.startsWith("Make:")) return;

            const title = text.replace(/^Make:\s*/, "");

            // prevent duplicate listeners (replace node)
            const fresh = li.cloneNode(true);
            li.parentNode.replaceChild(fresh, li);

            fresh.innerHTML = `Make: <span class="clickable-title">${title}</span>`;
            fresh.style.cursor = "pointer";

            fresh.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const subId = (recipeObj.subrecipeIds || []).find(id => {
                    const r = recipeData.recipes.find(x => x.id === id);
                    return r && r.title === title;
                });
                if (!subId) return;

                const sub = recipeData.recipes.find(r => r.id === subId);
                if (!sub) return;

                const subList = document.getElementById("view-subrecipes");
                if (!subList) return;

                const existing = subList.querySelector(`#subrecipe-card-${sub.id}`);
                if (existing) {
                    existing.remove();

                    // Re-center remaining cards (only those not user-moved)
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            centerOpenCards(subList, ".view-recipe-card");
                        });
                    });

                    return;
                }

                const subCard = document.createElement("div");
                subCard.className = "view-recipe-card";
                subCard.id = `subrecipe-card-${sub.id}`;
                subCard.innerHTML = `
                    <h2>${sub.title}</h2>
                    <p>${sub.category || ""}</p>
                    <h3>Ingredients</h3>
                    <div>${renderViewList(sub.sections || [{ subheading: "", items: sub.ingredients || [] }])}</div>
                    <h3>Instructions</h3>
                    <div class="view-instructions">${renderViewList(sub.instructions || [{ subheading: "", items: sub.instructions || [] }])}</div>
                    <button class="close-btn" type="button">×</button>
                `;

                subCard.querySelector(".close-btn").addEventListener("click", (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    subCard.remove();
                });

                subList.appendChild(subCard);
                subCard.dataset.userMoved = "0";
                makeDraggable(subCard);

                wireViewSubrecipeClicks(subCard, sub);

                // Re-center all open view cards as a single row (original behavior)
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        centerOpenCards(subList, ".view-recipe-card");
                    });
                });
            });
        });
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
        // Close any auxiliary subrecipe UI cards from previous sessions
        document.getElementById("subrecipe-picker-card")?.remove();
        document.getElementById("create-subrecipe-card")?.remove();

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
        // Remove any auxiliary cards so they don't persist between modal opens
        document.getElementById("subrecipe-picker-card")?.remove();
        document.getElementById("create-subrecipe-card")?.remove();
        // Also remove any leftover subrecipe editor cards if any exist
        recipeModal.querySelectorAll(".subrecipe-modal-card").forEach(el => {
            // keep the main editor card (it has class edit-recipe-card but no id match)
            if (el.id !== "") el.remove();
        });
    }

    // --- Subrecipe attach/create (main edit modal) ---
    function getCurrentMainRecipeId() {
        if (editIndex !== null && recipeData.recipes[editIndex]) return recipeData.recipes[editIndex].id;
        return null;
    }

    function addExistingRecipeAsSubrecipeById(recipeId) {
        const r = recipeData.recipes.find(x => x.id === recipeId);
        if (!r) return;
        if (activeSubrecipes.some(s => s && s.id === r.id)) return; // no duplicates
        setSubrecipe(undefined, r);
    }

    function openCreateSubrecipeCard({ onCreated } = {}) {
        const modal = document.getElementById("recipe-modal");
        if (!modal || !subrecipeEditorTemplate) return;

        const existing = modal.querySelector("#create-subrecipe-card");
        if (existing) { existing.remove(); return; }

        const clone = subrecipeEditorTemplate.cloneNode(true);
        const closeBtn = clone.querySelector("#close-recipe-modal");
        if (closeBtn) closeBtn.remove();

        clone.id = "create-subrecipe-card";
        clone.classList.add("subrecipe-modal-card");

        const header = clone.querySelector("#recipe-modal-title");
        if (header) header.textContent = "Create Sub-Recipe";

        const t = clone.querySelector("#recipe-title");
        const c = clone.querySelector("#recipe-category");
        const ingList = clone.querySelector("#recipe-ingredients-list");
        const instList = clone.querySelector("#recipe-instructions-list");
        const ingInput = clone.querySelector("#recipe-ingredient-input");
        const instInput = clone.querySelector("#recipe-instruction-input");

        if (t) t.value = "";
        if (c) c.value = "";
        if (ingInput) ingInput.value = "";
        if (instInput) instInput.value = "";
        if (ingList) ingList.innerHTML = "";
        if (instList) instList.innerHTML = "";

        // Rewire add buttons safely
        const ingBtn = clone.querySelector("#add-recipe-ingredient");
        const instBtn = clone.querySelector("#add-recipe-instruction");

        if (ingBtn && ingInput && ingList) {
            const b = ingBtn.cloneNode(true);
            ingBtn.replaceWith(b);
            b.addEventListener("click", () => addSimpleItem(ingInput, ingList));
        }

        if (instBtn && instInput && instList) {
            const b = instBtn.cloneNode(true);
            instBtn.replaceWith(b);
            b.addEventListener("click", () => addSimpleItem(instInput, instList));
        }

        // Save creates a first-class recipe and attaches by id
        const saveBtn = clone.querySelector("#save-recipe");
        if (saveBtn) {
            const b = saveBtn.cloneNode(true);
            saveBtn.replaceWith(b);
            b.addEventListener("click", () => {
                const title = (t?.value || "").trim();
                const category = (c?.value || "").trim();
                if (!title) return;

                const created = {
                    id: generateRecipeId(),
                    title,
                    category,
                    sections: [{ subheading: "", items: extractListItems(ingList) || [] }],
                    instructions: [{ subheading: "", items: extractListItems(instList) || [] }],
                    subrecipeIds: []
                };

                recipeData.recipes.push(created);
                saveRecipes();
                updateCategoryFilter();
                renderRecipes();

                if (onCreated) onCreated(created);
                clone.remove();
            });
        }

        // Cancel just closes
        const cancelBtn = clone.querySelector("#cancel-recipe");
        if (cancelBtn) {
            const b = cancelBtn.cloneNode(true);
            cancelBtn.replaceWith(b);
            b.textContent = "Close";
            b.className = "delete-btn";
            b.addEventListener("click", () => clone.remove());
        }

        modal.appendChild(clone);
        makeDraggable(clone);
        requestAnimationFrame(() => requestAnimationFrame(() => centerOpenCards(modal, ".edit-recipe-card, .subrecipe-modal-card")));
    }

    // Open a READ-ONLY view card inside the EDIT modal workspace (no full-screen view modal)
    function openViewCardInEditWorkspace(recipeId) {
        const modal = document.getElementById("recipe-modal");
        if (!modal) return;

        const recipe = recipeData.recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        // toggle if already open
        const existing = modal.querySelector(`#edit-workspace-view-${recipe.id}`);
        if (existing) {
            existing.remove();
            // Re-center remaining cards (old behavior)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    centerOpenCards(modal, ".edit-recipe-card, .subrecipe-modal-card, .view-recipe-card");
                });
            });
            return;
        }

        // normalize data shapes
        const sections = recipe.sections || [{ subheading: "", items: recipe.ingredients || [] }];
        const instructions = Array.isArray(recipe.instructions?.[0]?.items)
            ? recipe.instructions
            : [{ subheading: "", items: recipe.instructions || [] }];

        const card = document.createElement("div");
        card.className = "view-recipe-card";
        card.id = `edit-workspace-view-${recipe.id}`;
        card.innerHTML = `
            <h2>${recipe.title}</h2>
            <p>${recipe.category || ""}</p>
            <h3>Ingredients</h3>
            <div>${renderViewList(sections)}</div>
            <h3>Instructions</h3>
            <div class="view-instructions">${renderViewList(instructions)}</div>
            <button class="close-btn" type="button">×</button>
        `;

        card.querySelector(".close-btn").addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            card.remove();
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    centerOpenCards(modal, ".edit-recipe-card, .subrecipe-modal-card, .view-recipe-card");
                });
            });
        });

        modal.appendChild(card);
        card.dataset.userMoved = "0";
        makeDraggable(card);

        // allow infinite nesting inside the same edit workspace
        wireViewSubrecipeClicksInWorkspace(card, recipe, modal);

        // Re-center all open cards in the edit workspace as a single row (old behavior)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                centerOpenCards(modal, ".edit-recipe-card, .subrecipe-modal-card, .view-recipe-card");
            });
        });
    }

    // Like wireViewSubrecipeClicks, but appends new sub-cards into the same modal workspace
    function wireViewSubrecipeClicksInWorkspace(cardEl, recipeObj, workspaceEl) {
        if (!cardEl || !recipeObj || !workspaceEl) return;

        const instructionsRoot =
            cardEl.querySelector("#view-instructions-list") ||
            cardEl.querySelector(".view-instructions") ||
            cardEl;

        const lis = Array.from(instructionsRoot.querySelectorAll("li"));

        lis.forEach(li => {
            const text = li.textContent.trim();
            if (!text.startsWith("Make:")) return;

            const title = text.replace(/^Make:\s*/, "");

            // prevent duplicate listeners (replace node)
            const fresh = li.cloneNode(true);
            li.parentNode.replaceChild(fresh, li);

            fresh.innerHTML = `Make: <span class="clickable-title">${title}</span>`;
            fresh.style.cursor = "pointer";

            fresh.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const subId = (recipeObj.subrecipeIds || []).find(id => {
                    const r = recipeData.recipes.find(x => x.id === id);
                    return r && r.title === title;
                });
                if (!subId) return;

                openViewCardInEditWorkspace(subId);
            });
        });
    }
    function openSubrecipePicker() {
        const modal = document.getElementById("recipe-modal");
        if (!modal) return;

        const existing = modal.querySelector("#subrecipe-picker-card");
        if (existing) { existing.remove(); return; }

        const card = document.createElement("div");
        card.id = "subrecipe-picker-card";
        // Make it visually match the main editor card
        card.className = "edit-recipe-card subrecipe-modal-card";
        card.style.width = "520px";

        const currentMainId = getCurrentMainRecipeId();

        card.innerHTML = `
            <h2 style="margin-top:0;">Add Sub-Recipe</h2>
            <p style="margin-top:6px; opacity:0.8;">Attach an existing recipe, or create a new one.</p>
            <div class="subrecipe-picker-row">
                <input id="subrecipe-search" type="text" placeholder="Search recipes..." />
                <button id="create-new-subrecipe" class="edit-btn" type="button">Create New</button>
            </div>
            <div id="subrecipe-picker-list" class="subrecipe-picker-list"></div>
            <button id="close-subrecipe-picker" class="close-btn" type="button">&times;</button>
        `;

        function renderList(filterText) {
            const q = (filterText || "").trim().toLowerCase();
            const already = new Set(activeSubrecipes.filter(Boolean).map(s => s.id));

            const items = recipeData.recipes
                .filter(r => r && r.id)
                .filter(r => !currentMainId || r.id !== currentMainId)
                .filter(r => !already.has(r.id))
                .filter(r => {
                    if (!q) return true;
                    const t = (r.title || "").toLowerCase();
                    const c = (r.category || "").toLowerCase();
                    return t.includes(q) || c.includes(q);
                })
                .slice(0, 200);

            const listEl = card.querySelector("#subrecipe-picker-list");
            if (!listEl) return;

            if (!items.length) {
                listEl.innerHTML = `<div style="padding:10px; opacity:0.7;">No recipes found.</div>`;
                return;
            }

            listEl.innerHTML = items.map(r => {
                const title = (r.title || "(untitled)").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                const cat = (r.category || "").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                return `
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 6px; border-bottom:1px solid #f0f0f0;">
                        <div>
                            <div style="font-weight:600;">${title}</div>
                            <div style="opacity:0.7; font-size:0.9em;">${cat}</div>
                        </div>
                        <button class="edit-btn" type="button" data-add-id="${r.id}">Add</button>
                    </div>
                `;
            }).join("");
        }

        modal.appendChild(card);
        makeDraggable(card);
        requestAnimationFrame(() => requestAnimationFrame(() => centerOpenCards(modal, ".edit-recipe-card, .subrecipe-modal-card")));

        renderList("");

        const search = card.querySelector("#subrecipe-search");
        if (search) search.addEventListener("input", () => renderList(search.value));

        card.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-add-id]");
            if (!btn) return;
            const rid = btn.getAttribute("data-add-id");
            if (!rid) return;
            addExistingRecipeAsSubrecipeById(rid);
            renderList(search ? search.value : "");
        });

        const closeBtn = card.querySelector("#close-subrecipe-picker");
        if (closeBtn) closeBtn.addEventListener("click", () => card.remove());

        const createBtn = card.querySelector("#create-new-subrecipe");
        if (createBtn) {
            createBtn.addEventListener("click", () => {
                openCreateSubrecipeCard({
                    onCreated: (created) => {
                        addExistingRecipeAsSubrecipeById(created.id);
                        renderList(search ? search.value : "");
                    }
                });
            });
        }
    }

    // Save a recipe and its subrecipes as first-class recipes with linking
    function saveRecipe() {
        // Assign IDs to subrecipes if missing, and collect their IDs
        const subrecipesWithIds = activeSubrecipes.map(sub => {
            if (!sub.id) sub.id = generateRecipeId();
            if (!Array.isArray(sub.subrecipeIds)) sub.subrecipeIds = [];
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

        // Single workspace container for ALL view cards
        const workspace = document.createElement("div");
        workspace.id = "view-subrecipes";
        wrapper.appendChild(workspace);
        modal.appendChild(wrapper);

        // Main view card (also inside workspace)
        const mainCard = document.createElement("div");
        mainCard.className = "view-recipe-card";
        mainCard.id = "main-view-recipe-card";
        mainCard.innerHTML = `
        <h2 id="view-title"></h2>
        <p id="view-category"></p>
        <h3>Ingredients</h3>
        <div id="view-ingredients-list"></div>
        <h3>Instructions</h3>
        <div id="view-instructions-list"></div>
        <button id="close-view-recipe" class="close-btn">&times;</button>
        `;

        workspace.appendChild(mainCard);

        // Set modal content
        mainCard.querySelector("#view-title").textContent = recipe.title;
        mainCard.querySelector("#view-category").textContent = recipe.category;
        mainCard.querySelector("#view-ingredients-list").innerHTML = renderViewList(sections);
        mainCard.querySelector("#view-instructions-list").innerHTML = renderViewList(instructions);

        // Drag + subrecipe wiring
        makeDraggable(mainCard);
        wireViewSubrecipeClicks(mainCard, recipe);

        // Close button
        mainCard.querySelector("#close-view-recipe").addEventListener("click", () => {
            modal.classList.add("hidden");
            document.getElementById("recipe-modal")?.classList.remove("edit-under-view");
        });

        // Center all currently open view cards as a single row
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                centerOpenCards(workspace, ".view-recipe-card");
            });
        });

        // If EDIT is open, keep VIEW modal normal and remove EDIT backdrop to avoid double-dim
        const editModal = document.getElementById("recipe-modal");
        const editOpen = editModal && !editModal.classList.contains("hidden");
        if (editOpen) editModal.classList.add("edit-under-view");

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
        const vm = document.getElementById("view-recipe-modal");
        if (e.target === vm) {
            vm.classList.add("hidden");
            document.getElementById("recipe-modal")?.classList.remove("edit-under-view");
        }
    });

    // Search & Filter Events
    searchInput.addEventListener("input", renderRecipes);
    categoryFilter.addEventListener("change", renderRecipes);

    document.getElementById("add-recipe-btn").addEventListener("click", () => openRecipeModal());
    saveRecipeBtn.addEventListener("click", saveRecipe);
    cancelRecipeBtn.addEventListener("click", closeRecipeModal);
    document.getElementById("close-recipe-modal").addEventListener("click", closeRecipeModal);

    // Subrecipes are view-only (no editing), but can be created/attached
    const subBtn = document.getElementById("add-sub-recipe-btn");

    if (subBtn) {
        subBtn.style.display = ""; // ensure visible
        subBtn.addEventListener("click", (e) => {
            e.preventDefault();
            openSubrecipePicker();
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

    // Subrecipes are view-only in edit mode: clicking opens view card in edit workspace
    const instructionsList = document.getElementById("recipe-instructions-list");
    if (instructionsList) {
    instructionsList.addEventListener('click', (event) => {
        const li = event.target.closest('li.subrecipe-li');
        if (!li) return;

        const idx = Number(li.dataset.idx);
        if (isNaN(idx)) return;

        const sub = activeSubrecipes[idx];
        if (!sub || !sub.id) return;

        // Open as a draggable view card in the SAME edit modal workspace
        openViewCardInEditWorkspace(sub.id);
    }, true);
    }
});

// --- Centering layout for newly-opened draggable cards ---
function getCardSize(card) {
  const prevLeft = card.style.left;
  const prevTop = card.style.top;
  const prevPos = card.style.position;

  // Ensure measurable
  if (!prevPos) card.style.position = 'absolute';
  if (!prevLeft) card.style.left = '0px';
  if (!prevTop) card.style.top = '0px';

  const rect = card.getBoundingClientRect();
  return { w: rect.width || 360, h: rect.height || 420 };
}

function centerOpenCards(rootEl, cardSelector) {
  if (!rootEl) return;

  const cards = Array.from(rootEl.querySelectorAll(cardSelector))
    // only reposition cards that the user hasn't moved
    .filter(c => c && c.offsetParent !== null && c.dataset.userMoved !== '1');

  const n = cards.length;
  if (!n) return;

  const spacing = 32;
  const margin = 24;

  // Measure each card (allows different widths)
  const sizes = cards.map(getCardSize);
  const totalW = sizes.reduce((sum, s) => sum + s.w, 0) + (n - 1) * spacing;
  const maxH = sizes.reduce((m, s) => Math.max(m, s.h), 0);

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const startX = Math.max(margin, Math.round((vw - totalW) / 2));
  const startY = Math.max(margin, Math.round((vh - maxH) / 2));

  let x = startX;
  cards.forEach((card, i) => {
    const { w, h } = sizes[i];

    card.style.position = 'absolute';
    card.style.left = x + 'px';
    // vertically center each card within the row's max height
    card.style.top = (startY + Math.round((maxH - h) / 2)) + 'px';

    x += w + spacing;
  });
}

// Place a newly opened card to the right of existing cards (without moving existing cards).
function placeNewCardNextToExisting(rootEl, newCard, cardSelector) {
  if (!rootEl || !newCard) return;

  const rootRect = rootEl.getBoundingClientRect();
  const spacing = 32;
  const margin = 24;

  const cards = Array.from(rootEl.querySelectorAll(cardSelector))
    .filter(c => c && c !== newCard && c.offsetParent !== null);

  // If no other cards in this container, center within the container (NOT the window)
  if (!cards.length) {
    const ns = getCardSize(newCard);
    const x = Math.max(margin, Math.round((rootRect.width - ns.w) / 2));
    const y = Math.max(margin, Math.round((rootRect.height - ns.h) / 2));

    newCard.style.position = "absolute";
    newCard.style.left = x + "px";
    newCard.style.top = y + "px";
    newCard.dataset.userMoved = "0";
    return;
  }

  // Compute positions relative to root
  const rel = cards.map(c => {
    const r = c.getBoundingClientRect();
    return {
      x: r.left - rootRect.left,
      y: r.top - rootRect.top,
      w: r.width,
      h: r.height
    };
  });

  const rowY = rel[0].y; // align to first card's y
  const maxH = rel.reduce((m, s) => Math.max(m, s.h), 0);
  const rightMost = rel.reduce((m, s) => Math.max(m, s.x + s.w), 0);

  // Measure new card
  const ns = getCardSize(newCard);

  let x = rightMost + spacing;
  let y = rowY;

  const availableW = rootRect.width;

  // If it would overflow, start a new row under the existing row
  if (x + ns.w + margin > availableW) {
    const leftMost = rel.reduce((m, s) => Math.min(m, s.x), Infinity);
    x = Math.max(margin, leftMost);
    y = rowY + maxH + spacing;
  }

  newCard.style.position = "absolute";
  newCard.style.left = Math.max(margin, Math.round(x)) + "px";
  newCard.style.top = Math.max(margin, Math.round(y)) + "px";

  // Mark as not user-moved
  newCard.dataset.userMoved = "0";
}

// --- Add CSS for subrecipe card and modal side-by-side layout ---
// This block injects styles only once
// Helper to make elements draggable
function makeDraggable(el) {
    // Draggable cards use absolute positioning for free movement
    el.style.position = 'absolute';
    let isDragging = false;
    let offsetX = 0, offsetY = 0;
    let downX = 0, downY = 0;
    let moved = false;

    el.addEventListener('mousedown', e => {
        isDragging = true;
        moved = false;
        downX = e.clientX;
        downY = e.clientY;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
        el.style.cursor = 'move';
        el.style.zIndex = '1000';
    });

    document.addEventListener('mousemove', e => {
        if (!isDragging) return;

        // Only consider it "user moved" after a small drag threshold (prevents clicks from locking layout)
        if (!moved) {
            const dx = Math.abs(e.clientX - downX);
            const dy = Math.abs(e.clientY - downY);
            if (dx > 3 || dy > 3) {
                moved = true;
                el.dataset.userMoved = '1';
            }
        }

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
    position: relative;
    width: 100%;
    height: 100%;
}

/* VIEW workspace uses viewport coords so centering behaves like before */
#view-subrecipes {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
}
/* Ensure VIEW modal sits above EDIT modal */
#recipe-modal { 
  z-index: 3000 !important; 
}
#view-recipe-modal {
  position: fixed !important;
  inset: 0 !important;
  z-index: 5000 !important;
  background: rgba(0,0,0,0.6) !important;
}
#recipe-modal.edit-under-view {
  background: rgba(0,0,0,0) !important;
}
/* Ensure view cards render above the backdrop */
#view-recipe-modal .view-recipe-card {
  position: absolute;
  z-index: 10;
}
/* View cards opened inside the EDIT modal workspace */
#recipe-modal .view-recipe-card {
  position: absolute;
  z-index: 3500;
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
/* Subrecipe picker card layout */
.subrecipe-picker-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin: 12px 0 8px;
}
.subrecipe-picker-row input#subrecipe-search {
    flex: 1;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 8px;
}
.subrecipe-picker-list {
    max-height: 360px;
    overflow: auto;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 10px;
    background: #fff;
}
`;
    document.head.appendChild(style);
}