// ==UserScript==
// @name         VOI Bulk Tasks MUI-Style Fields (v5.1 - Synced)
// @namespace    http://tampermonkey.net/
// @version      5.1.1
// @description  Closer match to Task Type/Priority styling for Description & Internal Note, with full input hover area and same size. Now also syncs values with hidden inputs so the submit button works.
// @match        https://fm.voiapp.io/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("[VOI MUI-Style v5.1 - Synced] Script loaded.");

    ////////////////////////////////////////////////////////////////////////
    // Config: The options for Description + Internal Note
    ////////////////////////////////////////////////////////////////////////
    const descriptionOptions = [
        "External Request",
        "Blocked Path/Obstruction",
        "Dangerous Location",
        "Parking Zone Incompliance",
        "Event related",
        "Bulk Pickup",
        "Other"
    ];

    const internalOptionsByDesc = {
        "External Request": ["Authority Request", "Scooter Melder"],
        "Blocked Path/Obstruction": ["Blocked Path/Obstruction"],
        "Dangerous Location": ["Dangerous Location"],
        "Parking Zone Incompliance": ["Parking Zone Incompliance"],
        "Event related": ["Event related"],
        "Bulk Pickup": ["Bulk Pickup"],
        "Other": []
    };

    // We'll store the most recent Description / Note in memory
    let lastDescValue = "";
    let lastNoteValue = "";

    ////////////////////////////////////////////////////////////////////////
    // Helper: create a MUI-like field container
    ////////////////////////////////////////////////////////////////////////
    function createMuiFieldContainer(labelText, placeholderText) {
        // Outer container, e.g. <div class="css-95fj21">
        const outerDiv = document.createElement("div");
        // By default, MUI containers often have 16px margin at bottom
        outerDiv.style.marginBottom = "16px";

        // A label at the top (like "Description" or "Internal note")
        const label = document.createElement("label");
        label.className = "css-l3ethp"; // typical class name from the site
        label.textContent = labelText;
        outerDiv.appendChild(label);

        // Root container for the "autocomplete" style
        const autocompleteRoot = document.createElement("div");
        autocompleteRoot.className = "MuiAutocomplete-root MuiAutocomplete-hasPopupIcon css-1ctx9xg";
        autocompleteRoot.style.position = "relative";
        autocompleteRoot.style.width = "100%";

        // The "FormControl" container
        const formControl = document.createElement("div");
        formControl.className = "MuiFormControl-root MuiFormControl-fullWidth MuiTextField-root css-1vbfw84";
        formControl.style.width = "100%"; // ensure full width

        // The "InputBase" root
        const inputBase = document.createElement("div");
        inputBase.className = "MuiInputBase-root MuiOutlinedInput-root MuiInputBase-colorPrimary MuiInputBase-fullWidth MuiInputBase-formControl MuiInputBase-sizeSmall MuiInputBase-adornedEnd MuiAutocomplete-inputRoot css-1kmkvia";
        inputBase.style.position = "relative";
        inputBase.style.display = "flex";
        inputBase.style.alignItems = "center";
        inputBase.style.cursor = "pointer"; // entire field is clickable
        // Set the typical small MUI OutlinedInput height
        inputBase.style.minHeight = "40px";

        // The actual text input
        const inputEl = document.createElement("input");
        inputEl.className = "MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputSizeSmall MuiInputBase-inputAdornedEnd MuiAutocomplete-input MuiAutocomplete-inputFocused css-s43tfo";
        inputEl.type = "text";
        inputEl.placeholder = placeholderText;
        inputEl.style.width = "100%";
        inputEl.style.cursor = "text";
        inputEl.style.lineHeight = "1.5";
        inputEl.style.border = "none";

        // The arrow icon (like the site’s dropdown icon)
        const arrowImg = document.createElement("img");
        arrowImg.alt = "dropdown icon";
        arrowImg.className = "css-gwdlrc";
        arrowImg.src = "data:image/svg+xml,%3csvg%20id='Group_1761'%20xmlns='http://www.w3.org/2000/svg'%20width='20'%20height='20'%20viewBox='0%200%2020%2020'%3e%3cpath%20d='M7%2010l5%205%205-5z'%20fill='%23231f20'%3e%3c/path%3e%3c/svg%3e";
        arrowImg.style.width = "20px";
        arrowImg.style.height = "20px";
        arrowImg.style.flex = "0 0 auto";
        arrowImg.style.marginRight = "8px";

        // The "fieldset" to mimic MUI’s outline
        const fieldset = document.createElement("fieldset");
        fieldset.className = "MuiOutlinedInput-notchedOutline css-5v2ak0";
        fieldset.style.position = "absolute";
        fieldset.style.top = "0";
        fieldset.style.left = "0";
        fieldset.style.right = "0";
        fieldset.style.bottom = "0";
        fieldset.style.margin = "0";
        fieldset.style.pointerEvents = "none";

        const legend = document.createElement("legend");
        legend.className = "css-w4cd9x";
        legend.innerHTML = `<span class="notranslate" aria-hidden="true">&#8203;</span>`;
        fieldset.appendChild(legend);

        // The popup UL for options
        const popupUL = document.createElement("ul");
        popupUL.style.display = "none";
        popupUL.style.position = "absolute";
        popupUL.style.top = "calc(100% + 2px)";
        popupUL.style.left = "0";
        popupUL.style.right = "0";
        popupUL.style.zIndex = "99999";
        popupUL.style.listStyle = "none";
        popupUL.style.margin = "0";
        popupUL.style.padding = "4px 0";
        popupUL.style.background = "#fff";
        popupUL.style.border = "1px solid #ccc";
        popupUL.style.borderRadius = "4px";
        popupUL.style.cursor = "pointer";

        // Build the structure
        inputBase.appendChild(inputEl);
        inputBase.appendChild(arrowImg);
        inputBase.appendChild(fieldset);
        formControl.appendChild(inputBase);
        autocompleteRoot.appendChild(formControl);
        autocompleteRoot.appendChild(popupUL);
        outerDiv.appendChild(autocompleteRoot);

        return {
            container: outerDiv,
            inputBase,     // The clickable "root"
            inputEl,
            arrowImg,
            popupUL
        };
    }

    ////////////////////////////////////////////////////////////////////////
    // Show/hide the UL with the given array of options
    ////////////////////////////////////////////////////////////////////////
    function populateAndToggleUL(ulElem, optionsArray, show) {
        // Clear old items
        while (ulElem.firstChild) {
            ulElem.removeChild(ulElem.firstChild);
        }
        if (!optionsArray || optionsArray.length === 0) {
            ulElem.style.display = "none";
            return;
        }

        if (show) {
            optionsArray.forEach(opt => {
                const li = document.createElement("li");
                li.style.padding = "6px 12px";
                li.style.display = "block";
                li.style.width = "100%";
                li.style.boxSizing = "border-box";
                li.textContent = opt;
                li.addEventListener("mouseenter", () => {
                    li.style.background = "#f5f5f5";
                });
                li.addEventListener("mouseleave", () => {
                    li.style.background = "";
                });
                ulElem.appendChild(li);
            });
            ulElem.style.display = "block";
        } else {
            ulElem.style.display = "none";
        }
    }

    ////////////////////////////////////////////////////////////////////////
    // Create MUI-style fields for Description + Internal note, hide original inputs
    ////////////////////////////////////////////////////////////////////////
    function createCustomFieldsInBulkPanel(bulkPanelRoot) {
        const descOrig = bulkPanelRoot.querySelector('input[data-testid="create-task-form-info-input"]');
        const noteOrig = bulkPanelRoot.querySelector('input[data-testid="create-task-form-info-internal-input"]');
        if (!descOrig || !noteOrig) {
            console.log("[VOI MUI-Style] Original desc/note not found.");
            return;
        }
        // Hide the original inputs so they don’t interfere visually
        descOrig.style.display = "none";
        noteOrig.style.display = "none";

        // 1) Build the "Description" field container
        const descField = createMuiFieldContainer("Description", "Add description...");
        descOrig.closest(".css-1k2ndaq")?.insertAdjacentElement("beforebegin", descField.container);

        // 2) Build the "Internal note" field container
        const noteField = createMuiFieldContainer("Internal note", "Add note...");
        noteOrig.closest(".css-1k2ndaq")?.insertAdjacentElement("beforebegin", noteField.container);

        // =============== Logic for Description Field ===============
        descField.inputEl.value = lastDescValue || "";
        // Clicking the field toggles the dropdown
        descField.inputBase.addEventListener("click", (e) => {
            e.stopPropagation();
            const isHidden = (descField.popupUL.style.display !== "block");
            populateAndToggleUL(descField.popupUL, descriptionOptions, isHidden);
        });
        // Close the dropdown on outside click
        document.addEventListener("click", () => {
            descField.popupUL.style.display = "none";
        }, { capture: true });

        // When an option is clicked
        descField.popupUL.addEventListener("click", (e) => {
            e.stopPropagation();
            if (e.target.tagName === "LI") {
                const chosen = e.target.textContent;
                if (chosen === "Other") {
                    descField.inputEl.value = "";
                    descField.inputEl.focus();
                    lastDescValue = "";
                    // Sync the hidden input
                    descOrig.value = "";
                } else {
                    descField.inputEl.value = chosen;
                    lastDescValue = chosen;
                    // Sync the hidden input with the selected value
                    descOrig.value = chosen;
                }
                descField.popupUL.style.display = "none";
                updateNoteField(noteField, lastDescValue);
                console.log("[VOI MUI-Style] Description selected:", lastDescValue);
            }
        });

        // Update on blur if the user types manually (for "Other")
        descField.inputEl.addEventListener("blur", () => {
            const typedVal = descField.inputEl.value.trim();
            if (!descriptionOptions.includes(typedVal)) {
                lastDescValue = typedVal;
                // Sync hidden description input
                descOrig.value = typedVal;
                console.log("[VOI MUI-Style] Description typed manually:", typedVal);
                updateNoteField(noteField, typedVal);
            }
        });

        // =============== Logic for Internal Note Field ===============
        noteField.inputEl.value = lastNoteValue || "";
        // Toggle the note options on click
        noteField.inputBase.addEventListener("click", (e) => {
            e.stopPropagation();
            const isHidden = (noteField.popupUL.style.display !== "block");
            const possibleNotes = internalOptionsByDesc[lastDescValue] || [];
            populateAndToggleUL(noteField.popupUL, possibleNotes, isHidden);
        });
        document.addEventListener("click", () => {
            noteField.popupUL.style.display = "none";
        }, { capture: true });

        // When a note option is clicked
        noteField.popupUL.addEventListener("click", (e) => {
            e.stopPropagation();
            if (e.target.tagName === "LI") {
                const chosen = e.target.textContent;
                noteField.inputEl.value = chosen;
                lastNoteValue = chosen;
                // Sync the hidden note input
                noteOrig.value = chosen;
                noteField.popupUL.style.display = "none";
                console.log("[VOI MUI-Style] Note selected:", lastNoteValue);
            }
        });

        // Update on blur if user types the note manually
        noteField.inputEl.addEventListener("blur", () => {
            const typedVal = noteField.inputEl.value.trim();
            const validOptions = internalOptionsByDesc[lastDescValue] || [];
            if (!validOptions.includes(typedVal)) {
                lastNoteValue = typedVal;
                // Sync hidden internal note input
                noteOrig.value = typedVal;
                console.log("[VOI MUI-Style] Note typed manually:", typedVal);
            }
        });

        // Initialize the Note field based on the current description
        updateNoteField(noteField, lastDescValue);
    }

    ////////////////////////////////////////////////////////////////////////
    // If the new description is "Other" or not in the map => clear note field
    ////////////////////////////////////////////////////////////////////////
    function updateNoteField(noteField, descVal) {
        noteField.inputEl.value = "";
        lastNoteValue = "";
        noteField.popupUL.style.display = "none";
    }

    ////////////////////////////////////////////////////////////////////////
    // Observers: watch for the Bulk Tasks panel to open/close
    ////////////////////////////////////////////////////////////////////////
    let observerForOpen = null;
    let observerForClose = null;

    function startWatchingForOpen() {
        if (observerForOpen) observerForOpen.disconnect();
        observerForOpen = new MutationObserver(mutations => {
            for (const mut of mutations) {
                for (const node of mut.addedNodes) {
                    if (node.nodeType === 1) {
                        const bulkHeader = node.querySelector?.('.css-1alqfzv h3.css-wnk731');
                        if (bulkHeader && /bulk tasks/i.test(bulkHeader.textContent)) {
                            console.log("[VOI MUI-Style] Bulk tasks panel found. Creating custom fields...");
                            createCustomFieldsInBulkPanel(node);
                            observerForOpen.disconnect();
                            observerForOpen = null;

                            observerForClose = new MutationObserver(() => {
                                if (!document.body.contains(node)) {
                                    console.log("[VOI MUI-Style] Bulk tasks closed. Re-watch for next open...");
                                    observerForClose.disconnect();
                                    observerForClose = null;
                                    startWatchingForOpen();
                                }
                            });
                            observerForClose.observe(document.body, { childList: true, subtree: true });
                            return;
                        }
                    }
                }
            }
        });
        observerForOpen.observe(document.body, { childList: true, subtree: true });
        console.log("[VOI MUI-Style] Watching for Bulk Tasks to open...");
    }

    startWatchingForOpen();

})();
