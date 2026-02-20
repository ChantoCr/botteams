const ALLOWED_TAGS = new Set(["df", "dl", "inv", "act", "all"]);
const STATUS_COMMANDS = new Set([
  "available",
  "busy",
  "break",
  "lunch",
  "offline",
  "status",
]);

function parseMessage(text = "") {
  const raw = String(text || "").trim();
  if (!raw.startsWith("/")) {
    return { type: "unknown", raw };
  }

  const lower = raw.toLowerCase();

  if (STATUS_COMMANDS.has(lower.slice(1))) {
    return {
      type: "status",
      command: lower.slice(1),
      isStatusQuery: lower === "/status",
    };
  }

  if (lower.startsWith("/next")) {
    return parseNextCommand(raw);
  }

  return { type: "unknown", raw };
}

function parseNextCommand(raw) {
  const firstQuote = raw.indexOf('"');
  const lastQuote = raw.lastIndexOf('"');

  if (firstQuote === -1 || lastQuote === firstQuote) {
    return { type: "next", valid: false, error: "missing_quoted_task" };
  }

  const taskName = raw.slice(firstQuote + 1, lastQuote).trim();
  const beforeTask = raw.slice(0, firstQuote).trim();
  const parts = beforeTask.split(/\s+/).slice(1);

  if (!taskName) {
    return { type: "next", valid: false, error: "empty_task" };
  }

  if (parts.length === 0) {
    return { type: "next", valid: false, error: "missing_tags" };
  }

  const tags = [...new Set(parts.map((x) => x.toLowerCase()))];
  const invalidTag = tags.find((tag) => !ALLOWED_TAGS.has(tag));

  if (invalidTag) {
    return {
      type: "next",
      valid: false,
      error: "invalid_tag",
      invalidTag,
    };
  }

  return {
    type: "next",
    valid: true,
    tags: tags.includes("all") ? ["all"] : tags,
    taskName,
  };
}

module.exports = {
  parseMessage,
};
