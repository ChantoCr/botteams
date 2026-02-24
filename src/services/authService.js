const denyMessage = "⛔ No tienes permiso para asignar tareas.";

function csvSet(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function normalizeName(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isLeader(identity = {}) {
  const mode = normalizeName(process.env.AUTH_MODE || "prod");

  const aadObjectId = normalizeName(identity.aadObjectId);
  const displayName = normalizeName(identity.displayName || identity.name);
  const fromId = normalizeName(identity.id); // MUY útil en emulator/webchat

  // ✅ DEV MODE: permite por id/displayName rápido
  if (mode === "dev") {
    const dev = csvSet(process.env.DEV_LEADER_IDS);
    return dev.has(aadObjectId) || dev.has(fromId) || dev.has(displayName);
  }

  // ✅ PROD MODE: AAD IDs primero (seguro)
  const leaderAadIds = csvSet(process.env.LEADER_AAD_IDS);
  if (aadObjectId && leaderAadIds.size > 0) return leaderAadIds.has(aadObjectId);

  // fallback por nombre (menos seguro)
  const leaderNames = csvSet(process.env.LEADER_NAMES || "randall,eduardo,jorge,gabriel");
  const first = displayName.split(" ")[0];
  return leaderNames.has(displayName) || leaderNames.has(first);
}

module.exports = { denyMessage, isLeader };

/*const LEADER_NAMES = new Set(["randall", "eduardo", "jorge", "gabriel, User"]);

const denyMessage = "⛔ No tienes permiso para asignar tareas.";

function getLeaderAadIds() {
  return new Set(
    String(process.env.LEADER_AAD_IDS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isLeader(identity = {}) {
    console.log("[leader-check] identity =", {
    aadObjectId: identity.aadObjectId,
    displayName: identity.displayName,
    name: identity.name,
    from: identity,
  });
  
  const aadObjectId = String(identity.aadObjectId || "").trim().toLowerCase();
  const displayName = String(identity.displayName || "").trim().toLowerCase();
  
  const userId = String(identity.id || identity.userId || "").trim().toLowerCase();

  const leaderAadIds = getLeaderAadIds();
  if (aadObjectId && leaderAadIds.size > 0) {
    return leaderAadIds.has(aadObjectId);
  }

  // Emulator fallback: userId
  if (userId) {
    return LEADER_USER_IDS.has(userId);
  }

  return LEADER_NAMES.has(displayName);
}

module.exports = {
  denyMessage,
  isLeader,
};*/
