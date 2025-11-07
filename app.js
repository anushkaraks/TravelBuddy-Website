/* app.js - SRM Trip Planner Application Logic */
// Global app state
const state = {
  campuses: [],
  selectedCampus: null,
  filters: { type: "All", cost: "All", q: "" },
  destinations: [],
  selected: [],
  blogPosts: [],
  savedTrips: []
};

// Elements (declare now, assign after DOM loads via grabEls)
let campusSelect, blogCampus, activeCampusLabel, resultsCount, destinationsGrid, searchInput, clearSearch, tripTypeChips, costChips, clearFilters;
let exploreTab, plannerTab, blogTab, exploreSection, plannerSection, blogSection;
let selectedList, tripSummary, tripTitle, tripDate, tripPeople, plannerTripType, plannerBudget, tripNotes;
let pdfBtn, clearPlan, saveTripBtn;
let blogTitle, blogTags, blogContent, postBlogBtn, blogPostStatus, refreshBlogBtn, blogList;
let feedbackBtn, feedbackModal, closeFeedback, fbName, fbEmail, fbMessage, sendFeedbackBtn, feedbackStatus;
let destinationModal, modalTitle, modalBody, closeModal;
let blogModal, blogModalTitle, blogModalBody, closeBlogModal;

function grabEls() {
  campusSelect = document.getElementById("campusSelect");
  blogCampus = document.getElementById("blogCampus");
  activeCampusLabel = document.getElementById("activeCampusLabel");
  resultsCount = document.getElementById("resultsCount");
  destinationsGrid = document.getElementById("destinationsGrid");
  searchInput = document.getElementById("searchInput");
  clearSearch = document.getElementById("clearSearch");
  tripTypeChips = document.getElementById("tripTypeChips");
  costChips = document.getElementById("costChips");
  clearFilters = document.getElementById("clearFilters");

  exploreTab = document.getElementById("exploreTab");
  plannerTab = document.getElementById("plannerTab");
  blogTab = document.getElementById("blogTab");

  exploreSection = document.getElementById("exploreSection");
  plannerSection = document.getElementById("plannerSection");
  blogSection = document.getElementById("blogSection");

  selectedList = document.getElementById("selectedList");
  tripSummary = document.getElementById("tripSummary");

  tripTitle = document.getElementById("tripTitle");
  tripDate = document.getElementById("tripDate");
  tripPeople = document.getElementById("tripPeople");
  plannerTripType = document.getElementById("plannerTripType");
  plannerBudget = document.getElementById("plannerBudget");
  tripNotes = document.getElementById("tripNotes");

  pdfBtn = document.getElementById("pdfBtn");
  clearPlan = document.getElementById("clearPlan");
  saveTripBtn = document.getElementById("saveTripBtn");

  blogTitle = document.getElementById("blogTitle");
  blogTags = document.getElementById("blogTags");
  blogContent = document.getElementById("blogContent");
  postBlogBtn = document.getElementById("postBlogBtn");
  blogPostStatus = document.getElementById("blogPostStatus");
  refreshBlogBtn = document.getElementById("refreshBlogBtn");
  blogList = document.getElementById("blogList");

  feedbackBtn = document.getElementById("feedbackBtn");
  feedbackModal = document.getElementById("feedbackModal");
  closeFeedback = document.getElementById("closeFeedback");
  fbName = document.getElementById("fbName");
  fbEmail = document.getElementById("fbEmail");
  fbMessage = document.getElementById("fbMessage");
  sendFeedbackBtn = document.getElementById("sendFeedbackBtn");
  feedbackStatus = document.getElementById("feedbackStatus");

  destinationModal = document.getElementById("destinationModal");
  modalTitle = document.getElementById("modalTitle");
  modalBody = document.getElementById("modalBody");
  closeModal = document.getElementById("closeModal");

  blogModal = document.getElementById("blogModal");
  blogModalTitle = document.getElementById("blogModalTitle");
  blogModalBody = document.getElementById("blogModalBody");
  closeBlogModal = document.getElementById("closeBlogModal");
}

// Dialog polyfill (run after DOM is ready)
function initDialogPolyfill() {
  try {
    if (!window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal) {
      document.querySelectorAll("dialog").forEach(dlg => {
        dlg.showModal = function () { this.setAttribute("open", ""); this.style.display = "block"; document.body.style.overflow = "hidden"; };
        dlg.close = function () { this.removeAttribute("open"); this.style.display = "none"; document.body.style.overflow = ""; };
      });
    }
  } catch (e) { }
}

// Simple toast
function toast(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {
    position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)",
    background: "#111a37", color: "#e8edff", border: "1px solid rgba(255,255,255,.1)",
    padding: "10px 14px", borderRadius: "12px", zIndex: 2000
  });
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); }, 2200);
}

/* ----- Campus mapping (code <-> display) and normalizers ----- */
const CAMPUS_MAP = {
  KTR: "Kattankulathur",
  RMP: "Ramapuram",
  VDP: "Vadapalani",
  TRI: "Tiruchirappalli",
  NCR: "NCR (Delhi)",
  AMA: "Amaravati",
  MOD: "Modinagar",
  GTK: "Gangtok"
};
const CAMPUS_NAME_TO_CODE = Object.fromEntries(
  Object.entries(CAMPUS_MAP).map(([code, name]) => [name, code])
);

// Trip type and budget options for filters
const TRIP_TYPE_OPTIONS = ["All", "Friends", "Family", "Weekday", "Weekend", "Solo", "Couple", "Surprise"];
const COST_OPTIONS = ["All", "Cheap", "Moderate", "Expensive"];

// Target counts per campus
const TARGET_PLACES_PER_CAMPUS = 24;
const MIN_PER_TRIP_CATEGORY = 2;

// Budget and tripType helpers
function titleCaseBudget(b) {
  if (!b) return "Moderate";
  const v = String(b).toUpperCase();
  return v === "CHEAP" ? "Cheap" : v === "EXPENSIVE" ? "Expensive" : "Moderate";
}
function titleCaseTripType(t) {
  const m = String(t || "").toUpperCase();
  const map = {
    WEEKEND: "Weekend",
    WEEKDAY: "Weekday",
    FRIENDS: "Friends",
    FRIEND: "Friends",
    FAMILY: "Family",
    SOLO: "Solo",
    COUPLE: "Couple",
    SURPRISE: "Surprise"
  };
  return map[m] || (String(t || "").slice(0, 1).toUpperCase() + String(t || "").slice(1).toLowerCase());
}
function estimateCostFromBudget(b) {
  switch (String(b || "").toUpperCase()) {
    case "CHEAP": return 400;
    case "EXPENSIVE": return 2500;
    default: return 1200;
  }
}
function approxCostFromCostLabel(lbl) {
  const v = String(lbl || "").toUpperCase();
  if (v === "CHEAP") return 400;
  if (v === "EXPENSIVE") return 2500;
  return 1200;
}
function minutesFromKm(km) {
  const speed = 30; // km/h average
  return Math.max(10, Math.round((Number(km || 0) / speed) * 60));
}
function estimateTransport(a) {
  const km = Number(a?.distanceKm || 0);
  if (km > 0) {
    const mins = minutesFromKm(km);
    return `Taxi/Auto • ~${km} km (${mins}-${mins + 10} mins) from campus`;
  }
  return "Taxi/auto/metro/bus depending on route.";
}

// Normalize record (Attraction -> UI shape)
function normalizeAttraction(a) {
  if (a && a.campus && a.tripTypes) return a; // already UI shape
  const campusName = CAMPUS_MAP[a?.campusCode] || a?.campus || a?.campusName || "Unknown";
  const tripTypes = (a?.recommendedTripTypes || []).map(titleCaseTripType);
  if (!tripTypes.length) tripTypes.push("Weekend");
  const safety = [];
  if (a?.safetyInfo) safety.push(a.safetyInfo);
  (a?.emergencyContacts || []).forEach(c => safety.push(`Emergency: ${c}`));
  const approxCost = Number(a?.approxCost) || estimateCostFromBudget(a?.budgetLevel);
  const cost = a?.cost || titleCaseBudget(a?.budgetLevel);
  const transport = a?.transport || estimateTransport(a);
  const id = a?.id || `${String(a?.campusCode || campusName || "campus").toLowerCase()}-${String(a?.name || "place").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

  return {
    id,
    campus: campusName,
    name: a?.name || "Unnamed place",
    description: a?.description || "",
    tripTypes: Array.from(new Set(tripTypes)),
    cost,
    approxCost,
    transport,
    safety,
    imageUrl: a?.imageUrl || a?.coverImage || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
    _raw: {
      campusCode: a?.campusCode,
      type: a?.type,
      distanceKm: a?.distanceKm,
      bestTimings: a?.bestTimings,
      averageRating: a?.averageRating,
      latitude: a?.latitude,
      longitude: a?.longitude
    }
  };
}

// Common filter
function filterDest(d, filters) {
  const matchType = filters.type === "All" || (d.tripTypes || []).includes(filters.type);
  const matchCost = filters.cost === "All" || d.cost === filters.cost;
  const q = (filters.q || "").toLowerCase();
  const matchQ = !q || (d.name || "").toLowerCase().includes(q) || (d.description || "").toLowerCase().includes(q);
  return matchType && matchCost && matchQ;
}

// Create chips dynamically
function renderFilterChips() {
  if (tripTypeChips) {
    const activeType = state.filters.type || "All";
    tripTypeChips.innerHTML = TRIP_TYPE_OPTIONS.map(t => `
      <button class="chip ${t === activeType ? 'active' : ''}" data-type="${t}">${t}</button>
    `).join("");
  }
  if (costChips) {
    const activeCost = state.filters.cost || "All";
    costChips.innerHTML = COST_OPTIONS.map(c => `
      <button class="chip ${c === activeCost ? 'active' : ''}" data-cost="${c}">${c}</button>
    `).join("");
  }
}

// Auto-tag + expand
function autoTagTripTypes(list) {
  const enriched = list.map(d => {
    const tSet = new Set(d.tripTypes || []);
    const rawType = String(d._raw?.type || "").toUpperCase();
    const near = Number(d._raw?.distanceKm || 0) <= 10;
    if (!tSet.has("Weekday") && (["MUSEUM", "SHOPPING", "TEMPLE", "HISTORICAL", "PARK"].includes(rawType) || near)) {
      tSet.add("Weekday");
    }
    return { ...d, tripTypes: Array.from(tSet) };
  });

  let surpriseAdded = 0;
  for (let i = 0; i < enriched.length && surpriseAdded < 2; i++) {
    if (!enriched[i].tripTypes.includes("Surprise")) {
      enriched[i] = { ...enriched[i], tripTypes: Array.from(new Set([...enriched[i].tripTypes, "Surprise"])) };
      surpriseAdded++;
    }
  }
  return enriched;
}

function expandAttractionsForCampus(baseList, campusCode, targetCount = TARGET_PLACES_PER_CAMPUS, minPerCategory = MIN_PER_TRIP_CATEGORY) {
  const categories = TRIP_TYPE_OPTIONS.slice(1);
  let list = baseList.map(d => ({ ...d, tripTypes: Array.from(new Set(d.tripTypes || [])) }));

  const countCat = (cat, arr = list) => arr.filter(d => (d.tripTypes || []).includes(cat)).length;

  let cloneCounter = 1;
  function labelFor(cat) {
    const map = {
      Friends: "Friends Hangout",
      Family: "Family Bundle",
      Weekday: "Weekday Special",
      Weekend: "Weekend Plan",
      Solo: "Solo Explore",
      Couple: "Date Night",
      Surprise: "Surprise Pick"
    };
    return map[cat] || cat;
  }
  function cloneWithCategory(src, cat) {
    const newTypes = Array.from(new Set([...(src.tripTypes || []), cat]));
    const bump = { Weekday: -100, Weekend: 100, Couple: 150, Surprise: 150 };
    const baseCost = Number(src.approxCost || approxCostFromCostLabel(src.cost));
    const approx = Math.max(200, baseCost + (bump[cat] || 0));
    const suffix = `${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-v${cloneCounter++}`;
    return {
      ...src,
      id: `${src.id}-${suffix}`,
      name: `${src.name} — ${labelFor(cat)}`,
      description: src.description || "",
      tripTypes: newTypes,
      approxCost: approx
    };
  }

  for (const cat of categories) {
    let missing = Math.max(0, minPerCategory - countCat(cat, list));
    if (missing > 0) {
      const candidates = list.filter(d => !(d.tripTypes || []).includes(cat));
      let index = 0;
      while (missing > 0 && candidates.length) {
        const src = candidates[index % candidates.length];
        list.push(cloneWithCategory(src, cat));
        index++;
        missing--;
      }
    }
  }

  let catIdx = 0;
  while (list.length < targetCount) {
    const cat = categories[catIdx % categories.length];
    const srcCandidates = list.filter(d => !(d.tripTypes || []).includes(cat));
    const src = (srcCandidates[catIdx % (srcCandidates.length || 1)]) || list[catIdx % list.length];
    list.push(cloneWithCategory(src, cat));
    catIdx++;
  }

  return list;
}

// Fallback campuses
const DEMO_CAMPUSES = [
  { id: "KTR", name: "Kattankulathur" },
  { id: "RMP", name: "Ramapuram" },
  { id: "VDP", name: "Vadapalani" },
  { id: "TRI", name: "Tiruchirappalli" },
  { id: "NCR", name: "NCR (Delhi)" },
  { id: "AMA", name: "Amaravati" },
  { id: "MOD", name: "Modinagar" },
  { id: "GTK", name: "Gangtok" }
];



/** Demo ATTRACTIONS in backend shape (used locally, no API) */
const DEMO_ATTRACTIONS = [
  // ----- KTR (Kattankulathur) -----
  {
    name: "Marina Beach",
    description: "Iconic urban beach—long shoreline, sunrise/sunset views, food stalls.",
    type: "PARK",
    budgetLevel: "CHEAP",
    campusCode: "KTR",
    latitude: 13.05,
    longitude: 80.282,
    distanceKm: 35,
    bestTimings: "5:00-9:00, 16:00-19:00",
    safetyInfo: "Beware of strong currents; avoid swimming near dusk.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.4,
    imageUrl: "https://hblimg.mmtcdn.com/content/hubble/img/Chennai/mmt/activities/m_activities_chennai_marina_beach_l_505_757.jpg",
    recommendedTripTypes: ["WEEKEND", "FRIENDS", "FAMILY"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Arignar Anna Zoological Park (Vandalur Zoo)",
    description: "India’s first public zoo with 1,500+ species, safari rides and shaded trails.",
    type: "PARK",
    budgetLevel: "MODERATE",
    campusCode: "KTR",
    latitude: 12.8799,
    longitude: 80.0816,
    distanceKm: 9,
    bestTimings: "8:30-11:00, 15:30-17:30",
    safetyInfo: "Wear comfortable shoes; hydrate; do not feed animals.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.5,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c4/Arignar_Anna_Zoological_park_27.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Mahabalipuram Shore Temple",
    description: "UNESCO-listed 7th–8th century shore temple with exquisite rock-cut art.",
    type: "HISTORICAL",
    budgetLevel: "MODERATE",
    campusCode: "KTR",
    latitude: 12.6208,
    longitude: 80.1920,
    distanceKm: 52,
    bestTimings: "6:00-9:00, 16:00-18:30",
    safetyInfo: "Carry hats and water; coastal sun can be harsh.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.6,
    imageUrl: "https://s7ap1.scene7.com/is/image/incredibleindia/1-shore-temple-mamallapuram-2-attr-hero?qlt=82&ts=1726654555333",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "DakshinaChitra Museum",
    description: "Living museum of South Indian art, architecture, crafts, and heritage homes.",
    type: "MUSEUM",
    budgetLevel: "MODERATE",
    campusCode: "KTR",
    latitude: 12.8403,
    longitude: 80.2300,
    distanceKm: 35,
    bestTimings: "10:00-13:00, 15:00-17:30",
    safetyInfo: "Some areas are open-air; carry water and sunscreen.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.5,
    imageUrl: "https://s7ap1.scene7.com/is/image/incredibleindia/dakshinachitra-museum-chennai-tamil-nadu-1-attr-hero?qlt=82&ts=1726655056460",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Muttukadu Boat House",
    description: "Backwater boating on the ECR—kayaks, rowboats, speedboats.",
    type: "LAKE",
    budgetLevel: "MODERATE",
    campusCode: "KTR",
    latitude: 12.8017,
    longitude: 80.2451,
    distanceKm: 32,
    bestTimings: "8:00-11:00, 16:00-18:30",
    safetyInfo: "Wear life jackets; check weather before speedboat rides.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.3,
    imageUrl: "https://tamilnadutourisminfo.com/wp-content/uploads/2018/01/Muttukadu-Boat-House.webp",
    recommendedTripTypes: ["FRIENDS", "FAMILY", "WEEKEND"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Vedanthangal Bird Sanctuary",
    description: "Seasonal sanctuary famous for migratory birds and serene wetlands.",
    type: "PARK",
    budgetLevel: "CHEAP",
    campusCode: "KTR",
    latitude: 12.5218,
    longitude: 79.8581,
    distanceKm: 48,
    bestTimings: "Nov–Mar • 6:00-10:00, 16:00-18:00",
    safetyInfo: "Binoculars recommended; keep noise low around birds.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.4,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Vedanthangal_Lake.JPG",
    recommendedTripTypes: ["FAMILY", "WEEKEND"],
    _class: "com.ziya.model.Attraction"
  },

  // ----- KTR — Expensive -----
  {
    name: "VGP Universal Kingdom (ECR)",
    description: "Large amusement park with big rides, water slides, and shows.",
    type: "ENTERTAINMENT",
    budgetLevel: "EXPENSIVE",
    campusCode: "KTR",
    latitude: 12.9254,
    longitude: 80.2483,
    distanceKm: 36,
    bestTimings: "10:00-13:00, 15:00-18:30",
    safetyInfo: "Follow ride rules; keep electronics safe on water rides.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.3,
    imageUrl: "https://res.cloudinary.com/dyiffrkzh/image/upload/c_fill,f_auto,fl_progressive.strip_profile,g_center,h_400,q_auto,w_700/v1694273943/bbj/xgsza8ahmu8wg7w42oxg.webp",
    recommendedTripTypes: ["FRIENDS", "FAMILY", "WEEKEND"],
    approxCost: 2200,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Covelong (Kovalam) Surf School",
    description: "Surfing lessons on ECR with certified instructors; gear included.",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "KTR",
    latitude: 12.7896,
    longitude: 80.2516,
    distanceKm: 33,
    bestTimings: "6:00-10:00, 16:00-18:00",
    safetyInfo: "Listen to instructors; wear leash and follow flags.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.7,
    imageUrl: "https://imgstaticcontent.lbb.in/lbbnew/wp-content/uploads/2017/11/09083748/SurfTurf1.jpg",
    recommendedTripTypes: ["FRIENDS", "COUPLE", "WEEKEND"],
    approxCost: 3000,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Wild Tribe Ranch — ECR Adventure Park",
    description: "High-ropes, zip-lines, ATV rides and team challenges.",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "KTR",
    latitude: 12.8301,
    longitude: 80.2467,
    distanceKm: 34,
    bestTimings: "9:00-12:00, 15:00-18:00",
    safetyInfo: "Closed-toe shoes recommended; follow instructor briefings.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.4,
    imageUrl: "https://s-media-cache-ak0.pinimg.com/originals/6f/17/a8/6f17a83973cd60f3c3b7e42f84ab29dd.jpg",
    recommendedTripTypes: ["FRIENDS", "WEEKEND", "FAMILY"],
    approxCost: 1800,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Radisson Blu Temple Bay — Day Pass",
    description: "Resort pool and beach access with meals in Mahabalipuram.",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "KTR",
    latitude: 12.6176,
    longitude: 80.1976,
    distanceKm: 53,
    bestTimings: "10:00-18:00",
    safetyInfo: "Advance booking recommended; carry swimwear.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.6,
    imageUrl: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/01/db/a0/65/meandering-pool-with.jpg?w=700&h=-1&s=1",
    recommendedTripTypes: ["COUPLE", "FAMILY", "WEEKEND"],
    approxCost: 3500,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "The Flying Elephant — Park Hyatt",
    description: "Upscale multi-cuisine dining and ambience for special nights.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "KTR",
    latitude: 13.0103,
    longitude: 80.2207,
    distanceKm: 29,
    bestTimings: "19:00-22:30",
    safetyInfo: "Smart casuals; reserve in advance on weekends.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.6,
    imageUrl: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/28/b0/33/45/hero-shot.jpg?w=500&h=-1&s=1",
    recommendedTripTypes: ["COUPLE", "FRIENDS", "WEEKEND"],
    approxCost: 2500,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Royal Madras Yacht Club — Sunset Cruise",
    description: "Harbour cruise with views of the Chennai skyline (subject to availability).",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "KTR",
    latitude: 13.0831,
    longitude: 80.2935,
    distanceKm: 40,
    bestTimings: "16:30-18:30",
    safetyInfo: "Life jackets provided; confirm schedule ahead.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.5,
    imageUrl: "https://images.jdmagicbox.com/v2/comp/chennai/z5/044pxx44.xx44.180208061637.i4z5/catalogue/royal-madras-yacht-club-chennai-ho-chennai-clubs-1hdgpnii1q.jpg",
    recommendedTripTypes: ["COUPLE", "FRIENDS", "WEEKEND"],
    approxCost: 4000,
    _class: "com.ziya.model.Attraction"
  },

  // ----- RMP (Ramapuram) -----
  {
    name: "Phoenix Marketcity",
    description: "Massive mall with dining, movies, and live gigs—perfect for group hangouts.",
    type: "SHOPPING",
    budgetLevel: "MODERATE",
    campusCode: "RMP",
    latitude: 12.9899,
    longitude: 80.2167,
    distanceKm: 7,
    bestTimings: "12:00-22:00",
    safetyInfo: "Weekend evenings get crowded; keep belongings secure.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.5,
    imageUrl: "https://dtbtob4osa700.cloudfront.net/MallImages/26022020044642102_mallabt.jpg",
    recommendedTripTypes: ["FRIENDS", "WEEKEND", "FAMILY"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Guindy National Park",
    description: "Urban biodiversity hotspot with deer, blackbuck and rich birdlife.",
    type: "PARK",
    budgetLevel: "CHEAP",
    campusCode: "RMP",
    latitude: 13.0035,
    longitude: 80.2230,
    distanceKm: 8,
    bestTimings: "8:00-10:30, 16:00-18:00",
    safetyInfo: "Stick to marked paths; avoid littering.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.3,
    imageUrl: "https://mytourlogs.weebly.com/uploads/2/6/8/0/26805303/9326003.jpg?532",
    recommendedTripTypes: ["FAMILY", "WEEKEND"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Elliot's Beach (Besant Nagar)",
    description: "Relaxed beach vibe with cafes and evening strolls.",
    type: "PARK",
    budgetLevel: "CHEAP",
    campusCode: "RMP",
    latitude: 13.0006,
    longitude: 80.2695,
    distanceKm: 14,
    bestTimings: "5:30-9:00, 16:30-20:00",
    safetyInfo: "Swim only where allowed; heed lifeguard instructions.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.5,
    imageUrl: "https://imgstaticcontent.lbb.in/lbbnew/wp-content/uploads/2017/09/08073441/BesantNagarBeach1.jpg",
    recommendedTripTypes: ["FRIENDS", "FAMILY", "WEEKEND"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Kapaleeshwarar Temple, Mylapore",
    description: "Historic Dravidian temple with vibrant gopurams and rituals.",
    type: "TEMPLE",
    budgetLevel: "CHEAP",
    campusCode: "RMP",
    latitude: 13.0337,
    longitude: 80.2676,
    distanceKm: 12,
    bestTimings: "6:00-10:30, 16:30-20:30",
    safetyInfo: "Dress modestly; photography may be restricted in sanctum.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.7,
    imageUrl: "https://meghasen.in/wp-content/uploads/2023/05/Kapaleeshwarar-Temple-Chennai.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Government Museum, Egmore",
    description: "Artifacts, bronzes, archaeology and art—one of India’s oldest museums.",
    type: "MUSEUM",
    budgetLevel: "CHEAP",
    campusCode: "RMP",
    latitude: 13.0732,
    longitude: 80.2605,
    distanceKm: 11,
    bestTimings: "10:00-13:00, 15:00-17:00",
    safetyInfo: "Closed on some public holidays; check timings in advance.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.4,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/66/Madras_museum_theatre_in_October_2007.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Santhome Cathedral Basilica",
    description: "Neo-Gothic basilica by the Bay, believed to house St. Thomas’s tomb.",
    type: "HISTORICAL",
    budgetLevel: "CHEAP",
    campusCode: "RMP",
    latitude: 13.0292,
    longitude: 80.2797,
    distanceKm: 13,
    bestTimings: "6:00-10:00, 16:00-19:30",
    safetyInfo: "Quiet zone; be respectful during Mass.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.6,
    imageUrl: "https://s7ap1.scene7.com/is/image/incredibleindia/san-thome-basilica-chennai2-attr-hero?qlt=82&ts=1726654768684",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "COUPLE"],
    _class: "com.ziya.model.Attraction"
  },

  // ----- RMP — Expensive -----
  {
    name: "The Leela Palace Chennai — Sunday Brunch",
    description: "Lavish waterfront brunch with global cuisine and desserts galore.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "RMP",
    latitude: 13.0125,
    longitude: 80.2774,
    distanceKm: 11,
    bestTimings: "12:30-15:30 (Sun)",
    safetyInfo: "Advance reservation recommended; smart casuals.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.7,
    imageUrl: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/03/f1/8a/fb/the-leela-palace-chennai.jpg?w=900&h=-1&s=1",
    recommendedTripTypes: ["COUPLE", "FAMILY", "FRIENDS"],
    approxCost: 3500,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "PVR LUX — VR Chennai",
    description: "Premium recliner cinema with gourmet snacks and top-notch service.",
    type: "ENTERTAINMENT",
    budgetLevel: "EXPENSIVE",
    campusCode: "RMP",
    latitude: 13.0909,
    longitude: 80.2050,
    distanceKm: 14,
    bestTimings: "17:00-23:00",
    safetyInfo: "Arrive early for lounge access; check age rating.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.6,
    imageUrl: "https://vrchennai.com/UploadFile/storeImageGallery/PVR-pic-2.jpg",
    recommendedTripTypes: ["COUPLE", "FRIENDS", "WEEKEND"],
    approxCost: 1400,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Seasonal Tastes — The Westin Velachery Brunch",
    description: "Sunday brunch with live counters and dessert stations.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "RMP",
    latitude: 12.989,
    longitude: 80.22,
    distanceKm: 7,
    bestTimings: "12:30-15:30 (Sun)",
    safetyInfo: "Reservations recommended.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.4,
    imageUrl: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/03/ab/20/63/seasonal-taste-at-the.jpg?w=500&h=-1&s=1",
    recommendedTripTypes: ["FAMILY", "COUPLE", "WEEKEND"],
    approxCost: 2200,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Hilton Chennai — Q Bar Rooftop",
    description: "Rooftop lounge with skyline views and signature cocktails.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "RMP",
    latitude: 13.0109,
    longitude: 80.1999,
    distanceKm: 10,
    bestTimings: "19:00-23:00",
    safetyInfo: "ID required for entry; smart casuals.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.5,
    imageUrl: "https://www.hilton.com/im/en/MAAHIHI/4799940/q-bar-rooftop-bar.jpg?impolicy=crop&cw=2568&ch=1998&gravity=NorthWest&xposition=215&yposition=0&rw=684&rh=532",
    recommendedTripTypes: ["COUPLE", "FRIENDS", "WEEKEND"],
    approxCost: 2100,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Dakshin — Crowne Plaza Adyar Park",
    description: "Iconic South Indian fine dining with a curated tasting menu.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "RMP",
    latitude: 13.0295,
    longitude: 80.2579,
    distanceKm: 10,
    bestTimings: "19:00-22:30",
    safetyInfo: "Smart casuals; reservations encouraged.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.6,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Crowne_plaza_chennai.webp",
    recommendedTripTypes: ["COUPLE", "FAMILY", "WEEKEND"],
    approxCost: 2500,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "ITC Grand Chola — Ottimo (Italian)",
    description: "Wood-fired pizzas and artisanal pastas in a luxe setting.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "RMP",
    latitude: 13.0106,
    longitude: 80.2207,
    distanceKm: 9,
    bestTimings: "19:00-23:00",
    safetyInfo: "Reserve window seating; smart casuals.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.5,
    imageUrl: "https://www.itchotels.com/content/dam/itchotels/in/umbrella/itc/hotels/itcgrandchola-chennai/images/overview/overview-desktop/exterior-dusk.png",
    recommendedTripTypes: ["COUPLE", "FRIENDS", "WEEKEND"],
    approxCost: 2400,
    _class: "com.ziya.model.Attraction"
  },

  // ----- VDP (Vadapalani) -----
  {
    name: "Vadapalani Murugan Temple",
    description: "Famous Murugan temple; peaceful and central.",
    type: "TEMPLE",
    budgetLevel: "CHEAP",
    campusCode: "VDP",
    latitude: 13.0524,
    longitude: 80.2110,
    distanceKm: 0.5,
    bestTimings: "6:00-10:00, 17:00-20:30",
    safetyInfo: "Footwear not allowed inside the sanctum.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.6,
    imageUrl: "https://www.findmytemple.com/images/Article_Images/T238_Murugan-temple_temple3.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Forum Vijaya Mall",
    description: "Eat, shop, watch; easy meetup spot near metro.",
    type: "SHOPPING",
    budgetLevel: "MODERATE",
    campusCode: "VDP",
    latitude: 13.0531,
    longitude: 80.2124,
    distanceKm: 0.5,
    bestTimings: "12:00-22:00",
    safetyInfo: "Parking fills up on weekends—use metro when possible.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.4,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Forum_Vijaya_Arcot_Road_Entry.jpg/1200px-Forum_Vijaya_Arcot_Road_Entry.jpg",
    recommendedTripTypes: ["FRIENDS", "WEEKEND", "FAMILY"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Anna Tower Park",
    description: "Large green park for jogs, picnics, and sunset breaks.",
    type: "PARK",
    budgetLevel: "CHEAP",
    campusCode: "VDP",
    latitude: 13.0877,
    longitude: 80.2171,
    distanceKm: 5,
    bestTimings: "5:30-9:00, 16:30-19:30",
    safetyInfo: "Carry drinking water; keep the park clean.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.3,
    imageUrl: "https://media.assettype.com/tnm%2Fimport%2Fsites%2Fdefault%2Ffiles%2FAnnaNagarTowerPark_1200_Twitter.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "VR Chennai (Anna Nagar)",
    description: "Premium mall with cinemas, food court and events.",
    type: "SHOPPING",
    budgetLevel: "MODERATE",
    campusCode: "VDP",
    latitude: 13.0909,
    longitude: 80.2050,
    distanceKm: 7,
    bestTimings: "12:00-22:00",
    safetyInfo: "Weekends are busy; plan for queues at cinemas/restaurants.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.5,
    imageUrl: "https://vrchennai.com/UploadFile/Gallery/IMG-20241203-WA0075.jpg",
    recommendedTripTypes: ["FRIENDS", "WEEKEND", "FAMILY"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Semmozhi Poonga",
    description: "Botanical garden in the heart of the city—calm and shady.",
    type: "PARK",
    budgetLevel: "CHEAP",
    campusCode: "VDP",
    latitude: 13.0523,
    longitude: 80.2526,
    distanceKm: 6,
    bestTimings: "8:00-11:00, 16:00-18:30",
    safetyInfo: "No littering; some areas may be closed during maintenance.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.4,
    imageUrl: "https://th-i.thgim.com/public/incoming/vtgt3w/article69053282.ece/alternates/FREE_1200/FLOWER%20SHOW%20EXHIBITION%20SEMMOZHI%20POONGA%20HORTICULTURE%20DEPT_18.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Chennai Snake Park (adjacent to Guindy)",
    description: "Reptile conservation park—educational exhibits and talks.",
    type: "MUSEUM",
    budgetLevel: "CHEAP",
    campusCode: "VDP",
    latitude: 13.0055,
    longitude: 80.2447,
    distanceKm: 7,
    bestTimings: "9:00-11:30, 15:30-17:30",
    safetyInfo: "Follow staff instructions; don’t tap on glass enclosures.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.2,
    imageUrl: "https://assets.simplotel.com/simplotel/image/upload/x_0,y_832,w_3564,h_2004,r_0,c_crop,q_80,fl_progressive/w_500,f_auto,c_fit/raj-park-hotel---chennai/pexels-pixabay-34426_s6sjkb",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },

  // ----- VDP — Expensive -----
  {
    name: "ITC Grand Chola — Kaya Kalp Spa Day",
    description: "Indulgent spa therapies at a luxury hotel; serene facilities.",
    type: "SPA",
    budgetLevel: "EXPENSIVE",
    campusCode: "VDP",
    latitude: 13.0108,
    longitude: 80.2206,
    distanceKm: 5,
    bestTimings: "11:00-19:00",
    safetyInfo: "Advance booking required; arrive 15 mins early.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.7,
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0gRlfx9-ZA-XfpHC_Lh_MsQ4Mn2---q3cYQ&s",
    recommendedTripTypes: ["COUPLE", "SOLO", "WEEKEND"],
    approxCost: 4500,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Le Royal Méridien — Sunday Brunch",
    description: "Upscale spread with live grills and desserts.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "VDP",
    latitude: 12.9902,
    longitude: 80.1962,
    distanceKm: 6,
    bestTimings: "12:30-15:30 (Sun)",
    safetyInfo: "Reserve table; smart casuals.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.3,
    imageUrl: "https://b.zmtcdn.com/data/pictures/4/66034/e69a9704d5ec59d39a8f08072cdca1f3.jpg?fit=around|750:500&crop=750:500;*,*",
    recommendedTripTypes: ["FAMILY", "COUPLE", "WEEKEND"],
    approxCost: 2200,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Madras Race Club — VIP Enclosure",
    description: "Race-day experience with premium seating and views (seasonal).",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "VDP",
    latitude: 13.0067,
    longitude: 80.2205,
    distanceKm: 6,
    bestTimings: "Race day timings vary",
    safetyInfo: "Follow venue etiquette; ID required.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.2,
    imageUrl: "https://www.hydraces.com/assets/images/paddock.jpg",
    recommendedTripTypes: ["FRIENDS", "COUPLE", "WEEKEND"],
    approxCost: 2000,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Kart Attack ECR — Pro Session",
    description: "High-speed karting with timing laps and pro karts.",
    type: "ENTERTAINMENT",
    budgetLevel: "EXPENSIVE",
    campusCode: "VDP",
    latitude: 12.9126,
    longitude: 80.2485,
    distanceKm: 18,
    bestTimings: "16:00-20:00",
    safetyInfo: "Closed shoes mandatory; helmets provided.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.4,
    imageUrl: "https://www.leisurekart.com/blog/wp-content/uploads/2024/05/Go-Karting-in-Chennai.jpg",
    recommendedTripTypes: ["FRIENDS", "WEEKEND"],
    approxCost: 1800,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Raintree (Anna Salai) — Up North Rooftop",
    description: "Rooftop Punjabi cuisine with city views.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "VDP",
    latitude: 13.0449,
    longitude: 80.2501,
    distanceKm: 7,
    bestTimings: "19:00-22:30",
    safetyInfo: "Reserve window tables for views.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.4,
    imageUrl: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/03/3b/76/13/high.jpg?w=900&h=500&s=1",
    recommendedTripTypes: ["COUPLE", "FRIENDS", "WEEKEND"],
    approxCost: 2000,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "AVM Studios — Heritage Tour + Workshop",
    description: "Behind-the-scenes studio heritage tour with photo ops.",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "VDP",
    latitude: 13.0525,
    longitude: 80.2105,
    distanceKm: 1,
    bestTimings: "10:00-16:00",
    safetyInfo: "Guided areas only; follow staff instructions.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.2,
    imageUrl: "https://static.wixstatic.com/media/73dbf1_17429d2cfe474f6eb5a4b7f9900a1c29~mv2.jpg/v1/fill/w_560,h_400,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/73dbf1_17429d2cfe474f6eb5a4b7f9900a1c29~mv2.jpg",
    recommendedTripTypes: ["FRIENDS", "WEEKEND", "SOLO"],
    approxCost: 1800,
    _class: "com.ziya.model.Attraction"
  },

  // ----- TRI (Tiruchirappalli) -----
  {
    name: "Rockfort Temple (Ucchi Pillayar)",
    description: "Iconic hilltop temple with panoramic city views.",
    type: "TEMPLE",
    budgetLevel: "CHEAP",
    campusCode: "TRI",
    latitude: 10.8393,
    longitude: 78.6960,
    distanceKm: 17,
    bestTimings: "6:00-9:00, 16:30-19:00",
    safetyInfo: "Many steps to climb—carry water and wear good shoes.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.6,
    imageUrl: "https://internest.agency/wp-content/uploads/2017/09/Trichy-Rockfort-%E2%80%93-One-Rock-Two-Tier-Temple.webp",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Srirangam Temple",
    description: "One of the largest functioning Hindu temples in the world.",
    type: "TEMPLE",
    budgetLevel: "CHEAP",
    campusCode: "TRI",
    latitude: 10.8629,
    longitude: 78.6932,
    distanceKm: 22,
    bestTimings: "6:00-10:00, 16:00-20:00",
    safetyInfo: "Large crowds on festival days; plan queue time.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.7,
    imageUrl: "https://travelsetu.com/apps/uploads/new_destinations_photos/destination/2023/12/21/5bbded643474f9e135993944b52d03a1_1000x1000.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Kallanai (Grand Anicut)",
    description: "Ancient dam on the Kaveri River—historic engineering marvel.",
    type: "HISTORICAL",
    budgetLevel: "CHEAP",
    campusCode: "TRI",
    latitude: 10.8008,
    longitude: 78.9556,
    distanceKm: 45,
    bestTimings: "16:00-18:30",
    safetyInfo: "Caution near water edge; avoid slippery rocks.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.5,
    imageUrl: "https://graconllc.com/wp-content/uploads/2019/06/Anicut.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Mukkombu (Upper Anicut)",
    description: "River island with lawns and picnic spots—ideal evening escape.",
    type: "PARK",
    budgetLevel: "CHEAP",
    campusCode: "TRI",
    latitude: 10.9423,
    longitude: 78.6893,
    distanceKm: 28,
    bestTimings: "16:00-18:30",
    safetyInfo: "Watch out for slippery banks; supervised areas only.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.2,
    imageUrl: "https://hblimg.mmtcdn.com/content/hubble/img/ttd_images/mmt/activities/t_ufs/m_Tiruchirappalli_Kallanai_dam_1_l_360_640.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Samayapuram Mariamman Temple",
    description: "Popular Amman temple known for powerful rituals and offerings.",
    type: "TEMPLE",
    budgetLevel: "CHEAP",
    campusCode: "TRI",
    latitude: 10.9442,
    longitude: 78.7460,
    distanceKm: 30,
    bestTimings: "6:00-10:00, 16:00-20:00",
    safetyInfo: "Foot traffic heavy on Fridays and festival days.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.6,
    imageUrl: "https://www.poojn.in/wp-content/uploads/2025/03/Samayapuram-Mariamman-Temple-Hotels-Facilities-Guide.jpeg.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Puliyancholai Falls",
    description: "Foothills of Kolli Hills—streams, greenery and short hikes.",
    type: "WATERFALL",
    budgetLevel: "CHEAP",
    campusCode: "TRI",
    latitude: 11.1303,
    longitude: 78.3181,
    distanceKm: 70,
    bestTimings: "8:00-11:00, 15:30-17:30",
    safetyInfo: "Slippery rocks; avoid during heavy rains/monsoon.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.3,
    imageUrl: "https://tiruchirappalliairport.in/wp-content/uploads/2023/07/puliyancholai-falls-trichy-best-view.jpg",
    recommendedTripTypes: ["FRIENDS", "WEEKEND", "FAMILY"],
    _class: "com.ziya.model.Attraction"
  },

  // ----- TRI — Expensive -----
  {
    name: "SRM Hotel Trichy — Daycation + Pool",
    description: "Day access to pool and facilities; relaxed premium vibe.",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "TRI",
    latitude: 10.7657,
    longitude: 78.7090,
    distanceKm: 20,
    bestTimings: "11:00-18:00",
    safetyInfo: "Carry swimwear; follow pool safety rules.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.3,
    imageUrl: "https://images.trvl-media.com/lodging/39000000/38390000/38387800/38387799/f8515bb0.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill",
    recommendedTripTypes: ["FAMILY", "COUPLE", "WEEKEND"],
    approxCost: 2000,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Great Trails by GRT — Day Pass",
    description: "Premium pool access and buffet at a nature resort setting.",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "TRI",
    latitude: 10.7999,
    longitude: 78.6985,
    distanceKm: 18,
    bestTimings: "11:00-18:00",
    safetyInfo: "Prior reservation advised.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.4,
    imageUrl: "https://images.trvl-media.com/lodging/12000000/11530000/11520900/11520809/925c92d6.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill",
    recommendedTripTypes: ["COUPLE", "FAMILY", "WEEKEND"],
    approxCost: 2500,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Sangam Hotel — Fine Dining",
    description: "Curated regional and global menus in an upscale setting.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "TRI",
    latitude: 10.8116,
    longitude: 78.6899,
    distanceKm: 17,
    bestTimings: "19:00-22:30",
    safetyInfo: "Smart casuals recommended.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.3,
    imageUrl: "https://www.digitaltrichy.com/wp-content/uploads/2022/11/sangam1.webp",
    recommendedTripTypes: ["COUPLE", "FAMILY", "WEEKEND"],
    approxCost: 1800,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Mukkombu — Private Speedboat Charter",
    description: "Thrilling speedboat ride on the Kaveri backwaters (conditions apply).",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "TRI",
    latitude: 10.9423,
    longitude: 78.6893,
    distanceKm: 28,
    bestTimings: "16:00-18:00",
    safetyInfo: "Wear life jackets; avoid during high flow/monsoon.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.2,
    imageUrl: "https://content.jdmagicbox.com/v2/comp/alappuzha/h6/0477px477.x477.250510151610.e2h6/catalogue/1p72zjt13flqc33-z75zv0cp49.jpg",
    recommendedTripTypes: ["FRIENDS", "WEEKEND", "FAMILY"],
    approxCost: 1600,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Thanjavur Big Temple — Private SUV Day Trip",
    description: "Chauffeured day trip to Brihadeeswara Temple with guide.",
    type: "EXCURSION",
    budgetLevel: "EXPENSIVE",
    campusCode: "TRI",
    latitude: 10.7850,
    longitude: 79.1399,
    distanceKm: 60,
    bestTimings: "07:00-19:00",
    safetyInfo: "Start early; carry hats and water.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.8,
    imageUrl: "https://oneday.travel/wp-content/uploads/one-day-trichy-to-thanjavur-velankanni-tour-by-cab-header-1568x1045.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    approxCost: 4000,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Kodaikanal — Private Day Trip (SUV)",
    description: "Door-to-door guided hill getaway; viewpoints and lake time.",
    type: "EXCURSION",
    budgetLevel: "EXPENSIVE",
    campusCode: "TRI",
    latitude: 10.2381,
    longitude: 77.4895,
    distanceKm: 200,
    bestTimings: "05:30-21:00",
    safetyInfo: "Mountain roads; start early; carry warm clothes.",
    emergencyContacts: ["100", "108"],
    averageRating: 4.8,
    imageUrl: "https://static.toiimg.com/photo/116404399.cms",
    recommendedTripTypes: ["FRIENDS", "FAMILY", "WEEKEND"],
    approxCost: 5500,
    _class: "com.ziya.model.Attraction"
  },

  // ----- NCR (Delhi) -----
  {
    name: "India Gate & Kartavya Path",
    description: "Evening strolls, lit monuments, and lawns for picnics.",
    type: "HISTORICAL",
    budgetLevel: "CHEAP",
    campusCode: "NCR",
    latitude: 28.6129,
    longitude: 77.2295,
    distanceKm: 48,
    bestTimings: "17:00-21:00",
    safetyInfo: "Stay on marked crossings; area gets crowded on weekends.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.6,
    imageUrl: "https://assets-news.housing.com/news/wp-content/uploads/2022/09/16093641/Kartavya-Path-inaugurated-in-Delhi-Things-to-know-about-the-revamped-Rajpath-stretch.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Qutub Minar",
    description: "UNESCO site with stunning Indo-Islamic architecture.",
    type: "HISTORICAL",
    budgetLevel: "MODERATE",
    campusCode: "NCR",
    latitude: 28.5245,
    longitude: 77.1855,
    distanceKm: 60,
    bestTimings: "9:00-11:00, 16:00-18:00",
    safetyInfo: "Sunny mid-day; carry hats and water.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.7,
    imageUrl: "https://media.istockphoto.com/id/165204592/photo/qutub-minar-delhi-india.jpg?s=612x612&w=0&k=20&c=YvFLPmQmlgCyX7RGZA1VpKctdC6QsChINzLSMDPNI9k=",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Hauz Khas Village",
    description: "Cafes, ruins, and lake—great for photos and chill evenings.",
    type: "SHOPPING",
    budgetLevel: "MODERATE",
    campusCode: "NCR",
    latitude: 28.5535,
    longitude: 77.1910,
    distanceKm: 56,
    bestTimings: "17:00-22:00",
    safetyInfo: "Nightlife area—use trusted cabs at late hours.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.4,
    imageUrl: "https://media.tacdn.com/media/attractions-splice-spp-674x446/07/3c/09/70.jpg",
    recommendedTripTypes: ["FRIENDS", "WEEKEND", "COUPLE"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Lodhi Gardens",
    description: "Lush gardens dotted with medieval tombs—perfect for walks and picnics.",
    type: "PARK",
    budgetLevel: "CHEAP",
    campusCode: "NCR",
    latitude: 28.5933,
    longitude: 77.2197,
    distanceKm: 50,
    bestTimings: "6:00-10:00, 16:00-19:00",
    safetyInfo: "Early mornings are best; keep valuables secure.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.7,
    imageUrl: "https://assets-news.housing.com/news/wp-content/uploads/2022/10/13071655/lodhi-garden-near-metro-FEATURE-compressed.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Red Fort",
    description: "Magnificent Mughal fort complex with museums and light-and-sound show.",
    type: "HISTORICAL",
    budgetLevel: "MODERATE",
    campusCode: "NCR",
    latitude: 28.6562,
    longitude: 77.2410,
    distanceKm: 52,
    bestTimings: "9:30-12:00, 16:00-18:00",
    safetyInfo: "Allow time for security checks; closed on Mondays.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.6,
    imageUrl: "https://assets-news.housing.com/news/wp-content/uploads/2021/07/20184714/All-about-the-Delhi-Red-Fort-or-Lal-Kila-FB-1200x700-compressed-2.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Akshardham Temple",
    description: "Grand temple complex with gardens and cultural exhibits.",
    type: "TEMPLE",
    budgetLevel: "CHEAP",
    campusCode: "NCR",
    latitude: 28.6127,
    longitude: 77.2773,
    distanceKm: 54,
    bestTimings: "16:00-20:00",
    safetyInfo: "No phones/cameras allowed inside; free cloakroom available.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.8,
    imageUrl: "https://www.travelladda.com/package/AKSHARDHAM.gif",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "COUPLE"],
    _class: "com.ziya.model.Attraction"
  },

  // ----- NCR — Expensive -----
  {
    name: "Worlds of Wonder (Noida) — Park + Water Park",
    description: "Full-day rides, slides, and shows at a mega theme park.",
    type: "ENTERTAINMENT",
    budgetLevel: "EXPENSIVE",
    campusCode: "NCR",
    latitude: 28.5672,
    longitude: 77.3260,
    distanceKm: 70,
    bestTimings: "11:00-18:30",
    safetyInfo: "Lockers available; carry quick-dry clothes.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.5,
    imageUrl: "https://delhitourism.travel/images/tourist-places/worlds-of-wonder-amusement-water-park-noida/worlds-of-wonder-amusement-water-park-noida-tourism-holidays-closed-on-timings.jpg",
    recommendedTripTypes: ["FRIENDS", "FAMILY", "WEEKEND"],
    approxCost: 2000,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "DLF Emporio — Luxury Shopping, Vasant Kunj",
    description: "Designer boutiques and fine dining in Delhi’s most premium mall.",
    type: "SHOPPING",
    budgetLevel: "EXPENSIVE",
    campusCode: "NCR",
    latitude: 28.5386,
    longitude: 77.1553,
    distanceKm: 58,
    bestTimings: "12:00-21:00",
    safetyInfo: "Paid parking; carry ID for some brand trials/returns.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.6,
    imageUrl: "https://static.toiimg.com/photo/62266300/.jpg",
    recommendedTripTypes: ["COUPLE", "FRIENDS", "WEEKEND"],
    approxCost: 3000,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Smaaash Sky Karting — Gurugram",
    description: "Outdoor elevated karting track with pro timing systems.",
    type: "ENTERTAINMENT",
    budgetLevel: "EXPENSIVE",
    campusCode: "NCR",
    latitude: 28.5044,
    longitude: 77.0910,
    distanceKm: 70,
    bestTimings: "16:00-22:00",
    safetyInfo: "Closed shoes, helmets provided.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.3,
    imageUrl: "https://tse1.mm.bing.net/th/id/OIP.hMS2M5h002lDRo7u81JNsQHaEH?rs=1&pid=ImgDetMain&o=7&rm=3",
    recommendedTripTypes: ["FRIENDS", "WEEKEND"],
    approxCost: 1600,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "The Hong Kong Club — Andaz Aerocity",
    description: "Modern Cantonese cuisine with DJs and a luxe vibe.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "NCR",
    latitude: 28.5490,
    longitude: 77.1232,
    distanceKm: 62,
    bestTimings: "20:00-01:00",
    safetyInfo: "ID checks; dress code enforced.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.5,
    imageUrl: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=1200&auto=format&fit=crop",
    recommendedTripTypes: ["COUPLE", "FRIENDS", "WEEKEND"],
    approxCost: 3000,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Le Cirque — The Leela Palace New Delhi",
    description: "Michelin-style fine dining; iconic Delhi experience.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "NCR",
    latitude: 28.5863,
    longitude: 77.1890,
    distanceKm: 55,
    bestTimings: "19:00-23:00",
    safetyInfo: "Reservations essential; smart formals.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.7,
    imageUrl: "https://th.bing.com/th/id/R.1762546337827a8caffb3f28fd938152?rik=oL66D6tyaUS8pg&riu=http%3a%2f%2fwww.hauteliving.com%2fwp-content%2fuploads%2f2011%2f11%2fLeela.jpg&ehk=CzoxyIk4WDM3uAOm4k4woxFKaX5g2zueeLMG%2fK6DVAY%3d&risl=&pid=ImgRaw&r=0",
    recommendedTripTypes: ["COUPLE", "FAMILY", "WEEKEND"],
    approxCost: 4000,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Old Delhi Private Food Tour",
    description: "Guided walk with tastings at legendary eateries and chai stops.",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "NCR",
    latitude: 28.6561,
    longitude: 77.2410,
    distanceKm: 54,
    bestTimings: "16:00-20:00",
    safetyInfo: "Wear comfortable shoes; beware street traffic.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=1200&auto=format&fit=crop",
    recommendedTripTypes: ["FRIENDS", "FAMILY", "WEEKEND"],
    approxCost: 2500,
    _class: "com.ziya.model.Attraction"
  },

  // ----- AMA (Amaravati) -----
  {
    name: "Prakasam Barrage (Vijayawada)",
    description: "Riverfront views and night lights across the Krishna River.",
    type: "PARK",
    budgetLevel: "CHEAP",
    campusCode: "AMA",
    latitude: 16.5093,
    longitude: 80.6134,
    distanceKm: 25,
    bestTimings: "17:00-21:00",
    safetyInfo: "Avoid leaning over railings; heavy traffic area.",
    emergencyContacts: ["100","108"],
    averageRating: 4.4,
    imageUrl: "https://yometro.com/images/places/prakasam-barrage.jpg",
    recommendedTripTypes: ["FAMILY","WEEKEND","FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Undavalli Caves",
    description: "Monolithic rock-cut caves with historic carvings.",
    type: "HISTORICAL",
    budgetLevel: "CHEAP",
    campusCode: "AMA",
    latitude: 16.5205,
    longitude: 80.5773,
    distanceKm: 20,
    bestTimings: "8:30-11:00, 15:30-17:30",
    safetyInfo: "Stairs involved; careful with uneven steps.",
    emergencyContacts: ["100","108"],
    averageRating: 4.5,
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSLYZUyIBtBB1lDxmOVb0LbBkACdLAalBpbQKzA6ANEwhejGpXDW3V6DfViRPX5r-eoW8&usqp=CAU",
    recommendedTripTypes: ["FAMILY","WEEKEND","SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Bhavani Island",
    description: "Island getaway with boating and lush greenery.",
    type: "LAKE",
    budgetLevel: "MODERATE",
    campusCode: "AMA",
    latitude: 16.5301,
    longitude: 80.6000,
    distanceKm: 25,
    bestTimings: "9:00-12:00, 15:30-18:00",
    safetyInfo: "Life jacket mandatory for water activities.",
    emergencyContacts: ["100","108"],
    averageRating: 4.3,
    imageUrl: "https://myholidayhappiness.com/uploads/bhavani-island-7932.jpg",
    recommendedTripTypes: ["FRIENDS","FAMILY","WEEKEND"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Kanaka Durga Temple",
    description: "Famed hilltop temple overlooking the Krishna river.",
    type: "TEMPLE",
    budgetLevel: "CHEAP",
    campusCode: "AMA",
    latitude: 16.5170,
    longitude: 80.6220,
    distanceKm: 26,
    bestTimings: "6:00-10:00, 16:00-20:30",
    safetyInfo: "Expect queues on weekends and festivals.",
    emergencyContacts: ["100","108"],
    averageRating: 4.7,
    imageUrl: "https://hblimg.mmtcdn.com/content/hubble/img/vijayawada_imgs/mmt/activities/m_Kanaka_durga_temple_3_l_437_583.jpg",
    recommendedTripTypes: ["FAMILY","WEEKEND","SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Kondapalli Fort",
    description: "Hill fort and village known for Kondapalli toy craft.",
    type: "HISTORICAL",
    budgetLevel: "CHEAP",
    campusCode: "AMA",
    latitude: 16.6205,
    longitude: 80.3270,
    distanceKm: 45,
    bestTimings: "8:30-11:00, 16:00-18:00",
    safetyInfo: "Carry water; uphill walk involved.",
    emergencyContacts: ["100","108"],
    averageRating: 4.2,
    imageUrl: "https://s7ap1.scene7.com/is/image/incredibleindia/3-kondapalli-fort-guntur-andhra-pradesh-attr-about?qlt=82&ts=1726743674033",
    recommendedTripTypes: ["FRIENDS","WEEKEND","FAMILY"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Gandhi Hill",
    description: "Panoramic viewpoint with a museum and large Gandhi stupa.",
    type: "VIEWPOINT",
    budgetLevel: "CHEAP",
    campusCode: "AMA",
    latitude: 16.5060,
    longitude: 80.6206,
    distanceKm: 27,
    bestTimings: "16:30-19:00",
    safetyInfo: "Stairs and ramps; watch footing in the evening.",
    emergencyContacts: ["100","108"],
    averageRating: 4.1,
    imageUrl: "https://vijayawadatourism.com/images/tourist-places/gandhi-hill-vijayawada/gandhi-hill-vijayawada-india-tourism-history.jpg",
    recommendedTripTypes: ["FAMILY","WEEKEND","SOLO"],
    _class: "com.ziya.model.Attraction"
  },

  // ----- AMA — Expensive -----
  {
    name: "Haailand Theme Park & Resort",
    description: "Day of thrills with rides, water slides and resort vibes.",
    type: "ENTERTAINMENT",
    budgetLevel: "EXPENSIVE",
    campusCode: "AMA",
    latitude: 16.4532,
    longitude: 80.5322,
    distanceKm: 35,
    bestTimings: "10:00-13:00, 15:00-18:00",
    safetyInfo: "Follow lifeguard/rider instructions; keep hydrated.",
    emergencyContacts: ["100","108"],
    averageRating: 4.2,
    imageUrl: "https://theglobalelephant.com/wp-content/uploads/2020/09/Day1-120-1.jpg",
    recommendedTripTypes: ["FRIENDS","FAMILY","WEEKEND"],
    approxCost: 1800,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Novotel Vijayawada Varun — Rooftop Dining",
    description: "Skyline views and curated menus at a 5-star rooftop.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "AMA",
    latitude: 16.5088,
    longitude: 80.6325,
    distanceKm: 28,
    bestTimings: "19:00-22:30",
    safetyInfo: "Reserve a window table; smart casuals.",
    emergencyContacts: ["100","108"],
    averageRating: 4.5,
    imageUrl: "https://www.ahstatic.com/photos/a0l1_ho_00_p_1024x768.jpg",
    recommendedTripTypes: ["COUPLE","FRIENDS","WEEKEND"],
    approxCost: 2500,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Vivanta Vijayawada MG Road — Sunday Brunch",
    description: "Premium spread with live counters and dessert bar.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "AMA",
    latitude: 16.5065,
    longitude: 80.6480,
    distanceKm: 29,
    bestTimings: "12:30-15:30 (Sun)",
    safetyInfo: "Reservations recommended.",
    emergencyContacts: ["100","108"],
    averageRating: 4.4,
    imageUrl: "https://cdn.sanity.io/images/ocl5w36p/production/ab6584d91ca3165c78d363088ad01d7257709cf2-1720x1112.jpg?w=480&auto=format&dpr=2",
    recommendedTripTypes: ["FAMILY","COUPLE","WEEKEND"],
    approxCost: 2200,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Krishna River Dinner Cruise — Punnami Ghat",
    description: "Evening river cruise with dinner and live music (availability varies).",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "AMA",
    latitude: 16.5155,
    longitude: 80.6247,
    distanceKm: 26,
    bestTimings: "18:30-21:00",
    safetyInfo: "Life jackets onboard; arrive 20 mins early.",
    emergencyContacts: ["100","108"],
    averageRating: 4.3,
    imageUrl: "https://th.bing.com/th/id/OIP.bsioWqMIun0emq_fUJacnQHaE8?w=242&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3",
    recommendedTripTypes: ["COUPLE","FAMILY","WEEKEND"],
    approxCost: 3000,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Bhavani Island — Adventure Premium",
    description: "Ropes course, zip-lines and kayaking premium bundle.",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "AMA",
    latitude: 16.5301,
    longitude: 80.6000,
    distanceKm: 25,
    bestTimings: "9:00-12:00, 15:00-18:00",
    safetyInfo: "Wear sports shoes; follow instructors.",
    emergencyContacts: ["100","108"],
    averageRating: 4.2,
    imageUrl: "https://myholidayhappiness.com/uploads/bhavani-island-7932.jpg",
    recommendedTripTypes: ["FRIENDS","WEEKEND","FAMILY"],
    approxCost: 1500,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Kondapalli Toy Masterclass (Private)",
    description: "Learn from artisans and create your own Kondapalli toy.",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "AMA",
    latitude: 16.6205,
    longitude: 80.3270,
    distanceKm: 45,
    bestTimings: "10:00-13:00, 15:00-17:00",
    safetyInfo: "Paints and tools provided; wear aprons.",
    emergencyContacts: ["100","108"],
    averageRating: 4.4,
    imageUrl: "https://lh5.googleusercontent.com/proxy/jdvkiv_khUuyQUEFtHw_qYK7twKdtL4ClwwfzmcM-_wj-bL1cRfJFjuWpZ6TCpau4LEKp8C4yUMMDwzbAuZmtySlsEGgRNJfQ2hROfYW-SGEEW--Gx_62SmXM8tNDD634yp25LPX_pkYnWg",
    recommendedTripTypes: ["FAMILY","FRIENDS","WEEKEND"],
    approxCost: 2000,
    _class: "com.ziya.model.Attraction"
  },
  // ----- MOD (Modinagar) -----
  {
    name: "Modi Temple (Laxmi Narayan Mandir), Modinagar",
    description: "Local landmark temple built by the Modi family; calm complex for morning/evening darshan.",
    type: "TEMPLE",
    budgetLevel: "CHEAP",
    campusCode: "MOD",
    latitude: 28.8322,
    longitude: 77.5753,
    distanceKm: 2,
    bestTimings: "6:00-10:30, 17:00-20:30",
    safetyInfo: "Footwear not allowed inside; keep phones on silent.",
    emergencyContacts: ["112", "108"],
    averageRating: 4.5,
    imageUrl: "https://i.ytimg.com/vi/8efCsAbOccw/maxresdefault.jpg?sqp=-oaymwEmCIAKENAF8quKqQMa8AEB-AH-CYAC0AWKAgwIABABGFcgXyhlMA8=&rs=AOn4CLAoAHGZ1LuIQz6ndROYGAXaljiOVQ",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Drizzling Land Water & Amusement Park",
    description: "Slides, wave pool and rides on the Delhi–Meerut Expressway—easy day out from Modinagar.",
    type: "ENTERTAINMENT",
    budgetLevel: "MODERATE",
    campusCode: "MOD",
    latitude: 28.743,
    longitude: 77.450,
    distanceKm: 22,
    bestTimings: "10:00-13:00, 15:00-18:30",
    safetyInfo: "Follow ride instructions; use lockers for valuables.",
    emergencyContacts: ["112", "108"],
    averageRating: 4.2,
    imageUrl: "https://tripxl.com/blog/wp-content/uploads/2024/11/Drizzling-Land-Water-And-Amusement-Park-1.jpg",
    recommendedTripTypes: ["FRIENDS", "FAMILY", "WEEKEND"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Augharnath Temple (Kali Paltan Mandir), Meerut Cantt",
    description: "Historic temple associated with 1857 events; popular for evening aarti.",
    type: "TEMPLE",
    budgetLevel: "CHEAP",
    campusCode: "MOD",
    latitude: 28.990,
    longitude: 77.710,
    distanceKm: 32,
    bestTimings: "6:00-10:00, 17:00-20:30",
    safetyInfo: "Crowded on weekends and festivals—watch your belongings.",
    emergencyContacts: ["112", "108"],
    averageRating: 4.6,
    imageUrl: "https://www.studiodharma.in/uploads/post/61e9168a0db42.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Gandhi Bagh (Company Garden), Meerut",
    description: "Green lungs of Meerut—walkways, trees and relaxed picnic corners.",
    type: "PARK",
    budgetLevel: "CHEAP",
    campusCode: "MOD",
    latitude: 28.978,
    longitude: 77.706,
    distanceKm: 30,
    bestTimings: "6:00-10:00, 16:30-19:30",
    safetyInfo: "Keep the park clean; use designated entry/exit gates.",
    emergencyContacts: ["112", "108"],
    averageRating: 4.3,
    imageUrl: "https://www.studiodharma.in/uploads/post/64a8368eadffd.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Basilica of Our Lady of Graces, Sardhana",
    description: "Magnificent 19th‑century church with tranquil courtyards and heritage vibes.",
    type: "HISTORICAL",
    budgetLevel: "CHEAP",
    campusCode: "MOD",
    latitude: 29.1469,
    longitude: 77.6147,
    distanceKm: 40,
    bestTimings: "8:00-12:00, 16:00-18:30",
    safetyInfo: "Dress modestly; maintain silence during services.",
    emergencyContacts: ["112", "108"],
    averageRating: 4.6,
    imageUrl: "https://tse3.mm.bing.net/th/id/OIP.m2IVifhMvD0FZwVRnknFUgHaFq?rs=1&pid=ImgDetMain&o=7&rm=3",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Hastinapur Wildlife Sanctuary (Meerut sector)",
    description: "Riverine forests and grasslands; spot birds, antelope and rural vistas.",
    type: "PARK",
    budgetLevel: "CHEAP",
    campusCode: "MOD",
    latitude: 29.1800,
    longitude: 78.0200,
    distanceKm: 60,
    bestTimings: "Nov–Mar • 6:00-10:00, 16:00-18:00",
    safetyInfo: "Stay on marked tracks; carry water and avoid littering.",
    emergencyContacts: ["112", "108"],
    averageRating: 4.2,
    imageUrl: "https://tse1.mm.bing.net/th/id/OIP.v3aIE3tNQKC5h93ulvyXjQHaE8?rs=1&pid=ImgDetMain&o=7&rm=3",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },

  // ----- MOD — Expensive -----
  {
    name: "Drizzling Land — All-Access Wristband",
    description: "Unlimited slides and ride bundles; a full day of waterpark fun.",
    type: "ENTERTAINMENT",
    budgetLevel: "EXPENSIVE",
    campusCode: "MOD",
    latitude: 28.743,
    longitude: 77.450,
    distanceKm: 22,
    bestTimings: "10:00-18:30",
    safetyInfo: "Quick-dry clothes recommended; follow lifeguard instructions.",
    emergencyContacts: ["112", "108"],
    averageRating: 4.3,
    imageUrl: "https://www.fabhotels.com/blog/wp-content/uploads/2023/01/Drizzling-Land-1-990x743-1.jpg",
    recommendedTripTypes: ["FRIENDS", "FAMILY", "WEEKEND"],
    approxCost: 1600,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Bravura Gold Resort, Meerut — Sunday Brunch",
    description: "Lavish buffet with desserts and live counters in a premium setting.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "MOD",
    latitude: 28.990,
    longitude: 77.634,
    distanceKm: 28,
    bestTimings: "12:30-15:30 (Sun)",
    safetyInfo: "Reservations recommended; smart casuals.",
    emergencyContacts: ["112", "108"],
    averageRating: 4.3,
    imageUrl: "https://tse1.mm.bing.net/th/id/OIP.ccX2cn0vXOnoLxDO57IY4wHaEc?rs=1&pid=ImgDetMain&o=7&rm=3",
    recommendedTripTypes: ["FAMILY", "COUPLE", "WEEKEND"],
    approxCost: 2000,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "The Grand Venice Mall — Premium Dining + Gondola",
    description: "Venice‑themed mall with indoor canals, gondola rides and upscale eats.",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "MOD",
    latitude: 28.474,
    longitude: 77.504,
    distanceKm: 75,
    bestTimings: "12:00-21:00",
    safetyInfo: "Paid parking; avoid peak rush hours for smoother experience.",
    emergencyContacts: ["112", "108"],
    averageRating: 4.4,
    imageUrl: "https://www.malls.com/wp-content/uploads/2024/10/05061db7a0df94dd38f02320fe75e2f8.jpg",
    recommendedTripTypes: ["COUPLE", "FRIENDS", "WEEKEND"],
    approxCost: 2500,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Radisson Blu Kaushambi — Rooftop Lounge",
    description: "Evening views, curated cocktails and a refined vibe near Delhi border.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "MOD",
    latitude: 28.645,
    longitude: 77.323,
    distanceKm: 60,
    bestTimings: "19:00-23:00",
    safetyInfo: "ID checks; reserve in advance on weekends.",
    emergencyContacts: ["112", "108"],
    averageRating: 4.5,
    imageUrl: "https://hospibuz.com/wp-content/uploads/2023/08/Towers.jpg",
    recommendedTripTypes: ["COUPLE", "FRIENDS", "WEEKEND"],
    approxCost: 2200,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Brijghat (Garhmukteshwar) — Private Sunset Aarti + Dinner",
    description: "Ganga ghat experience with evening aarti and local dinner (cab required).",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "MOD",
    latitude: 28.783,
    longitude: 78.113,
    distanceKm: 80,
    bestTimings: "16:00-21:00",
    safetyInfo: "Stay within barricaded areas near the river; keep an eye on personal items.",
    emergencyContacts: ["112", "108"],
    averageRating: 4.6,
    imageUrl: "https://static.wixstatic.com/media/d2e9df_47f14c391a9d467290dd5c87bf2975dc~mv2.jpg/v1/fill/w_1600,h_663,al_c,q_85/d2e9df_47f14c391a9d467290dd5c87bf2975dc~mv2.jpg",
    recommendedTripTypes: ["FAMILY", "COUPLE", "WEEKEND"],
    approxCost: 2800,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Adventure Island, Rohini — Day Pass",
    description: "Full-day theme park rides with food courts and photo spots.",
    type: "ENTERTAINMENT",
    budgetLevel: "EXPENSIVE",
    campusCode: "MOD",
    latitude: 28.720,
    longitude: 77.111,
    distanceKm: 75,
    bestTimings: "11:00-18:30",
    safetyInfo: "Secure loose items; follow ride safety signage.",
    emergencyContacts: ["112", "108"],
    averageRating: 4.2,
    imageUrl: "https://www.joonsquare.com/usermanage/image/business/adventure-island-rohini-north-west-delhi-211/ADVENTURE-ISLAND---METRO-WALK-adventure5.jpg",
    recommendedTripTypes: ["FRIENDS", "FAMILY", "WEEKEND"],
    approxCost: 1700,
    _class: "com.ziya.model.Attraction"
  },

  // ----- GTK (Gangtok) -----
  {
    name: "MG Marg Pedestrian Street, Gangtok",
    description: "The heart of Gangtok—cobbled pedestrian-only street with cafes, shops and live vibes in the evening.",
    type: "SHOPPING",
    budgetLevel: "MODERATE",
    campusCode: "GTK",
    latitude: 27.3256,
    longitude: 88.6120,
    distanceKm: 3,
    bestTimings: "16:00-21:00",
    safetyInfo: "Pedestrian zone; weather can change quickly—carry a light jacket or umbrella.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.5,
    imageUrl: "https://c8.alamy.com/comp/JKN7PW/gangtok-india-december-3-2016-local-people-and-tourist-visit-mg-marg-JKN7PW.jpg",
    recommendedTripTypes: ["FRIENDS", "WEEKEND", "FAMILY", "COUPLE"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Enchey Monastery",
    description: "Peaceful 19th‑century monastery with prayer halls and views over Gangtok.",
    type: "TEMPLE",
    budgetLevel: "CHEAP",
    campusCode: "GTK",
    latitude: 27.3432,
    longitude: 88.6236,
    distanceKm: 4,
    bestTimings: "6:00-10:30, 16:00-18:30",
    safetyInfo: "Dress modestly; maintain silence inside prayer halls.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.6,
    imageUrl: "https://hblimg.mmtcdn.com/content/hubble/img/gangtok/mmt/activities/m_activities_Gangtok_Enchey%20Monastery_l_384_575.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Do Drul Chorten Stupa",
    description: "Prominent white stupa surrounded by prayer wheels; serene spiritual stop.",
    type: "TEMPLE",
    budgetLevel: "CHEAP",
    campusCode: "GTK",
    latitude: 27.3130,
    longitude: 88.6067,
    distanceKm: 2,
    bestTimings: "6:30-10:30, 16:00-18:00",
    safetyInfo: "Respect rituals; walk clockwise around the stupa.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.6,
    imageUrl: "https://tse2.mm.bing.net/th/id/OIP.HpmAtjI6ZNTBnbGqO_EoawHaE8?w=760&h=508&rs=1&pid=ImgDetMain&o=7&rm=3",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Namgyal Institute of Tibetology",
    description: "Renowned institute and museum preserving Tibetan Buddhist culture and art.",
    type: "MUSEUM",
    budgetLevel: "CHEAP",
    campusCode: "GTK",
    latitude: 27.3124,
    longitude: 88.6083,
    distanceKm: 2,
    bestTimings: "10:00-13:00, 15:00-17:00",
    safetyInfo: "Closed on select holidays; photography may be restricted inside galleries.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.5,
    imageUrl: "https://3.bp.blogspot.com/-hyBAbHAv28A/WRKczY_hzzI/AAAAAAAA1us/EXWCHCVqEjQWLyj_Rd4CXCkPYCmWIQ2RACLcB/w1200-h630-p-k-no-nu/Namgyal%2BInstitute%2Bof%2BTibetology%2B-%2BMain%2Bplaces%2Bto%2Bexplore%2Baround%2BGangtok%2Bin%2BSikkim-4.jpg",
    recommendedTripTypes: ["FAMILY", "WEEKDAY", "SOLO"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Banjhakri Falls & Energy Park",
    description: "Short trails, landscaped gardens and a scenic waterfall on Ranka Road.",
    type: "WATERFALL",
    budgetLevel: "MODERATE",
    campusCode: "GTK",
    latitude: 27.3189,
    longitude: 88.6569,
    distanceKm: 7,
    bestTimings: "9:00-12:00, 15:00-17:30",
    safetyInfo: "Pathways can be slippery—wear good shoes; avoid leaning over railings.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.4,
    imageUrl: "https://www.holidify.com/images/cmsuploads/compressed/1(3)_20180419160817.jpeg",
    recommendedTripTypes: ["FAMILY", "WEEKEND", "FRIENDS"],
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Tashi View Point",
    description: "Early-morning lookout for peaks and valley vistas; tea stalls nearby.",
    type: "VIEWPOINT",
    budgetLevel: "CHEAP",
    campusCode: "GTK",
    latitude: 27.3644,
    longitude: 88.6387,
    distanceKm: 9,
    bestTimings: "5:30-9:00, 16:30-18:30",
    safetyInfo: "Chilly winds—carry a jacket; watch steps in low light.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.3,
    imageUrl: "https://tse2.mm.bing.net/th/id/OIP.QUuhkohvjmexuZyfA3QRLgHaFQ?rs=1&pid=ImgDetMain&o=7&rm=3",
    recommendedTripTypes: ["COUPLE", "FAMILY", "WEEKEND"],
    _class: "com.ziya.model.Attraction"
  },

  // ----- GTK — Expensive -----
  {
    name: "Tsomgo (Changu) Lake & Baba Mandir — Private Day Trip",
    description: "High-altitude glacial lake and sacred site via scenic mountain roads; permits required.",
    type: "EXCURSION",
    budgetLevel: "EXPENSIVE",
    campusCode: "GTK",
    latitude: 27.3756,
    longitude: 88.7646,
    distanceKm: 40,
    bestTimings: "07:30-17:00",
    safetyInfo: "Carry original ID for permits; altitude can cause breathlessness—keep warm and hydrated.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.7,
    imageUrl: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/95/b0/72/caption.jpg?w=1200&h=-1&s=1",
    recommendedTripTypes: ["FAMILY", "FRIENDS", "WEEKEND"],
    approxCost: 3500,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Nathula Pass — India–China Border (Permit Trip)",
    description: "Bucket‑list border pass with army outposts and sweeping vistas (Indian nationals only).",
    type: "EXCURSION",
    budgetLevel: "EXPENSIVE",
    campusCode: "GTK",
    latitude: 27.3865,
    longitude: 88.8318,
    distanceKm: 55,
    bestTimings: "07:00-17:00",
    safetyInfo: "Permits and valid ID mandatory; weather-dependent and may close during heavy snow.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.8,
    imageUrl: "https://imgcdn.flamingotravels.co.in/Images/PlacesOfInterest/Nathula-Pass-Gangtok-3.jpg",
    recommendedTripTypes: ["FAMILY", "FRIENDS", "WEEKEND"],
    approxCost: 4500,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Paragliding at Baliman Dara (Ranka Road)",
    description: "Take-off from Baliman Dara for tandem flights over valleys—adrenaline with crisp views.",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "GTK",
    latitude: 27.3141,
    longitude: 88.6493,
    distanceKm: 12,
    bestTimings: "9:00-12:00, 15:00-17:00",
    safetyInfo: "Weather-dependent; follow pilot instructions; weight limits apply.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.6,
    imageUrl: "https://www.travenix.com/wp-content/uploads/2017/10/119-520x347.jpg",
    recommendedTripTypes: ["FRIENDS", "COUPLE", "WEEKEND", "SOLO"],
    approxCost: 3000,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Teesta River Rafting (Melli stretch)",
    description: "Guided white-water rafting run on the Teesta—beginner to intermediate sections.",
    type: "EXPERIENCE",
    budgetLevel: "EXPENSIVE",
    campusCode: "GTK",
    latitude: 27.0604,
    longitude: 88.5284,
    distanceKm: 38,
    bestTimings: "9:00-15:00 (Oct–May)",
    safetyInfo: "Life jackets and helmets mandatory; avoid during high monsoon flows.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.5,
    imageUrl: "https://www.solitarytraveller.com/wp-content/uploads/2025/04/Locals-Guide-to-Gangtok-River-Rafting-Teesta-River-1024x768.webp",
    recommendedTripTypes: ["FRIENDS", "WEEKEND"],
    approxCost: 2200,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "Mayfair Spa Resort — Day Spa + Pool Access",
    description: "Relaxing spa therapies and resort pool access in a forested setting near Ranipool.",
    type: "SPA",
    budgetLevel: "EXPENSIVE",
    campusCode: "GTK",
    latitude: 27.2957,
    longitude: 88.6050,
    distanceKm: 5,
    bestTimings: "11:00-19:00",
    safetyInfo: "Advance booking recommended; arrive 15 minutes early.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.6,
    imageUrl: "https://imgcld.yatra.com/ytimages/image/upload/t_hotel_mobileactualimage/v1501146230/Hotel/Gangtok/00005412/4_oV3awW.jpg",
    recommendedTripTypes: ["COUPLE", "SOLO", "WEEKEND"],
    approxCost: 3200,
    _class: "com.ziya.model.Attraction"
  },
  {
    name: "The Elgin Nor‑Khill, Gangtok — Heritage Dinner",
    description: "Classic Sikkimese and continental set menus in a historic boutique hotel.",
    type: "RESTAURANT",
    budgetLevel: "EXPENSIVE",
    campusCode: "GTK",
    latitude: 27.3305,
    longitude: 88.6151,
    distanceKm: 3,
    bestTimings: "19:00-22:00",
    safetyInfo: "Reservations advised; smart casuals.",
    emergencyContacts: ["112", "100", "108"],
    averageRating: 4.5,
    imageUrl: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/e3/ac/63/caption.jpg?w=1200&h=-1&s=1",
    recommendedTripTypes: ["COUPLE", "FAMILY", "WEEKEND"],
    approxCost: 2500,
    _class: "com.ziya.model.Attraction"
  },
];

// ------------- App logic starts here -------------
const STORAGE_KEYS = {
  selectedCampus: "srmTrips.selectedCampus",
  filters: "srmTrips.filters",
  selected: "srmTrips.selected",
  savedTrips: "srmTrips.savedTrips",
  blogPosts: "srmTrips.blogPosts",
  activeTab: "srmTrips.activeTab"
};

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

// In-memory cache of attractions by campus code
let ALL_DEST_BY_CAMPUS = {};

// Helpers
function byId(id) { return document.getElementById(id); }
function safe(val, d = "") { return val == null ? d : val; }
function campusNameFromCode(code) { return CAMPUS_MAP[code] || code || "Unknown"; }
function campusCodeFromName(name) { return CAMPUS_NAME_TO_CODE[name] || name || "KTR"; }
function nowISO() { return new Date().toISOString(); }
function htmlEscape(s) { return String(s || "").replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

function persist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
}
function readPersist(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (e) { return fallback; }
}

// Build normalized, expanded attractions grouped by campus
function buildAttractions() {
  const normalized = (DEMO_ATTRACTIONS || []).map(normalizeAttraction);
  const byCampus = {};
  normalized.forEach(d => {
    const code = d?._raw?.campusCode || campusCodeFromName(d?.campus);
    if (!byCampus[code]) byCampus[code] = [];
    byCampus[code].push(d);
  });

  DEMO_CAMPUSES.forEach(c => { if (!byCampus[c.id]) byCampus[c.id] = []; });

  for (const [code, list] of Object.entries(byCampus)) {
    const enriched = autoTagTripTypes(list);
    ALL_DEST_BY_CAMPUS[code] = expandAttractionsForCampus(enriched, code, TARGET_PLACES_PER_CAMPUS, MIN_PER_TRIP_CATEGORY);
  }
}

// UI Builders
function populateCampusSelects() {
  if (campusSelect) {
    campusSelect.innerHTML = DEMO_CAMPUSES.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  }
  if (blogCampus) {
    blogCampus.innerHTML = DEMO_CAMPUSES.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  }
}
function populatePlannerSelects() {
  if (plannerTripType) {
    const opts = TRIP_TYPE_OPTIONS.filter(x => x !== "All");
    plannerTripType.innerHTML = opts.map(t => `<option value="${t}">${t}</option>`).join("");
  }
  if (plannerBudget) {
    const opts = COST_OPTIONS.filter(x => x !== "All");
    plannerBudget.innerHTML = opts.map(t => `<option value="${t}">${t}</option>`).join("");
  }
}

// Tabs (toggle both class and display)
function setActiveTab(tab) {
  const TABS = { explore: exploreTab, planner: plannerTab, blog: blogTab };
  const SECTIONS = { explore: exploreSection, planner: plannerSection, blog: blogSection };

  Object.entries(TABS).forEach(([k, el]) => {
    if (!el) return;
    const isActive = (k === tab);
    el.classList.toggle("active", isActive);
    el.setAttribute("aria-selected", String(isActive));
    el.tabIndex = isActive ? 0 : -1;
  });

  Object.entries(SECTIONS).forEach(([k, el]) => {
    if (!el) return;
    const show = (k === tab);
    el.classList.toggle("active", show);
    el.style.display = show ? "block" : "none";
  });

  persist(STORAGE_KEYS.activeTab, tab);
}

function wireTabs() {
  if (exploreTab) exploreTab.addEventListener("click", () => setActiveTab("explore"));
  if (plannerTab) plannerTab.addEventListener("click", () => setActiveTab("planner"));
  if (blogTab) blogTab.addEventListener("click", () => setActiveTab("blog"));
}

// Campus switching
function setSelectedCampus(code) {
  const validCodes = new Set(DEMO_CAMPUSES.map(c => c.id));
  const fallback = DEMO_CAMPUSES[0]?.id || "KTR";
  const finalCode = validCodes.has(code) ? code : fallback;

  state.selectedCampus = finalCode;
  if (campusSelect) campusSelect.value = finalCode;
  if (blogCampus) blogCampus.value = finalCode;

  if (activeCampusLabel) activeCampusLabel.textContent = campusNameFromCode(finalCode);
  applyFiltersAndRender();
  persist(STORAGE_KEYS.selectedCampus, finalCode);
}

function wireCampusSelect() {
  if (!campusSelect) return;
  campusSelect.addEventListener("change", (e) => setSelectedCampus(e.target.value));
}

// Filters & chips
function applyFiltersAndRender() {
  const code = state.selectedCampus || DEMO_CAMPUSES[0]?.id || "KTR";
  const base = ALL_DEST_BY_CAMPUS[code] || [];
  const filtered = base.filter(d => filterDest(d, state.filters));
  state.destinations = filtered;
  renderFilterChips();
  renderDestinations(base.length, filtered);
}

function wireFilters() {
  if (tripTypeChips) {
    tripTypeChips.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-type]");
      if (!btn) return;
      state.filters.type = btn.dataset.type;
      persist(STORAGE_KEYS.filters, state.filters);
      applyFiltersAndRender();
    });
  }
  if (costChips) {
    costChips.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-cost]");
      if (!btn) return;
      state.filters.cost = btn.dataset.cost;
      persist(STORAGE_KEYS.filters, state.filters);
      applyFiltersAndRender();
    });
  }
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.filters.q = e.target.value || "";
      persist(STORAGE_KEYS.filters, state.filters);
      applyFiltersAndRender();
    });
  }
  if (clearFilters) {
    clearFilters.addEventListener("click", () => {
      state.filters = { type: "All", cost: "All", q: "" };
      if (searchInput) searchInput.value = "";
      persist(STORAGE_KEYS.filters, state.filters);
      applyFiltersAndRender();
      toast("Filters cleared");
    });
  }
  if (clearSearch) {
    clearSearch.addEventListener("click", () => {
      state.filters.q = "";
      if (searchInput) searchInput.value = "";
      persist(STORAGE_KEYS.filters, state.filters);
      applyFiltersAndRender();
    });
  }
}

// Explore grid
function cardHtml(d) {
  const tags = (d.tripTypes || []).slice(0, 3).map(t => `<span class="tag">${htmlEscape(t)}</span>`).join(" ");
  const cost = htmlEscape(d.cost || "Moderate");
  const rating = d._raw?.averageRating ? `⭐ ${d._raw.averageRating}` : "";
  const km = d._raw?.distanceKm != null ? `${d._raw.distanceKm} km` : "";
  const img = htmlEscape(d.imageUrl);

  return `
    <div class="destination-card" data-id="${htmlEscape(d.id)}">
      <div class="img" style="background-image:url('${img}');"></div>
      <div class="body">
        <div class="title-row">
          <h3 class="title">${htmlEscape(d.name)}</h3>
          <div class="meta">
            ${rating ? `<span class="mr-6">${rating}</span>` : ""}
            ${km ? `<span>${km}</span>` : ""}
          </div>
        </div>
        <p class="desc">${htmlEscape(d.description || "").slice(0, 120)}${(d.description || "").length > 120 ? "…" : ""}</p>
        <div class="row">
          <div class="tags">${tags}</div>
          <div class="cost ${cost.toLowerCase()}">${cost}</div>
        </div>
        <div class="actions">
          <button class="btn ghost" data-action="details">Details</button>
          ${state.selected.some(x => x.id === d.id)
      ? `<button class="btn danger" data-action="remove">Remove</button>`
      : `<button class="btn primary" data-action="add">Add</button>`
    }
        </div>
      </div>
    </div>
  `;
}

function renderDestinations(totalCount, arr) {
  if (!destinationsGrid) return;
  if (!Array.isArray(arr) || arr.length === 0) {
    destinationsGrid.innerHTML = `<div class="empty">No places match your filters. Try changing Type/Cost or clearing search.</div>`;
  } else {
    destinationsGrid.innerHTML = arr.map(cardHtml).join("");
  }
  if (resultsCount) {
    const f = arr.length;
    resultsCount.textContent = `${f} of ${safe(totalCount, 0)} places`;
  }
}

function wireExploreGrid() {
  if (!destinationsGrid) return;
  destinationsGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".destination-card");
    if (!card) return;
    const id = card.dataset.id;
    const place = state.destinations.find(d => d.id === id) ||
      (ALL_DEST_BY_CAMPUS[state.selectedCampus] || []).find(d => d.id === id);
    if (!place) return;

    const actionBtn = e.target.closest("button[data-action]");
    if (!actionBtn) {
      openDestinationModal(place);
      return;
    }

    const act = actionBtn.dataset.action;
    if (act === "details") {
      openDestinationModal(place);
    } else if (act === "add") {
      addToPlan(place);
    } else if (act === "remove") {
      removeFromPlan(place.id);
    }
  });
}

// Destination modal
function openDestinationModal(place) {
  if (!destinationModal || !modalTitle || !modalBody) return;
  modalTitle.textContent = place.name;

  const safety = (place.safety || []).map(s => `<li>${htmlEscape(s)}</li>`).join("") || "<li>No specific alerts</li>";
  const timings = place?._raw?.bestTimings ? htmlEscape(place._raw.bestTimings) : "Check venue timings";
  const transport = htmlEscape(place.transport || estimateTransport(place));
  const cost = INR.format(Number(place.approxCost || approxCostFromCostLabel(place.cost)));

  const already = state.selected.some(x => x.id === place.id);
  const btn = already
    ? `<button class="btn danger" id="modalRemove">Remove from Plan</button>`
    : `<button class="btn primary" id="modalAdd">Add to Plan</button>`;

  modalBody.innerHTML = `
    <div class="modal-img" style="background-image:url('${htmlEscape(place.imageUrl)}');"></div>
    <div class="modal-section">
      <p>${htmlEscape(place.description || "No description available.")}</p>
      <p><strong>Suggested for:</strong> ${(place.tripTypes || []).join(", ")}</p>
      <p><strong>Cost approx:</strong> ${cost} <em>per person</em> (${htmlEscape(place.cost)})</p>
      <p><strong>Best timings:</strong> ${timings}</p>
      <p><strong>Transport:</strong> ${transport}</p>
      <div><strong>Safety:</strong><ul>${safety}</ul></div>
    </div>
    <div class="modal-actions">
      ${btn}
      <button class="btn ghost" id="modalClose">Close</button>
    </div>
  `;

  if (destinationModal.showModal) destinationModal.showModal();
  const add = byId("modalAdd");
  const rem = byId("modalRemove");
  const cls = byId("modalClose");

  if (add) add.onclick = () => { addToPlan(place); destinationModal.close(); };
  if (rem) rem.onclick = () => { removeFromPlan(place.id); destinationModal.close(); };
  if (closeModal) closeModal.onclick = () => destinationModal.close();
  if (cls) cls.onclick = () => destinationModal.close();
}

// Planner
function addToPlan(place) {
  if (state.selected.some(x => x.id === place.id)) return;
  state.selected.push(place);
  persist(STORAGE_KEYS.selected, state.selected.map(p => p.id));
  renderSelected();
  applyFiltersAndRender();
  toast("Added to plan");
}
function removeFromPlan(id) {
  state.selected = state.selected.filter(x => x.id !== id);
  persist(STORAGE_KEYS.selected, state.selected.map(p => p.id));
  renderSelected();
  applyFiltersAndRender();
  toast("Removed from plan");
}

function renderSelected() {
  if (!selectedList) return;
  if (!state.selected.length) {
    selectedList.innerHTML = `<div class="empty small">No places added yet. Use the Explore tab to add some!</div>`;
  } else {
    selectedList.innerHTML = state.selected.map(d => `
      <div class="sel-item" data-id="${htmlEscape(d.id)}">
        <div class="thumb" style="background-image:url('${htmlEscape(d.imageUrl)}')"></div>
        <div class="info">
          <div class="name">${htmlEscape(d.name)}</div>
          <div class="sub">${htmlEscape(d.cost)} • ${INR.format(Number(d.approxCost || approxCostFromCostLabel(d.cost)))}</div>
        </div>
        <div class="sel-actions">
          <button class="btn xs danger" data-action="remove">Remove</button>
        </div>
      </div>
    `).join("");
  }
  updateTripSummary();
}

function wireSelectedList() {
  if (!selectedList) return;
  selectedList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action='remove']");
    if (!btn) return;
    const row = e.target.closest(".sel-item");
    if (!row) return;
    removeFromPlan(row.dataset.id);
  });
}

function updateTripSummary() {
  if (!tripSummary) return;
  const people = Math.max(1, parseInt(tripPeople?.value || "1", 10) || 1);
  const sum = state.selected.reduce((acc, d) => acc + Number(d.approxCost || approxCostFromCostLabel(d.cost)), 0);
  const perPerson = Math.round(sum);
  const total = Math.round(sum * people);

  const type = plannerTripType?.value || "Weekend";
  const budget = plannerBudget?.value || "Moderate";

  const estMinutes = state.selected.reduce((acc, d) => acc + minutesFromKm(d?._raw?.distanceKm || 5), 0);
  const estHours = Math.max(1, Math.round(estMinutes / 60));

  tripSummary.innerHTML = `
    <div class="sum-row"><strong>Stops:</strong> ${state.selected.length}</div>
    <div class="sum-row"><strong>Trip Type:</strong> ${htmlEscape(type)} • <strong>Budget:</strong> ${htmlEscape(budget)}</div>
    <div class="sum-row"><strong>Est. Duration:</strong> ~${estHours} hrs</div>
    <div class="sum-row"><strong>Per Person:</strong> ${INR.format(perPerson)} • <strong>Group (${people}):</strong> ${INR.format(total)}</div>
  `;

  const enableAction = !!state.selected.length && !!(tripTitle?.value);
  if (pdfBtn) pdfBtn.disabled = !enableAction;
  if (saveTripBtn) saveTripBtn.disabled = !enableAction;
}

function wirePlannerForm() {
  [tripTitle, tripDate, tripPeople, plannerTripType, plannerBudget].forEach(el => {
    if (el) el.addEventListener("input", updateTripSummary);
    if (el) el.addEventListener("change", updateTripSummary);
  });

  if (clearPlan) {
    clearPlan.addEventListener("click", () => {
      state.selected = [];
      persist(STORAGE_KEYS.selected, []);
      renderSelected();
      updateTripSummary();
      toast("Plan cleared");
    });
  }

  if (saveTripBtn) {
    saveTripBtn.addEventListener("click", () => {
      if (!state.selected.length) return;
      const trip = {
        id: `trip-${Date.now()}`,
        createdAt: nowISO(),
        campus: state.selectedCampus,
        title: tripTitle?.value?.trim() || "My SRM Trip",
        date: tripDate?.value || "",
        people: Math.max(1, parseInt(tripPeople?.value || "1", 10) || 1),
        type: plannerTripType?.value || "Weekend",
        budget: plannerBudget?.value || "Moderate",
        notes: tripNotes?.value || "",
        items: state.selected.map(d => ({ id: d.id, name: d.name, approxCost: d.approxCost, cost: d.cost }))
      };
      state.savedTrips = [trip, ...state.savedTrips];
      persist(STORAGE_KEYS.savedTrips, state.savedTrips);
      toast("Trip saved!");
    });
  }

  if (pdfBtn) {
    pdfBtn.addEventListener("click", () => {
      if (!state.selected.length) return;
      generatePrintView();
    });
  }
}

// Guidelines generator (heuristic)
function deriveGuidelines(d) {
  const tips = [];
  const type = String(d?._raw?.type || "").toUpperCase();
  const dist = Number(d?._raw?.distanceKm || 0);
  const cost = String(d?.cost || "Moderate");
  const best = d?._raw?.bestTimings;
  const tripTypes = new Set(d?.tripTypes || []);

  if (dist > 30) tips.push(`Start early and buffer for traffic (~${dist} km).`);
  if (best) tips.push(`Prefer visiting during: ${best}.`);
  if (tripTypes.has("Weekend")) tips.push("Expect crowds on weekends; arrive early.");
  if (tripTypes.has("Weekday")) tips.push("Weekdays are usually less crowded.");
  if (["TEMPLE"].includes(type)) tips.push("Dress modestly and remove footwear; check photography restrictions.");
  if (["PARK", "WATERFALL", "LAKE", "VIEWPOINT"].includes(type)) tips.push("Carry water and wear good shoes; keep the area clean.");
  if (["MUSEUM", "HISTORICAL"].includes(type)) tips.push("Some venues close on holidays; verify timings and ticket counters.");
  if (["ENTERTAINMENT", "EXPERIENCE", "SPA", "EXCURSION"].includes(type)) tips.push("Advance booking recommended; carry a valid ID if required.");
  if (/Cheap/i.test(cost)) tips.push("Carry small change; some vendors may be cash‑only.");
  if (/Expensive/i.test(cost)) tips.push("Budget extra for food/activities; consider reservations.");

  // De-dupe and cap to 5 items
  const uniq = Array.from(new Set(tips)).slice(0, 5);
  return uniq.length ? uniq : ["Plan transport and timings; keep essentials handy."];
}

// Pastel PDF generator with cost, safety, and guidelines
function generatePrintView() {
  const people = Math.max(1, parseInt(tripPeople?.value || "1", 10) || 1);
  const type = plannerTripType?.value || "Weekend";
  const budget = plannerBudget?.value || "Moderate";
  const dateStr = tripDate?.value || "";
  const notes = htmlEscape(tripNotes?.value || "");
  const campusName = campusNameFromCode(state.selectedCampus);
  const title = htmlEscape(tripTitle?.value || "Trip Plan");

  const rows = state.selected.map((d, i) => {
    const tags = (d.tripTypes || []).slice(0, 4).map(t => `<span class="chip">${htmlEscape(t)}</span>`).join(" ");
    const approx = Number(d.approxCost || approxCostFromCostLabel(d.cost));
    const approxStr = INR.format(approx);
    const groupApproxStr = INR.format(approx * people);
    const costClass = String(d.cost || "Moderate").toLowerCase();
    const safetyItems = (d.safety && d.safety.length)
      ? d.safety.map(s => `<li>${htmlEscape(s)}</li>`).join("")
      : `<li>No specific alerts</li>`;
    const guidelines = deriveGuidelines(d).map(g => `<li>${htmlEscape(g)}</li>`).join("");
    const timings = d?._raw?.bestTimings ? htmlEscape(d._raw.bestTimings) : "Check venue timings";
    const transport = htmlEscape(d.transport || estimateTransport(d));

    return `
      <tr class="main">
        <td class="idx">${i + 1}</td>
        <td class="place">
          <div class="place-name">${htmlEscape(d.name)}</div>
          <div class="chips">${tags}</div>
        </td>
        <td class="cost"><span class="badge ${costClass}">${htmlEscape(d.cost)}</span></td>
        <td class="pp">
          <div class="pp-amt">${approxStr}</div>
          <div class="muted small">Group: ${groupApproxStr}</div>
        </td>
      </tr>
      <tr class="details">
        <td colspan="4">
          <div class="detail-block">
            <div class="detail-col">
              <div class="subhead">Safety</div>
              <ul class="bullets">${safetyItems}</ul>
            </div>
            <div class="detail-col">
              <div class="subhead">Guidelines</div>
              <ul class="bullets">${guidelines}</ul>
            </div>
            <div class="detail-col">
              <div class="subhead">Info</div>
              <div class="kv"><span class="k">Best timings:</span> <span class="v">${timings}</span></div>
              <div class="kv"><span class="k">Transport:</span> <span class="v">${transport}</span></div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  const perPersonTotal = state.selected.reduce((acc, d) => acc + Number(d.approxCost || approxCostFromCostLabel(d.cost)), 0);
  const groupTotal = perPersonTotal * people;
  const stops = state.selected.length;

  const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          :root{
            --ink:#24324a;
            --muted:#667085;
            --paper:#ffffff;
            --bg:#f6f8ff;
            --p1:#e8f0fe; /* soft blue */
            --p2:#fef6e4; /* peach */
            --p3:#eafaf1; /* mint */
            --p4:#f5e6ff; /* lavender */
            --p5:#e6f7ff; /* aqua */
            --line:#e6e8f2;
            --cheap:#e6f4ea;
            --moderate:#fef6e4;
            --expensive:#fde2e4;
            --cheap-ink:#166534;
            --moderate-ink:#7c4a03;
            --expensive-ink:#7a1f2a;
            --primary:#6c7cff;
          }
          @page { size: A4; margin: 14mm; }
          html, body { height: 100%; }
          body{
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            color: var(--ink);
            background: var(--bg);
            margin: 0;
          }
          .doc{
            background: var(--paper);
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 6px 30px rgba(28,40,74,0.08);
          }
          .hero{
            padding: 20px 22px;
            background: linear-gradient(135deg, var(--p1), var(--p4) 60%, var(--p3));
            border-bottom: 1px solid var(--line);
          }
          .hero h1{
            font-size: 24px; line-height: 1.2; margin: 0 0 6px 0;
          }
          .meta{
            color: var(--ink);
            font-size: 12.8px;
            display: flex; flex-wrap: wrap; gap: 8px;
          }
          .meta .pill{
            background: rgba(255,255,255,0.7);
            border: 1px solid rgba(0,0,0,0.05);
            border-radius: 999px;
            padding: 4px 10px;
          }
          .section{
            padding: 16px 22px;
          }
          .summary{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 8px;
          }
          .card{
            background: linear-gradient(180deg, #fff, #fafaff);
            border: 1px solid var(--line);
            border-radius: 10px;
            padding: 10px 12px;
          }
          .card .label{ color: var(--muted); font-size: 12px; margin-bottom: 4px;}
          .card .value{ font-size: 16px; font-weight: 700; }

          table{
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 13px;
          }
          th, td{
            border: 1px solid var(--line);
            padding: 8px 10px;
            vertical-align: top;
          }
          th{
            text-align: left;
            background: linear-gradient(180deg, var(--p5), #f7fbff);
            color: #26324d;
            font-weight: 700;
          }
          tbody tr.main:nth-child(4n-3){ background: #fbfcff; } /* pattern to alternate main rows */
          tbody tr.main:nth-child(4n-1){ background: #ffffff; }
          tr.details td{
            background: #fffefd;
          }
          .idx{ width: 28px; text-align: center; color: var(--muted); font-weight: 600; }
          .place-name{ font-weight: 600; margin-bottom: 6px; }
          .chips{ display: flex; flex-wrap: wrap; gap: 6px; }
          .chip{
            background: #f1f4ff;
            color: #3b42a1;
            border: 1px solid #e3e7ff;
            padding: 3px 8px;
            border-radius: 999px;
            font-size: 11px;
            line-height: 1;
          }
          .badge{
            display: inline-block;
            border-radius: 999px;
            padding: 5px 10px;
            font-weight: 700;
            font-size: 11.5px;
            border: 1px solid rgba(0,0,0,0.06);
          }
          .badge.cheap{ background: var(--cheap); color: var(--cheap-ink); }
          .badge.moderate{ background: var(--moderate); color: var(--moderate-ink); }
          .badge.expensive{ background: var(--expensive); color: var(--expensive-ink); }
          .pp-amt{ text-align: right; font-weight: 700; }
          .small{ font-size: 11px; }

          /* Details block */
          .detail-block{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            border: 1px dashed var(--line);
            border-radius: 8px;
            padding: 10px;
            background: linear-gradient(180deg, #fff, #fffdfa);
          }
          .detail-col .subhead{
            font-weight: 700; margin-bottom: 6px; color: #2a3355;
          }
          .bullets{
            margin: 0; padding-left: 18px;
          }
          .kv{ margin: 4px 0; }
          .kv .k{ color: var(--muted); }
          .kv .v{ color: var(--ink); }

          tfoot td{
            font-weight: 700;
            background: linear-gradient(180deg, #fff7f9, #fff);
          }
          .muted{ color: var(--muted); }
          .notes{
            border: 1px dashed var(--line);
            background: #fffefd;
            border-radius: 8px;
            padding: 10px 12px;
            white-space: pre-wrap;
          }

          /* Avoid splits */
          tr, .card, .detail-block { page-break-inside: avoid; break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="doc">
          <div class="hero">
            <h1>${title}</h1>
            <div class="meta">
              <span class="pill">Campus: ${htmlEscape(campusName)}</span>
              <span class="pill">Type: ${htmlEscape(type)}</span>
              <span class="pill">Budget: ${htmlEscape(budget)}</span>
              ${dateStr ? `<span class="pill">Date: ${htmlEscape(dateStr)}</span>` : ""}
              <span class="pill">People: ${people}</span>
              <span class="pill">Stops: ${stops}</span>
            </div>
          </div>

          <div class="section">
            <div class="summary">
              <div class="card">
                <div class="label">Per Person</div>
                <div class="value">${INR.format(perPersonTotal)}</div>
              </div>
              <div class="card">
                <div class="label">Group Total (${people})</div>
                <div class="value">${INR.format(groupTotal)}</div>
              </div>
              <div class="card">
                <div class="label">Generated</div>
                <div class="value">${new Date().toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Place & Details</th>
                  <th>Cost</th>
                  <th style="text-align:right">Approx (pp)</th>
                </tr>
              </thead>
              <tbody>
                ${rows || `<tr><td colspan="4" class="muted">No items selected.</td></tr>`}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3">Per Person Total</td>
                  <td style="text-align:right">${INR.format(perPersonTotal)}</td>
                </tr>
                <tr>
                  <td colspan="3">Group Total (x${people})</td>
                  <td style="text-align:right">${INR.format(groupTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          ${notes ? `
          <div class="section">
            <div class="label muted" style="margin-bottom:4px">Notes</div>
            <div class="notes">${notes}</div>
          </div>` : ""}

        </div>
        <script>
          window.focus();
          window.print();
        </script>
      </body>
    </html>
  `;

  const w = window.open("", "_blank");
  if (!w) { alert("Please allow popups to print the plan."); return; }
  w.document.write(html);
  w.document.close();
}

// Blog
function renderBlogList() {
  if (!blogList) return;
  if (!state.blogPosts.length) {
    blogList.innerHTML = `<div class="empty small">No posts yet. Share your experience from the Blog tab!</div>`;
    return;
  }
  blogList.innerHTML = state.blogPosts.map(p => {
    const tags = (p.tags || []).map(t => `<span class="tag">${htmlEscape(t)}</span>`).join(" ");
    const campus = campusNameFromCode(p.campus);
    const snippet = htmlEscape(p.content).slice(0, 160) + (p.content.length > 160 ? "…" : "");
    return `
      <article class="post" data-id="${htmlEscape(p.id)}">
        <h3>${htmlEscape(p.title)}</h3>
        <div class="muted">${htmlEscape(campus)} • ${new Date(p.createdAt).toLocaleString()}</div>
        <div class="tags">${tags}</div>
        <p>${snippet}</p>
        <div class="actions"><button class="btn ghost" data-action="read">Read</button></div>
      </article>
    `;
  }).join("");
}

function wireBlog() {
  if (postBlogBtn) {
    postBlogBtn.addEventListener("click", () => {
      const title = blogTitle?.value?.trim();
      const campus = blogCampus?.value || state.selectedCampus || DEMO_CAMPUSES[0]?.id || "KTR";
      const tags = (blogTags?.value || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 6);
      const content = blogContent?.value?.trim();

      if (!title || !content) {
        if (blogPostStatus) { blogPostStatus.textContent = "Title and content are required."; blogPostStatus.style.color = "#e74c3c"; }
        return;
      }
      const post = { id: `post-${Date.now()}`, title, campus, tags, content, createdAt: nowISO() };
      state.blogPosts = [post, ...(state.blogPosts || [])];
      persist(STORAGE_KEYS.blogPosts, state.blogPosts);
      renderBlogList();
      if (blogPostStatus) { blogPostStatus.textContent = "Posted!"; blogPostStatus.style.color = "#2ecc71"; }
      blogTitle.value = ""; blogTags.value = ""; blogContent.value = "";
      setTimeout(() => { if (blogPostStatus) blogPostStatus.textContent = ""; }, 2000);
    });
  }

  if (refreshBlogBtn) {
    refreshBlogBtn.addEventListener("click", () => {
      renderBlogList();
      toast("Blog refreshed");
    });
  }

  if (blogList) {
    blogList.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action='read']");
      if (!btn) return;
      const card = e.target.closest(".post");
      const id = card?.dataset?.id;
      const p = state.blogPosts.find(x => x.id === id);
      if (p) openBlogModal(p);
    });
  }
}

// Blog modal
function openBlogModal(post) {
  if (!blogModal || !blogModalTitle || !blogModalBody) return;
  blogModalTitle.textContent = post.title;
  const campus = campusNameFromCode(post.campus);
  const tags = (post.tags || []).map(t => `<span class="tag">${htmlEscape(t)}</span>`).join(" ");
  blogModalBody.innerHTML = `
    <div class="muted">${htmlEscape(campus)} • ${new Date(post.createdAt).toLocaleString()}</div>
    ${tags ? `<div class="tags" style="margin:8px 0">${tags}</div>` : ""}
    <div class="content"><p>${htmlEscape(post.content).replace(/\n/g, "<br>")}</p></div>
  `;
  if (blogModal.showModal) blogModal.showModal();

  if (closeBlogModal) closeBlogModal.onclick = () => blogModal.close();
}

// Feedback modal
function wireFeedback() {
  if (feedbackBtn) feedbackBtn.addEventListener("click", () => feedbackModal?.showModal && feedbackModal.showModal());
  if (closeFeedback) closeFeedback.addEventListener("click", () => feedbackModal?.close && feedbackModal.close());
  if (sendFeedbackBtn) {
    sendFeedbackBtn.addEventListener("click", () => {
      const name = fbName?.value?.trim();
      const email = fbEmail?.value?.trim();
      const msg = fbMessage?.value?.trim();
      if (!name || !email || !msg) {
        if (feedbackStatus) { feedbackStatus.textContent = "Please fill all fields."; feedbackStatus.style.color = "#e74c3c"; }
        return;
      }
      if (feedbackStatus) { feedbackStatus.textContent = "Thanks for your feedback!"; feedbackStatus.style.color = "#2ecc71"; }
      setTimeout(() => {
        fbName.value = ""; fbEmail.value = ""; fbMessage.value = "";
        if (feedbackStatus) feedbackStatus.textContent = "";
        feedbackModal?.close && feedbackModal.close();
      }, 1000);
    });
  }
}

// Restore persisted data
function restoreState() {
  const selCampus = readPersist(STORAGE_KEYS.selectedCampus, null);
  const filters = readPersist(STORAGE_KEYS.filters, state.filters);
  const savedTrips = readPersist(STORAGE_KEYS.savedTrips, []);
  const blogPosts = readPersist(STORAGE_KEYS.blogPosts, []);
  const activeTab = readPersist(STORAGE_KEYS.activeTab, "explore");
  const selectedIds = readPersist(STORAGE_KEYS.selected, []);

  state.filters = { ...state.filters, ...filters };
  state.savedTrips = Array.isArray(savedTrips) ? savedTrips : [];
  state.blogPosts = Array.isArray(blogPosts) ? blogPosts : [];
  if (searchInput) searchInput.value = state.filters.q || "";

  return { selCampus, selectedIds, activeTab };
}

function hydrateSelectedFromIds(ids) {
  const allLists = Object.values(ALL_DEST_BY_CAMPUS);
  const flat = [].concat(...allLists);
  state.selected = ids.map(id => flat.find(d => d.id === id)).filter(Boolean);
}

// Init
function init() {
  grabEls();
  initDialogPolyfill();

  buildAttractions();
  populateCampusSelects();
  populatePlannerSelects();
  renderFilterChips();

  const { selCampus, selectedIds, activeTab } = restoreState();
  wireTabs();
  wireCampusSelect();
  wireFilters();
  wireExploreGrid();

  // Planner
  wireSelectedList();
  wirePlannerForm();

  // Blog & Feedback
  wireBlog();
  wireFeedback();

  setActiveTab(activeTab || "explore");

  // Set campus and hydrate selected
  setSelectedCampus(selCampus || DEMO_CAMPUSES[0]?.id || "KTR");
  hydrateSelectedFromIds(selectedIds || []);
  renderSelected();
  renderBlogList();
  applyFiltersAndRender();

  // Defaults
  if (tripTitle && !tripTitle.value) tripTitle.value = "My SRM Trip";
  if (tripPeople && !tripPeople.value) tripPeople.value = "2";
  if (tripDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (!tripDate.value) tripDate.value = today;
    tripDate.min = today;
  }
  updateTripSummary();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
