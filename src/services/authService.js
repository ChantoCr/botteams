const LEADER_NAMES = new Set(["randall", "eduardo", "jorge", "gabriel"]);

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
  const aadObjectId = String(identity.aadObjectId || "").trim().toLowerCase();
  const displayName = String(identity.displayName || "").trim().toLowerCase();

  const leaderAadIds = getLeaderAadIds();
  if (aadObjectId && leaderAadIds.size > 0) {
    return leaderAadIds.has(aadObjectId);
  }

  return LEADER_NAMES.has(displayName);
}

module.exports = {
  denyMessage,
  isLeader,
};
