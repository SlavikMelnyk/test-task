(function () {
  "use strict";

  const userId = "dealer-anna";
  const storageKey = `listing-general-info-extra:${userId}`;

  const pickerOptions = {
    vesselLocation: [
      "Miami, FL",
      "Fort Lauderdale, FL",
      "Newport Beach, CA",
      "Monaco",
      "Palma de Mallorca",
      "Antibes",
      "Saint-Tropez",
      "Dubai",
    ],
    taxStatus: ["VAT Paid", "VAT Unpaid", "VAT Exempt", "Not Applicable"],
    importDutyPaid: ["Yes", "No", "Pending"],
    countryOfDuty: [
      "United States",
      "United Kingdom",
      "Italy",
      "France",
      "Spain",
      "Germany",
      "Netherlands",
      "Monaco",
      "Cayman Islands",
      "Marshall Islands",
    ],
  };

  const multiPickerOptions = {
    vesselType: [
      "Motor Yacht",
      "Sailing Yacht",
      "Catamaran",
      "Trawler",
      "Sport Fisher",
      "Express Cruiser",
      "Center Console",
      "Mega Yacht",
    ],
    goodFor: ["Watersports", "Fishing", "Cruising", "Chartering", "Day Trips", "Racing", "Diving", "Family"],
  };

  const multiStateKey = {
    vesselType: "vesselTypes",
    goodFor: "goodFor",
  };

  const currencies = ["USD", "EUR", "GBP", "AUD", "CAD", "CHF", "JPY"];

  const HEAT_LEVELS = {
    1: { label: "Freezing", image: "./assets/snow.png" },
    2: { label: "Cold", icon: "❄" },
    3: { label: "Cool", icon: "☁" },
    4: { label: "Warm", icon: "☀" },
    5: { label: "Hot", image: "./assets/fire.png" },
  };
  const REQUIRED_TOTAL = 9;

  let heatEl = null;
  let heatLabelEl = null;
  let heatGlyphEl = null;
  let lastHeatLevel = null;
  let pulseTimer = null;

  const state = {
    internalId: "",
    currentName: "",
    launchName: "",
    vesselLocation: "",
    notForSaleUS: false,
    vesselTypes: [],
    goodFor: ["Watersports", "Fishing"],
    price: "100,000",
    currency: "USD",
    hidePrice: false,
    taxStatus: "",
    importDutyPaid: "Yes",
    countryOfDuty: "",
    warrantyDates: {
      generalWarranty: "08.08.2029",
      engineWarranty: "08.08.2029",
      hullWarranty: "08.08.2029",
      generatorWarranty: "08.08.2029",
    },
  };

  const els = {
    internalId: document.querySelector("#internal-id"),
    currentName: document.querySelector("#current-name"),
    launchName: document.querySelector("#launch-name"),
    price: document.querySelector("#price-input"),
    notForSaleUS: document.querySelector("#not-for-sale-us"),
    hidePrice: document.querySelector("#hide-price"),
    warrantyDateInputs: [...document.querySelectorAll("[data-warranty-date]")],
  };

  const pickers = Object.keys(pickerOptions).map(buildPicker);
  const multiPickers = Object.keys(multiPickerOptions).map(buildMultiPicker);

  hydrate();
  applyStateToDOM();
  attachListeners();
  setupDateTriggers();
  setupCurrencyPicker();
  setupHeatIndicator();

  function save() {
    localStorage.setItem(storageKey, JSON.stringify(state));
    refreshHeat();
  }

  function hydrate() {
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      localStorage.removeItem(storageKey);
    }
    const draft = JSON.parse(localStorage.getItem(storageKey) || "{}");
    Object.assign(state, {
      internalId: draft.internalId || "",
      currentName: draft.currentName || "",
      launchName: draft.launchName || "",
      vesselLocation: draft.vesselLocation || "",
      notForSaleUS: Boolean(draft.notForSaleUS),
      vesselTypes: Array.isArray(draft.vesselTypes) ? draft.vesselTypes : [],
      goodFor: Array.isArray(draft.goodFor) ? draft.goodFor : state.goodFor,
      price: draft.price ?? state.price,
      currency: currencies.includes(draft.currency) ? draft.currency : state.currency,
      hidePrice: Boolean(draft.hidePrice),
      taxStatus: draft.taxStatus || "",
      importDutyPaid: draft.importDutyPaid || "Yes",
      countryOfDuty: draft.countryOfDuty || "",
      warrantyDates: { ...state.warrantyDates, ...(draft.warrantyDates || {}) },
    });
  }

  function reset() {
    Object.assign(state, {
      internalId: "",
      currentName: "",
      launchName: "",
      vesselLocation: "",
      notForSaleUS: false,
      vesselTypes: [],
      goodFor: [],
      price: "",
      currency: "USD",
      hidePrice: false,
      taxStatus: "",
      importDutyPaid: "",
      countryOfDuty: "",
      warrantyDates: {
        generalWarranty: "",
        engineWarranty: "",
        hullWarranty: "",
        generatorWarranty: "",
      },
    });
    localStorage.removeItem(storageKey);
  }

  function applyStateToDOM() {
    els.internalId.value = state.internalId;
    els.currentName.value = state.currentName;
    els.launchName.value = state.launchName;
    els.price.value = state.price;
    els.notForSaleUS.checked = state.notForSaleUS;
    els.hidePrice.checked = state.hidePrice;
    els.warrantyDateInputs.forEach((input) => {
      input.value = state.warrantyDates[input.dataset.warrantyDate] || "";
    });
    pickers.forEach(renderPicker);
    multiPickers.forEach((picker) => {
      renderMultiTags(picker);
      renderMultiPicker(picker);
    });
  }

  function attachListeners() {
    ["internalId", "currentName", "launchName", "price"].forEach((key) => {
      els[key].addEventListener("input", () => {
        state[key] = els[key].value;
        save();
      });
    });

    els.notForSaleUS.addEventListener("change", () => {
      state.notForSaleUS = els.notForSaleUS.checked;
      save();
    });

    els.hidePrice.addEventListener("change", () => {
      state.hidePrice = els.hidePrice.checked;
      save();
    });

    els.warrantyDateInputs.forEach((input) => {
      input.addEventListener("input", () => {
        state.warrantyDates[input.dataset.warrantyDate] = input.value;
        save();
      });
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-picker]")) return;
      if (event.target.closest("[data-multi]")) return;
      if (event.target.closest("[data-currency-picker]")) return;
      if (event.target.closest(".currency-menu")) return;
      closeAllOpenPickers();
    });

    const createNew = document.querySelector(".create-new");
    if (createNew) {
      createNew.addEventListener("click", () => {
        reset();
        applyStateToDOM();
        refreshHeat();
      });
    }
  }

  function buildPicker(name) {
    const field = document.querySelector(`[data-picker="${name}"]`);
    const button = field.querySelector(":scope > button");
    const menu = field.querySelector(":scope > .combo-menu");

    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (field.classList.contains("is-open")) {
        closePickerField(field);
      } else {
        openPickerField(field, name);
      }
    });

    return { name, field, button, menu };
  }

  function buildMultiPicker(name) {
    const field = document.querySelector(`[data-multi="${name}"]`);
    const menu = field.querySelector(":scope > .combo-menu");
    const max = Number(field.dataset.max || 4);
    const stateKey = multiStateKey[name];

    field.addEventListener("click", (event) => {
      if (event.target.closest(".tag-close")) return;
      if (event.target.closest(".combo-menu")) return;
      if (field.classList.contains("is-open")) {
        closePickerField(field);
      } else {
        openMultiPickerField(field, name);
      }
    });

    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (field.classList.contains("is-open")) {
          closePickerField(field);
        } else {
          openMultiPickerField(field, name);
        }
      }
      if (event.key === "Escape") closePickerField(field);
    });

    return { name, field, menu, max, stateKey };
  }

  function renderPicker(picker) {
    picker.button.textContent = state[picker.name] || "";
    picker.menu.replaceChildren();

    const group = document.createElement("div");
    group.className = "combo-group";

    pickerOptions[picker.name].forEach((value) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "combo-option";
      option.setAttribute("role", "option");
      option.textContent = value;
      if (state[picker.name] === value) option.classList.add("is-selected");

      option.addEventListener("click", () => {
        state[picker.name] = value;
        picker.button.textContent = value;
        closePickerField(picker.field);
        save();
      });

      group.append(option);
    });

    picker.menu.append(group);
  }

  function renderMultiTags(picker) {
    picker.field.querySelectorAll(":scope > em").forEach((el) => el.remove());

    const selected = state[picker.stateKey];
    const countEl = picker.field.querySelector(".picker-count");
    if (countEl) countEl.textContent = String(selected.length);

    const counterEl = picker.field.querySelector(":scope > b");

    selected.forEach((value) => {
      const em = document.createElement("em");
      em.textContent = value;

      const close = document.createElement("i");
      close.className = "tag-close";
      close.setAttribute("role", "button");
      close.setAttribute("tabindex", "0");
      close.setAttribute("aria-label", `Remove ${value}`);
      close.addEventListener("click", (event) => {
        event.stopPropagation();
        state[picker.stateKey] = state[picker.stateKey].filter((v) => v !== value);
        renderMultiTags(picker);
        renderMultiPicker(picker);
        save();
      });
      close.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          close.click();
        }
      });

      em.append(close);
      picker.field.insertBefore(em, counterEl);
    });
  }

  function renderMultiPicker(picker) {
    picker.menu.replaceChildren();

    const selected = state[picker.stateKey];
    const group = document.createElement("div");
    group.className = "combo-group";

    multiPickerOptions[picker.name].forEach((value) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "combo-option";
      option.setAttribute("role", "option");
      option.textContent = value;

      const isSelected = selected.includes(value);
      if (isSelected) option.classList.add("is-selected");

      const atMax = selected.length >= picker.max;
      if (atMax && !isSelected) {
        option.classList.add("is-disabled");
        option.disabled = true;
        option.title = `You can choose up to ${picker.max}.`;
      }

      option.addEventListener("click", () => {
        const next = isSelected
          ? selected.filter((v) => v !== value)
          : [...selected, value];
        state[picker.stateKey] = next;
        renderMultiTags(picker);
        renderMultiPicker(picker);
        save();
      });

      group.append(option);
    });

    picker.menu.append(group);
  }

  function openPickerField(field, name) {
    closeAllOpenPickers();
    const picker = pickers.find((p) => p.name === name);
    if (picker) renderPicker(picker);
    field.classList.add("is-open");
  }

  function openMultiPickerField(field, name) {
    closeAllOpenPickers();
    const picker = multiPickers.find((p) => p.name === name);
    if (picker) renderMultiPicker(picker);
    field.classList.add("is-open");
    field.setAttribute("aria-expanded", "true");
  }

  function closePickerField(field) {
    field.classList.remove("is-open");
    if (field.matches("[data-multi]")) field.setAttribute("aria-expanded", "false");
  }

  function closeAllOpenPickers() {
    document.querySelectorAll(".field.is-open").forEach(closePickerField);
  }

  function setupDateTriggers() {
    document.querySelectorAll(".date-trigger").forEach((trigger) => {
      const wrapper = trigger.parentElement;
      const visible = wrapper.querySelector("input:not(.date-source)");
      const source = wrapper.querySelector(".date-source");
      if (!visible || !source) return;

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        if (visible.disabled) return;
        source.value = displayToISO(visible.value);
        if (typeof source.showPicker === "function") {
          try {
            source.showPicker();
            return;
          } catch (e) {}
        }
        source.focus();
        source.click();
      });

      source.addEventListener("change", () => {
        const display = isoToDisplay(source.value);
        if (!display) return;
        visible.value = display;
        visible.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
  }

  function displayToISO(display) {
    const match = String(display || "").trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return "";
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  function isoToDisplay(iso) {
    const match = String(iso || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "";
    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  function countFilledRequired() {
    let count = 0;
    const make = document.querySelector("#make-input");
    const model = document.querySelector("#model-input");
    const year = document.querySelector("#year-input");
    const hull = document.querySelector("#hull-number");
    if (make && make.value.trim()) count++;
    if (model && model.value.trim()) count++;
    if (year && year.value.trim()) count++;
    if (hull && hull.value.trim()) count++;
    if (state.vesselLocation) count++;
    if (state.vesselTypes.length > 0) count++;
    if ((state.price || "").trim()) count++;
    if (state.importDutyPaid) count++;
    if (state.countryOfDuty) count++;
    return count;
  }

  function heatLevelFor(filled, total) {
    if (filled <= 0) return 1;
    const ratio = filled / total;
    if (ratio < 0.25) return 2;
    if (ratio < 0.5) return 3;
    if (ratio < 0.85) return 4;
    return 5;
  }

  function refreshHeat() {
    if (!heatEl) return;
    const filled = countFilledRequired();
    const level = heatLevelFor(filled, REQUIRED_TOTAL);
    const percent = Math.round((filled / REQUIRED_TOTAL) * 100);

    heatEl.dataset.heatLevel = String(level);
    document.body.dataset.heatLevel = String(level);
    heatEl.style.setProperty("--heat-progress", `${percent}%`);

    const def = HEAT_LEVELS[level];
    if (heatLabelEl) heatLabelEl.textContent = def.label;
    if (heatGlyphEl) {
      if (def.image) {
        heatGlyphEl.replaceChildren();
        const img = document.createElement("img");
        img.src = def.image;
        img.alt = "";
        img.width = 28;
        img.height = 28;
        img.className = "heat-icon-image";
        heatGlyphEl.append(img);
      } else {
        heatGlyphEl.textContent = def.icon;
      }
    }

    if (lastHeatLevel !== null && lastHeatLevel !== level) {
      heatEl.classList.remove("is-pulsing");
      void heatEl.offsetWidth;
      heatEl.classList.add("is-pulsing");
      clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => heatEl.classList.remove("is-pulsing"), 700);
    }
    lastHeatLevel = level;
  }

  function setupHeatIndicator() {
    heatEl = document.querySelector(".heat");
    if (!heatEl) return;
    heatLabelEl = heatEl.querySelector(".heat-label");
    heatGlyphEl = heatEl.querySelector(".heat-icon-glyph");

    const form = document.querySelector(".form");
    if (form) {
      form.addEventListener("input", refreshHeat);
      form.addEventListener("change", refreshHeat);
      form.addEventListener("click", refreshHeat);
    }
    refreshHeat();
  }

  function setupCurrencyPicker() {
    const trigger = document.querySelector("[data-currency-picker]");
    if (!trigger) return;
    const field = trigger.closest(".field");
    const menu = field.querySelector(".currency-menu");
    const valueEl = trigger.querySelector(".currency-value");
    if (!field || !menu || !valueEl) return;

    function render() {
      valueEl.textContent = state.currency;
      menu.replaceChildren();
      const group = document.createElement("div");
      group.className = "combo-group";
      currencies.forEach((value) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "combo-option";
        option.setAttribute("role", "option");
        option.textContent = value;
        if (state.currency === value) option.classList.add("is-selected");
        option.addEventListener("click", () => {
          state.currency = value;
          valueEl.textContent = value;
          close();
          save();
        });
        group.append(option);
      });
      menu.append(group);
    }

    function open() {
      closeAllOpenPickers();
      render();
      field.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    }

    function close() {
      field.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }

    function toggle() {
      if (field.classList.contains("is-open")) close();
      else open();
    }

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
      if (event.key === "Escape") close();
    });

    render();
  }
})();
