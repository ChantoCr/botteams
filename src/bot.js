const { ActivityHandler } = require("botbuilder");

class DispatcherBot extends ActivityHandler {
  constructor(conversationState) {
    super();
    this.conversationState = conversationState;

    // somebody said something
    this.onMessage(async (context, next) => {
      const text = context.activity.text.toLowerCase().trim();

      // test
      if (text === "hola" || text === "hi") {
        await context.sendActivity("👋 Hola, soy tu Dispatcher Bot");
      } else {
        await context.sendActivity(
          "Escríbeme 'hola' para probar. Luego agregamos comandos 😉"
        );
      }

      await next();
    });
  }
}

module.exports.DispatcherBot = DispatcherBot;
