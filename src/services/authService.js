const LEADERS = new Set(["randall", "eduardo", "jorge", "gabriel"]);

const denyMessage = "⛔ No tienes permiso para asignar tareas.";

function isLeader(userName = "") {
  return LEADERS.has(String(userName).trim().toLowerCase());
}

module.exports = {
  denyMessage,
  isLeader,
};
