const journeys = {
  home: {
    title: "ClearDose home",
    intro: "Start by searching the fictional medication catalog or open the WebMCP demo.",
    steps: [
      "Search by generic medication, brand name, or health category.",
      "Review the transparent mock price and typical retail comparison.",
      "Open a medication to choose a strength and quantity.",
    ],
  },
  medications: {
    title: "Medication catalog",
    intro: "Filter and compare fictional medications. Prices are illustrative and not clinical advice.",
    steps: ["Enter a search term.", "Choose a category or sort order.", "Open a result to review its variants."],
  },
  medication: {
    title: "Medication details",
    intro: "Review the medication identity, prescription requirement, variant, and mock price breakdown.",
    steps: ["Choose a strength and quantity.", "Review the price components.", "Add the exact variant to the mock cart."],
  },
  compare: {
    title: "Medication price comparison",
    intro: "Compare two fictional medications side by side. This is a price demonstration, not a substitution recommendation.",
    steps: ["Choose the first medication.", "Choose the second medication.", "Review price, retail, and illustrative savings facts."],
  },
  udi: {
    title: "Universal Drug Index",
    intro: "Explore normalized fictional records, package offers, related-record groups, synthetic interaction review, and local procurement planning.",
    steps: [
      "Search by generic name, brand, category, class, or demo UDI.",
      "Select a record to inspect package offers and explicit missing identifiers.",
      "Try a related-record, interaction-review, or local procurement example while keeping the safety boundary visible.",
    ],
  },
  cart: {
    title: "Mock cart",
    intro: "Review selected variants, quantity, shipping, and total before checkout.",
    steps: ["Confirm each medication variant.", "Change quantity or remove an item.", "Continue to the mock checkout."],
  },
  checkout: {
    title: "Four-step mock checkout",
    intro: "Complete delivery, prescription source, mock payment, and review. Nothing is transmitted or charged.",
    steps: ["Confirm delivery information.", "Choose the prescription handoff.", "Choose a mock payment path.", "Review and create the local order."],
  },
  demo: {
    title: "ClearDose WebMCP hackathon demo",
    intro: "See why structured tools are clearer than asking an agent to infer controls from the page.",
    steps: ["Run the side-by-side agent example.", "Inspect the registered tool contracts.", "Try comparison and shared highlighting."],
  },
  "flow-lab": {
    title: "Local workflow observatory",
    intro: "Run a fictional patient or agent action beside a live view of its local state, events, and bounded context.",
    steps: [
      "Prepare the question-card handoff or run a negative scenario in the left pane.",
      "Choose a concurrent flow, event, and context snapshot in the right pane.",
      "Review or print generated questions, or open the Universal Drug Index in a second tab.",
    ],
  },
  shortcuts: {
    title: "Hackathon prompt shortcuts",
    intro: "Choose a prompt chain, copy it to your compatible agent, and inspect the deterministic machine analog beside the live workflow runtime.",
    steps: [
      "Choose a single-step or multi-step shortcut and review its role, situation, and step scope.",
      "Copy the full chain or one step, or run the visual analog without invoking an external agent.",
      "Inspect event ids and context, then explicitly review, copy, or save an optional memory packet.",
    ],
  },
  default: {
    title: "ClearDose page guidance",
    intro: "Use headings, landmarks, and the visible next action to continue through this fictional patient journey.",
    steps: ["Review the page heading.", "Complete the primary action.", "Use the navigation or agent tools for the next step."],
  },
};

export function getVoiceJourney(routeName) {
  return journeys[routeName] ?? journeys.default;
}
