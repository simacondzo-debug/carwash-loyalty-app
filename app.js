const STORAGE_KEY = "the-carwash-at-shell-live-state-v1";
const ACTIVE_CUSTOMER_KEY = "the-carwash-at-shell-active-customer";
const RESPONSE_LOOKUP_KEY = "the-carwash-at-shell-response-phone";
const SEEN_REPLIES_KEY = "the-carwash-at-shell-seen-replies-v1";
const SEEN_BOOKING_ALERTS_KEY = "the-carwash-at-shell-seen-booking-alerts-v1";
const SEEN_STAMP_ALERTS_KEY = "the-carwash-seen-stamp-alerts-v1";
const OWNER_SEEN_BOOKINGS_KEY = "the-carwash-at-shell-owner-seen-bookings-v1";
const OWNER_SEEN_FEEDBACK_KEY = "the-carwash-at-shell-owner-seen-feedback-v1";
const OWNER_CREDENTIAL_KEY = "the-carwash-at-shell-owner-credential-v1";
const INSTALL_HIDDEN_KEY = "the-carwash-install-button-hidden-v1";
const STATE_API_URL = "api/state";
const STAMPS_FOR_FREE_WASH = 9;
const REQUIRED_DRAW_WASHES = 5;
const DRAW_WINDOW_DAYS = 60;
const DRAW_PRIZE = "1 free standard wash valid for 30 days";
const OLD_DRAW_PRIZE = "1 free wash every month for a year";
const MENU_CSV_URL = "assets/products-12-05-2026.csv?v=duplicatefix1";
const FALLBACK_MENU_PRODUCTS = [
  { id: "taxi-minibus-2", name: "TAXI / MINIBUS", description: "", price: 80, category: "WASH & GO", sku: "T/M003", vatEnabled: true },
  { id: "suv-double-cab-3", name: "SUV / DOUBLE CAB", description: "", price: 65, category: "WASH & GO", sku: "S/DC004", vatEnabled: true },
  { id: "sedan-hatch-1", name: "SEDAN / HATCH", description: "", price: 55, category: "WASH & GO", sku: "S/H002", vatEnabled: true },
  { id: "taxi-minibus-1", name: "TAXI / MINIVAN", description: "", price: 120, category: "OUTSIDE ONLY", sku: "T/M002", vatEnabled: true },
  { id: "suv-double-cab-2", name: "SUV / DOUBLE CAB", description: "", price: 85, category: "OUTSIDE ONLY", sku: "S/DC003", vatEnabled: true },
  { id: "sedan-hatch", name: "SEDAN / HATCH", description: "", price: 75, category: "OUTSIDE ONLY", sku: "S/H001", vatEnabled: true },
  { id: "taxi-minibus", name: "TAXI / MINIVAN", description: "", price: 80, category: "INSIDE ONLY", sku: "T/M001", vatEnabled: true },
  { id: "suv-double-cab-1", name: "SUV / DOUBLE CAB", description: "", price: 65, category: "INSIDE ONLY", sku: "S/DC002", vatEnabled: true },
  { id: "hatch-sedan", name: "HATCH / SEDAN", description: "", price: 55, category: "INSIDE ONLY", sku: "H/S001", vatEnabled: true },
  { id: "aurum", name: "AURUM", description: "LOCAL ACCOUNT", price: 100, category: "FULL WASHES", sku: "AUR001", vatEnabled: true },
  { id: "minibus-taxi", name: "TAXI / MINIVAN", description: "", price: 160, category: "FULL WASHES", sku: "M/T001", vatEnabled: true },
  { id: "suv-double-cab", name: "SUV / DOUBLE CAB", description: "", price: 120, category: "FULL WASHES", sku: "S/DC001", vatEnabled: true },
  { id: "full-wash-hatchsedan", name: "HATCH/SEDAN", description: "", price: 100, category: "FULL WASHES", sku: "FWH001", vatEnabled: true },
];

const emptyState = {
  customers: [],
  activities: [],
  draws: [],
  feedback: [],
  bookings: [],
  menuProducts: [],
  notice: {
    active: false,
    type: "Open",
    message: "",
    expiresOn: "",
    updatedAt: "",
  },
};

let state = migrateState(loadState());
let currentMode = "customer";
let ownerUnlocked = false;
let ownerSetupRequested = new URLSearchParams(window.location.search).get("owner") === "setup";
let responseLookupPhone = localStorage.getItem(RESPONSE_LOOKUP_KEY) || "";
let pendingReplyPopup = null;
let pendingBookingAlert = null;
let pendingFeedbackThanks = null;
let pendingStampAlert = null;
let pendingOwnerAlert = null;
let deferredInstallPrompt = null;
let menuItems = [];
let menuStatus = "loading";
let sharedStateReady = false;
let sharedStateVersion = 0;
let suppressSharedSave = false;
let sharedStateDirty = false;
let sharedStateLoading = false;
let sharedSaveTimer = null;

const elements = {
  activityList: document.querySelector("#activityList"),
  activityPanel: document.querySelector("#activity"),
  aboutModeButton: document.querySelector("#aboutModeButton"),
  aboutView: document.querySelector("#aboutView"),
  bookingAlert: document.querySelector("#bookingAlert"),
  bookingForm: document.querySelector("#bookingForm"),
  bookingName: document.querySelector("#bookingName"),
  bookingNote: document.querySelector("#bookingNote"),
  bookingPhone: document.querySelector("#bookingPhone"),
  bookingPlate: document.querySelector("#bookingPlate"),
  bookingServiceSelect: document.querySelector("#bookingServiceSelect"),
  bookingAlertCloseButton: document.querySelector("#bookingAlertCloseButton"),
  bookingAlertModal: document.querySelector("#bookingAlertModal"),
  bookingAlertModalMessage: document.querySelector("#bookingAlertModalMessage"),
  bookingAlertModalMeta: document.querySelector("#bookingAlertModalMeta"),
  bookingAlertModalTitle: document.querySelector("#bookingAlertModalTitle"),
  bookingAlertViewButton: document.querySelector("#bookingAlertViewButton"),
  bookModeButton: document.querySelector("#bookModeButton"),
  bookView: document.querySelector("#bookView"),
  clearNoticeButton: document.querySelector("#clearNoticeButton"),
  customerBookingStatus: document.querySelector("#customerBookingStatus"),
  customerAppQr: document.querySelector("#customerAppQr"),
  customerAppQrLink: document.querySelector("#customerAppQrLink"),
  customerCardDisplay: document.querySelector("#customerCardDisplay"),
  customerAlert: document.querySelector("#customerAlert"),
  customerCode: document.querySelector("#customerCode"),
  customerCodeName: document.querySelector("#customerCodeName"),
  customerForm: document.querySelector("#customerForm"),
  customerList: document.querySelector("#customerList"),
  customerModeButton: document.querySelector("#customerModeButton"),
  customerName: document.querySelector("#customerName"),
  customerPhone: document.querySelector("#customerPhone"),
  customerPlate: document.querySelector("#customerPlate"),
  customerReplyPreview: document.querySelector("#customerReplyPreview"),
  customerWhatsappOptIn: document.querySelector("#customerWhatsappOptIn"),
  customerWelcomeCard: document.querySelector("#customerWelcomeCard"),
  customerView: document.querySelector("#customerView"),
  didYouKnowModeButton: document.querySelector("#didYouKnowModeButton"),
  didYouKnowView: document.querySelector("#didYouKnowView"),
  installButton: document.querySelector("#installButton"),
  drawResult: document.querySelector("#drawResult"),
  drawSummary: document.querySelector("#drawSummary"),
  feedbackAlert: document.querySelector("#feedbackAlert"),
  feedbackForm: document.querySelector("#feedbackForm"),
  feedbackList: document.querySelector("#feedbackList"),
  feedbackMessage: document.querySelector("#feedbackMessage"),
  feedbackModeButton: document.querySelector("#feedbackModeButton"),
  feedbackName: document.querySelector("#feedbackName"),
  feedbackPhone: document.querySelector("#feedbackPhone"),
  feedbackRating: document.querySelector("#feedbackRating"),
  feedbackThanksCloseButton: document.querySelector("#feedbackThanksCloseButton"),
  feedbackThanksModal: document.querySelector("#feedbackThanksModal"),
  feedbackThanksModalMessage: document.querySelector("#feedbackThanksModalMessage"),
  feedbackThanksModalMeta: document.querySelector("#feedbackThanksModalMeta"),
  feedbackThanksViewButton: document.querySelector("#feedbackThanksViewButton"),
  feedbackType: document.querySelector("#feedbackType"),
  feedbackView: document.querySelector("#feedbackView"),
  luckyDrawList: document.querySelector("#luckyDrawList"),
  manageAlert: document.querySelector("#manageAlert"),
  manageCustomerName: document.querySelector("#manageCustomerName"),
  manageCustomerPhone: document.querySelector("#manageCustomerPhone"),
  manageCustomerSearch: document.querySelector("#manageCustomerSearch"),
  manageCustomerSearchButton: document.querySelector("#manageCustomerSearchButton"),
  manageCustomerSelected: document.querySelector("#manageCustomerSelected"),
  manageNewVehicle: document.querySelector("#manageNewVehicle"),
  manageWhatsappOptIn: document.querySelector("#manageWhatsappOptIn"),
  manageVehicleSelect: document.querySelector("#manageVehicleSelect"),
  menuEditorList: document.querySelector("#menuEditorList"),
  menuCategoryFilter: document.querySelector("#menuCategoryFilter"),
  menuList: document.querySelector("#menuList"),
  menuModeButton: document.querySelector("#menuModeButton"),
  menuSearch: document.querySelector("#menuSearch"),
  menuSummary: document.querySelector("#menuSummary"),
  menuView: document.querySelector("#menuView"),
  metricBookings: document.querySelector("#metricBookings"),
  metricCustomers: document.querySelector("#metricCustomers"),
  metricDrawEntries: document.querySelector("#metricDrawEntries"),
  metricPaidWashes: document.querySelector("#metricPaidWashes"),
  metricReady: document.querySelector("#metricReady"),
  metricRedeemed: document.querySelector("#metricRedeemed"),
  noticeActive: document.querySelector("#noticeActive"),
  noticeAlert: document.querySelector("#noticeAlert"),
  noticeExpires: document.querySelector("#noticeExpires"),
  noticeMessage: document.querySelector("#noticeMessage"),
  noticeMessageInput: document.querySelector("#noticeMessageInput"),
  noticeMeta: document.querySelector("#noticeMeta"),
  noticeStatus: document.querySelector("#noticeStatus"),
  noticeTitle: document.querySelector("#noticeTitle"),
  noticeType: document.querySelector("#noticeType"),
  ownerAddCustomerAlert: document.querySelector("#ownerAddCustomerAlert"),
  ownerAddCustomerForm: document.querySelector("#ownerAddCustomerForm"),
  ownerAddCustomerInvite: document.querySelector("#ownerAddCustomerInvite"),
  ownerAddCustomerName: document.querySelector("#ownerAddCustomerName"),
  ownerAddCustomerPhone: document.querySelector("#ownerAddCustomerPhone"),
  ownerAddCustomerPlate: document.querySelector("#ownerAddCustomerPlate"),
  ownerAddWhatsappOptIn: document.querySelector("#ownerAddWhatsappOptIn"),
  ownerAlert: document.querySelector("#ownerAlert"),
  ownerAlertCloseButton: document.querySelector("#ownerAlertCloseButton"),
  ownerAlertModal: document.querySelector("#ownerAlertModal"),
  ownerAlertModalLabel: document.querySelector("#ownerAlertModalLabel"),
  ownerAlertModalMessage: document.querySelector("#ownerAlertModalMessage"),
  ownerAlertModalMeta: document.querySelector("#ownerAlertModalMeta"),
  ownerAlertModalTitle: document.querySelector("#ownerAlertModalTitle"),
  ownerAlertViewButton: document.querySelector("#ownerAlertViewButton"),
  offlineBanner: document.querySelector("#offlineBanner"),
  ownerBackupAlert: document.querySelector("#ownerBackupAlert"),
  ownerBackupButton: document.querySelector("#ownerBackupButton"),
  ownerBackupPanel: document.querySelector("#ownerBackupPanel"),
  ownerBookingClearButton: document.querySelector("#ownerBookingClearButton"),
  ownerBookingDate: document.querySelector("#ownerBookingDate"),
  ownerBookingFilter: document.querySelector("#ownerBookingFilter"),
  ownerBookingList: document.querySelector("#ownerBookingList"),
  ownerBookingSearch: document.querySelector("#ownerBookingSearch"),
  ownerBookingStats: document.querySelector("#ownerBookingStats"),
  ownerBookingSummary: document.querySelector("#ownerBookingSummary"),
  ownerBookingsPanel: document.querySelector("#ownerBookingsPanel"),
  ownerCustomerSearch: document.querySelector("#ownerCustomerSearch"),
  ownerCustomerSearchButton: document.querySelector("#ownerCustomerSearchButton"),
  ownerCustomerSelect: document.querySelector("#ownerCustomerSelect"),
  ownerCustomerBookPanel: document.querySelector("#ownerCustomerBookPanel"),
  ownerDrawPanel: document.querySelector("#ownerDrawPanel"),
  ownerFeedbackPanel: document.querySelector("#ownerFeedbackPanel"),
  ownerForgetButton: document.querySelector("#ownerForgetButton"),
  ownerLockButton: document.querySelector("#ownerLockButton"),
  ownerLockPanel: document.querySelector("#ownerLockPanel"),
  ownerLoginAlert: document.querySelector("#ownerLoginAlert"),
  ownerManageForm: document.querySelector("#ownerManageForm"),
  ownerManagePanel: document.querySelector("#ownerManagePanel"),
  ownerModeButton: document.querySelector("#ownerModeButton"),
  ownerNewProductButton: document.querySelector("#ownerNewProductButton"),
  ownerNoticeForm: document.querySelector("#ownerNoticeForm"),
  ownerProductAlert: document.querySelector("#ownerProductAlert"),
  ownerProductCategory: document.querySelector("#ownerProductCategory"),
  ownerProductDescription: document.querySelector("#ownerProductDescription"),
  ownerProductForm: document.querySelector("#ownerProductForm"),
  ownerProductName: document.querySelector("#ownerProductName"),
  ownerProductPrice: document.querySelector("#ownerProductPrice"),
  ownerProductSelect: document.querySelector("#ownerProductSelect"),
  ownerProductSku: document.querySelector("#ownerProductSku"),
  ownerRemoveProductButton: document.querySelector("#ownerRemoveProductButton"),
  ownerSecurePanels: document.querySelectorAll("[data-owner-secure]"),
  ownerTodayLabel: document.querySelector("#ownerTodayLabel"),
  ownerNote: document.querySelector("#ownerNote"),
  ownerPlate: document.querySelector("#ownerPlate"),
  ownerService: document.querySelector("#ownerService"),
  ownerSetupButton: document.querySelector("#ownerSetupButton"),
  ownerSetupPanel: document.querySelector("#ownerSetupPanel"),
  ownerUnlockButton: document.querySelector("#ownerUnlockButton"),
  ownerUnlockPanel: document.querySelector("#ownerUnlockPanel"),
  ownerVehicleSelect: document.querySelector("#ownerVehicleSelect"),
  ownerVerifyForm: document.querySelector("#ownerVerifyForm"),
  ownerVerifyPanel: document.querySelector("#ownerVerifyPanel"),
  ownerView: document.querySelector("#ownerView"),
  ownerWashDate: document.querySelector("#ownerWashDate"),
  ownerWhatsappOnVerify: document.querySelector("#ownerWhatsappOnVerify"),
  customerNoticeBanner: document.querySelector("#customerNoticeBanner"),
  redeemFreeButton: document.querySelector("#redeemFreeButton"),
  removeCustomerButton: document.querySelector("#removeCustomerButton"),
  removeVehicleButton: document.querySelector("#removeVehicleButton"),
  responseLookupForm: document.querySelector("#responseLookupForm"),
  responseLookupPhone: document.querySelector("#responseLookupPhone"),
  rulesModeButton: document.querySelector("#rulesModeButton"),
  rulesView: document.querySelector("#rulesView"),
  customerResponseList: document.querySelector("#customerResponseList"),
  replyModal: document.querySelector("#replyModal"),
  replyModalCloseButton: document.querySelector("#replyModalCloseButton"),
  replyModalDate: document.querySelector("#replyModalDate"),
  replyModalMessage: document.querySelector("#replyModalMessage"),
  replyModalViewButton: document.querySelector("#replyModalViewButton"),
  revokeWashButton: document.querySelector("#revokeWashButton"),
  runDrawButton: document.querySelector("#runDrawButton"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  stampAlertCloseButton: document.querySelector("#stampAlertCloseButton"),
  stampAlertModal: document.querySelector("#stampAlertModal"),
  stampAlertModalCard: document.querySelector("#stampAlertModalCard"),
  stampAlertModalMessage: document.querySelector("#stampAlertModalMessage"),
  stampAlertModalMeta: document.querySelector("#stampAlertModalMeta"),
  stampAlertModalTitle: document.querySelector("#stampAlertModalTitle"),
  stampAlertViewButton: document.querySelector("#stampAlertViewButton"),
  whatsappAlertList: document.querySelector("#whatsappAlertList"),
  whatsappAlertSummary: document.querySelector("#whatsappAlertSummary"),
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return structuredClone(emptyState);
  }

  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(emptyState);
  }
}

function migrateState(loadedState) {
  const nextState = {
    customers: Array.isArray(loadedState.customers) ? loadedState.customers : [],
    activities: Array.isArray(loadedState.activities) ? loadedState.activities : [],
    draws: Array.isArray(loadedState.draws) ? loadedState.draws : [],
    feedback: Array.isArray(loadedState.feedback) ? loadedState.feedback : [],
    bookings: Array.isArray(loadedState.bookings) ? loadedState.bookings : [],
    menuProducts: Array.isArray(loadedState.menuProducts) ? loadedState.menuProducts : [],
    notice:
      loadedState.notice && typeof loadedState.notice === "object"
        ? {
            ...emptyState.notice,
            ...loadedState.notice,
            active: Boolean(loadedState.notice.active),
            message: String(loadedState.notice.message || ""),
          }
        : { ...emptyState.notice },
  };

  nextState.customers = nextState.customers.map((customer, index) => {
    const vehicles = normalizeVehicleList(customer.vehicles, customer.plate);
    const hasPhone = Boolean(normalizePhone(customer.phone));
    return {
      ...customer,
      phone: String(customer.phone || ""),
      manualCode: normalizeManualCodeForBrand(
        customer.manualCode || (hasPhone ? "" : `TCW-WALK-${String(index + 1).padStart(3, "0")}`),
      ),
      ownerAdded: Boolean(customer.ownerAdded),
      facebookFollowed: Boolean(customer.facebookFollowed),
      lifetimePaidWashes: Number(customer.lifetimePaidWashes || 0),
      freeWashesRedeemed: Number(customer.freeWashesRedeemed || 0),
      whatsappOptIn: Boolean(customer.whatsappOptIn) && hasPhone,
      stampBalance: Number(customer.stampBalance || 0),
      vehicles,
      plate: vehicles[0] || "",
      updatedAt: String(customer.updatedAt || ""),
    };
  });

  nextState.bookings = nextState.bookings.map((booking) => ({
    ...booking,
    id: booking.id || crypto.randomUUID(),
    status: booking.status || "pending",
    queueNumber: String(booking.queueNumber || ""),
    date: booking.date || today(),
    updatedAt: booking.updatedAt || booking.date || today(),
  }));

  nextState.menuProducts = nextState.menuProducts
    .map(normalizeMenuItem)
    .filter((item) => item.name && item.category);

  return nextState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueSharedStateSave();
}

function cacheStateLocally() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function stateItemTime(value = {}) {
  const parsed = Date.parse(
    value.updatedAt || value.replyDate || value.date || value.lastWash || value.joined || "",
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeByKey(remoteItems = [], localItems = [], keyForItem = (item) => item.id) {
  const merged = new Map();

  [...remoteItems, ...localItems].forEach((item) => {
    const key = keyForItem(item);
    if (!key) return;
    const existing = merged.get(key);
    if (!existing || stateItemTime(item) >= stateItemTime(existing)) {
      merged.set(key, item);
    }
  });

  return [...merged.values()];
}

function mergeLoadedState(localState, remoteState) {
  const local = migrateState(localState || emptyState);
  const remote = migrateState(remoteState || emptyState);
  return {
    ...remote,
    customers: mergeByKey(remote.customers, local.customers, (customer) =>
      customerPhoneKey(customer.phone) || customerIdentityKey(customer) || customer.id,
    ),
    activities: mergeByKey(remote.activities, local.activities),
    bookings: mergeByKey(remote.bookings, local.bookings),
    draws: mergeByKey(remote.draws, local.draws, (draw) => draw.id || `${draw.month}:${draw.customerId}`),
    feedback: mergeByKey(remote.feedback, local.feedback),
    menuProducts: remote.menuProducts.length ? remote.menuProducts : local.menuProducts,
    notice: stateItemTime(local.notice) > stateItemTime(remote.notice) ? local.notice : remote.notice,
  };
}

async function fetchSharedState() {
  const response = await fetch(STATE_API_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Shared database unavailable.");
  return response.json();
}

async function loadSharedState() {
  if (sharedStateLoading) return false;
  sharedStateLoading = true;
  try {
    const payload = await fetchSharedState();
    if (payload?.state) {
      const mergedState = mergeLoadedState(state, payload.state);
      const changed = sharedStateDirty || JSON.stringify(mergedState) !== JSON.stringify(payload.state);
      state = mergedState;
      sharedStateVersion = Number(payload.version || 0);
      sharedStateReady = true;
      cacheStateLocally();
      if (changed) queueSharedStateSave();
      return true;
    }
  } catch {
    sharedStateReady = false;
  } finally {
    sharedStateLoading = false;
  }
  return false;
}

function queueSharedStateSave() {
  if (suppressSharedSave) return;
  sharedStateDirty = true;
  if (!sharedStateReady) {
    loadSharedState();
    return;
  }
  clearTimeout(sharedSaveTimer);
  sharedSaveTimer = setTimeout(pushSharedState, 250);
}

async function pushSharedState() {
  if (!sharedStateReady || suppressSharedSave) return;
  try {
    const response = await fetch(STATE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: sharedStateVersion, state }),
    });
    if (!response.ok) throw new Error("Could not save shared state.");
    const payload = await response.json();
    if (payload?.state) {
      state = mergeLoadedState(state, payload.state);
      cacheStateLocally();
    }
    sharedStateVersion = Number(payload.version || sharedStateVersion);
    sharedStateDirty = false;
  } catch {
    sharedStateReady = false;
    sharedStateDirty = true;
  }
}

async function refreshSharedState() {
  if (!sharedStateReady) {
    const loaded = await loadSharedState();
    if (loaded) render();
    return;
  }
  try {
    const payload = await fetchSharedState();
    const nextVersion = Number(payload.version || 0);
    if (!payload.state) return;
    if (nextVersion <= sharedStateVersion) {
      if (sharedStateDirty) queueSharedStateSave();
      return;
    }
    const mergedState = mergeLoadedState(state, payload.state);
    const shouldPushMerged = sharedStateDirty || JSON.stringify(mergedState) !== JSON.stringify(payload.state);
    suppressSharedSave = true;
    state = mergedState;
    sharedStateVersion = nextVersion;
    cacheStateLocally();
    render();
    if (shouldPushMerged) {
      setTimeout(queueSharedStateSave, 0);
    }
  } catch {
    sharedStateReady = false;
    sharedStateDirty = true;
  } finally {
    suppressSharedSave = false;
  }
}

function activateLinkedCustomer() {
  const params = new URLSearchParams(window.location.search);
  const customerParam = params.get("customer");
  if (!customerParam) return;
  const phoneKey = customerPhoneKey(customerParam);
  const customer = state.customers.find(
    (item) => item.id === customerParam || customerPhoneKey(item.phone) === phoneKey,
  );
  if (customer) {
    if (params.get("welcome") === "owner") {
      customer.ownerAdded = true;
      touchCustomer(customer);
      cacheStateLocally();
      queueSharedStateSave();
    }
    localStorage.setItem(ACTIVE_CUSTOMER_KEY, customer.id);
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function displayDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function displayDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function validAppDate(dateString) {
  const value = String(dateString || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-ZA").format(value);
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "Ask";
  return `R${formatNumber(value)}`;
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseProductCsv(text) {
  const lines = String(text)
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .filter((line) => line.trim());

  if (lines[0]?.toLowerCase().startsWith("sep=")) {
    lines.shift();
  }

  const headers = parseCsvLine(lines.shift() || "");
  return lines.map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = cells[index] || "";
      return row;
    }, {});
  });
}

function normalizeMenuItem(row) {
  const name = String(row.name || row["Product Name"] || "").trim();
  const category = String(row.category || row.Category || "Other").trim() || "Other";
  const rawPrice = String(row.price ?? row["Default Price"] ?? "").replace(/[^\d.-]/g, "");
  const price = rawPrice === "" ? NaN : Number(rawPrice);

  return {
    id: String(row.id || row["Product ID"] || crypto.randomUUID()).trim(),
    name,
    description: String(row.description || row.Description || "").trim(),
    price,
    category,
    sku: String(row.sku || row.SKU || "").trim(),
    vatEnabled: Boolean(row.vatEnabled) || String(row["VAT Enabled"] || "").toLowerCase() === "yes",
    updatedAt: String(row.updatedAt || ""),
  };
}

function menuCategories() {
  return [...new Set(menuItems.map((item) => item.category))].sort((a, b) =>
    a.localeCompare(b),
  );
}

async function loadMenu() {
  menuStatus = "loading";
  renderMenu();

  if (state.menuProducts.length) {
    menuItems = state.menuProducts.map(normalizeMenuItem);
    menuStatus = "ready";
    render();
    return;
  }

  try {
    const response = await fetch(MENU_CSV_URL);
    if (!response.ok) throw new Error("Menu CSV could not be loaded.");
    const rows = parseProductCsv(await response.text());
    menuItems = rows.map(normalizeMenuItem).filter((item) => item.name && item.category);
    if (!menuItems.length) throw new Error("Menu CSV did not contain products.");
    state.menuProducts = menuItems;
    menuStatus = "ready";
    saveState();
  } catch {
    menuItems = FALLBACK_MENU_PRODUCTS.map(normalizeMenuItem);
    state.menuProducts = menuItems;
    menuStatus = "ready";
    saveState();
  }

  render();
}

function randomChallenge() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBuffer(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function webAuthnAvailable() {
  return Boolean(window.isSecureContext && window.PublicKeyCredential && navigator.credentials);
}

async function platformLockAvailable() {
  if (!webAuthnAvailable()) return false;
  if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return true;
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}

function readOwnerCredential() {
  try {
    const credential = JSON.parse(localStorage.getItem(OWNER_CREDENTIAL_KEY) || "null");
    return credential?.id && credential?.rawId ? credential : null;
  } catch {
    return null;
  }
}

function hasOwnerCredential() {
  return Boolean(readOwnerCredential());
}

function ownerAccessAvailable() {
  return hasOwnerCredential() || ownerSetupRequested;
}

function readSeenReplies() {
  try {
    const saved = JSON.parse(localStorage.getItem(SEEN_REPLIES_KEY) || "[]");
    return Array.isArray(saved) ? new Set(saved) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenReplies(seenReplies) {
  localStorage.setItem(SEEN_REPLIES_KEY, JSON.stringify([...seenReplies]));
}

function readSeenBookingAlerts() {
  try {
    const saved = JSON.parse(localStorage.getItem(SEEN_BOOKING_ALERTS_KEY) || "[]");
    return Array.isArray(saved) ? new Set(saved) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenBookingAlerts(seenAlerts) {
  localStorage.setItem(SEEN_BOOKING_ALERTS_KEY, JSON.stringify([...seenAlerts]));
}

function readSeenStampAlerts() {
  try {
    const saved = JSON.parse(localStorage.getItem(SEEN_STAMP_ALERTS_KEY) || "[]");
    return Array.isArray(saved) ? new Set(saved) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenStampAlerts(seenAlerts) {
  localStorage.setItem(SEEN_STAMP_ALERTS_KEY, JSON.stringify([...seenAlerts]));
}

function readSeenOwnerAlerts(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(saved) ? new Set(saved) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenOwnerAlerts(storageKey, seenAlerts) {
  localStorage.setItem(storageKey, JSON.stringify([...seenAlerts]));
}

function replyKey(item) {
  return `${item.id}:${item.replyDate || ""}`;
}

function bookingAlertKey(booking) {
  return `${booking.id}:${booking.status}:${booking.queueNumber || ""}`;
}

function stampAlertKey(activity) {
  return `${activity.id}:${activity.type}:${activity.updatedAt || activity.date || ""}`;
}

function ownerBookingAlertKey(booking) {
  return `${booking.id}:${booking.status}:${booking.updatedAt || booking.date || ""}`;
}

function ownerFeedbackAlertKey(item) {
  return `${item.id}:${item.date || ""}`;
}

function markReplySeen(item) {
  if (!item) return;
  const seenReplies = readSeenReplies();
  seenReplies.add(replyKey(item));
  saveSeenReplies(seenReplies);
}

function markBookingAlertSeen(booking) {
  if (!booking) return;
  const seenAlerts = readSeenBookingAlerts();
  seenAlerts.add(bookingAlertKey(booking));
  saveSeenBookingAlerts(seenAlerts);
}

function markStampAlertSeen(activity) {
  if (!activity) return;
  const seenAlerts = readSeenStampAlerts();
  seenAlerts.add(stampAlertKey(activity));
  saveSeenStampAlerts(seenAlerts);
}

function normalizePhone(value) {
  return String(value).replace(/\D/g, "");
}

function customerPhoneKey(value) {
  let digits = normalizePhone(value);
  if (!digits) return "";
  if (digits.startsWith("0027")) digits = digits.slice(2);
  if (digits.startsWith("27") && digits.length >= 11) return digits;
  if (digits.startsWith("0") && digits.length >= 10) return `27${digits.slice(1)}`;
  return digits;
}

function normalizeCustomerName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function customerIdentityKey(customer) {
  const name = normalizeCustomerName(customer.name);
  if (!name) return "";
  const plate = primaryPlate(customer) || normalizeVehicleList(customer.vehicles, customer.plate)[0] || "";
  return plate ? `${name}:${plate}` : name;
}

function whatsappNumber(value) {
  const digits = customerPhoneKey(value);
  if (!digits) return "";
  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return `27${digits.slice(1)}`;
  return `27${digits}`;
}

function normalizePlate(value) {
  return String(value).trim().toUpperCase().replace(/\s+/g, " ");
}

function normalizeVehicleList(vehicles = [], fallbackPlate = "") {
  const values = Array.isArray(vehicles) ? vehicles : [];
  const normalized = [...values, fallbackPlate]
    .map(normalizePlate)
    .filter(Boolean);
  return [...new Set(normalized)];
}

function primaryPlate(customer) {
  return customer.vehicles?.[0] || customer.plate || "";
}

function touchCustomer(customer) {
  if (customer) customer.updatedAt = nowIso();
}

function addVehicleToCustomer(customer, plate) {
  const normalizedPlate = normalizePlate(plate);
  if (!normalizedPlate) return false;
  const vehicles = normalizeVehicleList(customer.vehicles, customer.plate);
  if (!vehicles.includes(normalizedPlate)) {
    vehicles.push(normalizedPlate);
    customer.updatedAt = nowIso();
  }
  customer.vehicles = vehicles;
  customer.plate = vehicles[0] || "";
  return true;
}

function vehicleLabel(customer) {
  const vehicles = normalizeVehicleList(customer.vehicles, customer.plate);
  if (!vehicles.length) return "No vehicles saved";
  if (vehicles.length === 1) return vehicles[0];
  return `${vehicles.length} vehicles: ${vehicles.join(", ")}`;
}

function normalizeManualCodeForBrand(code) {
  return String(code || "").replace(/^SHL-WALK-/, "TCW-WALK-");
}

function legacyCustomerCode(customer) {
  const phone = normalizePhone(customer.phone);
  if (phone) return `SHL-${phone.slice(-4).padStart(4, "0")}`;
  const manualCode = normalizeManualCodeForBrand(customer.manualCode);
  return manualCode ? manualCode.replace(/^TCW-WALK-/, "SHL-WALK-") : "";
}

function nextManualCustomerCode() {
  const highest = state.customers.reduce((max, customer) => {
    const match = String(customer.manualCode || "").match(/^(?:SHL|TCW)-WALK-(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `TCW-WALK-${String(highest + 1).padStart(3, "0")}`;
}

function customerCode(customer) {
  const phone = normalizePhone(customer.phone);
  if (phone) return `TCW-${phone.slice(-4).padStart(4, "0")}`;
  if (customer.manualCode) return normalizeManualCodeForBrand(customer.manualCode);
  return nextManualCustomerCode();
}

function isReadyForFreeWash(customer) {
  return customer.stampBalance >= STAMPS_FOR_FREE_WASH;
}

function washesUntilFree(customer) {
  return Math.max(0, STAMPS_FOR_FREE_WASH - customer.stampBalance);
}

function withinLastDays(dateString, dayCount) {
  const date = new Date(`${dateString}T00:00:00`);
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - dayCount);
  return date >= cutoff;
}

function recentPaidWashes(customer) {
  return state.activities.filter((activity) => {
    const sameCustomer =
      activity.customerId === customer.id ||
      (!activity.customerId && activity.customerName === customer.name);
    return (
      activity.type === "paid" &&
      !activity.revoked &&
      sameCustomer &&
      withinLastDays(activity.date, DRAW_WINDOW_DAYS)
    );
  }).length;
}

function customerWashActivities(customer, limit = 6) {
  if (!customer) return [];
  return [...state.activities]
    .filter((activity) => {
      const sameCustomer =
        activity.customerId === customer.id ||
        (!activity.customerId && activity.customerName === customer.name);
      const isWashRecord = ["paid", "free", "revoked"].includes(activity.type);
      return sameCustomer && isWashRecord && !(activity.type === "paid" && activity.revoked);
    })
    .reverse()
    .slice(0, limit);
}

function washHistoryLabel(activity) {
  if (activity.type === "free") return "Free wash redeemed";
  if (activity.type === "revoked") return "Wash revoked";
  return "Paid wash verified";
}

function renderCustomerWashHistory(customer) {
  const history = customerWashActivities(customer);
  if (!history.length) {
    return `
      <div class="wash-history">
        <strong>Wash history</strong>
        <p>No washes verified yet.</p>
      </div>
    `;
  }

  const rows = history
    .map(
      (activity) => `
        <li>
          <span>${escapeHtml(displayDate(activity.date))}</span>
          <strong>${escapeHtml(washHistoryLabel(activity))}</strong>
          <small>${escapeHtml(activity.service || "Wash")} - ${escapeHtml(activity.plate || "No plate")}</small>
        </li>
      `,
    )
    .join("");

  return `
    <div class="wash-history">
      <strong>Wash history</strong>
      <ol>${rows}</ol>
    </div>
  `;
}

function drawEligibility(customer) {
  const recentWashes = recentPaidWashes(customer);
  const eligible = recentWashes >= REQUIRED_DRAW_WASHES;
  const washesNeeded = Math.max(0, REQUIRED_DRAW_WASHES - recentWashes);

  return {
    eligible,
    recentWashes,
    washesNeeded,
    message: eligible
      ? `Entered for the monthly draw. Prize: ${DRAW_PRIZE}.`
      : `${washesNeeded} more verified paid wash${washesNeeded === 1 ? "" : "es"} needed in 2 months.`,
  };
}

function drawPrizeText(prize = DRAW_PRIZE) {
  const normalizedPrize = String(prize || "").trim();
  if (!normalizedPrize || normalizedPrize === OLD_DRAW_PRIZE) return DRAW_PRIZE;
  return normalizedPrize;
}

function eligibleDrawCustomers() {
  return state.customers.filter((customer) => drawEligibility(customer).eligible);
}

function currentDrawMonth() {
  return today().slice(0, 7);
}

function currentMonthDraw() {
  return state.draws.find((draw) => draw.month === currentDrawMonth()) || null;
}

function activeCustomer() {
  const activeId = localStorage.getItem(ACTIVE_CUSTOMER_KEY);
  return state.customers.find((customer) => customer.id === activeId) || null;
}

function findCustomerByPhone(phone) {
  const phoneKey = customerPhoneKey(phone);
  if (!phoneKey) return null;
  return state.customers.find((customer) => customerPhoneKey(customer.phone) === phoneKey) || null;
}

function findExistingCustomer({ name = "", phone = "", plate = "" }, excludeId = "") {
  const phoneMatch = findCustomerByPhone(phone);
  if (phoneMatch && phoneMatch.id !== excludeId) return phoneMatch;

  const nameKey = normalizeCustomerName(name);
  if (!nameKey) return null;

  const plateKey = normalizePlate(plate);
  return (
    state.customers.find((customer) => {
      if (customer.id === excludeId || normalizeCustomerName(customer.name) !== nameKey) return false;
      const customerVehicles = normalizeVehicleList(customer.vehicles, customer.plate);
      if (plateKey) return customerVehicles.includes(plateKey);
      return !customerPhoneKey(customer.phone);
    }) || null
  );
}

function customerSearchText(customer) {
  return [
    customer.name,
    customer.phone,
    customer.manualCode,
    customerCode(customer),
    legacyCustomerCode(customer),
    customer.plate,
    ...normalizeVehicleList(customer.vehicles, customer.plate),
  ]
    .join(" ")
    .toLowerCase();
}

function findOwnerCustomerSearchMatch(query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return null;

  const customer = [...state.customers]
    .sort((a, b) => a.name.localeCompare(b.name))
    .find((item) => customerSearchText(item).includes(normalizedQuery));

  if (!customer) return null;

  return {
    customer,
    matchingVehicle: normalizeVehicleList(customer.vehicles, customer.plate).find((plate) =>
      plate.toLowerCase().includes(normalizedQuery),
    ),
  };
}

function selectOwnerCustomer(customer, matchingVehicle = "") {
  elements.ownerCustomerSelect.value = customer.id;
  renderOwnerVehicleOptions();
  if (matchingVehicle) {
    elements.ownerVehicleSelect.value = matchingVehicle;
  }
  renderOwnerManagement();
  updateRedeemButtonState();
}

function searchOwnerCustomer() {
  const query = elements.ownerCustomerSearch.value.trim();
  if (!query) {
    setOwnerAlert("Enter a customer name, phone, code, or plate to search.");
    return false;
  }

  const match = findOwnerCustomerSearchMatch(query);

  if (!match) {
    setOwnerAlert("No customer found for that search.");
    return false;
  }

  selectOwnerCustomer(match.customer, match.matchingVehicle);
  elements.manageCustomerSearch.value = query;
  setOwnerAlert(`${match.customer.name} selected for verification.`);
  setManageAlert(`${match.customer.name} selected. You can edit their details in Manage customer.`);
  return true;
}

function searchManageCustomer() {
  const query = elements.manageCustomerSearch.value.trim();
  if (!query) {
    setManageAlert("Enter a customer name, phone, code, or plate to search.");
    return false;
  }

  const match = findOwnerCustomerSearchMatch(query);

  if (!match) {
    setManageAlert("No customer found for that search.");
    return false;
  }

  selectOwnerCustomer(match.customer, match.matchingVehicle);
  elements.ownerCustomerSearch.value = query;
  setManageAlert(`${match.customer.name} selected. You can update, remove, or revoke a wash.`);
  return true;
}

function render() {
  syncOwnerWashDate();
  updateOfflineBanner();
  renderCustomerNotice();
  renderCustomerAppQr();
  renderMenu();
  renderBookingServiceOptions();
  renderCustomerBookingStatus();
  renderOwnerBookings();
  renderOwnerMenuEditor();
  renderOwnerNoticeForm();
  renderMetrics();
  renderCustomerCard();
  renderOwnerCustomers();
  renderOwnerManagement();
  renderCustomerList();
  renderWhatsAppAlerts();
  renderLuckyDraw();
  renderActivity();
  renderFeedbackInbox();
  renderCustomerResponses();
  renderCustomerReplyPreview();
  renderBookingConfirmationPopup();
  renderStampAlertPopup();
  renderOwnerPopup();
  saveState();
}

function renderMetrics() {
  elements.ownerTodayLabel.textContent = displayDate(today());
  const paidWashes = state.customers.reduce(
    (sum, customer) => sum + customer.lifetimePaidWashes,
    0,
  );
  const redeemed = state.customers.reduce(
    (sum, customer) => sum + customer.freeWashesRedeemed,
    0,
  );
  const pendingBookings = state.bookings.filter((booking) => booking.status === "pending").length;
  const ready = state.customers.filter(isReadyForFreeWash).length;
  const drawEntries = eligibleDrawCustomers().length;

  elements.metricCustomers.textContent = formatNumber(state.customers.length);
  elements.metricBookings.textContent = formatNumber(pendingBookings);
  elements.metricPaidWashes.textContent = formatNumber(paidWashes);
  elements.metricReady.textContent = formatNumber(ready);
  elements.metricRedeemed.textContent = formatNumber(redeemed);
  elements.metricDrawEntries.textContent = formatNumber(drawEntries);
}

function activeNotice() {
  const notice = state.notice || emptyState.notice;
  const message = String(notice.message || "").trim();
  if (!notice.active || !message) return null;
  if (notice.expiresOn && notice.expiresOn < today()) return null;
  return { ...notice, message };
}

function renderCustomerNotice() {
  const notice = activeNotice();
  elements.customerNoticeBanner.classList.toggle("is-hidden", !notice);

  if (!notice) {
    elements.noticeStatus.textContent = "Notice";
    elements.noticeMessage.textContent = "";
    elements.noticeMeta.textContent = "";
    return;
  }

  elements.noticeStatus.textContent = notice.type || "Notice";
  elements.noticeTitle.textContent = "THE CARWASH";
  elements.noticeMessage.textContent = notice.message;
  elements.noticeMeta.textContent = notice.expiresOn
    ? `Shown until ${displayDate(notice.expiresOn)}`
    : "Latest update";
}

function renderCustomerAppQr() {
  if (!elements.customerAppQr || !elements.customerAppQrLink) return;
  const appLink = customerAppLink();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(appLink)}`;
  elements.customerAppQr.src = qrUrl;
  elements.customerAppQrLink.value = appLink;
}

function syncMenuCategoryFilter() {
  const selected = elements.menuCategoryFilter.value || "all";
  const categories = menuCategories();

  elements.menuCategoryFilter.innerHTML = '<option value="all">All services</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.menuCategoryFilter.append(option);
  });

  elements.menuCategoryFilter.value = categories.includes(selected) ? selected : "all";
}

function menuItemSearchText(item) {
  return [item.name, item.category, item.description, item.sku].join(" ").toLowerCase();
}

function renderMenu() {
  if (!elements.menuList) return;

  if (menuStatus === "loading") {
    elements.menuSummary.textContent = "Loading menu";
    elements.menuList.innerHTML = `
      <div class="empty-state compact-empty">
        <strong>Loading wash menu</strong>
        <span>Please wait a moment.</span>
      </div>
    `;
    return;
  }

  if (menuStatus === "error") {
    elements.menuSummary.textContent = "Menu unavailable";
    elements.menuList.innerHTML = `
      <div class="empty-state compact-empty">
        <strong>Menu could not load</strong>
        <span>Please ask at the counter for today's prices.</span>
      </div>
    `;
    return;
  }

  syncMenuCategoryFilter();

  const category = elements.menuCategoryFilter.value;
  const query = elements.menuSearch.value.trim().toLowerCase();
  const filtered = menuItems.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const matchesSearch = !query || menuItemSearchText(item).includes(query);
    return matchesCategory && matchesSearch;
  });

  elements.menuSummary.textContent = `${filtered.length} of ${menuItems.length} services`;

  if (!filtered.length) {
    elements.menuList.innerHTML = `
      <div class="empty-state compact-empty">
        <strong>No matching services</strong>
        <span>Try another category or search word.</span>
      </div>
    `;
    return;
  }

  const grouped = filtered.reduce((groups, item) => {
    const items = groups.get(item.category) || [];
    items.push(item);
    groups.set(item.category, items);
    return groups;
  }, new Map());

  elements.menuList.innerHTML = [...grouped.entries()]
    .map(([groupName, items]) => {
      const serviceCards = items
        .map(
          (item) => `
            <article class="menu-item">
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <span>${escapeHtml(item.description || item.sku || groupName)}</span>
              </div>
              <div class="menu-price">${formatPrice(item.price)}</div>
            </article>
          `,
        )
        .join("");

      return `
        <section class="menu-category">
          <div class="menu-category-heading">
            <h3>${escapeHtml(groupName)}</h3>
            <span>${items.length} option${items.length === 1 ? "" : "s"}</span>
          </div>
          <div class="menu-items">${serviceCards}</div>
        </section>
      `;
    })
    .join("");
}

function menuItemById(id) {
  return menuItems.find((item) => item.id === id) || null;
}

function updateOfflineBanner() {
  if (!elements.offlineBanner) return;
  elements.offlineBanner.classList.toggle("is-hidden", navigator.onLine);
}

function appIsStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function appInstallDismissedOrInstalled() {
  return appIsStandalone() || localStorage.getItem(INSTALL_HIDDEN_KEY) === "1";
}

function hideInstallButton(persist = false) {
  elements.installButton.hidden = true;
  elements.installButton.classList.add("is-hidden");
  deferredInstallPrompt = null;
  if (persist) localStorage.setItem(INSTALL_HIDDEN_KEY, "1");
}

function updateInstallButton() {
  if (appInstallDismissedOrInstalled()) {
    hideInstallButton(false);
    return;
  }
  elements.installButton.hidden = false;
  elements.installButton.classList.remove("is-hidden");
}

function setBookingAlert(message) {
  elements.bookingAlert.textContent = message;
  elements.bookingAlert.classList.toggle("visible", Boolean(message));
}

function setCustomerAlert(message) {
  elements.customerAlert.textContent = message;
  elements.customerAlert.classList.toggle("visible", Boolean(message));
}

function setOwnerAddCustomerAlert(message) {
  elements.ownerAddCustomerAlert.textContent = message;
  elements.ownerAddCustomerAlert.classList.toggle("visible", Boolean(message));
}

function customerAppLink(customer = null, options = {}) {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  if (customer) {
    url.searchParams.set("customer", customerPhoneKey(customer.phone) || customer.id);
    if (options.ownerWelcome ?? customer.ownerAdded) {
      url.searchParams.set("welcome", "owner");
    }
  }
  url.searchParams.set("v", "duplicatefix1");
  return url.href;
}

function customerAppInviteMessage(customer) {
  return `Hi ${customer.name}, welcome to THE CARWASH. Your loyalty card has been created for you. Open this link to download or open the app: ${customerAppLink(customer, { ownerWelcome: true })}. Your customer code is ${customerCode(customer)}.`;
}

function renderOwnerCustomerInvite(customer) {
  const appLink = customerAppLink(customer);
  const phone = whatsappNumber(customer.phone);
  const whatsappHref = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(customerAppInviteMessage(customer))}`
    : "";

  elements.ownerAddCustomerInvite.classList.remove("is-hidden");
  elements.ownerAddCustomerInvite.innerHTML = `
    <strong>App invite ready</strong>
    <span>Customer code: ${escapeHtml(customerCode(customer))}</span>
    <input readonly value="${escapeHtml(appLink)}" aria-label="Customer app link" />
    <div class="button-row">
      ${
        whatsappHref
          ? `<a class="success-action" href="${whatsappHref}" target="_blank" rel="noopener">Send WhatsApp link</a>`
          : '<button class="success-action" type="button" disabled>No phone number</button>'
      }
      <button class="ghost-button" data-copy-invite-link="${escapeHtml(appLink)}" type="button">
        Copy link
      </button>
    </div>
  `;
}

function setOwnerProductAlert(message) {
  elements.ownerProductAlert.textContent = message;
  elements.ownerProductAlert.classList.toggle("visible", Boolean(message));
}

function renderBookingServiceOptions() {
  const selectedBookingService = elements.bookingServiceSelect.value;
  const selectedOwnerService = elements.ownerService.value;
  elements.bookingServiceSelect.innerHTML = "";
  elements.ownerService.innerHTML = "";

  if (!menuItems.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Menu loading";
    elements.bookingServiceSelect.append(option);
    elements.ownerService.append(option.cloneNode(true));
    return;
  }

  menuItems.forEach((item) => {
    const label = `${item.category} - ${item.name} (${formatPrice(item.price)})`;
    const bookingOption = document.createElement("option");
    bookingOption.value = item.id;
    bookingOption.textContent = label;
    elements.bookingServiceSelect.append(bookingOption);

    const ownerOption = document.createElement("option");
    ownerOption.value = `${item.category} - ${item.name}`;
    ownerOption.textContent = label;
    elements.ownerService.append(ownerOption);
  });

  if (menuItemById(selectedBookingService)) {
    elements.bookingServiceSelect.value = selectedBookingService;
  }
  if ([...elements.ownerService.options].some((option) => option.value === selectedOwnerService)) {
    elements.ownerService.value = selectedOwnerService;
  }
}

function prefillBookingForm(productId = "") {
  const customer = activeCustomer();
  if (productId && menuItemById(productId)) {
    elements.bookingServiceSelect.value = productId;
  }
  if (customer) {
    elements.bookingName.value = customer.name;
    elements.bookingPhone.value = customer.phone;
    elements.bookingPlate.value = primaryPlate(customer);
  }
  setBookingAlert(productId ? "Service selected. Add your details and send the booking request." : "");
}

function customerBookings(customer = activeCustomer()) {
  if (!customer) return [];
  const phone = customerPhoneKey(customer.phone);
  return state.bookings
    .filter((booking) => booking.customerId === customer.id || (phone && customerPhoneKey(booking.phone) === phone))
    .sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)));
}

function bookingStatusText(booking) {
  if (booking.status === "queued") return `Queue number ${booking.queueNumber}`;
  if (booking.status === "completed") return "Completed";
  if (booking.status === "cancelled") return "Cancelled";
  return "Waiting for owner";
}

function bookingStatusRank(status) {
  const statusRank = { pending: 0, queued: 1, completed: 2, cancelled: 3 };
  return statusRank[status] ?? 4;
}

function bookingCustomer(booking) {
  const phone = customerPhoneKey(booking.phone);
  return state.customers.find(
    (customer) => customer.id === booking.customerId || (phone && customerPhoneKey(customer.phone) === phone),
  );
}

function bookingSearchText(booking) {
  return [
    booking.customerName,
    booking.phone,
    normalizePhone(booking.phone),
    booking.plate,
    booking.serviceName,
    booking.category,
    booking.price,
    booking.note,
    booking.status,
    booking.queueNumber,
    booking.date,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function bookingMatchesOwnerFilters(booking) {
  const statusFilter = elements.ownerBookingFilter.value || "active";
  const dateFilter = elements.ownerBookingDate.value || "";
  const query = elements.ownerBookingSearch.value.trim().toLowerCase();
  const digitQuery = normalizePhone(query);

  const statusMatch =
    statusFilter === "all" ||
    (statusFilter === "active" && ["pending", "queued"].includes(booking.status)) ||
    booking.status === statusFilter;

  const dateMatch = !dateFilter || booking.date === dateFilter;
  const searchMatch =
    !query ||
    bookingSearchText(booking).includes(query) ||
    (digitQuery && normalizePhone(booking.phone).includes(digitQuery));

  return statusMatch && dateMatch && searchMatch;
}

function nextBookingQueueNumber(booking) {
  const date = booking.date || today();
  const usedNumbers = state.bookings
    .filter((item) => item.id !== booking.id && (item.date || today()) === date)
    .map((item) => String(item.queueNumber || "").match(/\d+/g)?.pop())
    .map((value) => Number(value))
    .filter(Number.isFinite);
  const nextNumber = Math.max(0, ...usedNumbers) + 1;
  return `Q${String(nextNumber).padStart(2, "0")}`;
}

function bookingContactLinks(booking) {
  const phone = whatsappNumber(booking.phone);
  if (!phone) return "";
  const message = `Hi ${booking.customerName}, THE CARWASH is contacting you about your ${booking.serviceName} booking.`;
  return `
    <div class="booking-contact-row">
      <a class="ghost-button" href="tel:+${escapeHtml(phone)}">Call customer</a>
      <a class="success-action" href="https://wa.me/${escapeHtml(phone)}?text=${encodeURIComponent(message)}" target="_blank" rel="noopener">WhatsApp</a>
    </div>
  `;
}

function renderOwnerBookingStats(bookings) {
  const todayDate = today();
  const stats = [
    ["Pending", bookings.filter((booking) => booking.status === "pending").length],
    ["Queued", bookings.filter((booking) => booking.status === "queued").length],
    ["Today", bookings.filter((booking) => booking.date === todayDate).length],
    [
      "Completed today",
      bookings.filter((booking) => booking.status === "completed" && booking.date === todayDate).length,
    ],
  ];

  elements.ownerBookingStats.innerHTML = stats
    .map(
      ([label, value]) => `
        <div class="booking-queue-stat">
          <strong>${formatNumber(value)}</strong>
          <span>${escapeHtml(label)}</span>
        </div>
      `,
    )
    .join("");
}

function renderCustomerBookingStatus() {
  const bookings = customerBookings().slice(0, 3);
  elements.customerBookingStatus.innerHTML = "";

  if (!bookings.length) {
    return;
  }

  const heading = document.createElement("div");
  heading.className = "booking-status-heading";
  heading.innerHTML = "<strong>My wash bookings</strong><span>Latest requests</span>";
  elements.customerBookingStatus.append(heading);

  bookings.forEach((booking) => {
    const card = document.createElement("article");
    card.className = `booking-status-card booking-${booking.status}`;
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(booking.serviceName)}</strong>
        <span>${escapeHtml(booking.plate || "No plate")} - ${escapeHtml(booking.date)}</span>
      </div>
      <div class="queue-pill">${escapeHtml(bookingStatusText(booking))}</div>
    `;
    elements.customerBookingStatus.append(card);
  });
}

function alertableCustomerBookings() {
  return customerBookings().filter(
    (booking) =>
      (booking.status === "queued" && String(booking.queueNumber || "").trim()) ||
      booking.status === "completed",
  );
}

function renderBookingConfirmationPopup() {
  const customer = activeCustomer();
  if (!customer || currentMode === "owner") return;
  const modalOpen = !elements.bookingAlertModal.classList.contains("is-hidden");
  if (modalOpen) return;

  const seenAlerts = readSeenBookingAlerts();
  const booking = alertableCustomerBookings().find((item) => !seenAlerts.has(bookingAlertKey(item)));
  if (!booking) return;

  pendingBookingAlert = booking;
  markBookingAlertSeen(booking);
  if (booking.status === "completed") {
    elements.bookingAlertModalTitle.textContent = "Your wash is complete";
    elements.bookingAlertModalMessage.textContent = `Your ${booking.serviceName} booking has been marked complete. Thank you for visiting THE CARWASH.`;
  } else {
    elements.bookingAlertModalTitle.textContent = "Your wash is in the queue";
    elements.bookingAlertModalMessage.textContent = `Your ${booking.serviceName} booking has been confirmed. Your queue number is ${booking.queueNumber}.`;
  }
  elements.bookingAlertModalMeta.textContent = `${booking.category} - ${booking.plate || "No plate"} - ${booking.date}`;
  elements.bookingAlertModal.classList.remove("is-hidden");
}

function closeBookingAlert(markSeen = true) {
  if (markSeen && pendingBookingAlert) {
    markBookingAlertSeen(pendingBookingAlert);
  }
  pendingBookingAlert = null;
  elements.bookingAlertModal.classList.add("is-hidden");
}

function viewBookingAlert() {
  if (pendingBookingAlert) {
    markBookingAlertSeen(pendingBookingAlert);
  }
  pendingBookingAlert = null;
  elements.bookingAlertModal.classList.add("is-hidden");
  setMode("book");
  elements.customerBookingStatus.scrollIntoView({ behavior: "smooth", block: "center" });
}

function alertableStampActivities(customer = activeCustomer()) {
  if (!customer) return [];
  const phone = customerPhoneKey(customer.phone);
  return [...state.activities]
    .filter((activity) => {
      const sameCustomer =
        activity.customerId === customer.id ||
        (!activity.customerId && activity.customerName === customer.name) ||
        (phone && activity.phone && customerPhoneKey(activity.phone) === phone);
      return sameCustomer && ["paid", "free"].includes(activity.type) && !activity.revoked;
    })
    .sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)));
}

function renderStampAlertPopup() {
  const customer = activeCustomer();
  if (!customer || currentMode === "owner") return;
  const anyModalOpen =
    !elements.stampAlertModal.classList.contains("is-hidden") ||
    !elements.bookingAlertModal.classList.contains("is-hidden") ||
    !elements.replyModal.classList.contains("is-hidden");
  if (anyModalOpen) return;

  const seenAlerts = readSeenStampAlerts();
  const activity = alertableStampActivities(customer).find((item) => !seenAlerts.has(stampAlertKey(item)));
  if (!activity) return;

  pendingStampAlert = activity;
  markStampAlertSeen(activity);
  const rawStampBalance = Number(activity.stampBalanceAfter ?? customer.stampBalance);
  const safeStampBalance = Number.isFinite(rawStampBalance) ? rawStampBalance : Number(customer.stampBalance || 0);
  const stampBalance =
    activity.type === "free" ? 0 : Math.min(STAMPS_FOR_FREE_WASH, Math.max(0, safeStampBalance));
  const title =
    activity.type === "free" ? "Your free wash was redeemed" : "Your loyalty card was stamped";
  const message =
    activity.type === "free"
      ? "Your card has reset and is ready for your next paid wash."
      : stampBalance >= STAMPS_FOR_FREE_WASH
        ? "Your card is full. Your next standard wash is free."
        : `You now have ${stampBalance}/9 stamps. ${STAMPS_FOR_FREE_WASH - stampBalance} more paid wash${STAMPS_FOR_FREE_WASH - stampBalance === 1 ? "" : "es"} until your free wash.`;

  elements.stampAlertModalTitle.textContent = title;
  elements.stampAlertModalMessage.textContent = message;
  elements.stampAlertModalMeta.textContent = `${activity.service || "Wash"} - ${activity.plate || "No plate"} - ${displayDate(activity.date)}`;
  elements.stampAlertModalCard.innerHTML = `
    <div>
      <strong>${escapeHtml(customer.name)}</strong>
      <span>${escapeHtml(customerCode(customer))}</span>
    </div>
    ${renderStampCard(stampBalance)}
  `;
  elements.stampAlertModal.classList.remove("is-hidden");
}

function closeStampAlert(markSeen = true) {
  if (markSeen && pendingStampAlert) markStampAlertSeen(pendingStampAlert);
  pendingStampAlert = null;
  elements.stampAlertModal.classList.add("is-hidden");
}

function viewStampAlert() {
  if (pendingStampAlert) markStampAlertSeen(pendingStampAlert);
  pendingStampAlert = null;
  elements.stampAlertModal.classList.add("is-hidden");
  setMode("customer");
  elements.customerCardDisplay.scrollIntoView({ behavior: "smooth", block: "center" });
}

function ensureBookingCustomer({ name, phone, plate }) {
  let customer = findExistingCustomer({ name, phone, plate });
  if (!customer) {
    customer = {
      id: crypto.randomUUID(),
      name,
      phone,
      plate: normalizePlate(plate),
      vehicles: normalizeVehicleList([], plate),
      stampBalance: 0,
      lifetimePaidWashes: 0,
      freeWashesRedeemed: 0,
      facebookFollowed: false,
      whatsappOptIn: false,
      lastWash: today(),
      joined: today(),
      updatedAt: nowIso(),
      ownerAdded: false,
    };
    state.customers.push(customer);
  } else {
    customer.name = name || customer.name;
    if (!customer.phone && phone) customer.phone = phone;
    if (addVehicleToCustomer(customer, plate) || name || phone) touchCustomer(customer);
  }
  localStorage.setItem(ACTIVE_CUSTOMER_KEY, customer.id);
  return customer;
}

function addOwnerCustomer(event) {
  event.preventDefault();
  if (!ownerUnlocked) return;

  const name = elements.ownerAddCustomerName.value.trim();
  const phone = elements.ownerAddCustomerPhone.value.trim();
  const plate = normalizePlate(elements.ownerAddCustomerPlate.value);
  const phoneKey = customerPhoneKey(phone);

  if (!name) {
    setOwnerAddCustomerAlert("Customer name is required.");
    elements.ownerAddCustomerInvite.classList.add("is-hidden");
    return;
  }

  const existingCustomer = findExistingCustomer({ name, phone, plate });
  if (existingCustomer) {
    render();
    selectOwnerCustomer(existingCustomer, plate);
    renderOwnerCustomerInvite(existingCustomer);
    setOwnerAddCustomerAlert(
      `${existingCustomer.name} is already on the system. Customer code: ${customerCode(existingCustomer)}. No duplicate was created.`,
    );
    return;
  }

  const customer = {
    id: crypto.randomUUID(),
    name,
    phone,
    manualCode: phoneKey ? "" : nextManualCustomerCode(),
    plate,
    vehicles: normalizeVehicleList([], plate),
    stampBalance: 0,
    lifetimePaidWashes: 0,
    freeWashesRedeemed: 0,
    facebookFollowed: false,
    whatsappOptIn: Boolean(phoneKey && elements.ownerAddWhatsappOptIn.checked),
    lastWash: today(),
    joined: today(),
    updatedAt: nowIso(),
    ownerAdded: true,
  };

  state.customers.push(customer);
  elements.ownerAddCustomerForm.reset();
  render();
  elements.ownerCustomerSelect.value = customer.id;
  renderOwnerVehicleOptions();
  renderOwnerManagement();
  updateRedeemButtonState();
  setOwnerAddCustomerAlert(`${customer.name} added. Customer code: ${customerCode(customer)}.`);
  renderOwnerCustomerInvite(customer);
}

function submitBooking(event) {
  event.preventDefault();
  const item = menuItemById(elements.bookingServiceSelect.value);
  const name = elements.bookingName.value.trim();
  const phone = elements.bookingPhone.value.trim();
  const plate = normalizePlate(elements.bookingPlate.value);
  const note = elements.bookingNote.value.trim();

  if (!item || !name || !phone) {
    setBookingAlert("Please choose a wash service, then add your name and phone number.");
    return;
  }

  const customer = ensureBookingCustomer({ name, phone, plate });
  const booking = {
    id: crypto.randomUUID(),
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
    plate: plate || primaryPlate(customer),
    serviceId: item.id,
    serviceName: item.name,
    category: item.category,
    price: item.price,
    note,
    status: "pending",
    queueNumber: "",
    date: today(),
    updatedAt: nowIso(),
  };

  state.bookings.unshift(booking);
  elements.bookingNote.value = "";
  setBookingAlert("Booking sent. The owner will confirm your queue number in the app.");
  render();
}

function renderOwnerBookings() {
  const bookings = [...state.bookings].sort((a, b) => {
    return (
      bookingStatusRank(a.status) - bookingStatusRank(b.status) ||
      String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date))
    );
  });
  const pending = bookings.filter((booking) => booking.status === "pending").length;
  const queued = bookings.filter((booking) => booking.status === "queued").length;
  const visibleBookings = bookings.filter(bookingMatchesOwnerFilters);
  elements.ownerBookingSummary.textContent = `${pending} pending / ${queued} queued`;
  renderOwnerBookingStats(bookings);
  elements.ownerBookingList.innerHTML = "";

  if (!bookings.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state compact-empty";
    empty.innerHTML = "<strong>No bookings yet</strong><span>Customer booking requests will appear here.</span>";
    elements.ownerBookingList.append(empty);
    return;
  }

  if (!visibleBookings.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state compact-empty";
    empty.innerHTML = "<strong>No matching bookings</strong><span>Clear the search or filters to see more bookings.</span>";
    elements.ownerBookingList.append(empty);
    return;
  }

  visibleBookings.forEach((booking) => {
    const customer = bookingCustomer(booking);
    const customerWhatsappStatus = customer?.whatsappOptIn ? "WhatsApp approved" : "WhatsApp not approved";
    const closedBooking = ["completed", "cancelled"].includes(booking.status);
    const displayedDate = validAppDate(booking.date) ? displayDate(booking.date) : booking.date || "No date";
    const noteHtml = booking.note
      ? `
        <div class="booking-card-note">
          <strong>Customer note</strong>
          <span>${escapeHtml(booking.note)}</span>
        </div>
      `
      : "";
    const controls = closedBooking
      ? `
        <button class="ghost-button full-width" data-booking-reopen="${escapeHtml(booking.id)}" type="button">
          Reopen booking
        </button>
      `
      : `
        <form class="booking-queue-form" data-booking-queue-form="${escapeHtml(booking.id)}">
          <label>
            Queue number
            <input data-booking-queue-number type="text" value="${escapeHtml(booking.queueNumber)}" placeholder="${escapeHtml(nextBookingQueueNumber(booking))}" />
          </label>
          <div class="button-row">
            <button class="primary-action" type="submit">Send queue</button>
            <button class="ghost-button" data-booking-next-queue="${escapeHtml(booking.id)}" type="button">Next number</button>
          </div>
          <div class="button-row">
            <button class="success-action" data-booking-complete="${escapeHtml(booking.id)}" type="button">Complete</button>
            <button class="danger-action" data-booking-cancel="${escapeHtml(booking.id)}" type="button">Cancel booking</button>
          </div>
        </form>
      `;
    const card = document.createElement("article");
    card.className = `booking-card booking-${booking.status}`;
    card.innerHTML = `
      <div class="booking-card-header">
        <div>
          <strong>${escapeHtml(booking.customerName)}</strong>
          <span>${escapeHtml(booking.phone)} - ${escapeHtml(booking.plate || "No plate")}</span>
        </div>
        <div class="queue-pill">${escapeHtml(bookingStatusText(booking))}</div>
      </div>
      <div class="booking-card-details">
        <span>${escapeHtml(booking.category)} - ${escapeHtml(booking.serviceName)}</span>
        <span>${formatPrice(booking.price)}</span>
        <span>${escapeHtml(displayedDate)}</span>
      </div>
      <div class="booking-card-details">
        <span>${escapeHtml(customerWhatsappStatus)}</span>
        <span>Updated ${escapeHtml(displayDateTime(booking.updatedAt) || booking.date || "today")}</span>
        <span>${escapeHtml(booking.queueNumber ? `Queue ${booking.queueNumber}` : "No queue number yet")}</span>
      </div>
      ${noteHtml}
      <div class="booking-card-actions">
        ${controls}
        ${bookingContactLinks(booking)}
      </div>
    `;
    elements.ownerBookingList.append(card);
  });
}

function updateBookingQueue(bookingId, queueNumber) {
  const booking = state.bookings.find((item) => item.id === bookingId);
  if (!booking) return;
  booking.queueNumber = String(queueNumber || "").trim();
  booking.status = booking.queueNumber ? "queued" : "pending";
  booking.updatedAt = nowIso();
  render();
}

function updateBookingStatus(bookingId, status) {
  const booking = state.bookings.find((item) => item.id === bookingId);
  if (!booking) return;
  booking.status = status;
  booking.updatedAt = nowIso();
  render();
}

function pendingOwnerBookingAlerts() {
  const seen = readSeenOwnerAlerts(OWNER_SEEN_BOOKINGS_KEY);
  return [...state.bookings]
    .filter((booking) => booking.status === "pending")
    .filter((booking) => !seen.has(ownerBookingAlertKey(booking)))
    .sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)));
}

function pendingOwnerFeedbackAlerts() {
  const seen = readSeenOwnerAlerts(OWNER_SEEN_FEEDBACK_KEY);
  return [...state.feedback]
    .filter((item) => !seen.has(ownerFeedbackAlertKey(item)))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

function showOwnerBookingAlert(booking) {
  pendingOwnerAlert = {
    type: "booking",
    key: ownerBookingAlertKey(booking),
  };
  elements.ownerAlertModalLabel.textContent = "New booking";
  elements.ownerAlertModalTitle.textContent = "New wash booking";
  elements.ownerAlertModalMessage.textContent = `${booking.customerName} requested ${booking.serviceName}.`;
  elements.ownerAlertModalMeta.textContent = `${booking.phone} - ${booking.plate || "No plate"} - ${formatPrice(booking.price)}`;
  elements.ownerAlertViewButton.textContent = "View booking";
  elements.ownerAlertModal.classList.remove("is-hidden");
}

function showOwnerFeedbackAlert(item) {
  pendingOwnerAlert = {
    type: "feedback",
    key: ownerFeedbackAlertKey(item),
  };
  elements.ownerAlertModalLabel.textContent = "New feedback";
  elements.ownerAlertModalTitle.textContent = `${item.type} from ${item.name}`;
  elements.ownerAlertModalMessage.textContent = String(item.message || "");
  elements.ownerAlertModalMeta.textContent = `${item.phone} - Rating ${item.rating || "?"}/5 - ${item.date}`;
  elements.ownerAlertViewButton.textContent = "View feedback";
  elements.ownerAlertModal.classList.remove("is-hidden");
}

function renderOwnerPopup() {
  if (!ownerUnlocked || currentMode !== "owner") return;
  if (!elements.ownerAlertModal.classList.contains("is-hidden")) return;

  const booking = pendingOwnerBookingAlerts()[0];
  if (booking) {
    showOwnerBookingAlert(booking);
    return;
  }

  const feedback = pendingOwnerFeedbackAlerts()[0];
  if (feedback) {
    showOwnerFeedbackAlert(feedback);
  }
}

function markOwnerAlertSeen(alert = pendingOwnerAlert) {
  if (!alert) return;
  const storageKey = alert.type === "booking" ? OWNER_SEEN_BOOKINGS_KEY : OWNER_SEEN_FEEDBACK_KEY;
  const seen = readSeenOwnerAlerts(storageKey);
  seen.add(alert.key);
  saveSeenOwnerAlerts(storageKey, seen);
}

function closeOwnerAlert(markSeen = true) {
  if (markSeen) markOwnerAlertSeen();
  pendingOwnerAlert = null;
  elements.ownerAlertModal.classList.add("is-hidden");
  setTimeout(renderOwnerPopup, 0);
}

function openOwnerPanel(panel) {
  if (!panel) return;
  panel.classList.remove("owner-collapsed");
  const toggle = panel.querySelector(".owner-toggle-button");
  if (toggle) {
    toggle.textContent = "Close";
    toggle.setAttribute("aria-expanded", "true");
  }
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function viewOwnerAlert() {
  const alert = pendingOwnerAlert;
  markOwnerAlertSeen(alert);
  pendingOwnerAlert = null;
  elements.ownerAlertModal.classList.add("is-hidden");
  setMode("owner");
  openOwnerPanel(alert?.type === "booking" ? elements.ownerBookingsPanel : elements.ownerFeedbackPanel);
}

function selectedOwnerProduct() {
  return menuItemById(elements.ownerProductSelect.value);
}

function renderOwnerMenuEditor() {
  const selected = elements.ownerProductSelect.value;
  elements.ownerProductSelect.innerHTML = "";

  menuItems.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.category} - ${item.name}`;
    elements.ownerProductSelect.append(option);
  });

  if (selected && menuItemById(selected)) {
    elements.ownerProductSelect.value = selected;
  }

  const product = selectedOwnerProduct();
  const hasProduct = Boolean(product);
  elements.ownerRemoveProductButton.disabled = !hasProduct;
  if (hasProduct) {
    elements.ownerProductName.value = product.name;
    elements.ownerProductCategory.value = product.category;
    elements.ownerProductPrice.value = Number.isFinite(product.price) ? product.price : "";
    elements.ownerProductSku.value = product.sku || "";
    elements.ownerProductDescription.value = product.description || "";
  } else {
    elements.ownerProductName.value = "";
    elements.ownerProductCategory.value = "";
    elements.ownerProductPrice.value = "";
    elements.ownerProductSku.value = "";
    elements.ownerProductDescription.value = "";
  }

  elements.menuEditorList.innerHTML = "";
  menuItems.slice(0, 8).forEach((item) => {
    const card = document.createElement("article");
    card.className = "menu-editor-card";
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.category)} - ${escapeHtml(item.sku || "No SKU")}</span>
      </div>
      <div class="menu-price">${formatPrice(item.price)}</div>
    `;
    elements.menuEditorList.append(card);
  });
}

function createBlankProduct() {
  const item = {
    id: crypto.randomUUID(),
    name: "New wash service",
    description: "",
    price: 0,
    category: "FULL WASHES",
    sku: "",
    vatEnabled: true,
    updatedAt: nowIso(),
  };
  menuItems.push(item);
  state.menuProducts = menuItems;
  render();
  elements.ownerProductSelect.value = item.id;
  renderOwnerMenuEditor();
  setOwnerProductAlert("New product created. Edit the fields and save it.");
}

function saveOwnerProduct(event) {
  event.preventDefault();
  if (!ownerUnlocked) return;

  const product = selectedOwnerProduct();
  const name = elements.ownerProductName.value.trim();
  const category = elements.ownerProductCategory.value.trim();
  const price = Number(elements.ownerProductPrice.value);

  if (!name || !category || !Number.isFinite(price)) {
    setOwnerProductAlert("Add a product name, category, and price.");
    return;
  }

  const item = product || { id: crypto.randomUUID() };
  Object.assign(item, {
    name,
    category,
    price,
    sku: elements.ownerProductSku.value.trim(),
    description: elements.ownerProductDescription.value.trim(),
    vatEnabled: true,
    updatedAt: nowIso(),
  });
  if (!product) menuItems.push(item);
  state.menuProducts = menuItems;
  setOwnerProductAlert("Menu product saved.");
  render();
}

function removeOwnerProduct() {
  if (!ownerUnlocked) return;
  const product = selectedOwnerProduct();
  if (!product) return;
  const confirmed = window.confirm(`Remove ${product.name} from the menu?`);
  if (!confirmed) return;
  menuItems = menuItems.filter((item) => item.id !== product.id);
  state.menuProducts = menuItems;
  setOwnerProductAlert("Product removed from menu.");
  render();
}

function renderOwnerNoticeForm() {
  const notice = state.notice || emptyState.notice;
  elements.noticeType.value = notice.type || "Open";
  elements.noticeExpires.value = notice.expiresOn || "";
  elements.noticeMessageInput.value = notice.message || "";
  elements.noticeActive.checked = Boolean(notice.active);
}

function setNoticeAlert(message) {
  elements.noticeAlert.textContent = message;
  elements.noticeAlert.classList.toggle("visible", Boolean(message));
}

function setOwnerBackupAlert(message) {
  elements.ownerBackupAlert.textContent = message;
  elements.ownerBackupAlert.classList.toggle("visible", Boolean(message));
}

function syncOwnerWashDate() {
  if (!elements.ownerWashDate) return;
  const currentDate = today();
  elements.ownerWashDate.max = currentDate;
  if (!validAppDate(elements.ownerWashDate.value) || elements.ownerWashDate.value > currentDate) {
    elements.ownerWashDate.value = currentDate;
  }
}

function selectedOwnerWashDate() {
  syncOwnerWashDate();
  return elements.ownerWashDate?.value || today();
}

function exportOwnerBackup() {
  if (!ownerUnlocked) {
    setOwnerBackupAlert("Unlock owner verification before exporting a backup.");
    return false;
  }

  const payload = {
    app: "THE CARWASH",
    backupVersion: "duplicatefix1",
    exportedAt: new Date().toISOString(),
    sharedStateVersion: sharedStateVersion || null,
    state: migrateState(state),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `the-carwash-backup-${today()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setOwnerBackupAlert("Backup exported.");
  return true;
}

function publishCustomerNotice() {
  const message = elements.noticeMessageInput.value.trim();
  if (!message) {
    setNoticeAlert("Type a message before publishing.");
    return false;
  }

  state.notice = {
    active: elements.noticeActive.checked,
    type: elements.noticeType.value,
    message,
    expiresOn: elements.noticeExpires.value,
    updatedAt: nowIso(),
  };
  setNoticeAlert(state.notice.active ? "Customer message published." : "Message saved but hidden from customers.");
  renderCustomerNotice();
  saveState();
  return true;
}

function clearCustomerNotice() {
  state.notice = { ...emptyState.notice, updatedAt: nowIso() };
  setNoticeAlert("Customer message cleared.");
  renderCustomerNotice();
  renderOwnerNoticeForm();
  saveState();
}

function renderCustomerCard() {
  const customer = activeCustomer();
  const hasCustomer = Boolean(customer);
  elements.customerForm.hidden = hasCustomer;
  elements.customerCardDisplay.hidden = !hasCustomer;

  if (!customer) {
    elements.customerWelcomeCard.hidden = false;
    elements.customerWelcomeCard.classList.remove("owner-added-welcome");
    elements.customerWelcomeCard.innerHTML = `
      <strong>Welcome to THE CARWASH</strong>
      <span>Add your name and phone number to start collecting verified washes.</span>
    `;
    elements.customerCode.textContent = "TCW-0000";
    elements.customerCodeName.textContent = "Open a customer card to show this code.";
    elements.customerReplyPreview.classList.add("is-hidden");
    elements.customerReplyPreview.innerHTML = "";
    return;
  }

  const ready = isReadyForFreeWash(customer);
  const draw = drawEligibility(customer);
  elements.customerWelcomeCard.hidden = !customer.ownerAdded;
  elements.customerWelcomeCard.classList.toggle("owner-added-welcome", Boolean(customer.ownerAdded));
  if (customer.ownerAdded) {
    const installed = appInstallDismissedOrInstalled();
    elements.customerWelcomeCard.innerHTML = `
      <strong>Welcome, ${escapeHtml(customer.name)}. Your loyalty card is ready.</strong>
      <span>${
        installed
          ? "You are already using your THE CARWASH app on this device. You can track washes, book a wash, and see owner replies here."
          : "The owner has already created your THE CARWASH card. Download the app to your phone so you can track washes, book a wash, and see owner replies."
      }</span>
      <span>Your customer code is ${escapeHtml(customerCode(customer))}.</span>
      <div class="button-row">
        ${
          installed
            ? ""
            : '<button class="primary-action" data-customer-install-app type="button">Download app</button>'
        }
        <button class="ghost-button" data-customer-book-wash type="button">Book a wash</button>
      </div>
    `;
  }
  elements.customerCode.textContent = customerCode(customer);
  elements.customerCodeName.textContent = `${customer.name} - ${vehicleLabel(customer)}`;
  elements.customerCardDisplay.innerHTML = `
    <article class="digital-card">
      <div class="digital-card-top">
        <div>
          <h3>${escapeHtml(customer.name)}</h3>
          <div class="meta">
            <span>${escapeHtml(customer.phone)}</span>
            <span>${escapeHtml(vehicleLabel(customer))}</span>
            <span>Last wash ${customer.lastWash}</span>
          </div>
        </div>
        <span class="status-pill ${ready ? "status-ready" : "status-earning"}">
          ${ready ? "Free wash ready" : `${washesUntilFree(customer)} to free`}
        </span>
      </div>
      ${renderStampCard(customer.stampBalance)}
      <div class="card-stats">
        <span>${formatNumber(customer.lifetimePaidWashes)} paid washes</span>
        <span>${formatNumber(customer.freeWashesRedeemed)} free redeemed</span>
        <span>${draw.recentWashes}/${REQUIRED_DRAW_WASHES} recent washes for draw</span>
      </div>
      ${renderCustomerWashHistory(customer)}
      <div class="vehicle-manager">
        <strong>My cars</strong>
        <div class="vehicle-list">
          ${normalizeVehicleList(customer.vehicles, customer.plate)
            .map((plate) => `<span>${escapeHtml(plate)}</span>`)
            .join("") || "<span>No cars added yet</span>"}
        </div>
        <form class="add-vehicle-form" data-add-vehicle-form>
          <label>
            Add another car
            <input data-new-vehicle-plate type="text" placeholder="ABC 123 GP" required />
          </label>
          <button class="ghost-button full-width" type="submit">Add car</button>
        </form>
      </div>
      <div class="draw-status ${draw.eligible ? "draw-eligible" : ""}">
        <strong>Lucky draw entry</strong>
        <span>${escapeHtml(draw.message)}</span>
      </div>
    </article>
  `;
}

function renderOwnerCustomers() {
  const selected = elements.ownerCustomerSelect.value;
  elements.ownerCustomerSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Search or select a customer";
  elements.ownerCustomerSelect.append(placeholder);

  for (const customer of [...state.customers].sort((a, b) => a.name.localeCompare(b.name))) {
    const option = document.createElement("option");
    option.value = customer.id;
    option.textContent = `${customer.name} - ${customerCode(customer)} (${customer.stampBalance}/9)`;
    elements.ownerCustomerSelect.append(option);
  }

  if (selected && state.customers.some((customer) => customer.id === selected)) {
    elements.ownerCustomerSelect.value = selected;
  } else {
    elements.ownerCustomerSelect.value = "";
  }

  updateRedeemButtonState();
  renderOwnerVehicleOptions();
  renderOwnerManagement();
}

function renderOwnerVehicleOptions() {
  const customer = selectedOwnerCustomer();
  elements.ownerVehicleSelect.innerHTML = "";

  if (!customer) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Select a customer first";
    elements.ownerVehicleSelect.append(option);
    elements.ownerVehicleSelect.disabled = true;
    return;
  }

  const vehicles = normalizeVehicleList(customer.vehicles, customer.plate);
  elements.ownerVehicleSelect.disabled = false;

  if (!vehicles.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No car saved";
    elements.ownerVehicleSelect.append(option);
  }

  for (const plate of vehicles) {
    const option = document.createElement("option");
    option.value = plate;
    option.textContent = plate;
    elements.ownerVehicleSelect.append(option);
  }

  const newOption = document.createElement("option");
  newOption.value = "__new__";
  newOption.textContent = "New car / not listed";
  elements.ownerVehicleSelect.append(newOption);
}

function renderOwnerManagement() {
  const customer = selectedOwnerCustomer();
  const hasCustomer = Boolean(customer);
  [
    elements.manageCustomerName,
    elements.manageCustomerPhone,
    elements.manageNewVehicle,
    elements.manageWhatsappOptIn,
    elements.manageVehicleSelect,
    elements.removeVehicleButton,
    elements.revokeWashButton,
    elements.removeCustomerButton,
  ].forEach((control) => {
    control.disabled = !hasCustomer;
  });

  elements.manageVehicleSelect.innerHTML = "";

  if (!customer) {
    elements.manageCustomerName.value = "";
    elements.manageCustomerPhone.value = "";
    elements.manageWhatsappOptIn.checked = false;
    elements.manageNewVehicle.value = "";
    elements.manageCustomerSelected.textContent =
      "Search and select a customer before editing their details.";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No customer selected";
    elements.manageVehicleSelect.append(option);
    return;
  }

  elements.manageCustomerName.value = customer.name;
  elements.manageCustomerPhone.value = customer.phone;
  elements.manageWhatsappOptIn.checked = Boolean(customer.whatsappOptIn);
  elements.manageCustomerSelected.textContent = `${customer.name} - ${customerCode(customer)} - ${vehicleLabel(customer)}`;

  const vehicles = normalizeVehicleList(customer.vehicles, customer.plate);
  if (!vehicles.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No cars saved";
    elements.manageVehicleSelect.append(option);
    elements.removeVehicleButton.disabled = true;
  }

  for (const plate of vehicles) {
    const option = document.createElement("option");
    option.value = plate;
    option.textContent = plate;
    elements.manageVehicleSelect.append(option);
  }
}

function renderCustomerList() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const status = elements.statusFilter.value;
  const matches = state.customers
    .filter((customer) => {
      return customerSearchText(customer).includes(query);
    })
    .filter((customer) => {
      if (status === "ready") return isReadyForFreeWash(customer);
      if (status === "draw") return drawEligibility(customer).eligible;
      if (status === "earning") return !isReadyForFreeWash(customer);
      return true;
    })
    .sort((a, b) => b.stampBalance - a.stampBalance || a.name.localeCompare(b.name));

  elements.customerList.innerHTML = "";

  if (!matches.length) {
    elements.customerList.append(document.querySelector("#emptyStateTemplate").content.cloneNode(true));
    return;
  }

  for (const customer of matches) {
    const ready = isReadyForFreeWash(customer);
    const draw = drawEligibility(customer);
    const card = document.createElement("article");
    card.className = [
      "customer-card",
      ready ? "ready-card" : "",
      draw.eligible ? "draw-card" : "",
    ]
      .filter(Boolean)
      .join(" ");
    card.innerHTML = `
      <div class="customer-heading">
        <div>
          <h3>${escapeHtml(customer.name)}</h3>
          <div class="meta">
            <span>${escapeHtml(customer.phone)}</span>
            <span>${escapeHtml(vehicleLabel(customer))}</span>
            <span>${customerCode(customer)}</span>
          </div>
        </div>
        <span class="status-pill ${ready ? "status-ready" : "status-earning"}">
          ${ready ? "Free wash ready" : `${washesUntilFree(customer)} to free`}
        </span>
      </div>
      ${renderStampCard(customer.stampBalance)}
      <div class="card-stats">
        <span>${formatNumber(customer.lifetimePaidWashes)} paid washes</span>
        <span>${formatNumber(customer.freeWashesRedeemed)} free redeemed</span>
        <span>${draw.recentWashes}/${REQUIRED_DRAW_WASHES} recent washes</span>
        <span>WhatsApp: ${customer.whatsappOptIn ? "approved" : "not approved"}</span>
        <span>Draw: ${draw.eligible ? "eligible" : "not eligible"}</span>
        <span>Last wash ${customer.lastWash}</span>
      </div>
    `;
    elements.customerList.append(card);
  }
}

function whatsappLink(customer, message) {
  const phone = whatsappNumber(customer.phone);
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function freeWashMessage(customer) {
  return `Hi ${customer.name}, THE CARWASH says your loyalty card is ready for your free wash. Show your customer code ${customerCode(customer)} when you arrive.`;
}

function competitionMessage(customer) {
  return `Hi ${customer.name}, THE CARWASH says you are entered in our monthly competition. Prize: ${DRAW_PRIZE}. Good luck!`;
}

function stampTextCard(customer) {
  const stamped = Math.min(STAMPS_FOR_FREE_WASH, Math.max(0, Number(customer.stampBalance || 0)));
  const slots = Array.from({ length: STAMPS_FOR_FREE_WASH }, (_, index) =>
    index < stamped ? "[X]" : "[ ]",
  ).join(" ");
  const freeSlot = stamped >= STAMPS_FOR_FREE_WASH ? "[FREE READY]" : "[FREE]";
  return `${slots} ${freeSlot}`;
}

function verifiedWashMessage(customer, details = {}) {
  const service = details.service || "wash";
  const plate = details.plate ? ` for ${details.plate}` : "";
  const cardLink = customerAppLink(customer, { ownerWelcome: false });
  const header = `THE CARWASH LOYALTY CARD\nCustomer: ${customer.name}\nCode: ${customerCode(customer)}\nWash stamped: ${service}${plate}`;
  if (isReadyForFreeWash(customer)) {
    return `${header}\n\n${stampTextCard(customer)}\n\n9/9 stamps. Your next standard wash is free.\nView your stamped card: ${cardLink}`;
  }
  return `${header}\n\n${stampTextCard(customer)}\n\n${customer.stampBalance}/9 stamps. ${washesUntilFree(customer)} more paid wash${washesUntilFree(customer) === 1 ? "" : "es"} until your free wash.\nView your stamped card: ${cardLink}`;
}

function redeemedWashMessage(customer, details = {}) {
  const service = details.service || "free wash";
  const plate = details.plate ? ` for ${details.plate}` : "";
  return `THE CARWASH LOYALTY CARD\nCustomer: ${customer.name}\nCode: ${customerCode(customer)}\nFree wash redeemed: ${service}${plate}\n\n[ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [FREE]\n\nYour loyalty card has reset and you can start earning stamps again.\nView your card: ${customerAppLink(customer, { ownerWelcome: false })}`;
}

function openVerificationWhatsApp(customer, message) {
  if (!elements.ownerWhatsappOnVerify.checked) return "";
  if (!customer.whatsappOptIn) {
    return "WhatsApp not opened because this customer has not approved WhatsApp alerts.";
  }

  const link = whatsappLink(customer, message);
  if (!link) return "WhatsApp not opened because the customer phone number is missing.";
  const opened = window.open(link, "_blank", "noopener");
  return opened
    ? "WhatsApp alert opened for this customer."
    : "WhatsApp alert could not open automatically. Use the WhatsApp alerts panel.";
}

function renderWhatsAppAlerts() {
  const optInCustomers = state.customers.filter((customer) => customer.whatsappOptIn);
  const freeReady = optInCustomers.filter(isReadyForFreeWash);
  const drawReady = optInCustomers.filter((customer) => drawEligibility(customer).eligible);
  const skipped = state.customers.length - optInCustomers.length;
  const alerts = [
    ...freeReady.map((customer) => ({ customer, type: "Free wash", message: freeWashMessage(customer) })),
    ...drawReady.map((customer) => ({ customer, type: "Competition", message: competitionMessage(customer) })),
  ];

  elements.whatsappAlertSummary.textContent = alerts.length
    ? `${alerts.length} WhatsApp alert${alerts.length === 1 ? "" : "s"} ready. ${skipped ? `${skipped} customer${skipped === 1 ? "" : "s"} have not approved WhatsApp alerts.` : ""}`
    : skipped
      ? `No WhatsApp alerts ready. ${skipped} customer${skipped === 1 ? "" : "s"} have not approved WhatsApp alerts.`
      : "No WhatsApp alerts ready.";
  elements.whatsappAlertList.innerHTML = "";

  if (!alerts.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state compact-empty";
    empty.innerHTML = "<strong>No alerts ready</strong><span>Alerts appear when customers approve WhatsApp and qualify for a free wash or competition.</span>";
    elements.whatsappAlertList.append(empty);
    return;
  }

  for (const alert of alerts) {
    const link = whatsappLink(alert.customer, alert.message);
    const card = document.createElement("article");
    card.className = "whatsapp-alert-card";
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(alert.type)}: ${escapeHtml(alert.customer.name)}</strong>
        <span>${escapeHtml(alert.customer.phone)} - ${customerCode(alert.customer)}</span>
        <p>${escapeHtml(alert.message)}</p>
      </div>
      <a class="success-action full-width" href="${link}" target="_blank" rel="noopener">
        Send WhatsApp
      </a>
    `;
    elements.whatsappAlertList.append(card);
  }
}

function renderStampCard(stampBalance) {
  const stamps = Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;
    const isFreeSlot = number === 10;
    const isFilled = !isFreeSlot && number <= stampBalance;
    const isReady = isFreeSlot && stampBalance >= STAMPS_FOR_FREE_WASH;
    const label = isFreeSlot ? "FREE" : number;
    const className = [
      "stamp",
      isFilled ? "filled" : "",
      isFreeSlot ? "free-slot" : "",
      isReady ? "ready" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<span class="${className}">${label}</span>`;
  }).join("");

  return `<div class="stamp-card" aria-label="${stampBalance} of 9 paid wash stamps">${stamps}</div>`;
}

function renderLuckyDraw() {
  const entries = eligibleDrawCustomers();
  const winner = currentMonthDraw();
  elements.drawSummary.textContent = `${entries.length} eligible entr${entries.length === 1 ? "y" : "ies"} this month. Customers need 5+ verified paid washes in 2 months. Prize: ${DRAW_PRIZE}.`;
  elements.luckyDrawList.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<strong>No lucky draw entries yet</strong><span>Verify more washes to qualify customers.</span>";
    elements.luckyDrawList.append(empty);
  } else {
    for (const customer of entries) {
      const entry = document.createElement("article");
      entry.className = "draw-entry";
      entry.innerHTML = `
        <strong>${escapeHtml(customer.name)}</strong>
        <span>${customerCode(customer)} - ${recentPaidWashes(customer)} verified washes in 2 months</span>
      `;
      elements.luckyDrawList.append(entry);
    }
  }

  elements.runDrawButton.disabled = !ownerUnlocked || !entries.length || Boolean(winner);
  if (winner) {
    elements.drawResult.textContent = `${winner.month} winner: ${winner.customerName} wins ${drawPrizeText(winner.prize)}.`;
    elements.drawResult.classList.add("visible");
  } else {
    elements.drawResult.textContent = ownerUnlocked
      ? ""
      : "Unlock owner verification to pick the monthly winner.";
    elements.drawResult.classList.toggle("visible", !ownerUnlocked);
  }
}

function renderActivity() {
  elements.activityList.innerHTML = "";
  const latest = [...state.activities].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);

  if (!latest.length) {
    const item = document.createElement("li");
    item.className = "empty-state";
    item.innerHTML = "<strong>No verified activity yet</strong><span>Owner-verified washes will appear here.</span>";
    elements.activityList.append(item);
    return;
  }

  for (const activity of latest) {
    const item = document.createElement("li");
    const title =
      activity.type === "draw"
        ? `${activity.customerName} won the lucky draw`
        : activity.type === "revoked"
          ? `${activity.customerName} had a wash revoked`
          : activity.type === "free"
            ? `${activity.customerName} redeemed a free wash`
            : `${activity.customerName} verified a paid wash`;
    item.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(activity.service)} - ${escapeHtml(activity.plate || "No plate")} - ${escapeHtml(activity.note || "Owner verified")} - ${activity.date}</span>
    `;
    elements.activityList.append(item);
  }
}

function renderFeedbackInbox() {
  elements.feedbackList.innerHTML = "";
  const latest = [...state.feedback].slice(0, 20);

  if (!latest.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<strong>No feedback yet</strong><span>Customer messages will appear here after submission.</span>";
    elements.feedbackList.append(empty);
    return;
  }

  for (const item of latest) {
    const rating = Number(item.rating || 0);
    const reply = String(item.ownerReply || "").trim();
    const entry = document.createElement("article");
    entry.className = "feedback-entry";
    entry.innerHTML = `
      <div class="feedback-entry-header">
        <div>
          <strong>${escapeHtml(item.type)} from ${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.phone)} - ${escapeHtml(item.date)}${rating ? ` - Rating ${rating}/5` : ""}</span>
        </div>
        <button class="ghost-button" data-reply-feedback="${escapeHtml(item.id)}" type="button">
          ${reply ? "Edit reply" : "Reply"}
        </button>
      </div>
      <p>${escapeHtml(item.message)}</p>
      ${
        reply
          ? `<div class="owner-reply"><strong>Owner reply</strong><p>${escapeHtml(reply)}</p><span>${escapeHtml(item.replyDate || "")}</span></div>`
          : ""
      }
      <form class="reply-form is-hidden" data-feedback-reply-form="${escapeHtml(item.id)}">
        <label>
          Owner reply
          <textarea data-feedback-reply-message rows="3" required>${escapeHtml(reply)}</textarea>
        </label>
        <button class="primary-action full-width" type="submit">Save reply</button>
      </form>
    `;
    elements.feedbackList.append(entry);
  }
}

function toggleFeedbackReplyForm(feedbackId) {
  const form = elements.feedbackList.querySelector(
    `[data-feedback-reply-form="${CSS.escape(feedbackId)}"]`,
  );
  if (!form) return;
  form.classList.toggle("is-hidden");
  if (!form.classList.contains("is-hidden")) {
    form.querySelector("[data-feedback-reply-message]")?.focus();
  }
}

function saveFeedbackReply(feedbackId, reply) {
  const item = state.feedback.find((feedbackItem) => feedbackItem.id === feedbackId);
  if (!item) return false;

  item.ownerReply = reply;
  item.replyDate = today();
  item.updatedAt = nowIso();
  renderFeedbackInbox();
  renderCustomerResponses();
  saveState();
  return true;
}

function setResponseLookupPhone(phone) {
  responseLookupPhone = phone.trim();
  localStorage.setItem(RESPONSE_LOOKUP_KEY, responseLookupPhone);
  elements.responseLookupPhone.value = responseLookupPhone;
  renderCustomerResponses();
}

function renderCustomerResponses() {
  elements.customerResponseList.innerHTML = "";
  elements.responseLookupPhone.value = responseLookupPhone;

  const lookupPhoneKey = customerPhoneKey(responseLookupPhone);
  if (!lookupPhoneKey) {
    const empty = document.createElement("div");
    empty.className = "empty-state compact-empty";
    empty.innerHTML = "<strong>No phone number entered</strong><span>Enter your phone number to view owner responses.</span>";
    elements.customerResponseList.append(empty);
    return;
  }

  const matches = state.feedback
    .filter((item) => customerPhoneKey(item.phone) === lookupPhoneKey)
    .slice(0, 10);

  if (!matches.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state compact-empty";
    empty.innerHTML = "<strong>No messages found</strong><span>Use the same phone number you used when sending the message.</span>";
    elements.customerResponseList.append(empty);
    return;
  }

  for (const item of matches) {
    const rating = Number(item.rating || 0);
    const reply = String(item.ownerReply || "").trim();
    const entry = document.createElement("article");
    entry.className = "customer-response-entry";
    entry.innerHTML = `
      <strong>${escapeHtml(item.type)} - ${escapeHtml(item.date)}</strong>
      <span>${rating ? `Rating ${rating}/5` : "No rating saved"}</span>
      <p>${escapeHtml(item.message)}</p>
      <div class="owner-reply ${reply ? "" : "pending-reply"}">
        <strong>${reply ? "Owner reply" : "Awaiting owner reply"}</strong>
        <p>${reply ? escapeHtml(reply) : "Please check again later."}</p>
        ${reply ? `<span>${escapeHtml(item.replyDate || "")}</span>` : ""}
      </div>
    `;
    elements.customerResponseList.append(entry);
  }
}

function customerReplyItems(customer = activeCustomer()) {
  if (!customer) return [];
  const customerPhone = customerPhoneKey(customer.phone);
  if (!customerPhone) return [];
  return state.feedback
    .filter((item) => customerPhoneKey(item.phone) === customerPhone)
    .filter((item) => String(item.ownerReply || "").trim())
    .sort((a, b) => (b.replyDate || b.date).localeCompare(a.replyDate || a.date))
    .slice(0, 10);
}

function markCustomerRepliesSeen(customer = activeCustomer()) {
  const seenReplies = readSeenReplies();
  customerReplyItems(customer).forEach((item) => seenReplies.add(replyKey(item)));
  saveSeenReplies(seenReplies);
}

function renderCustomerReplyPreview() {
  const customer = activeCustomer();
  const replies = customerReplyItems(customer);

  if (!customer || !replies.length) {
    elements.customerReplyPreview.classList.add("is-hidden");
    elements.customerReplyPreview.innerHTML = "";
    return;
  }

  const seenReplies = readSeenReplies();
  const unseen = replies.filter((item) => !seenReplies.has(replyKey(item)));
  const latest = replies[0];
  const latestReply = String(latest.ownerReply || "").trim();
  elements.customerReplyPreview.classList.remove("is-hidden");
  elements.customerReplyPreview.innerHTML = `
    <div class="reply-preview-card ${unseen.length ? "has-new-reply" : ""}">
      <span>${unseen.length ? `${unseen.length} new owner repl${unseen.length === 1 ? "y" : "ies"}` : "Latest owner reply"}</span>
      <strong>${escapeHtml(latest.type)} - ${escapeHtml(latest.replyDate || latest.date)}</strong>
      <p>${escapeHtml(latestReply)}</p>
      <button class="primary-action full-width" data-view-customer-replies type="button">
        View replies
      </button>
    </div>
  `;

  const modalOpen = !elements.replyModal.classList.contains("is-hidden");
  if (currentMode === "customer" && unseen.length && !modalOpen) {
    showReplyPopup(unseen[0]);
  }
}

function showReplyPopup(item) {
  pendingReplyPopup = item;
  elements.replyModalMessage.textContent = String(item.ownerReply || "").trim();
  elements.replyModalDate.textContent = `${item.type} reply - ${item.replyDate || item.date}`;
  elements.replyModal.classList.remove("is-hidden");
}

function closeReplyPopup(markSeen = true) {
  if (markSeen && pendingReplyPopup) {
    markReplySeen(pendingReplyPopup);
  }
  pendingReplyPopup = null;
  elements.replyModal.classList.add("is-hidden");
  renderCustomerReplyPreview();
}

function openCustomerReplies() {
  const customer = activeCustomer();
  if (customer) {
    setResponseLookupPhone(customer.phone);
    markCustomerRepliesSeen(customer);
  }
  pendingReplyPopup = null;
  elements.replyModal.classList.add("is-hidden");
  setMode("feedback");
  renderCustomerReplyPreview();
}

function showFeedbackThanksPopup(item) {
  pendingFeedbackThanks = item;
  elements.feedbackThanksModalMessage.textContent =
    "Your feedback was sent to the owner. We appreciate you helping us improve the carwash experience.";
  elements.feedbackThanksModalMeta.textContent = `${item.type} - Rating ${item.rating}/5 - ${item.date}`;
  elements.feedbackThanksModal.classList.remove("is-hidden");
}

function closeFeedbackThanksPopup() {
  pendingFeedbackThanks = null;
  elements.feedbackThanksModal.classList.add("is-hidden");
}

function viewFeedbackThanks() {
  if (pendingFeedbackThanks) {
    setResponseLookupPhone(pendingFeedbackThanks.phone);
  }
  closeFeedbackThanksPopup();
  setMode("feedback");
  elements.customerResponseList.scrollIntoView({ behavior: "smooth", block: "center" });
}

function updateCustomerFromOwner(customer) {
  const name = elements.manageCustomerName.value.trim();
  const phone = elements.manageCustomerPhone.value.trim();
  const newVehicle = normalizePlate(elements.manageNewVehicle.value);
  const phoneKey = customerPhoneKey(phone);

  if (!name) {
    setManageAlert("Customer name is required.");
    return false;
  }

  const duplicateCustomer = findExistingCustomer({ name, phone, plate: newVehicle }, customer.id);
  const duplicatePhone = phoneKey
    ? state.customers.find((item) => item.id !== customer.id && customerPhoneKey(item.phone) === phoneKey)
    : null;
  if (duplicatePhone || duplicateCustomer) {
    const duplicate = duplicatePhone || duplicateCustomer;
    setManageAlert(`${duplicate.name} is already on the system. Customer code: ${customerCode(duplicate)}.`);
    return false;
  }

  customer.name = name;
  customer.phone = phone;
  customer.manualCode = phoneKey ? "" : customer.manualCode || nextManualCustomerCode();
  customer.whatsappOptIn = Boolean(phoneKey && elements.manageWhatsappOptIn.checked);
  if (newVehicle) addVehicleToCustomer(customer, newVehicle);
  touchCustomer(customer);

  state.activities.forEach((activity) => {
    if (activity.customerId === customer.id) {
      activity.customerName = customer.name;
    }
  });
  state.draws.forEach((draw) => {
    if (draw.customerId === customer.id) {
      draw.customerName = customer.name;
    }
  });

  elements.manageNewVehicle.value = "";
  setManageAlert("Customer information updated.");
  return true;
}

function removeSelectedVehicle(customer) {
  const plate = elements.manageVehicleSelect.value;
  if (!plate) {
    setManageAlert("Select a car to remove.");
    return false;
  }

  const vehicles = normalizeVehicleList(customer.vehicles, customer.plate).filter(
    (vehicle) => vehicle !== plate,
  );
  customer.vehicles = vehicles;
  customer.plate = vehicles[0] || "";
  touchCustomer(customer);
  setManageAlert(`${plate} removed from this customer.`);
  return true;
}

function revokeLastPaidWash(customer) {
  if (customer.stampBalance <= 0) {
    setManageAlert("There is no current paid wash stamp to revoke.");
    return false;
  }

  const revokedIds = new Set(
    state.activities
      .filter((activity) => activity.type === "revoked" && activity.revokedActivityId)
      .map((activity) => activity.revokedActivityId),
  );
  const paidActivity = [...state.activities]
    .reverse()
    .find(
      (activity) =>
        activity.type === "paid" &&
        activity.customerId === customer.id &&
        !activity.revoked &&
        !revokedIds.has(activity.id),
    );

  customer.stampBalance = Math.max(0, customer.stampBalance - 1);
  customer.lifetimePaidWashes = Math.max(0, customer.lifetimePaidWashes - 1);
  customer.lastWash = today();
  touchCustomer(customer);

  if (paidActivity) {
    paidActivity.revoked = true;
    paidActivity.updatedAt = nowIso();
  }

  state.activities.push({
    id: crypto.randomUUID(),
    customerId: customer.id,
    customerName: customer.name,
    type: "revoked",
    service: paidActivity?.service || "Adjustment",
    plate: paidActivity?.plate || primaryPlate(customer),
    note: paidActivity ? "Owner revoked a verified paid wash" : "Owner adjusted paid wash count",
    revokedActivityId: paidActivity?.id || null,
    date: today(),
    updatedAt: nowIso(),
  });

  setManageAlert("Last paid wash stamp revoked.");
  return true;
}

function removeCustomer(customer) {
  const confirmed = window.confirm(`Remove ${customer.name} and all their wash records?`);
  if (!confirmed) return false;

  state.customers = state.customers.filter((item) => item.id !== customer.id);
  state.activities = state.activities.filter((activity) => activity.customerId !== customer.id);
  state.draws = state.draws.filter((draw) => draw.customerId !== customer.id);
  if (localStorage.getItem(ACTIVE_CUSTOMER_KEY) === customer.id) {
    localStorage.removeItem(ACTIVE_CUSTOMER_KEY);
  }
  setManageAlert("Customer removed.");
  return true;
}

function runMonthlyDraw() {
  const existingWinner = currentMonthDraw();
  if (existingWinner) {
    elements.drawResult.textContent = `${existingWinner.month} winner already picked: ${existingWinner.customerName}.`;
    elements.drawResult.classList.add("visible");
    return false;
  }

  const entries = eligibleDrawCustomers();
  if (!entries.length) {
    elements.drawResult.textContent = "No eligible lucky draw entries yet.";
    elements.drawResult.classList.add("visible");
    return false;
  }

  const winner = entries[Math.floor(Math.random() * entries.length)];
  const draw = {
    id: crypto.randomUUID(),
    customerId: winner.id,
    customerName: winner.name,
    month: currentDrawMonth(),
    prize: DRAW_PRIZE,
    date: today(),
    updatedAt: nowIso(),
  };

  state.draws.unshift(draw);
  state.activities.push({
    id: crypto.randomUUID(),
    customerId: winner.id,
    customerName: winner.name,
    type: "draw",
    service: "Lucky draw",
    plate: primaryPlate(winner),
    note: `Won ${DRAW_PRIZE}`,
    date: today(),
    updatedAt: nowIso(),
  });
  elements.drawResult.textContent = `${winner.name} wins ${DRAW_PRIZE}.`;
  elements.drawResult.classList.add("visible");
  return true;
}

function addPaidWash(customer, details = {}) {
  if (isReadyForFreeWash(customer)) {
    setOwnerAlert(`${customer.name} already has 9 stamps. Redeem the free wash first.`);
    return false;
  }

  const washDate = validAppDate(details.date) ? details.date : today();
  customer.stampBalance += 1;
  customer.lifetimePaidWashes += 1;
  customer.lastWash = washDate;
  if (details.plate) addVehicleToCustomer(customer, details.plate);
  touchCustomer(customer);

  state.activities.push({
    id: crypto.randomUUID(),
    customerId: customer.id,
    customerName: customer.name,
    type: "paid",
    service: details.service || "Full wash",
    plate: details.plate || primaryPlate(customer),
    note: details.note || (isReadyForFreeWash(customer) ? "Free wash now ready" : "Owner verified"),
    date: washDate,
    stampBalanceAfter: customer.stampBalance,
    updatedAt: nowIso(),
  });
  setOwnerAlert(isReadyForFreeWash(customer) ? `${customer.name}'s free wash is now ready.` : "Paid wash verified.");
  return true;
}

function redeemFreeWash(customer, details = {}) {
  if (!isReadyForFreeWash(customer)) {
    setOwnerAlert(`${customer.name} needs ${washesUntilFree(customer)} more paid wash(es) before the free wash.`);
    return false;
  }

  const washDate = validAppDate(details.date) ? details.date : today();
  customer.stampBalance = 0;
  customer.freeWashesRedeemed += 1;
  customer.lastWash = washDate;
  if (details.plate) addVehicleToCustomer(customer, details.plate);
  touchCustomer(customer);

  state.activities.push({
    id: crypto.randomUUID(),
    customerId: customer.id,
    customerName: customer.name,
    type: "free",
    service: details.service || "Exterior wash",
    plate: details.plate || primaryPlate(customer),
    note: details.note || "10th wash redeemed",
    date: washDate,
    stampBalanceAfter: customer.stampBalance,
    updatedAt: nowIso(),
  });
  setOwnerAlert(`${customer.name}'s free wash was redeemed. Their card has reset.`);
  return true;
}

function selectedOwnerCustomer() {
  return state.customers.find((customer) => customer.id === elements.ownerCustomerSelect.value) || null;
}

function ownerDetails() {
  const selectedVehicle = elements.ownerVehicleSelect.value;
  const typedPlate = normalizePlate(elements.ownerPlate.value);
  const plate =
    typedPlate || (selectedVehicle === "__new__" ? "" : normalizePlate(selectedVehicle));
  return {
    service: elements.ownerService.value,
    plate,
    date: selectedOwnerWashDate(),
    note: elements.ownerNote.value.trim(),
  };
}

function updateRedeemButtonState() {
  const customer = selectedOwnerCustomer();
  elements.redeemFreeButton.disabled = !customer || !isReadyForFreeWash(customer);
}

function setOwnerAlert(message) {
  elements.ownerAlert.textContent = message;
  elements.ownerAlert.classList.toggle("visible", Boolean(message));
}

function setLoginAlert(message) {
  elements.ownerLoginAlert.textContent = message;
  elements.ownerLoginAlert.classList.toggle("visible", Boolean(message));
}

function setManageAlert(message) {
  elements.manageAlert.textContent = message;
  elements.manageAlert.classList.toggle("visible", Boolean(message));
}

function setFeedbackAlert(message) {
  elements.feedbackAlert.textContent = message;
  elements.feedbackAlert.classList.toggle("visible", Boolean(message));
}

function setOwnerLockButtons(disabled) {
  elements.ownerSetupButton.disabled = disabled;
  elements.ownerUnlockButton.disabled = disabled;
  elements.ownerForgetButton.disabled = disabled;
}

function syncOwnerAccessVisibility() {
  const available = ownerAccessAvailable();
  elements.ownerModeButton.hidden = !available;
  elements.ownerModeButton.classList.toggle("is-hidden", !available);
  if (!available && currentMode === "owner") {
    setMode("customer");
  }
}

function clearOwnerSetupFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("owner") !== "setup") return;
  params.delete("owner");
  const query = params.toString();
  window.history.replaceState(
    {},
    "",
    `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
  );
}

async function registerOwnerDevice() {
  setLoginAlert("");
  setOwnerLockButtons(true);

  try {
    if (!(await platformLockAvailable())) {
      setLoginAlert("Fingerprint/passkey lock needs a secure browser on a phone or computer that supports device lock.");
      return;
    }

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge(),
        rp: { name: "THE CARWASH" },
        user: {
          id: randomChallenge(),
          name: "owner@thecarwash.local",
          displayName: "THE CARWASH Owner",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "preferred",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      },
    });

    if (!credential) {
      setLoginAlert("Owner device setup was not completed.");
      return;
    }

    localStorage.setItem(
      OWNER_CREDENTIAL_KEY,
      JSON.stringify({
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        created: today(),
      }),
    );
    ownerSetupRequested = false;
    clearOwnerSetupFromUrl();
    syncOwnerAccessVisibility();
    setOwnerUnlocked(true);
    renderOwnerCustomers();
  } catch {
    setLoginAlert("Fingerprint/passkey setup was cancelled or could not be completed.");
  } finally {
    setOwnerLockButtons(false);
  }
}

async function unlockOwnerDevice() {
  const credential = readOwnerCredential();
  if (!credential) {
    setLoginAlert("This device is not set up for owner access.");
    syncOwnerAccessVisibility();
    return;
  }

  setLoginAlert("");
  setOwnerLockButtons(true);
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: [
          {
            id: base64UrlToBuffer(credential.rawId),
            type: "public-key",
            transports: ["internal"],
          },
        ],
        timeout: 60000,
        userVerification: "required",
      },
    });

    if (assertion?.id === credential.id) {
      setOwnerUnlocked(true);
      renderOwnerCustomers();
      return;
    }
    setLoginAlert("Owner fingerprint/passkey was not recognized.");
  } catch {
    setLoginAlert("Fingerprint/passkey unlock was cancelled or not recognized.");
  } finally {
    setOwnerLockButtons(false);
  }
}

function forgetOwnerDevice() {
  const confirmed = window.confirm("Remove owner access from this device?");
  if (!confirmed) return;

  localStorage.removeItem(OWNER_CREDENTIAL_KEY);
  ownerSetupRequested = false;
  setOwnerUnlocked(false);
  syncOwnerAccessVisibility();
  setMode("customer");
}

function prefillFeedbackForm() {
  const customer = activeCustomer();
  if (!customer) return;
  if (!elements.feedbackName.value) elements.feedbackName.value = customer.name;
  if (!elements.feedbackPhone.value) elements.feedbackPhone.value = customer.phone;
  if (!responseLookupPhone) setResponseLookupPhone(customer.phone);
}

function setupOwnerAccordions() {
  const panels = document.querySelectorAll("#ownerVerifyPanel, #ownerView > .panel[data-owner-secure], #activity.panel[data-owner-secure]");
  panels.forEach((panel) => {
    if (panel.dataset.ownerAccordionReady) return;
    const header = panel.querySelector(".panel-header");
    if (!header) return;

    const content = document.createElement("div");
    content.className = "owner-panel-content";
    let node = header.nextSibling;
    while (node) {
      const next = node.nextSibling;
      content.append(node);
      node = next;
    }

    const toggle = document.createElement("button");
    toggle.className = "owner-toggle-button";
    toggle.type = "button";
    toggle.textContent = "Open";
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      const collapsed = panel.classList.toggle("owner-collapsed");
      toggle.textContent = collapsed ? "Open" : "Close";
      toggle.setAttribute("aria-expanded", String(!collapsed));
    });
    header.addEventListener("click", (event) => {
      if (event.target.closest("button, input, select, textarea, a")) return;
      toggle.click();
    });

    header.append(toggle);
    panel.append(content);
    panel.classList.add("owner-tool-panel", "owner-collapsed");
    panel.dataset.ownerAccordionReady = "true";
  });
}

function collapseOwnerPanels() {
  document.querySelectorAll(".owner-tool-panel").forEach((panel) => {
    panel.classList.add("owner-collapsed");
    const toggle = panel.querySelector(".owner-toggle-button");
    if (toggle) {
      toggle.textContent = "Open";
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function setMode(mode) {
  if (mode === "owner" && !ownerAccessAvailable()) {
    mode = "customer";
  }
  currentMode = mode;
  const isCustomer = mode === "customer";
  const isMenu = mode === "menu";
  const isBook = mode === "book";
  const isDidYouKnow = mode === "didYouKnow";
  const isRules = mode === "rules";
  const isAbout = mode === "about";
  const isFeedback = mode === "feedback";
  const isOwner = mode === "owner";
  elements.customerView.classList.toggle("is-hidden", !isCustomer);
  elements.menuView.classList.toggle("is-hidden", !isMenu);
  elements.bookView.classList.toggle("is-hidden", !isBook);
  elements.didYouKnowView.classList.toggle("is-hidden", !isDidYouKnow);
  elements.rulesView.classList.toggle("is-hidden", !isRules);
  elements.aboutView.classList.toggle("is-hidden", !isAbout);
  elements.feedbackView.classList.toggle("is-hidden", !isFeedback);
  elements.ownerView.classList.toggle("is-hidden", !isOwner);
  elements.customerModeButton.classList.toggle("active", isCustomer);
  elements.menuModeButton.classList.toggle("active", isMenu);
  elements.bookModeButton.classList.toggle("active", isBook);
  elements.didYouKnowModeButton.classList.toggle("active", isDidYouKnow);
  elements.rulesModeButton.classList.toggle("active", isRules);
  elements.aboutModeButton.classList.toggle("active", isAbout);
  elements.feedbackModeButton.classList.toggle("active", isFeedback);
  elements.ownerModeButton.classList.toggle("active", isOwner);
  if (isFeedback) prefillFeedbackForm();
  if (isBook) prefillBookingForm();
  updateOwnerPrivacy();
  renderCustomerReplyPreview();
}

function setOwnerUnlocked(unlocked) {
  ownerUnlocked = unlocked;
  if (!unlocked) {
    setOwnerAlert("");
    closeOwnerAlert(false);
  } else {
    collapseOwnerPanels();
  }
  syncOwnerAccessVisibility();
  updateOwnerPrivacy();
  renderLuckyDraw();
  renderOwnerPopup();
}

function updateOwnerPrivacy() {
  const isOwnerMode = currentMode === "owner";
  const canSeeDatabase = isOwnerMode && ownerUnlocked;
  const showOwnerLock = isOwnerMode && !ownerUnlocked;
  const hasCredential = hasOwnerCredential();
  elements.ownerLockPanel.classList.toggle("is-hidden", !showOwnerLock);
  elements.ownerSetupPanel.classList.toggle("is-hidden", !showOwnerLock || hasCredential);
  elements.ownerUnlockPanel.classList.toggle("is-hidden", !showOwnerLock || !hasCredential);
  elements.ownerVerifyPanel.classList.toggle("is-hidden", !canSeeDatabase);
  elements.ownerSecurePanels.forEach((panel) => {
    panel.classList.toggle("is-hidden", !canSeeDatabase);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function submitFeedback(event) {
  event.preventDefault();
  const name = elements.feedbackName.value.trim();
  const phone = elements.feedbackPhone.value.trim();
  const message = elements.feedbackMessage.value.trim();

  if (!name || !phone || !message) {
    setFeedbackAlert("Please complete your name, phone, and message.");
    return;
  }

  const feedbackItem = {
    id: crypto.randomUUID(),
    type: elements.feedbackType.value,
    rating: Number(elements.feedbackRating.value),
    name,
    phone,
    message,
    date: today(),
    updatedAt: nowIso(),
  };

  state.feedback.unshift(feedbackItem);

  setResponseLookupPhone(phone);
  elements.feedbackForm.reset();
  setFeedbackAlert("Thank you. Your message has been sent to the owner. Check back here for a reply.");
  renderFeedbackInbox();
  renderCustomerResponses();
  showFeedbackThanksPopup(feedbackItem);
  saveState();
}

setupOwnerAccordions();

elements.customerModeButton.addEventListener("click", () => setMode("customer"));
elements.menuModeButton.addEventListener("click", () => setMode("menu"));
elements.bookModeButton.addEventListener("click", () => setMode("book"));
elements.didYouKnowModeButton.addEventListener("click", () => setMode("didYouKnow"));
elements.rulesModeButton.addEventListener("click", () => setMode("rules"));
elements.aboutModeButton.addEventListener("click", () => setMode("about"));
elements.feedbackModeButton.addEventListener("click", () => setMode("feedback"));
elements.ownerModeButton.addEventListener("click", () => setMode("owner"));
elements.customerWelcomeCard.addEventListener("click", (event) => {
  if (event.target.closest("[data-customer-install-app]")) {
    elements.installButton.click();
    return;
  }
  if (event.target.closest("[data-customer-book-wash]")) {
    setMode("book");
  }
});
elements.ownerView.addEventListener("click", (event) => {
  const button = event.target.closest("[data-owner-jump]");
  if (!button || !ownerUnlocked) return;
  const panels = {
    verify: elements.ownerVerifyPanel,
    bookings: elements.ownerBookingsPanel,
    manage: elements.ownerManagePanel,
    feedback: elements.ownerFeedbackPanel,
    addCustomer: elements.ownerAddCustomerPanel,
    notice: elements.ownerNoticePanel,
    menuEdit: elements.ownerMenuPanel,
    whatsapp: elements.ownerWhatsAppPanel,
    backup: elements.ownerBackupPanel,
    customers: elements.ownerCustomerBookPanel,
    draw: elements.ownerDrawPanel,
    activity: elements.activityPanel,
  };
  openOwnerPanel(panels[button.dataset.ownerJump]);
});
window.addEventListener("online", updateOfflineBanner);
window.addEventListener("offline", updateOfflineBanner);
elements.menuCategoryFilter.addEventListener("change", renderMenu);
elements.menuSearch.addEventListener("input", renderMenu);
elements.bookingForm.addEventListener("submit", submitBooking);
elements.ownerAddCustomerForm.addEventListener("submit", addOwnerCustomer);
elements.ownerAddCustomerInvite.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy-invite-link]");
  if (!button) return;
  try {
    await navigator.clipboard.writeText(button.dataset.copyInviteLink);
    setOwnerAddCustomerAlert("App link copied.");
  } catch {
    setOwnerAddCustomerAlert("Could not copy automatically. Select the link and copy it.");
  }
});
elements.ownerBookingList.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-booking-queue-form]");
  if (!form || !ownerUnlocked) return;
  event.preventDefault();
  const input = form.querySelector("[data-booking-queue-number]");
  updateBookingQueue(form.dataset.bookingQueueForm, input?.value || "");
});
elements.ownerBookingList.addEventListener("click", (event) => {
  if (!ownerUnlocked) return;
  const nextQueueButton = event.target.closest("[data-booking-next-queue]");
  if (nextQueueButton) {
    const booking = state.bookings.find((item) => item.id === nextQueueButton.dataset.bookingNextQueue);
    if (booking) updateBookingQueue(booking.id, nextBookingQueueNumber(booking));
    return;
  }
  const completeButton = event.target.closest("[data-booking-complete]");
  if (completeButton) {
    updateBookingStatus(completeButton.dataset.bookingComplete, "completed");
    return;
  }
  const cancelButton = event.target.closest("[data-booking-cancel]");
  if (cancelButton) {
    updateBookingStatus(cancelButton.dataset.bookingCancel, "cancelled");
    return;
  }
  const reopenButton = event.target.closest("[data-booking-reopen]");
  if (reopenButton) {
    const booking = state.bookings.find((item) => item.id === reopenButton.dataset.bookingReopen);
    if (booking) updateBookingStatus(booking.id, booking.queueNumber ? "queued" : "pending");
  }
});
elements.ownerBookingSearch.addEventListener("input", renderOwnerBookings);
elements.ownerBookingFilter.addEventListener("change", renderOwnerBookings);
elements.ownerBookingDate.addEventListener("change", renderOwnerBookings);
elements.ownerBookingClearButton.addEventListener("click", () => {
  elements.ownerBookingSearch.value = "";
  elements.ownerBookingFilter.value = "active";
  elements.ownerBookingDate.value = "";
  renderOwnerBookings();
});
elements.ownerProductSelect.addEventListener("change", renderOwnerMenuEditor);
elements.ownerProductForm.addEventListener("submit", saveOwnerProduct);
elements.ownerNewProductButton.addEventListener("click", createBlankProduct);
elements.ownerRemoveProductButton.addEventListener("click", removeOwnerProduct);
elements.ownerBackupButton.addEventListener("click", exportOwnerBackup);
elements.feedbackForm.addEventListener("submit", submitFeedback);
elements.ownerNoticeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!ownerUnlocked) return;
  publishCustomerNotice();
});
elements.clearNoticeButton.addEventListener("click", () => {
  if (!ownerUnlocked) return;
  clearCustomerNotice();
});
elements.customerReplyPreview.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view-customer-replies]");
  if (!button) return;
  openCustomerReplies();
});
elements.replyModalCloseButton.addEventListener("click", () => closeReplyPopup(true));
elements.replyModalViewButton.addEventListener("click", openCustomerReplies);
elements.replyModal.addEventListener("click", (event) => {
  if (event.target === elements.replyModal) closeReplyPopup(true);
});
elements.bookingAlertCloseButton.addEventListener("click", () => closeBookingAlert(true));
elements.bookingAlertViewButton.addEventListener("click", viewBookingAlert);
elements.bookingAlertModal.addEventListener("click", (event) => {
  if (event.target === elements.bookingAlertModal) closeBookingAlert(true);
});
elements.stampAlertCloseButton.addEventListener("click", () => closeStampAlert(true));
elements.stampAlertViewButton.addEventListener("click", viewStampAlert);
elements.stampAlertModal.addEventListener("click", (event) => {
  if (event.target === elements.stampAlertModal) closeStampAlert(true);
});
elements.feedbackThanksCloseButton.addEventListener("click", closeFeedbackThanksPopup);
elements.feedbackThanksViewButton.addEventListener("click", viewFeedbackThanks);
elements.feedbackThanksModal.addEventListener("click", (event) => {
  if (event.target === elements.feedbackThanksModal) closeFeedbackThanksPopup();
});
elements.ownerAlertCloseButton.addEventListener("click", () => closeOwnerAlert(true));
elements.ownerAlertViewButton.addEventListener("click", viewOwnerAlert);
elements.ownerAlertModal.addEventListener("click", (event) => {
  if (event.target === elements.ownerAlertModal) closeOwnerAlert(true);
});
elements.responseLookupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setResponseLookupPhone(elements.responseLookupPhone.value);
});
elements.feedbackList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-reply-feedback]");
  if (!button) return;
  toggleFeedbackReplyForm(button.dataset.replyFeedback);
});

elements.feedbackList.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-feedback-reply-form]");
  if (!form) return;
  event.preventDefault();
  if (!ownerUnlocked) return;
  const reply = form.querySelector("[data-feedback-reply-message]")?.value.trim();
  if (!reply) return;
  saveFeedbackReply(form.dataset.feedbackReplyForm, reply);
});

elements.customerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.customerName.value.trim();
  const phone = elements.customerPhone.value.trim();
  const plate = normalizePlate(elements.customerPlate.value);
  let customer = findExistingCustomer({ name, phone, plate });
  const isNewCustomer = !customer;

  if (!customer) {
    customer = {
      id: crypto.randomUUID(),
      name,
      phone,
      plate,
      vehicles: normalizeVehicleList([], plate),
      stampBalance: 0,
      lifetimePaidWashes: 0,
      freeWashesRedeemed: 0,
      facebookFollowed: false,
      whatsappOptIn: elements.customerWhatsappOptIn.checked,
      lastWash: today(),
      joined: today(),
      updatedAt: nowIso(),
      ownerAdded: false,
    };
    state.customers.push(customer);
  } else {
    customer.name = name || customer.name;
    if (!customer.phone && phone) customer.phone = phone;
    addVehicleToCustomer(customer, plate);
    customer.whatsappOptIn = customer.whatsappOptIn || elements.customerWhatsappOptIn.checked;
    touchCustomer(customer);
  }

  localStorage.setItem(ACTIVE_CUSTOMER_KEY, customer.id);
  elements.customerForm.reset();
  setCustomerAlert(
    isNewCustomer
      ? "Your loyalty card is ready. Show your Customer ID at the counter after each wash."
      : "Welcome back. Your loyalty card is open and ready to use.",
  );
  render();
});

elements.customerCardDisplay.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-add-vehicle-form]");
  if (!form) return;
  event.preventDefault();

  const customer = activeCustomer();
  const input = form.querySelector("[data-new-vehicle-plate]");
  if (!customer || !input) return;

  addVehicleToCustomer(customer, input.value);
  touchCustomer(customer);
  input.value = "";
  render();
});

elements.ownerSetupButton.addEventListener("click", registerOwnerDevice);
elements.ownerUnlockButton.addEventListener("click", unlockOwnerDevice);
elements.ownerForgetButton.addEventListener("click", forgetOwnerDevice);
elements.ownerLockButton.addEventListener("click", () => setOwnerUnlocked(false));

elements.ownerVerifyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const customer = selectedOwnerCustomer();
  if (!customer || !ownerUnlocked) return;

  const details = ownerDetails();
  const changed = addPaidWash(customer, details);
  if (changed) {
    const currentAlert = elements.ownerAlert.textContent;
    const whatsappAlert = openVerificationWhatsApp(customer, verifiedWashMessage(customer, details));
    if (whatsappAlert) setOwnerAlert(`${currentAlert} ${whatsappAlert}`);
    elements.ownerNote.value = "";
    elements.ownerPlate.value = "";
    syncOwnerWashDate();
    render();
  }
});

elements.redeemFreeButton.addEventListener("click", () => {
  const customer = selectedOwnerCustomer();
  if (!customer || !ownerUnlocked) return;

  const details = ownerDetails();
  const changed = redeemFreeWash(customer, details);
  if (changed) {
    const currentAlert = elements.ownerAlert.textContent;
    const whatsappAlert = openVerificationWhatsApp(customer, redeemedWashMessage(customer, details));
    if (whatsappAlert) setOwnerAlert(`${currentAlert} ${whatsappAlert}`);
    elements.ownerNote.value = "";
    elements.ownerPlate.value = "";
    syncOwnerWashDate();
    render();
  }
});

elements.ownerCustomerSelect.addEventListener("change", () => {
  updateRedeemButtonState();
  renderOwnerVehicleOptions();
  renderOwnerManagement();
  setManageAlert("");
});

elements.ownerCustomerSearchButton.addEventListener("click", searchOwnerCustomer);

elements.ownerCustomerSearch.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  searchOwnerCustomer();
});

elements.manageCustomerSearchButton.addEventListener("click", searchManageCustomer);

elements.manageCustomerSearch.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  searchManageCustomer();
});

elements.ownerManageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const customer = selectedOwnerCustomer();
  if (!ownerUnlocked) return;
  if (!customer && elements.manageCustomerSearch.value.trim()) {
    searchManageCustomer();
    return;
  }
  if (!customer) {
    setManageAlert("Search and select a customer before updating details.");
    return;
  }

  if (updateCustomerFromOwner(customer)) {
    render();
  }
});

elements.removeVehicleButton.addEventListener("click", () => {
  const customer = selectedOwnerCustomer();
  if (!customer || !ownerUnlocked) return;

  if (removeSelectedVehicle(customer)) {
    render();
  }
});

elements.revokeWashButton.addEventListener("click", () => {
  const customer = selectedOwnerCustomer();
  if (!customer || !ownerUnlocked) return;

  if (revokeLastPaidWash(customer)) {
    render();
  }
});

elements.removeCustomerButton.addEventListener("click", () => {
  const customer = selectedOwnerCustomer();
  if (!customer || !ownerUnlocked) return;

  if (removeCustomer(customer)) {
    render();
  }
});
elements.searchInput.addEventListener("input", renderCustomerList);
elements.statusFilter.addEventListener("change", renderCustomerList);

elements.runDrawButton.addEventListener("click", () => {
  if (!ownerUnlocked) return;
  const changed = runMonthlyDraw();
  if (changed) render();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButton();
});

window.addEventListener("appinstalled", () => {
  hideInstallButton(true);
});

elements.installButton.addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (choice.outcome === "accepted") {
      hideInstallButton(true);
    } else {
      updateInstallButton();
    }
    return;
  }
  alert("On iPhone, open Safari Share and choose Add to Home Screen. On Android, use the browser install option.");
  hideInstallButton(true);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js?v=duplicatefix1");
  });
}

async function initializeApp() {
  await loadSharedState();
  activateLinkedCustomer();
  syncOwnerAccessVisibility();
  updateInstallButton();
  setMode(ownerSetupRequested ? "owner" : "customer");
  setOwnerUnlocked(false);
  render();
  await loadMenu();
  setInterval(refreshSharedState, 5000);
}

initializeApp();
