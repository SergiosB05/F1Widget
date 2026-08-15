const WORKER_URL = "https://f1widget.sergiosbexis.workers.dev"; // <-- Change this!

const COLORS = {
  bgStart: new Color("#16161c"),
  bgEnd: new Color("#08080a"),
  red: new Color("#e10600"),
  white: new Color("#ffffff"),
  gray: new Color("#a0a0b0"),
  yellow: new Color("#ffc107"),
  green: new Color("#00e676"),
  dimmed: new Color("#3a3a44"),
  accentBg: new Color("#e10600", 0.15),
  accentBorder: new Color("#e10600", 0.6),
  glassBg: new Color("#ffffff", 0.08),
  glassBorder: new Color("#ffffff", 0.15),
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
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), "f1_widget_data_cache.json");

  try {
    const req = new Request(WORKER_URL);
    req.timeoutInterval = 10;
    const data = await req.loadJSON();
    fm.writeString(cachePath, JSON.stringify(data));
    return data;
  } catch (e) {
    if (fm.fileExists(cachePath)) {
      const cachedStr = fm.readString(cachePath);
      return JSON.parse(cachedStr);
    }
    throw e;
  }
}

function createRacingBackground() {
  const size = 1000;
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = true;

  // Dark carbon base
  ctx.setFillColor(new Color("#0a0a0c"));
  ctx.fillRect(new Rect(0, 0, size, size));

  // Dynamic Grid / Carbon pattern
  ctx.setStrokeColor(new Color("#ffffff", 0.03));
  ctx.setLineWidth(3);
  for (let i = -size; i < size * 2; i += 45) {
    const p = new Path();
    p.move(new Point(i, 0));
    p.addLine(new Point(i + size, size));
    ctx.addPath(p);
    ctx.strokePath();
  }

  // Red and white aggressive racing stripes
  // Red stripe
  const p1 = new Path();
  p1.move(new Point(size * 0.45, 0));
  p1.addLine(new Point(size * 0.65, 0));
  p1.addLine(new Point(size * 0.15, size));
  p1.addLine(new Point(-0.05 * size, size));
  p1.closeSubpath();
  ctx.setFillColor(new Color("#e10600", 0.5)); 
  ctx.addPath(p1);
  ctx.fillPath();
  
  // White stripe
  const p2 = new Path();
  p2.move(new Point(size * 0.70, 0));
  p2.addLine(new Point(size * 0.80, 0));
  p2.addLine(new Point(size * 0.30, size));
  p2.addLine(new Point(size * 0.20, size));
  p2.closeSubpath();
  ctx.setFillColor(new Color("#ffffff", 0.15));
  ctx.addPath(p2);
  ctx.fillPath();

  // Dark vignette bottom layer
  ctx.setFillColor(new Color("#000000", 0.6));
  ctx.fillRect(new Rect(0, size * 0.6, size, size * 0.4));

  return ctx.getImage();
}

function addGlassPanel(parent) {
  const panel = parent.addStack();
  panel.backgroundColor = COLORS.glassBg;
  panel.cornerRadius = 16;
  panel.borderWidth = 1.5;
  panel.borderColor = COLORS.glassBorder;
  panel.setPadding(12, 12, 12, 12);
  return panel;
}

async function buildWidget(size) {
  const widget = new ListWidget();
  
  // Apply Custom Racing Background
  widget.backgroundImage = createRacingBackground();
  widget.setPadding(14, 14, 14, 14);

  let data;
  try {
    data = await fetchRaceData();
  } catch (e) {
    const err = widget.addText("TELEMETRY LOST");
    err.textColor = COLORS.red;
    err.font = new Font("Menlo-Bold", 14);
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
  if (isSmall) {
    mainLayout.layoutVertically();
  } else {
    mainLayout.layoutHorizontally();
  }
  mainLayout.centerAlignContent();

  // LEFT COLUMN (Glass Panel for Info)
  const leftPanel = addGlassPanel(mainLayout);
  leftPanel.layoutVertically();
  
  // Flag & Locality Row
  const topRow = leftPanel.addStack();
  topRow.centerAlignContent();
  
  const flagText = topRow.addText(data.flag || "🏁");
  flagText.font = Font.systemFont(isSmall ? 26 : 34);
  flagText.shadowRadius = 3;
  flagText.shadowColor = new Color("#000", 0.5);
  topRow.addSpacer(8);

  const locStack = topRow.addStack();
  locStack.layoutVertically();
  
  const locality = locStack.addText((data.locality || data.country).toUpperCase());
  // Heavy Italic for F1 Racing aesthetic
  locality.font = new Font("HelveticaNeue-CondensedBlack", isSmall ? 18 : 24);
  locality.textColor = COLORS.white;
  locality.shadowRadius = 2;
  locality.shadowColor = new Color("#000000", 0.8);

  const gpName = locStack.addText(data.raceName.replace(" Grand Prix", " GP").toUpperCase());
  gpName.font = Font.systemFont(11);
  gpName.textColor = COLORS.gray;

  leftPanel.addSpacer(12);

  // Dates & Badges
  const datesRow = leftPanel.addStack();
  datesRow.layoutHorizontally();
  datesRow.centerAlignContent();
  
  const calSym = SFSymbol.named("calendar");
  if (calSym) {
    const calImg = datesRow.addImage(calSym.image);
    calImg.imageSize = new Size(13, 13);
    calImg.tintColor = COLORS.white;
    datesRow.addSpacer(5);
  }

  const datesLabel = datesRow.addText(weekendStr.toUpperCase());
  datesLabel.font = Font.boldSystemFont(12);
  datesLabel.textColor = COLORS.white;

  if (data.isSprint) {
    datesRow.addSpacer(10);
    const sprintBadge = datesRow.addStack();
    sprintBadge.backgroundColor = COLORS.yellow;
    sprintBadge.cornerRadius = 6;
    sprintBadge.setPadding(4, 7, 4, 7);
    
    const boltSym = SFSymbol.named("bolt.fill");
    if (boltSym) {
      const boltImg = sprintBadge.addImage(boltSym.image);
      boltImg.imageSize = new Size(11, 11);
      boltImg.tintColor = Color.black();
      sprintBadge.addSpacer(4);
    }
    
    const sTxt = sprintBadge.addText("SPRINT");
    sTxt.font = Font.blackSystemFont(10);
    sTxt.textColor = Color.black();
  }

  if (isSmall) {
    widget.addSpacer(10);
    const rightPanel = addGlassPanel(mainLayout);
    rightPanel.layoutVertically();
    renderSessions(rightPanel, data, size);
  } else {
    mainLayout.addSpacer(14);
    const rightPanel = addGlassPanel(mainLayout);
    rightPanel.layoutVertically();
    renderSessions(rightPanel, data, size);
  }

  return widget;
}

function renderSessions(parent, data, size) {
  const sessions = data.sessions;
  const now = new Date();
  const nextIdx = sessions.findIndex(s => new Date(s.iso) > now);

  let maxRows = size === "large" ? sessions.length : (size === "small" ? 1 : 4);
  
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
    
    if (isNext) {
      row.backgroundColor = COLORS.accentBg;
      row.cornerRadius = 8;
      row.borderWidth = 1.5;
      row.borderColor = COLORS.accentBorder;
    }
    const pad = size === "small" ? 5 : 7;
    row.setPadding(pad, pad + 5, pad, pad + 5);

    // Pill Badge
    const badgeStack = row.addStack();
    badgeStack.backgroundColor = cd.past ? COLORS.dimmed : sessionColor(s.short);
    badgeStack.cornerRadius = 7;
    badgeStack.size = new Size(46, 20);
    badgeStack.centerAlignContent();
    if (!cd.past) {
      badgeStack.borderWidth = 1.5;
      badgeStack.borderColor = new Color("#ffffff", 0.25);
    }
    
    badgeStack.addSpacer(); 
    const badge = badgeStack.addText(s.short);
    badge.font = Font.blackSystemFont(10);
    badge.textColor = cd.past ? new Color("#999") : Color.white();
    badgeStack.addSpacer();

    row.addSpacer(10);

    // Time & Date
    const timeStack = row.addStack();
    timeStack.layoutVertically();

    const timeLabel = timeStack.addText(localTime(s.iso));
    timeLabel.textColor = cd.past ? COLORS.gray : (isNext ? COLORS.white : new Color("#f0f0f0"));
    timeLabel.font = new Font("Menlo-Bold", 12);
    
    const dateLabel = timeStack.addText(localDate(s.iso).toUpperCase());
    dateLabel.textColor = isNext ? new Color("#ffcccc") : COLORS.gray;
    dateLabel.font = Font.semiboldSystemFont(9);

    row.addSpacer();

    // Countdown Timer
    const cdText = row.addText(cd.label);
    if (isNext) {
      cdText.font = new Font("Menlo-Bold", 12);
      cdText.textColor = COLORS.green; 
    } else {
      cdText.font = new Font("Menlo-Regular", 11);
      cdText.textColor = cd.past ? COLORS.dimmed : COLORS.gray;
    }
    cdText.rightAlignText();
    cdText.minimumScaleFactor = 0.8;

    if (i < endIdx - 1) parent.addSpacer(6);
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
