import { Client, middleware } from "@line/bot-sdk";
import OpenAI from "openai";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const configApi = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    await middleware(config)(req, res, async () => {
      const events = req.body.events;

      for (const event of events) {
        if (event.type !== "message") continue;

        const userMessage = event.message.text;

        const ai = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "あなたはAI営業アシスタントです。初心者にも分かるようにAIの活用方法を提案してください。",
            },
            {
              role: "user",
              content: userMessage,
            },
          ],
        });

        const reply = ai.choices[0].message.content;

        await client.replyMessage(event.replyToken, {
          type: "text",
          text: reply,
        });
      }
    });

    res.status(200).end();
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}
