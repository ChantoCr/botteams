const { ActivityHandler } = require("botbuilder");
const { denyMessage, isLeader } = require("./services/authService");
const { parseMessage } = require("./services/commandParser");
const assignmentService = require("./services/assignmentService");

const HELP_MESSAGE = [
  "Comandos disponibles:",
  "• /next <tags...> \"task name\" (solo líderes)",
  "  Tags válidos: df, dl, inv, act, all",
  "• /available | /busy | /break | /lunch | /offline",
  "• /status",
].join("\n");

class DispatcherBot extends ActivityHandler {
  constructor(conversationState) {
    super();
    this.conversationState = conversationState;

    this.onMessage(async (context, next) => {
      const parsed = parseMessage(context.activity.text || "");
      const userName = getUserName(context);

      if (parsed.type === "next") {
        await this.handleNextCommand(context, parsed, userName);
      } else if (parsed.type === "status") {
        await this.handleStatusCommand(context, parsed, userName);
      } else {
        await context.sendActivity(HELP_MESSAGE);
      }

      await next();
    });
  }

  async handleNextCommand(context, parsed, userName) {
    if (!parsed.valid) {
      await context.sendActivity(`⚠️ Entrada inválida.\n${HELP_MESSAGE}`);
      return;
    }

    if (!isLeader(userName)) {
      await context.sendActivity(denyMessage);
      return;
    }

    const result = assignmentService.assignNext({
      tags: parsed.tags,
      taskName: parsed.taskName,
      requestedBy: userName,
    });

    if (!result.ok && result.reason === "no_available") {
      await context.sendActivity("⚠️ No hay agentes disponibles (available).");
      return;
    }

    await context.sendActivity(
      `✅ Asignado a: ${result.assignedAgent.name} | Tags: ${result.tags.join(", "
      )} | Tarea: "${result.taskName}"`
    );
  }

  async handleStatusCommand(context, parsed, userName) {
    if (parsed.isStatusQuery) {
      const status = assignmentService.getUserStatus(userName);
      if (!status) {
        await context.sendActivity("⚠️ No te encontré en la cola local.");
        return;
      }

      await context.sendActivity(
        `📌 ${status.name} | Estado: ${status.status.toUpperCase()} | Queue: ${status.queueOrder} | Boost: ${status.boostMode}\nTop cola: ${assignmentService.getQueueSnapshot()}`
      );
      return;
    }

    const result = assignmentService.setUserStatus({
      userName,
      newStatus: parsed.command,
    });

    if (!result.ok && result.reason === "user_not_found") {
      await context.sendActivity("⚠️ No te encontré en la cola local.");
      return;
    }

    if (!result.ok) {
      await context.sendActivity(`⚠️ Entrada inválida.\n${HELP_MESSAGE}`);
      return;
    }

    if (result.reinsertion === "double") {
      await context.sendActivity("✅ AVAILABLE. Te inserté en el centro (double).");
      return;
    }

    if (result.reinsertion === "normal") {
      await context.sendActivity("✅ AVAILABLE. Te moví al final de la cola.");
      return;
    }

    await context.sendActivity(`✅ Estado actualizado a ${parsed.command.toUpperCase()}`);
  }
}

function getUserName(context) {
  return context.activity.from?.id || context.activity.from?.name || "";
}

module.exports.DispatcherBot = DispatcherBot;
