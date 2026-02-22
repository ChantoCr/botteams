const {
  getQueueAgents,
  writeQueueAgents,
  getLockRow,
  writeLockRow,
} = require("./excelService");

const ALLOWED_STATUSES = new Set(["available", "busy", "break", "lunch", "offline"]);
const RETRY_LIMIT = 2;
const LOCK_WINDOW_MS = 10_000;
const ALL_BUSY_MESSAGE =
  "⚠️ Todos los agentes están ocupados o no disponibles. No hay nadie AVAILABLE.";
const LOCK_BUSY_MESSAGE = "⏳ Bot ocupado, intenta en 10s";

function nowUtc() {
  return new Date().toISOString();
}

function normalizeQueueOrder(agents) {
  const sorted = agents.slice().sort((a, b) => a.queueOrder - b.queueOrder);
  sorted.forEach((agent, index) => {
    agent.queueOrder = index + 1;
  });
  return sorted;
}

function pickNextAgent(agents) {
  return (
    agents
      .slice()
      .sort((a, b) => a.queueOrder - b.queueOrder)
      .find((agent) => agent.status === "available") || null
  );
}

function findByIdentity(agents, identity = {}) {
  const aad = String(identity.aadObjectId || "").trim().toLowerCase();
  const displayName = String(identity.displayName || "").trim().toLowerCase();

  if (aad) {
    const byAad = agents.find((a) => String(a.aadObjectId || "").trim().toLowerCase() === aad);
    if (byAad) {
      return byAad;
    }
  }

  return (
    agents.find((a) => String(a.displayName || "").trim().toLowerCase() === displayName) || null
  );
}

function reinsertBusyToAvailable(agent, agents) {
  const ordered = agents
    .slice()
    .sort((a, b) => a.queueOrder - b.queueOrder)
    .filter((candidate) => candidate.displayName !== agent.displayName);

  const insertAt =
    agent.boostMode === "double" ? Math.floor(ordered.length / 2) : ordered.length;

  ordered.splice(insertAt, 0, agent);

  return {
    updatedAgents: normalizeQueueOrder(ordered),
    reinsertion: agent.boostMode === "double" ? "double" : "normal",
  };
}

async function acquireNextLock(requesterKey) {
  const lock = await getLockRow();
  const now = new Date();
  const lockUntil = new Date(lock.lockUntilUtc);

  if (lock.lockOwnerAadId && lock.lockOwnerAadId !== requesterKey && lockUntil > now) {
    return { ok: false, reason: "locked" };
  }

  const updatedLock = {
    lockOwnerAadId: requesterKey,
    lockUntilUtc: new Date(now.getTime() + LOCK_WINDOW_MS).toISOString(),
    lockRowVersion: lock.lockRowVersion + 1,
  };

  await writeLockRow(updatedLock);
  return { ok: true };
}

async function releaseNextLock() {
  const lock = await getLockRow();
  await writeLockRow({
    lockOwnerAadId: "",
    lockUntilUtc: nowUtc(),
    lockRowVersion: lock.lockRowVersion + 1,
  });
}

async function assignNext({ tags, taskName, requestedBy }) {
  const requesterKey = requestedBy.aadObjectId || requestedBy.displayName;
  let lockHeld = false;

  try {
    const lockResult = await acquireNextLock(requesterKey);
    if (!lockResult.ok && lockResult.reason === "locked") {
      return { ok: false, reason: "locked", message: LOCK_BUSY_MESSAGE };
    }
    lockHeld = true;

    for (let attempt = 0; attempt <= RETRY_LIMIT; attempt += 1) {
      const agents = normalizeQueueOrder(await getQueueAgents());
      const selectedAgent = pickNextAgent(agents);

      if (!selectedAgent) {
        return { ok: false, reason: "no_available", message: ALL_BUSY_MESSAGE };
      }

      const expectedVersion = selectedAgent.rowVersion + 1;
      selectedAgent.status = "busy";
      selectedAgent.rowVersion = expectedVersion;
      selectedAgent.lastUpdatedUtc = nowUtc();

      await writeQueueAgents(agents);

      const verification = await getQueueAgents();
      const updated = verification.find(
        (a) => a.displayName === selectedAgent.displayName || a.aadObjectId === selectedAgent.aadObjectId
      );

      if (updated && updated.status === "busy" && updated.rowVersion >= expectedVersion) {
        return {
          ok: true,
          assignedAgent: updated,
          tags,
          taskName,
          requestedBy,
        };
      }
    }

    return { ok: false, reason: "stale_update" };
  } finally {
    if (lockHeld) {
      try {
        await releaseNextLock();
      } catch (error) {
        console.error("Failed to release dispatcher lock", error);
      }
    }
  }
}

async function setUserStatus({ identity, newStatus }) {
  if (!ALLOWED_STATUSES.has(newStatus)) {
    return { ok: false, reason: "invalid_status" };
  }

  for (let attempt = 0; attempt <= RETRY_LIMIT; attempt += 1) {
    let agents = normalizeQueueOrder(await getQueueAgents());
    const agent = findByIdentity(agents, identity);

    if (!agent) {
      return { ok: false, reason: "user_not_found" };
    }

    const previousStatus = agent.status;
    const expectedVersion = agent.rowVersion + 1;

    agent.status = newStatus;
    agent.rowVersion = expectedVersion;
    agent.lastUpdatedUtc = nowUtc();

    let reinsertion = null;
    if (previousStatus === "busy" && newStatus === "available") {
      const result = reinsertBusyToAvailable(agent, agents);
      agents = result.updatedAgents;
      reinsertion = result.reinsertion;
    } else {
      agents = normalizeQueueOrder(agents);
    }

    await writeQueueAgents(agents);

    const verification = await getQueueAgents();
    const updated = findByIdentity(verification, identity);

    if (updated && updated.status === newStatus && updated.rowVersion >= expectedVersion) {
      return {
        ok: true,
        agent: updated,
        previousStatus,
        newStatus,
        reinsertion,
      };
    }
  }

  return { ok: false, reason: "stale_update" };
}

async function getUserStatus(identity) {
  const agents = await getQueueAgents();
  const agent = findByIdentity(agents, identity);
  if (!agent) {
    return null;
  }

  return {
    displayName: agent.displayName,
    status: agent.status,
    queueOrder: agent.queueOrder,
    boostMode: agent.boostMode,
  };
}

async function getQueueSnapshot(limit = 5) {
  const agents = normalizeQueueOrder(await getQueueAgents());
  return agents
    .slice(0, limit)
    .map((a) => `${a.queueOrder}. ${a.displayName} (${a.status})`)
    .join(" | ");
}

module.exports = {
  assignNext,
  getQueueSnapshot,
  getUserStatus,
  normalizeQueueOrder,
  pickNextAgent,
  setUserStatus,
  ALL_BUSY_MESSAGE,
  LOCK_BUSY_MESSAGE,
};
