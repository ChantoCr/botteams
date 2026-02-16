require("dotenv").config();

const restify = require("restify");
const {
    BotFrameworkAdapter,
    MemoryStorage,
    ConversationState
} = require("botbuilder");

const { DispatcherBot } = require("./bot");

// server web created
const server = restify.createServer();
server.listen(process.env.PORT || 3978, () => {
    console.log(`✅ Bot corriendo en puerto ${process.env.PORT || 3978}`);
});

// Adapter conect to Teams - bot
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// error manager
adapter.onTurnError = async (context, error) => {
    console.error(error);
    await context.sendActivity("Ups, algo explotó 😅");
};

// temporal memory (mientras cambiamos a excel)
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);

const bot = new DispatcherBot(conversationState);

// este va a ser el endpoint que Teams llama
server.post("/api/messages", async (req, res) => {
    await adapter.processActivity(req, res, async (context) => {
        await bot.run(context);
    });
});
