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
      const identity = getIdentity(context);

      try {
        if (parsed.type === "next") {
          await this.handleNextCommand(context, parsed, identity);
        } else if (parsed.type === "status") {
          await this.handleStatusCommand(context, parsed, identity);
        } else {
          await context.sendActivity(HELP_MESSAGE);
        }
      } catch (error) {
        console.error("Error handling message", error);
        await context.sendActivity("⚠️ Error al procesar comando. Intenta nuevamente.");
      }

      await next();
    });
  }

  async handleNextCommand(context, parsed, identity) {
    if (!parsed.valid) {
      await context.sendActivity(`⚠️ Entrada inválida.\n${HELP_MESSAGE}`);
      return;
    }

    if (!isLeader(identity)) {
      await context.sendActivity(denyMessage);
      return;
    }

    const result = await assignmentService.assignNext({
      tags: parsed.tags,
      taskName: parsed.taskName,
      requestedBy: identity,
    });

    if (!result.ok && result.message) {
      await context.sendActivity(result.message);
      return;
    }

    if (!result.ok) {
      await context.sendActivity("⚠️ No se pudo completar la asignación.");
      return;
    }

    await context.sendActivity(
      `✅ Asignado a: ${result.assignedAgent.displayName} | Tags: ${result.tags.join(", ")} | Tarea: \"${result.taskName}\"`
    );
  }

  async handleStatusCommand(context, parsed, identity) {
    if (parsed.isStatusQuery) {
      const status = await assignmentService.getUserStatus(identity);
      if (!status) {
        await context.sendActivity("⚠️ No te encontré en QueueTable.");
        return;
      }

      await context.sendActivity(
        `📌 ${status.displayName} | Estado: ${status.status.toUpperCase()} | Queue: ${status.queueOrder} | Boost: ${status.boostMode}\nTop cola: ${await assignmentService.getQueueSnapshot()}`
      );
      return;
    }

    const result = await assignmentService.setUserStatus({
      identity,
      newStatus: parsed.command,
    });

    if (!result.ok && result.reason === "user_not_found") {
      await context.sendActivity("⚠️ No te encontré en QueueTable.");
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

function getIdentity(context) {
  const from = context.activity.from || {};
  const channelData = context.activity.channelData || {};

  return {
    displayName: from.name || from.id || "",
    aadObjectId: from.aadObjectId || channelData?.from?.aadObjectId || "",
  };
}

module.exports.DispatcherBot = DispatcherBot;
