const WORKER_URL = "https://f1widget.sergiosbexis.workers.dev"; // <-- Change this!

const COLORS = {
  bgStart: new Color("#16161c"),
  bgEnd: new Color("#08080a"),
  red: new Color("#e10600"),
  white: new Color("#ffffff"),
  gray: new Color("#888899"),
  yellow: new Color("#ffeb3b"),
  green: new Color("#00e676"),
  dimmed: new Color("#333333"),
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

  let weekendStr = "";
  if (data.sessions && data.sessions.length > 0) {
    const d1 = new Date(data.sessions[0].iso);
    const d2 = new Date(data.sessions[data.sessions.length - 1].iso);
    const m1 = d1.toLocaleDateString([], { month: "short" });
    const m2 = d2.toLocaleDateString([], { month: "short" });
    weekendStr = (m1 === m2) ? `${d1.getDate()}-${d2.getDate()} ${m2}` : `${d1.getDate()} ${m1} - ${d2.getDate()} ${m2}`;
  }

  const isSmall = size === "small";

  // MAIN LAYOUT
  const mainLayout = widget.addStack();
  mainLayout.layoutHorizontally();
  mainLayout.centerAlignContent();

  // LEFT COLUMN (Info)
  const leftCol = mainLayout.addStack();
  leftCol.layoutVertically();
  
  // Flag
  const flagText = leftCol.addText(data.flag || "🏁");
  flagText.font = Font.systemFont(isSmall ? 28 : 36);
  leftCol.addSpacer(2);

  // Locality (City)
  const locality = leftCol.addText((data.locality || data.country).toUpperCase());
  locality.font = new Font("HelveticaNeue-CondensedBlack", isSmall ? 16 : 20);
  locality.textColor = COLORS.white;
  locality.minimumScaleFactor = 0.5;
  locality.lineLimit = 1;

  // Race Name
  const gpName = leftCol.addText(data.raceName.replace(" Grand Prix", " GP").toUpperCase());
  gpName.font = Font.semiboldSystemFont(9);
  gpName.textColor = COLORS.gray;
  gpName.minimumScaleFactor = 0.7;
  gpName.lineLimit = 1;

  leftCol.addSpacer(6);

  // Dates & Badges
  const datesRow = leftCol.addStack();
  datesRow.layoutHorizontally();
  datesRow.centerAlignContent();
  
  const datesLabel = datesRow.addText(weekendStr.toUpperCase());
  datesLabel.font = Font.boldSystemFont(9);
  datesLabel.textColor = COLORS.red;

  if (data.isSprint) {
    datesRow.addSpacer(4);
    const sprintBadge = datesRow.addStack();
    sprintBadge.backgroundColor = COLORS.yellow;
    sprintBadge.cornerRadius = 3;
    sprintBadge.setPadding(2, 4, 2, 4);
    const sTxt = sprintBadge.addText("SPRINT");
    sTxt.font = Font.blackSystemFont(7);
    sTxt.textColor = Color.black();
  }

  leftCol.addSpacer(); // Push everything to the top

  if (isSmall) {
    // In SMALL widget, stack vertically
    widget.addSpacer(8);
    renderSessions(widget, data, size);
  } else {
    // In MEDIUM/LARGE widget, use Right Column
    mainLayout.addSpacer(12);
    
    // Vertical Divider
    const divider = mainLayout.addStack();
    divider.size = new Size(1, 0); // 1px wide, full height
    divider.backgroundColor = new Color("#ffffff", 0.15);
    
    mainLayout.addSpacer(12);

    // RIGHT COLUMN (Sessions)
    const rightCol = mainLayout.addStack();
    rightCol.layoutVertically();
    renderSessions(rightCol, data, size);
  }

  return widget;
}

function renderSessions(parent, data, size) {
  const sessions = data.sessions;
  const now = new Date();
  const nextIdx = sessions.findIndex(s => new Date(s.iso) > now);

  let maxRows = 4;
  if (size === "large") maxRows = sessions.length;
  if (size === "small") maxRows = 2; // Small widgets fit max 2 sessions cleanly
  
  let startIdx = 0;
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

    const row = parent.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    
    // Highlight background for next session
    if (isNext) {
      row.backgroundColor = new Color("#ffffff", 0.08);
      row.cornerRadius = 6;
    }
    const pad = size === "small" ? 3 : 4;
    row.setPadding(pad, pad, pad, pad);

    // Pill Badge
    const badgeStack = row.addStack();
    badgeStack.backgroundColor = cd.past ? COLORS.dimmed : sessionColor(s.short);
    badgeStack.cornerRadius = 4;
    badgeStack.size = new Size(38, 16);
    badgeStack.centerAlignContent();
    
    badgeStack.addSpacer(); 
    const badge = badgeStack.addText(s.short);
    badge.font = Font.blackSystemFont(8);
    badge.textColor = cd.past ? new Color("#888") : Color.white();
    badgeStack.addSpacer();

    row.addSpacer(6);

    // Time & Date
    const timeStack = row.addStack();
    timeStack.layoutVertically();

    const timeLabel = timeStack.addText(localTime(s.iso));
    timeLabel.textColor = cd.past ? COLORS.gray : COLORS.white;
    timeLabel.font = new Font("Menlo-Bold", 10);
    
    const dateLabel = timeStack.addText(localDate(s.iso).toUpperCase());
    dateLabel.textColor = COLORS.gray;
    dateLabel.font = Font.semiboldSystemFont(7);

    row.addSpacer();

    // Countdown Timer
    const cdText = row.addText(cd.label);
    if (isNext) {
      cdText.font = new Font("Menlo-Bold", 10);
      cdText.textColor = COLORS.green; 
    } else {
      cdText.font = new Font("Menlo-Regular", 9);
      cdText.textColor = cd.past ? COLORS.dimmed : COLORS.gray;
    }
    cdText.rightAlignText();
    cdText.minimumScaleFactor = 0.8;

    if (i < endIdx - 1) parent.addSpacer(2);
  }
}

const size = config.widgetFamily || "medium";
const widget = await buildWidget(size);

if (config.runInWidget) {
  Script.setWidget(widget);
} else {
  await (size === "small" ? widget.presentSmall() : widget.presentMedium());
}
Script.complete();
