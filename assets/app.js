/* New House Plan — app logic. Vanilla JS, no dependencies, all data stays
   in this browser (localStorage) until the user exports a JSON file. */
(function () {
  "use strict";

  var D = window.HOUSE_DATA;
  var CATS = D.CATEGORIES, WHEN = D.WHEN, STATUS = D.STATUS, TYPES = D.ROOM_TYPES;
  var KEY = "newHousePlan.v1";
  var SCHEMA = 1;

  /* ============================= helpers ============================= */

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var app = null, toastEl = null, saveTimer = null;

  function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function fmtDateShort(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function money(n) {
    n = Number(n) || 0;
    return "£" + n.toLocaleString("en-GB", { maximumFractionDigits: 0 });
  }

  /* ============================== state ============================== */

  var state, ui = { view: "rooms", room: null, filter: "all", open: {} };

  function makeTask(t) {
    return {
      id: uid(), title: t[0], cat: t[1] || "check", when: t[2] || "later",
      hint: t[3] || "", core: !!t[4], status: "", notes: "", date: "", who: "", cost: ""
    };
  }

  function makeRoom(type, name) {
    var def = TYPES[type] || TYPES.other;
    return {
      id: uid(), type: type, name: name || def.label,
      tasks: (def.tasks || []).map(makeTask)
    };
  }

  function freshState() {
    return {
      schema: SCHEMA,
      savedAt: "",
      house: { nickname: "", address: "", beds: 3, completion: "", moveIn: "", budget: "", notes: "" },
      level: "core",
      rooms: D.DEFAULT_HOUSE.map(function (r) { return makeRoom(r.type, r.name); })
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return freshState();
      var s = JSON.parse(raw);
      return migrate(s);
    } catch (e) { return freshState(); }
  }

  function migrate(s) {
    if (!s || !s.rooms) return freshState();
    s.schema = SCHEMA;
    s.house = s.house || {};
    s.level = s.level || "core";
    s.rooms.forEach(function (r) {
      r.id = r.id || uid();
      r.tasks = (r.tasks || []).map(function (t) {
        t.id = t.id || uid();
        ["status", "notes", "date", "who", "cost", "hint"].forEach(function (k) { if (t[k] == null) t[k] = ""; });
        t.cat = t.cat || "check"; t.when = t.when || "later";
        return t;
      });
    });
    return s;
  }

  function save(quiet) {
    state.savedAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast("Could not save to this browser — use Save to file instead."); return; }
    var el = $("#savedNote");
    if (el) el.textContent = "Saved in this browser";
    if (!quiet) { /* nothing else */ }
  }

  function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { save(true); }, 400); }

  /* ============================ computation ========================== */

  function allTasks() {
    var out = [];
    state.rooms.forEach(function (r) {
      r.tasks.forEach(function (t) { out.push({ room: r, task: t }); });
    });
    return out;
  }

  function inPlan(t) { return t.status === "todo" || t.status === "booked" || t.status === "done"; }

  function visibleTasks(room) {
    return room.tasks.filter(function (t) {
      if (state.level === "core" && !t.core && !t.custom && t.status === "") return false;
      if (ui.filter === "review") return t.status === "";
      if (ui.filter === "plan") return t.status === "todo" || t.status === "booked";
      if (ui.filter === "done") return t.status === "done" || t.status === "skip";
      return true;
    });
  }

  function roomStats(r) {
    var s = { total: 0, review: 0, todo: 0, booked: 0, done: 0, skip: 0 };
    r.tasks.forEach(function (t) {
      if (state.level === "core" && !t.core && !t.custom && t.status === "") return;
      s.total++;
      if (t.status === "") s.review++;
      else if (t.status === "todo") s.todo++;
      else if (t.status === "booked") s.booked++;
      else if (t.status === "done") s.done++;
      else if (t.status === "skip") s.skip++;
    });
    s.reviewed = s.total - s.review;
    s.pct = s.total ? Math.round((s.reviewed / s.total) * 100) : 100;
    return s;
  }

  function totals() {
    var t = { total: 0, review: 0, todo: 0, booked: 0, done: 0, skip: 0, cost: 0, rooms: state.rooms.length };
    state.rooms.forEach(function (r) {
      var s = roomStats(r);
      t.total += s.total; t.review += s.review; t.todo += s.todo;
      t.booked += s.booked; t.done += s.done; t.skip += s.skip;
      r.tasks.forEach(function (k) { if (inPlan(k) && k.status !== "done") t.cost += Number(k.cost) || 0; });
    });
    t.pct = t.total ? Math.round(((t.total - t.review) / t.total) * 100) : 0;
    return t;
  }

  function groupByCat(statuses) {
    var map = {};
    allTasks().forEach(function (x) {
      if (statuses.indexOf(x.task.status) === -1) return;
      var c = x.task.cat;
      (map[c] = map[c] || []).push(x);
    });
    return Object.keys(map)
      .sort(function (a, b) { return map[b].length - map[a].length; })
      .map(function (c) { return { cat: c, items: map[c] }; });
  }

  /* ============================== render ============================= */

  var TABS = [
    ["rooms", "🏡 Room by room"],
    ["summary", "📊 The big picture"],
    ["dates", "📅 Dates & bookings"],
    ["claude", "✨ Ask Claude"],
    ["setup", "⚙️ Set up & save"]
  ];

  var lastKey = "";
  function render() {
    renderNav();
    var v = ui.view;
    if (v === "rooms") app.innerHTML = ui.room ? viewRoom() : viewRooms();
    else if (v === "summary") app.innerHTML = viewSummary();
    else if (v === "dates") app.innerHTML = viewDates();
    else if (v === "claude") app.innerHTML = viewClaude();
    else app.innerHTML = viewSetup();

    var key = v + ":" + (ui.room || "");
    if (key !== lastKey) { window.scrollTo(0, 0); lastKey = key; }

    if (ui.refocus) {
      var back = document.querySelector(ui.refocus);
      if (back) back.focus({ preventScroll: true });
      ui.refocus = null;
    }
  }

  function renderNav() {
    var nav = $("#tabs");
    nav.innerHTML = TABS.map(function (t) {
      return '<button data-tab="' + t[0] + '" aria-current="' + (ui.view === t[0]) + '">' + t[1] + "</button>";
    }).join("");
    var h = state.house.nickname || state.house.address || "Your new house";
    $("#houseName").textContent = h;
    var tt = totals();
    $("#headSub").textContent = (tt.todo + tt.booked + tt.done) === 0
      ? state.rooms.length + " areas to walk through"
      : tt.todo + " to do · " + tt.booked + " booked" + (tt.done ? " · " + tt.done + " done" : "");
  }

  /* ---- rooms grid ---- */

  function viewRooms() {
    var t = totals();
    var specials = state.rooms.filter(function (r) { return TYPES[r.type] && TYPES[r.type].special; });
    var normal = state.rooms.filter(function (r) { return !(TYPES[r.type] && TYPES[r.type].special); });

    if (!state.rooms.length) {
      return '<div class="view"><div class="card"><h2>No rooms yet</h2>' +
        '<p class="lead">Add the rooms in your house and the suggestions come with them.</p>' +
        '<button class="btn primary" data-tab="setup">Add some rooms \u2192</button></div></div>';
    }

    var intro = "";
    if (t.review === t.total) {
      intro = '<div class="card"><h2>Start here</h2>' +
        '<p class="lead">Take your phone round the house one room at a time. For each suggestion, tap ' +
        '<b>Needs doing</b>, <b>Booked</b>, <b>Done</b> or <b>Not needed</b> — that is all there is to it. ' +
        'Add anything you spot that is not on the list.</p>' +
        '<p class="lead">Nothing has to happen today. When you have been round, ' +
        '<b>The big picture</b> adds it all up, and <b>Ask Claude</b> turns it into an order of work.</p>' +
        '<div class="row"><button class="btn primary" data-openroom="' + esc(specials.length ? specials[0].id : normal[0].id) +
        '">Start with moving-in essentials →</button></div></div>';
    }

    function cardFor(r) {
      var def = TYPES[r.type] || TYPES.other, s = roomStats(r);
      var pills = [];
      if (s.todo) pills.push('<span class="pill todo">' + s.todo + " to do</span>");
      if (s.booked) pills.push('<span class="pill booked">' + s.booked + " booked</span>");
      if (s.done) pills.push('<span class="pill done">' + s.done + " done</span>");
      if (s.review) pills.push('<span class="pill new">' + s.review + " to review</span>");
      if (!pills.length) pills.push('<span class="pill skip">all clear</span>');
      return '<button class="room-card" data-openroom="' + r.id + '">' +
        '<span class="rc-top"><span class="ico">' + def.icon + '</span><span class="nm">' + esc(r.name) + "</span></span>" +
        '<span class="bar"><span style="width:' + s.pct + '%"></span></span>' +
        '<span class="rc-meta">' + pills.join("") + "</span></button>";
    }

    return '<div class="view">' + intro +
      '<div class="card"><div class="spread"><h2>Progress</h2>' +
        '<span class="small muted">' + (t.total - t.review) + " of " + t.total + " suggestions reviewed</span></div>" +
        '<div class="bar" style="margin:10px 0 14px"><span style="width:' + t.pct + '%"></span></div>' +
        '<div class="stats">' +
          stat(t.todo, "Needs doing", "todo") + stat(t.booked, "Booked in", "booked") +
          stat(t.done, "Done", "done") + stat(t.review, "To review", "") +
          stat(money(t.cost), "Estimated cost", "") +
        "</div>" +
        '<p class="small muted" style="margin-top:12px">Plenty of these will turn out to be <b>not needed</b> — ' +
        "that is the point of going round. One tap each and the list shrinks fast.</p>" +
        '<div class="row" style="margin-top:10px">' + levelToggle() + "</div>" +
      "</div>" +
      (specials.length ? '<h2 style="margin:18px 0 10px">Not a room, but do these</h2><div class="rooms">' +
        specials.map(cardFor).join("") + "</div>" : "") +
      '<h2 style="margin:22px 0 10px">Room by room</h2><div class="rooms">' + normal.map(cardFor).join("") + "</div>" +
      '<div class="row" style="margin-top:14px"><button class="btn ghost" data-tab="setup">➕ Add or rename rooms</button></div>' +
      "</div>";
  }

  function stat(val, label, cls) {
    return '<div class="stat ' + (cls || "") + '"><b>' + val + "</b><span>" + label + "</span></div>";
  }

  function levelToggle() {
    return '<div class="filters" role="group" aria-label="How much detail to show">' +
      '<button data-level="core" aria-pressed="' + (state.level === "core") + '">Just the essentials</button>' +
      '<button data-level="full" aria-pressed="' + (state.level === "full") + '">Show everything</button>' +
      "</div>";
  }

  /* ---- single room ---- */

  function viewRoom() {
    var r = state.rooms.filter(function (x) { return x.id === ui.room; })[0];
    if (!r) { ui.room = null; return viewRooms(); }
    var def = TYPES[r.type] || TYPES.other, s = roomStats(r);
    var list = visibleTasks(r);
    var idx = state.rooms.indexOf(r);
    var next = state.rooms[idx + 1];

    return '<div class="view">' +
      '<div class="row" style="margin-bottom:12px"><button class="btn ghost small" data-back="1">← All rooms</button>' +
        (next ? '<button class="btn ghost small" data-openroom="' + next.id + '">Next: ' + esc(next.name) + " →</button>" : "") +
      "</div>" +
      '<div class="card">' +
        '<div class="spread"><h2>' + def.icon + " " + esc(r.name) + "</h2>" +
          '<span class="small muted">' + s.reviewed + " of " + s.total + " reviewed</span></div>" +
        '<div class="bar" style="margin:10px 0 12px"><span style="width:' + s.pct + '%"></span></div>' +
        '<div class="filters" role="group" aria-label="Filter">' +
          fbtn("all", "All (" + s.total + ")") + fbtn("review", "To review (" + s.review + ")") +
          fbtn("plan", "In my plan (" + (s.todo + s.booked) + ")") + fbtn("done", "Done / skipped (" + (s.done + s.skip) + ")") +
        "</div>" +
        '<div class="row" style="margin:8px 0 2px">' + levelToggle() + "</div>" +
        '<div class="tasks">' + (list.length ? list.map(function (t) { return taskHTML(t, r); }).join("") :
          '<div class="empty">Nothing to show with this filter.</div>') + "</div>" +
        '<div class="addbox"><input type="text" id="addTask" placeholder="Add something you have spotted…" ' +
          'data-room="' + r.id + '" autocomplete="off"><button class="btn primary" data-add="' + r.id + '">Add</button></div>' +
        '<p class="tiny muted" style="margin-top:8px">Tip: add the small things too — "hooks in the porch", "curtain pole wobbly". ' +
        "They are the ones you forget.</p>" +
      "</div>" +
      (next ? '<div class="row" style="justify-content:center;margin-top:6px">' +
        '<button class="btn" data-openroom="' + next.id + '">Done in here — on to ' + esc(next.name) + " →</button></div>" : "") +
      "</div>";
  }

  function fbtn(key, label) {
    return '<button data-filter="' + key + '" aria-pressed="' + (ui.filter === key) + '">' + label + "</button>";
  }

  function taskHTML(t, r) {
    var c = CATS[t.cat] || CATS.check;
    var open = !!ui.open[t.id];
    var cls = "task" + (t.status ? " is-" + t.status : "");
    var meta = ['<span class="pill cat">' + c.icon + " " + esc(c.label) + "</span>",
                '<span class="pill when">' + esc(WHEN[t.when].short) + "</span>"];
    if (t.date) meta.push('<span class="pill booked">📅 ' + fmtDateShort(t.date) + "</span>");
    if (t.who) meta.push('<span class="pill skip">' + esc(t.who) + "</span>");
    if (t.cost) meta.push('<span class="pill skip">' + money(t.cost) + "</span>");
    if (t.notes) meta.push('<span class="pill skip">📝 note</span>');

    return '<div class="' + cls + '" data-task="' + t.id + '" data-room="' + r.id + '">' +
      '<div class="task-head"><div class="task-title"><div class="t">' + esc(t.title) + "</div>" +
        (t.hint ? '<div class="hint">' + esc(t.hint) + "</div>" : "") +
        '<div class="task-meta">' + meta.join("") + "</div></div>" +
        '<div class="task-actions">' +
          '<button class="iconbtn" data-toggle="' + t.id + '" title="Notes, date, cost" aria-expanded="' + open + '">' +
            (open ? "✕" : "✎") + "</button>" +
          (t.custom ? '<button class="iconbtn" data-del="' + t.id + '" title="Delete">🗑</button>' : "") +
        "</div></div>" +
      '<div class="seg" role="group" aria-label="Status">' +
        sbtn(t, "todo", "Needs doing") + sbtn(t, "booked", "Booked") +
        sbtn(t, "done", "Done") + sbtn(t, "skip", "Not needed") +
      "</div>" +
      (open ? detailsHTML(t) : "") +
      "</div>";
  }

  function sbtn(t, key, label) {
    return '<button class="s-' + key + '" data-status="' + key + '" data-for="' + t.id +
      '" aria-pressed="' + (t.status === key) + '">' + label + "</button>";
  }

  function detailsHTML(t) {
    var catOpts = Object.keys(CATS).map(function (k) {
      return '<option value="' + k + '"' + (t.cat === k ? " selected" : "") + ">" + esc(CATS[k].icon + " " + CATS[k].label) + "</option>";
    }).join("");
    var whenOpts = Object.keys(WHEN).map(function (k) {
      return '<option value="' + k + '"' + (t.when === k ? " selected" : "") + ">" + esc(WHEN[k].label) + "</option>";
    }).join("");
    return '<div class="details">' +
      '<div class="grid3">' +
        '<div><label class="field" for="d-date-' + t.id + '">Date booked / planned</label>' +
          '<input id="d-date-' + t.id + '" type="date" data-f="date" data-for="' + t.id + '" value="' + esc(t.date) + '"></div>' +
        '<div><label class="field" for="d-who-' + t.id + '">Who is doing it</label>' +
          '<input id="d-who-' + t.id + '" type="text" data-f="who" data-for="' + t.id + '" value="' + esc(t.who) +
          '" placeholder="e.g. Dave the plumber / us"></div>' +
        '<div><label class="field" for="d-cost-' + t.id + '">Cost or estimate (£)</label>' +
          '<input id="d-cost-' + t.id + '" type="number" min="0" step="10" data-f="cost" data-for="' + t.id + '" value="' + esc(t.cost) + '"></div>' +
      "</div>" +
      '<div class="grid2" style="margin-top:10px">' +
        '<div><label class="field" for="d-cat-' + t.id + '">Type of work</label>' +
          '<select id="d-cat-' + t.id + '" data-f="cat" data-for="' + t.id + '">' + catOpts + "</select></div>" +
        '<div><label class="field" for="d-when-' + t.id + '">When</label>' +
          '<select id="d-when-' + t.id + '" data-f="when" data-for="' + t.id + '">' + whenOpts + "</select></div>" +
      "</div>" +
      '<div style="margin-top:10px"><label class="field" for="d-notes-' + t.id + '">Notes</label>' +
        '<textarea id="d-notes-' + t.id + '" data-f="notes" data-for="' + t.id +
        '" placeholder="Quotes, measurements, what the tradesperson said…">' + esc(t.notes) + "</textarea></div>" +
      "</div>";
  }

  /* ---- summary ---- */

  function viewSummary() {
    var t = totals();
    if (t.todo + t.booked + t.done === 0) {
      return '<div class="view"><div class="card"><h2>Nothing in the plan yet</h2>' +
        '<p class="lead">Go round the house in <b>Room by room</b> and mark a few things. This page then adds ' +
        "everything up for you — how many rooms need carpet, who you need to ring, what it might cost.</p>" +
        '<button class="btn primary" data-tab="rooms">Go to the rooms →</button></div></div>';
    }

    var groups = groupByCat(["todo", "booked", "done"]);
    var body = groups.map(function (g) {
      var c = CATS[g.cat] || CATS.check;
      var outstanding = g.items.filter(function (x) { return x.task.status !== "done"; });
      var rooms = [];
      outstanding.forEach(function (x) { if (rooms.indexOf(x.room.name) === -1) rooms.push(x.room.name); });
      var cost = g.items.reduce(function (a, x) { return a + (x.task.status !== "done" ? (Number(x.task.cost) || 0) : 0); }, 0);

      var headline = outstanding.length
        ? outstanding.length + (outstanding.length === 1 ? " job" : " jobs") +
          (rooms.length > 1 ? " across " + rooms.length + " rooms" : rooms.length === 1 ? " in " + rooms[0] : "")
        : "all done";

      return '<div class="sum-group">' +
        '<div class="sum-head"><span class="ico">' + c.icon + '</span><span class="nm">' + esc(c.label) + "</span>" +
          '<span class="pill ' + (outstanding.length ? "todo" : "done") + '">' + headline + "</span>" +
          (cost ? '<span class="pill skip">' + money(cost) + "</span>" : "") + "</div>" +
        '<div class="sum-body">' +
          (rooms.length > 1 ? '<p class="small muted" style="margin-bottom:8px"><b>Rooms:</b> ' + esc(rooms.join(", ")) + "</p>" : "") +
          "<ul>" + g.items.sort(function (a, b) {
            return (a.task.status === "done" ? 1 : 0) - (b.task.status === "done" ? 1 : 0);
          }).map(function (x) {
            var k = x.task;
            return "<li>" + (k.status === "done" ? "<s>" : "") + esc(k.title) + (k.status === "done" ? "</s>" : "") +
              ' <span class="where">— ' + esc(x.room.name) +
              (k.date ? " · " + fmtDate(k.date) : "") +
              (k.who ? " · " + esc(k.who) : "") +
              (k.cost ? " · " + money(k.cost) : "") +
              " · " + esc(STATUS[k.status].short) + "</span>" +
              (k.notes ? '<br><span class="where">' + esc(k.notes) + "</span>" : "") + "</li>";
          }).join("") + "</ul>" +
          '<div class="tipline"><b>Who to call:</b> ' + esc(c.trade) + (c.tip ? " — " + esc(c.tip) : "") + "</div>" +
        "</div></div>";
    }).join("");

    /* by timing */
    var byWhen = Object.keys(WHEN).map(function (w) {
      var items = allTasks().filter(function (x) {
        return x.task.when === w && (x.task.status === "todo" || x.task.status === "booked");
      });
      if (!items.length) return "";
      return '<div class="sum-group"><div class="sum-head"><span class="nm">' + esc(WHEN[w].label) + "</span>" +
        '<span class="pill todo">' + items.length + "</span></div><div class=\"sum-body\"><ul>" +
        items.map(function (x) {
          return "<li>" + esc(x.task.title) + ' <span class="where">— ' + esc(x.room.name) +
            (x.task.date ? " · " + fmtDate(x.task.date) : "") + "</span></li>";
        }).join("") + "</ul></div></div>";
    }).join("");

    /* shopping list */
    var shop = allTasks().filter(function (x) {
      return ["furniture", "appliances", "soft"].indexOf(x.task.cat) > -1 &&
        (x.task.status === "todo" || x.task.status === "booked");
    });

    return '<div class="view">' +
      '<div class="card"><div class="spread"><h2>The big picture</h2>' +
        '<button class="btn small ghost" data-print="1">🖨 Print / save as PDF</button></div>' +
        '<div class="stats" style="margin-top:10px">' +
          stat(t.todo, "Needs doing", "todo") + stat(t.booked, "Booked in", "booked") +
          stat(t.done, "Done", "done") + stat(t.review, "Still to review", "") +
          stat(money(t.cost), "Est. outstanding", "") +
        "</div>" +
        (t.review ? '<p class="small muted" style="margin-top:12px">There are still ' + t.review +
          " suggestion" + (t.review === 1 ? "" : "s") + " you have not looked at, so these numbers will move. " +
          "No need to do it all in one go.</p>" : "") +
      "</div>" +
      '<h2 style="margin:18px 0 10px">Grouped by type of work</h2>' +
      '<p class="lead">This is the view that makes quotes easy: one measure-up, one quote, one visit per group.</p>' +
      body +
      (shop.length ? '<h2 style="margin:22px 0 10px">Things to buy or order</h2>' +
        '<div class="sum-group"><div class="sum-body"><ul>' + shop.map(function (x) {
          return "<li>" + esc(x.task.title) + ' <span class="where">— ' + esc(x.room.name) + "</span></li>";
        }).join("") + '</ul><div class="tipline">Check lead times now. Sofas and beds are often 6–12 weeks, ' +
        "made-to-measure blinds 2–3 weeks, carpets 2–3 weeks from measuring.</div></div></div>" : "") +
      '<h2 style="margin:22px 0 10px">When you are doing it</h2>' + byWhen +
      '<div class="card" style="margin-top:18px"><h3>Next step</h3>' +
        '<p class="lead">Let Claude turn this into a proper order of work — what has to happen before what, ' +
        "and what can wait until next year.</p>" +
        '<button class="btn primary" data-tab="claude">✨ Build my Claude prompt →</button></div>' +
      "</div>";
  }

  /* ---- dates ---- */

  function viewDates() {
    var h = state.house;
    var items = allTasks().filter(function (x) { return x.task.date && x.task.status !== "skip"; })
      .sort(function (a, b) { return a.task.date < b.task.date ? -1 : 1; });

    var key = [];
    if (h.completion) key.push({ date: h.completion, what: "<b>Completion day</b> — keys, meter readings, photos, change the locks" });
    if (h.moveIn) key.push({ date: h.moveIn, what: "<b>Moving in</b> — removals, first-night box, build the beds" });

    var merged = key.map(function (k) { return { date: k.date, html: k.what, key: true }; })
      .concat(items.map(function (x) {
        return {
          date: x.task.date,
          html: "<b>" + esc(x.task.title) + "</b> — " + esc(x.room.name) +
            (x.task.who ? " · " + esc(x.task.who) : "") +
            (x.task.cost ? " · " + money(x.task.cost) : "") +
            ' <span class="pill ' + STATUS[x.task.status].cls + '">' + esc(STATUS[x.task.status].short) + "</span>" +
            (x.task.notes ? '<br><span class="small muted">' + esc(x.task.notes) + "</span>" : "")
        };
      }))
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });

    var now = today();
    var upcoming = merged.filter(function (m) { return m.date >= now; });
    var past = merged.filter(function (m) { return m.date < now; });

    function lines(arr) {
      return '<ul class="timeline">' + arr.map(function (m) {
        return "<li><span class=\"date\">" + fmtDateShort(m.date) + "<small>" + m.date.slice(0, 4) + "</small></span>" +
          '<span class="what">' + m.html + "</span></li>";
      }).join("") + "</ul>";
    }

    return '<div class="view">' +
      '<div class="card"><h2>Key dates</h2>' +
        '<div class="grid2" style="margin-top:6px">' +
          '<div><label class="field" for="hCompletion">Completion day (you get the keys)</label>' +
            '<input id="hCompletion" type="date" data-house="completion" value="' + esc(h.completion) + '"></div>' +
          '<div><label class="field" for="hMoveIn">Moving-in day</label>' +
            '<input id="hMoveIn" type="date" data-house="moveIn" value="' + esc(h.moveIn) + '"></div>' +
        "</div>" +
        '<p class="tiny muted" style="margin-top:10px">Add a date to any job (the ✎ button next to it) and it shows up here.</p>' +
      "</div>" +
      '<div class="card"><div class="spread"><h2>Coming up</h2>' +
        '<button class="btn small ghost" data-print="1">🖨 Print</button></div>' +
        (upcoming.length ? lines(upcoming) :
          '<div class="empty">Nothing booked yet. When you book a cleaner, a carpet fitter or the boiler service, ' +
          "put the date on the job and it will appear here.</div>") + "</div>" +
      (past.length ? '<div class="card"><h2>Already happened</h2>' + lines(past) + "</div>" : "") +
      "</div>";
  }

  /* ---- claude prompt ---- */

  var FOCUS = {
    plan: "a sensible order of work and a timeline",
    budget: "how to spend the money wisely",
    move: "what has to happen before I move in",
    quotes: "how to get and judge quotes from tradespeople"
  };

  function buildPrompt(focus) {
    var h = state.house, L = [];
    var t = totals();

    L.push("I have just bought a house in the UK and I am moving in. I have never done this before and I would like practical, straightforward advice — please assume I know very little.");
    L.push("");
    L.push("## The house");
    if (h.address) L.push("- Location / address: " + h.address);
    L.push("- Size: " + (h.beds || 3) + " bedrooms");
    L.push("- Rooms I am tracking: " + state.rooms.map(function (r) { return r.name; }).join(", "));
    L.push("- Condition: generally OK. Nothing known to be structurally wrong — mostly cosmetic work, replacements and jobs I have noted below.");
    if (h.completion) L.push("- Completion (keys) date: " + fmtDate(h.completion));
    if (h.moveIn) L.push("- Moving-in date: " + fmtDate(h.moveIn));
    if (h.budget) L.push("- Rough budget for the first phase of work: £" + h.budget);
    if (t.cost) L.push("- My own rough estimates for outstanding jobs add up to about " + money(t.cost) + " (probably wrong — please sanity-check).");
    if (h.notes) L.push("- Other context: " + h.notes);
    L.push("");

    L.push("## What I found, room by room");
    L.push("(Status is my own: NEEDS DOING / BOOKED / DONE.)");
    state.rooms.forEach(function (r) {
      var items = r.tasks.filter(function (k) { return inPlan(k); });
      if (!items.length) return;
      L.push("");
      L.push("### " + r.name);
      items.forEach(function (k) {
        var bits = [];
        bits.push("[" + STATUS[k.status].short.toUpperCase() + "]");
        bits.push(k.title);
        var extra = [];
        extra.push((CATS[k.cat] || CATS.check).label);
        extra.push("when: " + WHEN[k.when].short);
        if (k.date) extra.push("date: " + fmtDate(k.date));
        if (k.who) extra.push("who: " + k.who);
        if (k.cost) extra.push("est. " + money(k.cost));
        if (k.notes) extra.push("note: " + k.notes);
        L.push("- " + bits.join(" ") + " (" + extra.join("; ") + ")");
      });
    });

    var groups = groupByCat(["todo", "booked"]);
    if (groups.length) {
      L.push("");
      L.push("## The same list, grouped by type of work");
      groups.forEach(function (g) {
        var rooms = [];
        g.items.forEach(function (x) { if (rooms.indexOf(x.room.name) === -1) rooms.push(x.room.name); });
        L.push("- **" + (CATS[g.cat] || CATS.check).label + "**: " + g.items.length +
          " job(s) across " + rooms.length + " space(s) — " + rooms.join(", "));
      });
    }

    var booked = allTasks().filter(function (x) { return x.task.status === "booked" && x.task.date; })
      .sort(function (a, b) { return a.task.date < b.task.date ? -1 : 1; });
    if (booked.length) {
      L.push("");
      L.push("## Already booked in");
      booked.forEach(function (x) {
        L.push("- " + fmtDate(x.task.date) + ": " + x.task.title + " (" + x.room.name + ")" +
          (x.task.who ? " — " + x.task.who : ""));
      });
    }

    var skipped = allTasks().filter(function (x) { return x.task.status === "skip"; });
    if (skipped.length) {
      L.push("");
      L.push("## Deliberately not doing (for now)");
      L.push(skipped.slice(0, 25).map(function (x) { return x.task.title + " (" + x.room.name + ")"; }).join("; "));
    }

    L.push("");
    L.push("## What I would like from you");
    if (focus === "budget") {
      L.push("1. Rough UK price ranges for each job above, so I can tell a fair quote from a bad one.");
      L.push("2. Where to spend and where to save — what is worth paying a professional for, and what I could realistically do myself as a beginner.");
      L.push("3. What I should do now versus what genuinely can wait a year or two without costing me more later.");
      L.push("4. Any jobs that are cheap now but expensive if left (the false economies).");
      L.push("5. A suggested split of my budget across the jobs, with a contingency.");
    } else if (focus === "move") {
      L.push("1. Everything from my list that really needs doing BEFORE the furniture goes in, and why.");
      L.push("2. A day-by-day plan for the fortnight around completion and moving day.");
      L.push("3. Anything with a lead time I should be booking or ordering right now.");
      L.push("4. The UK admin I must not forget (utilities, council tax, insurance, post, broadband) and the sensible order to do it in.");
      L.push("5. Anything important that is missing from my list for a house of this type.");
    } else if (focus === "quotes") {
      L.push("1. For each type of work above: what trade I need, what qualifications or registrations to insist on in the UK, and how many quotes to get.");
      L.push("2. The questions I should ask each tradesperson, and the answers that should worry me.");
      L.push("3. What a written quote should include, and what deposit/payment terms are normal.");
      L.push("4. Which of these jobs should be bundled together into one quote to save money.");
      L.push("5. Rough UK price ranges so I can spot an outlier.");
    } else {
      L.push("1. A sensible ORDER of work, and please explain what must come before what (for example: anything structural or damp-related first, then plumbing and electrics, then plastering, then painting, then flooring, then furniture).");
      L.push("2. A phased plan using my dates: before I move in, first week, first month, first six months, and next year.");
      L.push("3. Which jobs to bundle into a single visit or quote, and which to do myself versus hire a professional (I am a beginner but willing).");
      L.push("4. Rough UK cost ranges for each job so I can sanity-check quotes, and where it is worth spending more.");
      L.push("5. Anything with a long lead time that I should order or book immediately.");
      L.push("6. Anything important I have missed for a UK house of this type, including safety and paperwork.");
    }
    L.push("");
    L.push("Please lay it out as a clear checklist I can follow, phase by phase, with a one-line reason for each bit of sequencing. If something in my list does not make sense or you need more information, ask me rather than guessing.");

    return L.join("\n");
  }

  function viewClaude() {
    var t = totals();
    var focus = ui.focus || "plan";
    var txt = buildPrompt(focus);
    return '<div class="view">' +
      '<div class="card"><h2>✨ Ask Claude what to do first</h2>' +
        '<p class="lead">This builds a single, well-organised message describing everything you have noted. ' +
        "Copy it, paste it into Claude, and you will get a proper order of work instead of a pile of jobs.</p>" +
        (t.todo + t.booked === 0 ? '<p class="small" style="color:var(--todo)"><b>Note:</b> you have not marked anything as needing doing yet, ' +
          "so the message will be fairly empty. Go round the rooms first.</p>" : "") +
        '<label class="field" for="focusSel" style="margin-top:6px">What do you want help with?</label>' +
        '<select id="focusSel" style="max-width:420px">' +
          Object.keys(FOCUS).map(function (k) {
            return '<option value="' + k + '"' + (focus === k ? " selected" : "") + ">" +
              esc({ plan: "The best order to do everything in (recommended)",
                    move: "What to do before I move in",
                    budget: "Budget — costs, and where to save",
                    quotes: "Getting quotes and choosing tradespeople" }[k]) + "</option>";
          }).join("") + "</select>" +
        '<div class="row" style="margin-top:14px">' +
          '<button class="btn primary" data-copy="1">📋 Copy the message</button>' +
          '<a class="btn" href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude ↗</a>' +
          '<button class="btn ghost" data-download="prompt">⬇ Save as a text file</button>' +
        "</div>" +
        '<p class="tiny muted" style="margin-top:10px">Copy first, then open Claude and paste. ' +
        "Claude cannot see this page — the message is the whole story.</p>" +
      "</div>" +
      '<div class="card"><h3>The message</h3>' +
        '<textarea id="promptText" spellcheck="false" readonly>' + esc(txt) + "</textarea></div>" +
      "</div>";
  }

  /* ---- setup ---- */

  function viewSetup() {
    var h = state.house;
    var typeOpts = function (sel) {
      return Object.keys(TYPES).map(function (k) {
        return '<option value="' + k + '"' + (sel === k ? " selected" : "") + ">" + esc(TYPES[k].label) + "</option>";
      }).join("");
    };
    var saved = state.savedAt ? "Last saved " + new Date(state.savedAt).toLocaleString("en-GB") : "Not saved yet";

    return '<div class="view">' +
      '<div class="card"><h2>Your house</h2>' +
        '<div class="grid2">' +
          '<div><label class="field" for="hNick">What shall we call it?</label>' +
            '<input id="hNick" type="text" data-house="nickname" value="' + esc(h.nickname) + '" placeholder="e.g. The new house"></div>' +
          '<div><label class="field" for="hAddr">Address or area</label>' +
            '<input id="hAddr" type="text" data-house="address" value="' + esc(h.address) + '" placeholder="e.g. 12 Elm Road, Leeds"></div>' +
          '<div><label class="field" for="hBeds">Bedrooms</label>' +
            '<input id="hBeds" type="number" min="1" max="12" data-house="beds" value="' + esc(h.beds || 3) + '"></div>' +
          '<div><label class="field" for="hBudget">Rough budget for the first phase (£)</label>' +
            '<input id="hBudget" type="number" min="0" step="100" data-house="budget" value="' + esc(h.budget) + '"></div>' +
          '<div><label class="field" for="hComp2">Completion day</label>' +
            '<input id="hComp2" type="date" data-house="completion" value="' + esc(h.completion) + '"></div>' +
          '<div><label class="field" for="hMove2">Moving-in day</label>' +
            '<input id="hMove2" type="date" data-house="moveIn" value="' + esc(h.moveIn) + '"></div>' +
        "</div>" +
        '<div style="margin-top:12px"><label class="field" for="hNotes">Anything else worth knowing</label>' +
          '<textarea id="hNotes" data-house="notes" placeholder="e.g. 1930s semi, gas central heating, we have a dog, survey mentioned the gutters">' +
          esc(h.notes) + "</textarea></div>" +
      "</div>" +

      '<div class="card"><h2>Rooms</h2>' +
        '<p class="lead">Rename anything, delete what you do not have, add what you do. ' +
        "Changing a room's type swaps in a different set of suggestions for the things you have not reviewed yet.</p>" +
        state.rooms.map(function (r) {
          return '<div class="roomrow">' +
            '<input type="text" data-rname="' + r.id + '" value="' + esc(r.name) + '" aria-label="Room name">' +
            '<select data-rtype="' + r.id + '" aria-label="Room type">' + typeOpts(r.type) + "</select>" +
            '<button class="iconbtn" data-rup="' + r.id + '" title="Move up">↑</button>' +
            '<button class="iconbtn" data-rdown="' + r.id + '" title="Move down">↓</button>' +
            '<button class="iconbtn" data-rdel="' + r.id + '" title="Delete room">🗑</button>' +
          "</div>";
        }).join("") +
        '<hr class="sep"><h3>Add a room</h3><div class="quickadd">' +
          D.QUICK_ADD.map(function (q) {
            return '<button class="btn small" data-addroom="' + q.type + '" data-name="' + esc(q.name) + '">➕ ' + esc(q.name) + "</button>";
          }).join("") +
        "</div></div>" +

      '<div class="card"><h2>Save your plan</h2>' +
        '<p class="lead">Everything is kept in this browser automatically (' + esc(saved) + '). ' +
        "Save a file as well if you want a backup, or to carry it to another device or share it with someone.</p>" +
        '<div class="row">' +
          '<button class="btn primary" data-download="json">⬇ Save to a file</button>' +
          '<label class="btn" style="cursor:pointer">⬆ Open a saved file<input type="file" id="importFile" accept=".json,application/json" hidden></label>' +
          '<button class="btn ghost" data-print="1">🖨 Print</button>' +
        "</div>" +
        '<hr class="sep">' +
        '<div class="row"><button class="btn danger small" data-reset="1">Start again from scratch</button>' +
          '<span class="tiny muted">Clears everything in this browser. Save a file first if you might want it.</span></div>' +
      "</div>" +

      '<div class="card"><h3>How much detail?</h3>' +
        '<p class="lead">"Just the essentials" hides the more specialist suggestions so each room is a shorter list. ' +
        "Anything you have already reviewed always stays visible.</p>" + levelToggle() + "</div>" +
      "</div>";
  }

  /* ============================== actions ============================ */

  function findTask(id) {
    for (var i = 0; i < state.rooms.length; i++) {
      var ts = state.rooms[i].tasks;
      for (var j = 0; j < ts.length; j++) if (ts[j].id === id) return { room: state.rooms[i], task: ts[j] };
    }
    return null;
  }
  function findRoom(id) { return state.rooms.filter(function (r) { return r.id === id; })[0]; }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function exportName(ext) {
    var n = (state.house.nickname || "new-house").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return (n || "new-house") + "-plan-" + today() + "." + ext;
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("button, a, [data-openroom]");
    if (!el) return;
    var d = el.dataset || {};

    if (d.tab) { ui.view = d.tab; ui.room = null; render(); return; }
    if (d.openroom) { ui.view = "rooms"; ui.room = d.openroom; ui.filter = "all"; render(); return; }
    if (d.back) { ui.room = null; render(); return; }
    if (d.filter) { ui.filter = d.filter; render(); return; }
    if (d.level) { state.level = d.level; save(true); render(); return; }
    if (d.print) { window.print(); return; }

    if (d.status) {
      var f = findTask(d.for);
      if (!f) return;
      f.task.status = (f.task.status === d.status) ? "" : d.status;
      if (f.task.status === "booked" && !f.task.date) ui.open[f.task.id] = true;
      ui.refocus = '[data-status="' + d.status + '"][data-for="' + d.for + '"]';
      save(true);
      render();
      return;
    }

    if (d.toggle) { ui.open[d.toggle] = !ui.open[d.toggle]; render(); return; }

    if (d.del) {
      var g = findTask(d.del);
      if (g && confirm("Delete “" + g.task.title + "”?")) {
        g.room.tasks = g.room.tasks.filter(function (t) { return t.id !== d.del; });
        save(true); render();
      }
      return;
    }

    if (d.add) {
      var input = $("#addTask");
      var title = (input && input.value || "").trim();
      if (!title) { if (input) input.focus(); return; }
      var room = findRoom(d.add);
      var task = makeTask([title, "check", "week1", "", 1]);
      task.custom = true; task.status = "todo";
      room.tasks.push(task);
      ui.open[task.id] = true;
      save(true); render();
      var again = $("#addTask"); if (again) again.focus();
      toast("Added — set the type and a date if you know it");
      return;
    }

    if (d.addroom) {
      var name = d.name;
      var same = state.rooms.filter(function (r) { return r.type === d.addroom; }).length;
      if (same && (d.addroom === "bedroom" || d.addroom === "bathroom" || d.addroom === "ensuite")) name = name + " " + (same + 1);
      state.rooms.push(makeRoom(d.addroom, name));
      save(true); render();
      toast(name + " added");
      return;
    }

    if (d.rdel) {
      var r2 = findRoom(d.rdel);
      if (r2 && confirm("Delete " + r2.name + " and everything noted in it?")) {
        state.rooms = state.rooms.filter(function (r) { return r.id !== d.rdel; });
        save(true); render();
      }
      return;
    }
    if (d.rup || d.rdown) {
      var id = d.rup || d.rdown, i = state.rooms.findIndex(function (r) { return r.id === id; });
      var j = d.rup ? i - 1 : i + 1;
      if (i > -1 && j > -1 && j < state.rooms.length) {
        var tmp = state.rooms[i]; state.rooms[i] = state.rooms[j]; state.rooms[j] = tmp;
        save(true); render();
      }
      return;
    }

    if (d.copy) {
      var ta = $("#promptText");
      if (!ta) return;
      var ok = function () { toast("Copied — now paste it into Claude"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(ok, function () { legacyCopy(ta); });
      } else legacyCopy(ta);
      return;
    }

    if (d.download === "json") { download(exportName("json"), JSON.stringify(state, null, 2)); toast("Saved to your downloads"); return; }
    if (d.download === "prompt") {
      download(exportName("txt").replace("-plan-", "-claude-prompt-"), buildPrompt(ui.focus || "plan"), "text/plain");
      toast("Saved to your downloads"); return;
    }

    if (d.reset) {
      if (confirm("Clear everything and start again? This cannot be undone.")) {
        state = freshState(); ui = { view: "rooms", room: null, filter: "all", open: {} };
        save(true); render(); toast("Fresh start");
      }
      return;
    }
  });

  function legacyCopy(ta) {
    ta.removeAttribute("readonly"); ta.select();
    try { document.execCommand("copy"); toast("Copied — now paste it into Claude"); }
    catch (e) { toast("Select the text and copy it manually"); }
    ta.setAttribute("readonly", "readonly");
  }

  /* field edits: no re-render, so typing is never interrupted */
  document.addEventListener("input", function (e) {
    var d = e.target.dataset || {};
    if (d.f && d.for) {
      var f = findTask(d.for);
      if (!f) return;
      f.task[d.f] = e.target.value;
      queueSave();
      return;
    }
    if (d.house) {
      state.house[d.house] = e.target.value;
      if (d.house === "nickname" || d.house === "address") renderNav();
      queueSave();
      return;
    }
    if (d.rname) {
      var r = findRoom(d.rname);
      if (r) { r.name = e.target.value; queueSave(); }
      return;
    }
  });

  document.addEventListener("change", function (e) {
    var d = e.target.dataset || {};
    if (e.target.id === "focusSel") { ui.focus = e.target.value; render(); return; }
    if (d.rtype) {
      var r = findRoom(d.rtype);
      if (!r) return;
      r.type = e.target.value;
      var have = {};
      r.tasks.forEach(function (t) { have[t.title] = true; });
      /* keep everything reviewed or custom, drop untouched suggestions, add the new type's */
      r.tasks = r.tasks.filter(function (t) { return t.status !== "" || t.custom; });
      var kept = {}; r.tasks.forEach(function (t) { kept[t.title] = true; });
      (TYPES[r.type].tasks || []).forEach(function (tpl) {
        if (!kept[tpl[0]]) r.tasks.push(makeTask(tpl));
      });
      save(true); render();
      return;
    }
    if (d.f && d.for) { save(true); if (d.f === "cat" || d.f === "when") render(); return; }
    if (e.target.id === "importFile") {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var s = JSON.parse(fr.result);
          if (!s || !s.rooms) throw new Error("bad file");
          if (!confirm("Replace what is in this browser with the plan in that file?")) return;
          state = migrate(s);
          ui = { view: "rooms", room: null, filter: "all", open: {} };
          save(true); render(); toast("Plan loaded");
        } catch (err) { toast("That does not look like a saved plan file"); }
      };
      fr.readAsText(file);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.id === "addTask") {
      e.preventDefault();
      var btn = document.querySelector('[data-add="' + e.target.dataset.room + '"]');
      if (btn) btn.click();
    }
  });

  /* ================================ boot ============================= */

  document.addEventListener("DOMContentLoaded", function () {
    app = $("#app"); toastEl = $("#toast");
    state = load();
    render();
    if (state.savedAt) $("#savedNote").textContent = "Saved in this browser";
  });
})();
