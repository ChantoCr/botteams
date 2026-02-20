const ALLOWED_STATUSES = new Set([
  "available",
  "busy",
  "break",
  "lunch",
  "offline",
]);

const AGENT_NAMES = [
  "Randall",
  "Eduardo",
  "Jorge",
  "Gabriel",
  "Marianela",
  "Gerald",
  "Cristian",
  "Valery",
  "Allan",
];

const agents = AGENT_NAMES.map((name, index) => ({
  name,
  status: "available",
  queueOrder: index + 1,
  boostMode: "normal",
}));

function sortedAgents() {
  return agents.slice().sort((a, b) => a.queueOrder - b.queueOrder);
}

function getAgentByName(userName = "") {
  const normalized = String(userName).trim().toLowerCase();
  return agents.find((a) => a.name.toLowerCase() === normalized) || null;
}

function normalizeQueueOrder() {
  sortedAgents().forEach((agent, index) => {
    agent.queueOrder = index + 1;
  });
}

function pickNextAgent() {
  return (
    sortedAgents().find((agent) => agent.status === "available") || null
  );
}

function assignNext({ tags, taskName, requestedBy }) {
  const agent = pickNextAgent();
  if (!agent) {
    return { ok: false, reason: "no_available" };
  }

  agent.status = "busy";

  return {
    ok: true,
    assignedAgent: agent,
    tags,
    taskName,
    requestedBy,
  };
}

function reinsertBusyToAvailable(agent) {
  const ordered = sortedAgents().filter((a) => a.name !== agent.name);
  const insertAt =
    agent.boostMode === "double" ? Math.floor(ordered.length / 2) : ordered.length;

  ordered.splice(insertAt, 0, agent);

  ordered.forEach((current, index) => {
    current.queueOrder = index + 1;
  });

  return agent.boostMode === "double" ? "double" : "normal";
}

function setUserStatus({ userName, newStatus }) {
  if (!ALLOWED_STATUSES.has(newStatus)) {
    return { ok: false, reason: "invalid_status" };
  }

  const agent = getAgentByName(userName);
  if (!agent) {
    return { ok: false, reason: "user_not_found" };
  }

  const previousStatus = agent.status;
  agent.status = newStatus;

  let reinsertion = null;
  if (previousStatus === "busy" && newStatus === "available") {
    reinsertion = reinsertBusyToAvailable(agent);
  }

  return {
    ok: true,
    agent,
    previousStatus,
    newStatus,
    reinsertion,
  };
}

function getUserStatus(userName) {
  const agent = getAgentByName(userName);
  if (!agent) {
    return null;
  }

  return {
    name: agent.name,
    status: agent.status,
    queueOrder: agent.queueOrder,
    boostMode: agent.boostMode,
  };
}

function getQueueSnapshot(limit = 5) {
  return sortedAgents()
    .slice(0, limit)
    .map((a) => `${a.queueOrder}. ${a.name} (${a.status})`)
    .join(" | ");
}

module.exports = {
  assignNext,
  getQueueSnapshot,
  getUserStatus,
  normalizeQueueOrder,
  pickNextAgent,
  setUserStatus,
};
