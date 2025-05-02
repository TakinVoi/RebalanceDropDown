// ==UserScript==
// @name         VOI MUI-Style Tasks Single & Bulk (v5.2.2 - Type-Conditional)
// @namespace    http://tampermonkey.net/
// @version      5.2.2
// @description  Only show Description & Internal Note dropdowns when Task Type is Rebalance or Repark.
// @match        https://fm.voiapp.io/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("[VOI MUI-Style v5.2.2] Script loaded.");

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

    let lastDescValue = "";
    let lastNoteValue = "";

    function createMuiFieldContainer(labelText, placeholderText) {
        const outerDiv = document.createElement("div");
        outerDiv.style.marginBottom = "16px";

        const label = document.createElement("label");
        label.className = "css-l3ethp";
        label.textContent = labelText;
        outerDiv.appendChild(label);

        const autocompleteRoot = document.createElement("div");
        autocompleteRoot.className = "MuiAutocomplete-root MuiAutocomplete-hasPopupIcon css-1ctx9xg";
        autocompleteRoot.style.position = "relative";
        autocompleteRoot.style.width = "100%";

        const formControl = document.createElement("div");
        formControl.className = "MuiFormControl-root MuiFormControl-fullWidth MuiTextField-root css-1vbfw84";
        formControl.style.width = "100%";

        const inputBase = document.createElement("div");
        inputBase.className = "MuiInputBase-root MuiOutlinedInput-root MuiInputBase-colorPrimary MuiInputBase-fullWidth MuiInputBase-formControl MuiInputBase-sizeSmall MuiInputBase-adornedEnd MuiAutocomplete-inputRoot css-1kmkvia";
        inputBase.style.display = "flex";
        inputBase.style.alignItems = "center";
        inputBase.style.cursor = "pointer";
        inputBase.style.minHeight = "40px";

        const inputEl = document.createElement("input");
        inputEl.className = "MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputSizeSmall MuiInputBase-inputAdornedEnd MuiAutocomplete-input MuiAutocomplete-inputFocused css-s43tfo";
        inputEl.type = "text";
        inputEl.placeholder = placeholderText;
        inputEl.style.width = "100%";
        inputEl.style.border = "none";

        const arrowImg = document.createElement("img");
        arrowImg.alt = "dropdown icon";
        arrowImg.className = "css-gwdlrc";
        arrowImg.src = "data:image/svg+xml,%3csvg id='Group_1761' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3e%3cpath d='M7 10l5 5 5-5z' fill='%23231f20'/%3e%3c/svg%3e";
        arrowImg.style.width = "20px";
        arrowImg.style.marginRight = "8px";

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

        inputBase.appendChild(inputEl);
        inputBase.appendChild(arrowImg);
        inputBase.appendChild(fieldset);
        formControl.appendChild(inputBase);
        autocompleteRoot.appendChild(formControl);
        autocompleteRoot.appendChild(popupUL);
        outerDiv.appendChild(autocompleteRoot);

        return { container: outerDiv, inputBase, inputEl, popupUL };
    }

    function populateAndToggleUL(ulElem, optionsArray, show) {
        while (ulElem.firstChild) ulElem.removeChild(ulElem.firstChild);
        if (!optionsArray || optionsArray.length === 0) {
            ulElem.style.display = "none";
            return;
        }
        if (show) {
            optionsArray.forEach(opt => {
                const li = document.createElement("li");
                li.style.padding = "6px 12px";
                li.style.cursor = "pointer";
                li.textContent = opt;
                li.addEventListener("mouseenter", () => li.style.background = "#f5f5f5");
                li.addEventListener("mouseleave", () => li.style.background = "");
                ulElem.appendChild(li);
            });
            ulElem.style.display = "block";
        } else {
            ulElem.style.display = "none";
        }
    }

    function resetNoteField(noteField) {
        noteField.inputEl.value = "";
        lastNoteValue = "";
        noteField.popupUL.style.display = "none";
    }

    function createCustomFields(panelRoot) {
        const descOrig = panelRoot.querySelector('input[data-testid="create-task-form-info-input"]');
        const noteOrig = panelRoot.querySelector('input[data-testid="create-task-form-info-internal-input"]');
        const typeInput = panelRoot.querySelector('[data-testid="create-task-form-type-select"] input');
        if (!descOrig || !noteOrig || !typeInput) return;

        descOrig.style.display = "none";
        noteOrig.style.display = "none";

        const descField = createMuiFieldContainer("Description", "Add description...");
        descOrig.closest(".css-1k2ndaq")?.insertAdjacentElement("beforebegin", descField.container);

        const noteField = createMuiFieldContainer("Internal note", "Add note...");
        noteOrig.closest(".css-1k2ndaq")?.insertAdjacentElement("beforebegin", noteField.container);

        // Description logic: only open when Task Type is Rebalance or Repark
        descField.inputBase.addEventListener("click", e => {
            e.stopPropagation();
            const t = typeInput.value.trim().toLowerCase();
            if (t === "rebalance" || t === "repark") {
                descField.inputEl.value = "";
                lastDescValue = "";
                descOrig.value = "";
                populateAndToggleUL(descField.popupUL, descriptionOptions, true);
            }
        });
        document.addEventListener("click", () => descField.popupUL.style.display = "none", { capture: true });
        descField.popupUL.addEventListener("click", e => {
            e.stopPropagation();
            if (e.target.tagName === "LI") {
                const v = e.target.textContent;
                if (v === "Other") {
                    descField.inputEl.value = "";
                    lastDescValue = "";
                    descOrig.value = "";
                } else {
                    descField.inputEl.value = v;
                    lastDescValue = v;
                    descOrig.value = v;
                }
                descField.popupUL.style.display = "none";
                resetNoteField(noteField);
            }
        });
        descField.inputEl.addEventListener("blur", () => {
            const v = descField.inputEl.value.trim();
            if (!descriptionOptions.includes(v)) {
                lastDescValue = v;
                descOrig.value = v;
                resetNoteField(noteField);
            }
        });

        // Note logic: only open when Task Type is Rebalance or Repark
        noteField.inputBase.addEventListener("click", e => {
            e.stopPropagation();
            const t = typeInput.value.trim().toLowerCase();
            if (t === "rebalance" || t === "repark") {
                noteField.inputEl.value = "";
                lastNoteValue = "";
                noteOrig.value = "";
                const opts = internalOptionsByDesc[lastDescValue] || [];
                populateAndToggleUL(noteField.popupUL, opts, true);
            }
        });
        document.addEventListener("click", () => noteField.popupUL.style.display = "none", { capture: true });
        noteField.popupUL.addEventListener("click", e => {
            e.stopPropagation();
            if (e.target.tagName === "LI") {
                const v = e.target.textContent;
                noteField.inputEl.value = v;
                lastNoteValue = v;
                noteOrig.value = v;
                noteField.popupUL.style.display = "none";
            }
        });
        noteField.inputEl.addEventListener("blur", () => {
            const v = noteField.inputEl.value.trim();
            const valid = internalOptionsByDesc[lastDescValue] || [];
            if (!valid.includes(v)) {
                lastNoteValue = v;
                noteOrig.value = v;
            }
        });
    }

    // Bulk observer (unchanged)
    let observerForOpen = null, observerForClose = null;
    function startWatchingForBulk() {
        if (observerForOpen) observerForOpen.disconnect();
        observerForOpen = new MutationObserver(muts => {
            for (const mut of muts) {
                for (const node of mut.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    const bulkHeader = node.querySelector('.css-1alqfzv h3.css-wnk731');
                    if (bulkHeader && /bulk tasks/i.test(bulkHeader.textContent)) {
                        console.log("[VOI MUI-Style] Bulk tasks panel found.");
                        createCustomFields(node);
                        observerForOpen.disconnect();
                        observerForOpen = null;
                        observerForClose = new MutationObserver(() => {
                            if (!document.body.contains(node)) {
                                observerForClose.disconnect();
                                observerForClose = null;
                                startWatchingForBulk();
                            }
                        });
                        observerForClose.observe(document.body, { childList: true, subtree: true });
                        return;
                    }
                }
            }
        });
        observerForOpen.observe(document.body, { childList: true, subtree: true });
        console.log("[VOI MUI-Style] Watching for Bulk Tasks…");
    }
    startWatchingForBulk();

    // Single-scooter Add task observer
    function startWatchingForAddTask() {
        const obs = new MutationObserver(muts => {
            for (const mut of muts) {
                for (const node of mut.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    const hdr = node.querySelector('h3.css-wnk731');
                    if (hdr && hdr.textContent.trim() === "Add task") {
                        console.log("[VOI MUI-Style] Add-task popup found.");
                        createCustomFields(node);
                    }
                }
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        console.log("[VOI MUI-Style] Watching for single-scooter 'Add task'…");
    }
    startWatchingForAddTask();

})();
