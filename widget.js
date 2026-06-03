const WORKER_URL = "https://f1widget.sergiosbexis.workers.dev"; // <-- Change this!

const COLORS = {
  bgStart: new Color("#1c1c24"),
  bgEnd: new Color("#0a0a0c"),
  red: new Color("#e10600"), // Official F1 Red
  white: new Color("#ffffff"),
  gray: new Color("#888899"),
  yellow: new Color("#ffeb3b"),
  green: new Color("#00e676"),
  dimmed: new Color("#333333"),
  cardBg: new Color("#ffffff", 0.05), // Transparent white for elements
};

function sessionColor(short) {
  const map = {
    "FP1": new Color("#2196F3"),
    "FP2": new Color("#1976D2"),
    "FP3": new Color("#0D47A1"),
    "SQ": new Color("#FF9800"),
    "SPR": new Color("#FF5722"),
    "QUALI": new Color("#9C27B0"),
    "RACE": new Color("#e10600"),
  };
  return map[short] || new Color("#555555");
}

function countdown(isoString) {
  const target = new Date(isoString);
  const now = new Date();
  const diff = target - now;

  if (diff < 0) return { label: "FINISHED", past: true };

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return { label: `T-${days}d ${hours}h`, past: false };
  if (hours > 0) return { label: `T-${hours}h ${mins}m`, past: false };
  return { label: `T-${mins}m`, past: false };
}

function localTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function localDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

async function fetchRaceData() {
  const req = new Request(WORKER_URL);
  req.timeoutInterval = 10;
  return await req.loadJSON();
}

async function buildWidget(size) {
  const widget = new ListWidget();

  // Modern Dark Gradient Background
  const gradient = new LinearGradient();
  gradient.colors = [COLORS.bgStart, COLORS.bgEnd];
  gradient.locations = [0.0, 1.0];
  gradient.startPoint = new Point(0, 0);
  gradient.endPoint = new Point(1, 1);
  widget.backgroundGradient = gradient;

  widget.setPadding(14, 14, 14, 14);

  let data;
  try {
    data = await fetchRaceData();
  } catch (e) {
    const err = widget.addText("Telemetry Lost (Connection Error)");
    err.textColor = COLORS.red;
    err.font = new Font("Menlo-Bold", 12);
    return widget;
  }

  // --- HEADER ---
  const headerStack = widget.addStack();
  headerStack.layoutHorizontally();
  headerStack.centerAlignContent();

  // F1 Racing Typography
  const f1Label = headerStack.addText("F1");
  f1Label.textColor = COLORS.red;
  f1Label.font = new Font("HelveticaNeue-CondensedBlack", 20);

  headerStack.addSpacer(6);

  // Vertical divider in header
  const hDiv = headerStack.addStack();
  hDiv.size = new Size(2, 16);
  hDiv.backgroundColor = COLORS.red;
  hDiv.cornerRadius = 1;
  headerStack.addSpacer(6);

  const titleStack = headerStack.addStack();
  titleStack.layoutVertically();

  const raceTitle = titleStack.addText(data.raceName.replace(" Grand Prix", "").toUpperCase());
  raceTitle.textColor = COLORS.white;
  raceTitle.font = Font.blackSystemFont(12);
  raceTitle.lineLimit = 1;
  raceTitle.minimumScaleFactor = 0.7;

  if (data.sessions && data.sessions.length > 0) {
    const d1 = new Date(data.sessions[0].iso);
    const d2 = new Date(data.sessions[data.sessions.length - 1].iso);
    const m1 = d1.toLocaleDateString([], { month: "short" });
    const m2 = d2.toLocaleDateString([], { month: "short" });
    const weekendStr = (m1 === m2) ? `${d1.getDate()}-${d2.getDate()} ${m2}` : `${d1.getDate()} ${m1} - ${d2.getDate()} ${m2}`;

    const datesLabel = titleStack.addText(weekendStr.toUpperCase() + ` • R${data.round}`);
    datesLabel.textColor = COLORS.gray;
    datesLabel.font = Font.semiboldSystemFont(9);
  }

  headerStack.addSpacer();

  // Sprint Badge
  if (data.isSprint) {
    const sprintBadge = headerStack.addStack();
    sprintBadge.backgroundColor = COLORS.yellow;
    sprintBadge.cornerRadius = 4;
    sprintBadge.setPadding(3, 5, 3, 5);
    const sprintTxt = sprintBadge.addText("SPRINT");
    sprintTxt.textColor = Color.black();
    sprintTxt.font = Font.blackSystemFont(9);
  }

  widget.addSpacer(8);

  // --- SEPARATOR ---
  const sep = widget.addStack();
  sep.size = new Size(0, 1); // 1px tall, 100% wide
  sep.backgroundColor = new Color("#ffffff", 0.15);
  widget.addSpacer(8);

  // --- SESSIONS ---
  const now = new Date();
  const sessions = data.sessions;
  const nextIdx = sessions.findIndex(s => new Date(s.iso) > now);

  let startIdx = 0;
  const maxRows = size === "large" ? sessions.length : 4;

  if (sessions.length > maxRows) {
    startIdx = Math.max(0, (nextIdx === -1 ? sessions.length : nextIdx) - 1);
    if (startIdx + maxRows > sessions.length) {
      startIdx = sessions.length - maxRows;
    }
  }

  const endIdx = Math.min(sessions.length, startIdx + maxRows);

  for (let i = startIdx; i < endIdx; i++) {
    const s = sessions[i];
    const cd = countdown(s.iso);
    const isNext = (i === nextIdx);

    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();

    // Highlight next session with a subtle background box
    if (isNext) {
      row.backgroundColor = new Color("#ffffff", 0.08);
      row.cornerRadius = 6;
      row.setPadding(3, 4, 3, 4);
    } else {
      row.setPadding(3, 4, 3, 4);
    }

    // Modern Solid Badge
    const badgeStack = row.addStack();
    badgeStack.backgroundColor = cd.past ? COLORS.dimmed : sessionColor(s.short);
    badgeStack.cornerRadius = 4;
    badgeStack.size = new Size(44, 18); // Fixed size pill
    badgeStack.centerAlignContent();

    badgeStack.addSpacer(); // Force center text
    const badge = badgeStack.addText(s.short);
    badge.font = Font.blackSystemFont(9);
    badge.textColor = cd.past ? new Color("#888") : Color.white();
    badgeStack.addSpacer();

    row.addSpacer(8);

    // Time & Date
    const timeStack = row.addStack();
    timeStack.layoutVertically();

    const timeLabel = timeStack.addText(localTime(s.iso));
    timeLabel.textColor = cd.past ? COLORS.gray : COLORS.white;
    timeLabel.font = new Font("Menlo-Bold", 11); // Digital pitwall timing look

    const dateLabel = timeStack.addText(localDate(s.iso).toUpperCase());
    dateLabel.textColor = COLORS.gray;
    dateLabel.font = Font.semiboldSystemFont(8);

    row.addSpacer();

    // Countdown / Status
    const cdStack = row.addStack();
    cdStack.layoutVertically();

    const cdText = cdStack.addText(cd.label);
    if (isNext) {
      cdText.font = new Font("Menlo-Bold", 11);
      cdText.textColor = COLORS.green; // Glowing green for next
    } else {
      cdText.font = new Font("Menlo-Regular", 10);
      cdText.textColor = cd.past ? COLORS.dimmed : COLORS.gray;
    }
    cdText.rightAlignText();
    cdText.minimumScaleFactor = 0.8;

    if (i < endIdx - 1) widget.addSpacer(2);
  }

  return widget;
}

const size = config.widgetFamily || "medium";
const widget = await buildWidget(size);

if (config.runInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
