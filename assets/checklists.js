/* ------------------------------------------------------------------
   New House Plan — default UK checklist library
   Nothing in here is required: every suggestion can be dismissed,
   edited or added to by the user.
   Task shape: [ title, category, when, hint, core ]
     category -> key of CATEGORIES
     when     -> before | week1 | month1 | later
     core     -> 1 = shown in "Just the essentials" mode
-------------------------------------------------------------------*/
(function () {
  "use strict";

  var CATEGORIES = {
    flooring:   { label: "Flooring & carpets",    icon: "▦", trade: "Carpet / flooring fitter",
      tip: "Get one fitter to measure the whole house in a single visit. Fit carpets AFTER decorating, and allow 2–3 weeks from order to fitting." },
    decorating: { label: "Painting & decorating", icon: "🖌", trade: "Decorator (or a weekend and a roller)",
      tip: "Painting is far easier before furniture and carpets arrive. Do ceilings, then walls, then woodwork." },
    plastering: { label: "Plastering & wall repairs", icon: "🧱", trade: "Plasterer",
      tip: "Plastering must come before painting, and fresh plaster needs weeks to dry before its first proper coat." },
    soft:       { label: "Curtains & blinds",     icon: "🪟", trade: "Blind / curtain supplier",
      tip: "Every window needs covering on night one. Measure before you move; made-to-measure is usually 2–3 weeks." },
    plumbing:   { label: "Plumbing",              icon: "🚰", trade: "Plumber",
      tip: "Bundle all the small plumbing jobs into one visit — you pay for the call-out either way." },
    heating:    { label: "Heating, boiler & gas", icon: "🔥", trade: "Gas Safe registered engineer",
      tip: "Only a Gas Safe registered engineer may work on gas. Check the register before you book (gassaferegister.co.uk)." },
    electrics:  { label: "Electrics & lighting",  icon: "💡", trade: "Registered electrician (NICEIC / NAPIT)",
      tip: "Group socket, light and aerial jobs into one visit. Anything notifiable should come with a certificate." },
    cleaning:   { label: "Cleaning",              icon: "🪣", trade: "Cleaner",
      tip: "A one-off deep clean of an empty house is the best money you will spend. Roughly £150–£250 for a 3-bed." },
    furniture:  { label: "Furniture & things to buy", icon: "🛋", trade: "Order / deliver",
      tip: "Check delivery lead times now — sofas and beds are often 6–12 weeks. Measure your doorways and stairs first." },
    appliances: { label: "Appliances & white goods", icon: "🧺", trade: "Buy / install",
      tip: "Confirm what the seller is leaving on the fixtures & fittings form before you buy anything." },
    joinery:    { label: "Joinery, doors & storage", icon: "🪚", trade: "Carpenter / handyperson",
      tip: "Save up the small jobs and book a handyperson for a full day — much better value than single call-outs." },
    safety:     { label: "Safety & security",     icon: "🔐", trade: "You / locksmith",
      tip: "Locks and alarms are day-one jobs, not later jobs." },
    outside:    { label: "Garden & outside",      icon: "🌿", trade: "Gardener / handyperson",
      tip: "Gutters, drains and fences are cheap to sort now and expensive to ignore." },
    admin:      { label: "Admin & paperwork",     icon: "📄", trade: "You (kitchen table job)",
      tip: "Do the admin in one sitting with a cup of tea and a list. Most of it is 10 minutes per item." },
    check:      { label: "Check & investigate",   icon: "🔍", trade: "You (or your surveyor)",
      tip: "Look first, spend later. Half of these turn out to be nothing." }
  };

  var WHEN = {
    before: { label: "Before you move in", short: "Before move", order: 1 },
    week1:  { label: "First week",         short: "Week 1",      order: 2 },
    month1: { label: "First month",        short: "Month 1",     order: 3 },
    later:  { label: "Later, when you are ready", short: "Later", order: 4 }
  };

  var STATUS = {
    "":       { label: "Not looked at yet", short: "To review", cls: "new" },
    todo:     { label: "Needs doing",       short: "Needs doing", cls: "todo" },
    booked:   { label: "Booked / ordered",  short: "Booked",      cls: "booked" },
    done:     { label: "Done",              short: "Done",        cls: "done" },
    skip:     { label: "Not needed",        short: "Not needed",  cls: "skip" }
  };

  /* ---- building blocks ------------------------------------------ */

  var BASE = [
    ["Carpet or flooring — keep, clean or replace?", "flooring", "before",
     "Lift a corner if you can and look underneath. If you are replacing, measure now — but fit after painting.", 1],
    ["Walls — paint, strip wallpaper, or leave for now?", "decorating", "before",
     "Miles easier before the furniture arrives. One neutral colour through the house is the cheap, calm option.", 1],
    ["Ceiling — needs painting?", "decorating", "later", "Yellowed ceilings age a room more than the walls do.", 0],
    ["Woodwork — skirting, door frames, window sills", "decorating", "later",
     "Usually satinwood or eggshell. Do it after the walls.", 0],
    ["Curtains or blinds — measured and ordered?", "soft", "before",
     "You will want privacy on the first night. A cheap temporary blind is fine until the proper ones arrive.", 1],
    ["Light fittings, shades and bulbs", "electrics", "before",
     "Sellers often take shades and bulbs with them. Check every room before move day.", 1],
    ["Enough sockets, in the right places?", "electrics", "month1",
     "Note where you actually want them once the furniture is in.", 0],
    ["Radiator — works, needs bleeding, or replacing?", "heating", "week1",
     "Cold at the top and warm at the bottom means it needs bleeding — a two-minute job with a £2 key.", 1],
    ["Give the room a proper clean", "cleaning", "before", "Skirtings, tops of doors, inside window frames, light switches.", 1],
    ["Furniture needed in here", "furniture", "week1", "List what you actually need first. The rest can wait.", 1],
    ["Windows and doors — locks, keys, draughts, condensation", "check", "week1",
     "Missing window keys are very common. Note the make so you can order more.", 0],
    ["Anything the survey mentioned about this room?", "check", "before",
     "Your survey is a to-do list in disguise. Re-read it room by room.", 0]
  ];

  function base(exclude) {
    exclude = exclude || [];
    return BASE.filter(function (t) { return exclude.indexOf(t[0]) === -1; });
  }

  /* ---- room templates ------------------------------------------- */

  var ROOM_TYPES = {
    hall: {
      label: "Hallway / entrance", icon: "🚪",
      tasks: [
        ["Front door — change the locks", "safety", "before",
         "Do this on day one. You have no idea how many keys are out there. A new euro cylinder is about £20–40 and fifteen minutes.", 1],
        ["Hall, stairs and landing carpet — quoted as one job", "flooring", "before",
         "This is the hardest-wearing carpet in the house, so pay a bit more here. Fitters quote hall/stairs/landing together.", 1],
        ["Smoke alarm on this floor", "safety", "before",
         "One on every floor, tested. Interlinked mains alarms are better than battery ones.", 1],
        ["Front door — draughty, sticking, needs painting?", "joinery", "later", "", 0],
        ["Coat hooks, shoe storage, doormat", "joinery", "week1", "The hallway becomes a dumping ground without these.", 1],
        ["Where are the meters and the consumer unit (fuse box)?", "check", "before",
         "Find them before you need them, and label the circuits while you are there.", 1],
        ["Walls take a battering here — durable paint", "decorating", "later",
         "A washable/scuffable finish is worth it in the hall.", 0],
        ["House number visible, post arrangements", "admin", "week1", "Deliveries and emergency services both need to find you.", 0],
        ["Lighting and switches", "electrics", "later", "", 0],
        ["Clean thoroughly", "cleaning", "before", "", 1]
      ]
    },
    stairs: {
      label: "Stairs & landing", icon: "🪜",
      tasks: [
        ["Stairs and landing carpet", "flooring", "before", "Usually part of the same quote as the hall.", 1],
        ["Smoke alarm on the landing", "safety", "before", "", 1],
        ["Banister and spindles — secure? need painting?", "joinery", "week1", "Give the banister a firm shake. It should not move.", 1],
        ["Light and switch at both ends of the stairs", "electrics", "later", "", 0],
        ["Loft hatch — can you get up there safely?", "check", "week1", "A proper loft ladder turns the loft into usable storage.", 1],
        ["Airing cupboard / hot water tank", "heating", "week1", "Check the tank jacket and look for any drips underneath.", 0],
        ["High walls — you may want a decorator for the stairwell", "decorating", "later",
         "Stairwells need long ladders or scaffolding. This is the one bit of painting worth paying for.", 1],
        ["Clean (including the tops of the skirtings)", "cleaning", "before", "", 0]
      ]
    },
    living: {
      label: "Living room", icon: "🛋",
      tasks: base().concat([
        ["Sofa and chairs — will they fit through the door?", "furniture", "before",
         "Measure the front door, hall, and the turn at the bottom of the stairs before you order anything.", 1],
        ["TV aerial or point — working?", "electrics", "week1", "Test it before you assume it works. Old aerials are often knackered.", 1],
        ["Where will the broadband router go?", "admin", "before",
         "It usually has to live where the master socket is. Think about signal across the house.", 1],
        ["Fireplace — swept? Gas fire serviced? Chimney capped?", "heating", "month1",
         "Have an open chimney swept once a year, and always before first use in a new house.", 1],
        ["Shelving, storage or media unit", "joinery", "later", "", 0]
      ])
    },
    dining: {
      label: "Dining room", icon: "🍽",
      tasks: base().concat([
        ["Table and chairs", "furniture", "week1", "", 1],
        ["Pendant light over the table — in the right place?", "electrics", "later",
         "Moving a ceiling rose is an electrician job but a cheap one.", 0]
      ])
    },
    kitchen: {
      label: "Kitchen", icon: "🍳",
      tasks: [
        ["Which appliances is the seller leaving?", "appliances", "before",
         "Check the fixtures & fittings form (TA10) your solicitor has. Do not assume the fridge stays.", 1],
        ["Fridge/freezer, washing machine, dishwasher — buy or bring?", "appliances", "before",
         "Order early: delivery slots and installation are often a week or two out.", 1],
        ["Oven, hob and extractor — working and clean?", "appliances", "before",
         "An oven deep clean is about £50–80 and transforms how the kitchen feels.", 1],
        ["Plumbing for washing machine / dishwasher", "plumbing", "before",
         "Check there is a valve and a waste connection where you need one.", 1],
        ["Look under the sink for leaks and water damage", "plumbing", "before",
         "Torch, hand at the back, look for staining or soft chipboard.", 1],
        ["Taps dripping? Sink slow to drain?", "plumbing", "week1", "Cheap fixes that get expensive if ignored.", 0],
        ["Kitchen deep clean — inside cupboards too", "cleaning", "before",
         "Do this before a single box goes in. Nobody wants to line someone else's crumby cupboards.", 1],
        ["Cupboard doors, hinges and handles", "joinery", "later",
         "New handles and a coat of cupboard paint is the cheapest kitchen refresh there is.", 0],
        ["Worktop, splashback and sealant", "joinery", "later", "Re-sealing around the worktop stops water getting into the units.", 0],
        ["Flooring — something wipeable", "flooring", "later", "Vinyl, LVT or tile. Not carpet.", 0],
        ["Walls and ceiling — paint (wipeable/kitchen paint)", "decorating", "later", "", 0],
        ["Blind for the kitchen window", "soft", "before", "Wipeable, and keep fabric away from the hob.", 0],
        ["Bins, recycling and where they live", "admin", "week1",
         "Find out your collection days and which bin is which — they vary wildly by council.", 1],
        ["Fire blanket and a smoke alarm nearby (not in the kitchen itself)", "safety", "month1",
         "Kitchen alarms get set off by toast — a heat alarm in the kitchen and a smoke alarm in the hall is the usual answer.", 0],
        ["Enough sockets for the kettle, toaster, air fryer...", "electrics", "month1", "", 0],
        ["Boiler in here? Note its make, model and age", "heating", "before",
         "Photograph the boiler's data plate — you will need it when booking a service.", 1]
      ]
    },
    bedroom: {
      label: "Bedroom", icon: "🛏",
      tasks: base().concat([
        ["Bed and mattress — arriving before move day?", "furniture", "before",
         "Make this the very first thing that goes in. Build the beds before anything else on move day.", 1],
        ["Blackout blind or lined curtains", "soft", "before", "Especially for children's rooms and east-facing windows.", 1],
        ["Wardrobes and storage", "furniture", "month1", "Measure the alcoves before you buy anything.", 1],
        ["Sockets beside the bed", "electrics", "month1", "For lamps and phone chargers — obvious once you have lived there a week.", 0]
      ])
    },
    bathroom: {
      label: "Bathroom", icon: "🛁",
      tasks: [
        ["Shower — pressure OK? Thermostatic? Needs replacing?", "plumbing", "before",
         "Run it hot and cold. Electric showers over about 10 years old are often due for renewal.", 1],
        ["Silicone sealant around the bath and shower", "plumbing", "week1",
         "Mouldy or split sealant lets water into the floor. A £8 tube and an hour fixes it.", 1],
        ["Toilet — flush, seat, wobble, leaks at the base", "plumbing", "before", "", 1],
        ["Extractor fan — does it actually work?", "electrics", "week1",
         "Hold a sheet of loo roll to it. No suction means mould later. This matters more than people think.", 1],
        ["Damp, mould or black spots", "check", "before", "Usually ventilation, not a leak — but find out which.", 1],
        ["New toilet seat, shower head, shower curtain or screen", "furniture", "before",
         "The cheapest way to make someone else's bathroom feel like yours.", 1],
        ["Taps dripping? Basin or bath slow to drain?", "plumbing", "week1", "", 0],
        ["Grout and tiles — clean, or re-grout", "cleaning", "later", "Re-grouting is a tedious but genuinely DIY-able job.", 0],
        ["Bathroom cabinet, mirror, towel rail, bath mat", "furniture", "week1", "", 1],
        ["Lock on the door", "safety", "week1", "", 0],
        ["Flooring — vinyl or tile (please not carpet)", "flooring", "later", "", 0],
        ["Paint — use bathroom/moisture-resistant paint", "decorating", "later", "", 0],
        ["Deep clean and disinfect everything", "cleaning", "before", "Including the shower head and the loo seat hinges.", 1],
        ["Radiator or heated towel rail", "heating", "week1", "", 0]
      ]
    },
    ensuite: {
      label: "En-suite", icon: "🚿",
      tasks: [
        ["Shower — pressure, temperature, condition", "plumbing", "before", "", 1],
        ["Silicone sealant and grout", "plumbing", "week1", "", 1],
        ["Extractor fan works?", "electrics", "week1", "En-suites without working extractors grow mould fast.", 1],
        ["Toilet and basin — leaks, flush, taps", "plumbing", "before", "", 1],
        ["Damp or mould", "check", "before", "", 1],
        ["Deep clean", "cleaning", "before", "", 1],
        ["Shower screen, mirror, towel rail", "furniture", "week1", "", 0],
        ["Flooring and paint", "decorating", "later", "", 0]
      ]
    },
    wc: {
      label: "Downstairs WC / cloakroom", icon: "🚽",
      tasks: [
        ["Toilet and basin — working, leaks, taps", "plumbing", "before", "", 1],
        ["Extractor fan or opening window", "electrics", "week1", "", 0],
        ["Deep clean", "cleaning", "before", "", 1],
        ["Flooring", "flooring", "later", "", 0],
        ["Paint — a small room is a good first decorating job", "decorating", "later",
         "Little rooms are where you learn to paint. Low risk, quick win.", 1],
        ["Lock, hook, mirror, small bin", "furniture", "week1", "", 0]
      ]
    },
    utility: {
      label: "Utility room", icon: "🧼",
      tasks: [
        ["Washing machine and dryer — plumbing and vent", "plumbing", "before",
         "A condenser or heat-pump dryer needs no vent; a vented one needs a hole in the wall.", 1],
        ["Sink and taps", "plumbing", "week1", "", 0],
        ["Boiler or hot water tank in here?", "heating", "before", "Note the make, model and age.", 1],
        ["Storage and shelving", "joinery", "month1", "", 1],
        ["Flooring — something wipeable", "flooring", "later", "", 0],
        ["Clean", "cleaning", "before", "", 1],
        ["Somewhere to dry clothes without steaming up the house", "check", "month1",
         "Drying washing indoors is the single biggest cause of condensation and mould.", 1]
      ]
    },
    study: {
      label: "Study / office", icon: "💻",
      tasks: base().concat([
        ["Broadband — wifi signal or a wired point?", "electrics", "before",
         "If you work from home, test the signal in here before move day. An ethernet run or a mesh point is cheap.", 1],
        ["Desk and chair", "furniture", "week1", "", 1],
        ["Enough sockets for all the kit", "electrics", "month1", "", 0]
      ])
    },
    conservatory: {
      label: "Conservatory", icon: "🌻",
      tasks: [
        ["Roof panels and seals — any leaks or staining?", "check", "before", "Look along the junction with the house wall.", 1],
        ["Too hot in summer, too cold in winter — blinds or roof film?", "soft", "month1", "", 1],
        ["Any heating out here? Is it on the house system?", "heating", "month1",
         "Radiators in a conservatory often need their own valve or a separate heater.", 0],
        ["Flooring", "flooring", "later", "", 0],
        ["Clean the glass, inside and out", "cleaning", "week1", "", 0],
        ["Furniture", "furniture", "later", "", 0]
      ]
    },
    loft: {
      label: "Loft", icon: "🧰",
      tasks: [
        ["Any daylight, damp patches, or signs of mice/birds?", "check", "before",
         "Go up with a torch on a bright day. Daylight through the roof is a problem; a little around the eaves is normal ventilation.", 1],
        ["Insulation depth — 270mm is the modern standard", "check", "month1",
         "Most older lofts have 100mm or less. Topping it up is cheap, DIY-able and pays back fast.", 1],
        ["Water tank and pipes lagged?", "plumbing", "month1", "Unlagged pipes in a cold loft are how you get a burst in January.", 1],
        ["Boarding and a proper loft ladder", "joinery", "later", "Do not squash the insulation — use raised loft legs.", 0],
        ["Is there a light up there?", "electrics", "later", "", 0],
        ["Clear out whatever the seller left behind", "cleaning", "week1", "Check before completion — it is much easier to ask them to take it.", 1]
      ]
    },
    garage: {
      label: "Garage", icon: "🚗",
      tasks: [
        ["Door — works? Keys? Needs replacing?", "joinery", "week1", "", 1],
        ["Power and lighting out there", "electrics", "month1", "", 1],
        ["Roof and damp — older garage roofs may be asbestos cement", "check", "before",
         "Corrugated cement sheet garage roofs are common and usually fine if left alone. Do not drill, cut or break it — get advice.", 1],
        ["Shelving and storage", "joinery", "later", "", 0],
        ["Clear out and sweep", "cleaning", "week1", "", 1]
      ]
    },
    garden: {
      label: "Garden & outside", icon: "🌿",
      tasks: [
        ["Lawn mower and basic garden tools", "furniture", "before",
         "You will need a mower sooner than you expect — grass does not wait for you to unpack.", 1],
        ["Fences, gates and boundaries — which are yours?", "outside", "week1",
         "Your title plan shows the boundaries; the deeds may say who maintains which fence. Worth knowing before a neighbour asks.", 1],
        ["Gutters and downpipes — clear?", "outside", "month1",
         "Blocked gutters cause damp on inside walls. Clearing them is a half-day job or one cheap call-out.", 1],
        ["Drains and gullies — lift the cover and look", "check", "month1",
         "Slow-draining or smelly gullies are worth sorting early. Photograph the manhole positions.", 1],
        ["Roof and chimney — have a good look from the ground", "check", "before",
         "Use binoculars or a phone zoom: slipped tiles, cracked pointing, aerials hanging off.", 1],
        ["Shed, bin storage, and where the bins go out", "outside", "week1", "", 1],
        ["Outside tap and outside sockets", "plumbing", "later", "An outside tap is about £100–150 fitted and you will use it constantly.", 0],
        ["Patio, path or drive — jet wash or repair", "outside", "later", "", 0],
        ["Hedges, trees and anything overgrown", "outside", "month1",
         "Check for TPOs (tree preservation orders) before cutting anything big, and avoid hedge cutting in bird nesting season (Mar–Aug).", 1],
        ["Security lighting or a video doorbell", "safety", "month1", "", 0],
        ["Garden furniture", "furniture", "later", "", 0],
        ["External paint, render and window frames", "decorating", "later", "", 0]
      ]
    },
    other: {
      label: "Other room", icon: "📦",
      tasks: base()
    },

    /* --- the two special, non-room sections --- */
    wholehouse: {
      label: "Whole house — structure & systems", icon: "🏠", special: true,
      tasks: [
        ["Read the survey again and write down every recommendation", "check", "before",
         "Your survey is the single best to-do list you own. Ring the surveyor to explain anything vague — they will usually do it free.", 1],
        ["Boiler — age, service history, and book a service", "heating", "before",
         "Ask the seller for the last Gas Safe certificate. A service is £80–120 and tells you what you are dealing with.", 1],
        ["Run the heating before you move in — every radiator", "heating", "before",
         "Even in summer. Find the cold ones now, not in November.", 1],
        ["Smoke alarms on every floor + CO alarm near the boiler / fire", "safety", "before",
         "Legally required in rentals, plain common sense in your own house. Test them all on day one.", 1],
        ["Electrics — is there an EICR? Does the fuse box have RCDs?", "electrics", "month1",
         "An EICR (electrical condition report) is £150–250 for a 3-bed and tells you if anything is unsafe. Worth it if there is no recent paperwork.", 1],
        ["Water pressure, and any dripping taps or slow drains", "plumbing", "week1", "", 0],
        ["Damp patches, musty smells, flaking plaster", "check", "before",
         "Check behind furniture and in the corners of external walls, especially north-facing ones.", 1],
        ["Windows — any blown/misted double glazing? FENSA certificates?", "check", "month1",
         "Misted units can often be replaced without changing the whole window.", 0],
        ["Loft insulation and draught proofing", "check", "month1", "The cheapest way to cut your heating bill.", 0],
        ["Collect guarantees and certificates from the seller", "admin", "before",
         "Damp proofing, windows (FENSA), electrics, boiler, roof, cavity wall insulation, any building work. Many guarantees transfer to you.", 1],
        ["Appliance manuals, alarm codes and spare keys", "admin", "before",
         "Ask for these before completion — much harder to chase afterwards.", 1],
        ["Whole-house deep clean before the furniture goes in", "cleaning", "before",
         "About £150–250 for a 3-bed and completely worth it. Empty houses clean fast.", 1],
        ["Get 2–3 quotes for anything over a few hundred pounds", "admin", "before",
         "Check the trade registers (Gas Safe, NICEIC, TrustMark), ask for a written quote, and never pay the full amount up front.", 1],
        ["Decide the order: structural → plumbing/electrics → plaster → paint → floors → furniture", "admin", "before",
         "Doing it in this order means you never redo work. This tool's \"Ask Claude\" tab will turn your list into a proper plan.", 1],
        ["Set a budget and a \"not this year\" list", "admin", "before",
         "Write down what you are deliberately NOT doing yet. It is the quickest cure for feeling overwhelmed.", 1]
      ]
    },
    essentials: {
      label: "Moving in & admin", icon: "📋", special: true,
      tasks: [
        ["Buildings insurance in place from exchange", "admin", "before",
         "You are usually responsible for the building from exchange, not completion. Your lender will insist on it.", 1],
        ["Contents insurance from move day", "admin", "before", "Check whether your removals firm covers your things in transit.", 1],
        ["Book removals (or a van and some willing friends)", "admin", "before",
         "3–4 weeks ahead, and Fridays go first. Get 3 quotes.", 1],
        ["Book the broadband install — do this now", "admin", "before",
         "Engineer appointments are routinely 2+ weeks out. Book it the day you get a completion date, not the day you move.", 1],
        ["Change the locks and get spare keys cut", "safety", "before", "", 1],
        ["Meter readings and photos on day one — gas, electricity, water", "admin", "before",
         "Photograph every meter with the date. It settles any argument about the seller's final bill.", 1],
        ["Find the stopcock, fuse box, gas meter, water meter and thermostat", "check", "before",
         "Learn where the water shut-off is BEFORE you need it at 2am. Label it.", 1],
        ["Set up an account with the existing energy supplier", "admin", "before",
         "You inherit the seller's supplier and tariff. Set up the account first, then switch if you want to.", 1],
        ["Register with the water company", "admin", "before", "You cannot switch water supplier in the UK — you just register.", 1],
        ["Register for council tax and find the bin collection days", "admin", "before",
         "Your council website does both in about five minutes. Check the band while you are there.", 1],
        ["Royal Mail redirect", "admin", "before", "Set it up a week or two before you move; it costs around £40 for 3 months.", 1],
        ["Pack a first-night box", "admin", "before",
         "Kettle, mugs, tea, milk, loo roll, soap, towels, bedding, phone chargers, torch, screwdriver, scissors, paracetamol, snacks.", 1],
        ["Parking for the removal van — permit or cones needed?", "admin", "before",
         "Some councils require a permit or suspension. Ask the neighbours to leave space.", 0],
        ["Arrange the children and pets for move day", "admin", "before", "Genuinely the best money and favours you will spend.", 0],
        ["Measure big furniture against the doorways and the stairs", "check", "before",
         "Sofas, wardrobes, fridge-freezers. Measure the narrowest point, including the turn.", 1],
        ["Update your address everywhere", "admin", "week1",
         "Bank and cards, DVLA licence and V5C logbook, car insurance, GP, dentist, employer, HMRC, pension, ISA/investments, subscriptions, Amazon.", 1],
        ["TV licence", "admin", "week1", "", 0],
        ["Electoral roll", "admin", "week1", "Also helps your credit file, which matters if you are borrowing for work on the house.", 0],
        ["Order any extra or replacement bins; check the tip permit rules", "admin", "week1",
         "Some tips need proof of address or a van permit — check before you load the car with old carpet.", 0],
        ["Test every smoke and CO alarm, and change the batteries", "safety", "week1", "", 1],
        ["Say hello to the neighbours", "admin", "week1",
         "They know which plumber to call, which bin day is which, and where the leak was last time.", 1],
        ["Check the loft, garage and shed for anything left behind", "check", "week1", "", 0],
        ["Get quotes: carpets, decorating, and anything from the survey", "admin", "month1",
         "Quotes take time to arrive. Start early even if the work is months away.", 1],
        ["Book the boiler service (and a chimney sweep if you have a fire)", "heating", "month1", "", 1],
        ["Start a house folder: certificates, manuals, receipts, guarantees", "admin", "month1",
         "Paper or a folder in the cloud. You will want it when you come to sell.", 1],
        ["Check you are on a sensible energy tariff", "admin", "month1", "", 0],
        ["Consider a water meter if there are fewer people than bedrooms", "admin", "later",
         "Usually cheaper, and you can normally switch back within 2 years if it is not.", 0],
        ["Draught proofing and insulation before winter", "check", "later", "", 0],
        ["Look at the survey list again — what did you postpone?", "check", "later", "", 1]
      ]
    }
  };

  /* default 3-bedroom house */
  var DEFAULT_HOUSE = [
    { type: "essentials",  name: "Moving in & admin" },
    { type: "wholehouse",  name: "Whole house" },
    { type: "hall",        name: "Hallway" },
    { type: "living",      name: "Living room" },
    { type: "kitchen",     name: "Kitchen" },
    { type: "dining",      name: "Dining room" },
    { type: "stairs",      name: "Stairs & landing" },
    { type: "bedroom",     name: "Bedroom 1 (main)" },
    { type: "bedroom",     name: "Bedroom 2" },
    { type: "bedroom",     name: "Bedroom 3" },
    { type: "bathroom",    name: "Bathroom" },
    { type: "loft",        name: "Loft" },
    { type: "garden",      name: "Garden & outside" }
  ];

  /* rooms offered as quick-add buttons in Setup */
  var QUICK_ADD = [
    { type: "bedroom", name: "Bedroom" }, { type: "bathroom", name: "Bathroom" },
    { type: "ensuite", name: "En-suite" }, { type: "wc", name: "Downstairs WC" },
    { type: "utility", name: "Utility room" }, { type: "study", name: "Study / office" },
    { type: "dining", name: "Dining room" }, { type: "living", name: "Second reception" },
    { type: "conservatory", name: "Conservatory" }, { type: "garage", name: "Garage" },
    { type: "loft", name: "Loft" }, { type: "garden", name: "Garden & outside" },
    { type: "hall", name: "Porch / hallway" }, { type: "other", name: "Other room" }
  ];

  window.HOUSE_DATA = {
    CATEGORIES: CATEGORIES, WHEN: WHEN, STATUS: STATUS,
    ROOM_TYPES: ROOM_TYPES, DEFAULT_HOUSE: DEFAULT_HOUSE, QUICK_ADD: QUICK_ADD
  };
})();
