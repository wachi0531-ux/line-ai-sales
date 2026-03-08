import { Client } from "@line/bot-sdk";
import OpenAI from "openai";

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {

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
            "あなたはAI営業アシスタントです。初心者にも分かるようにAIの活用方法を提案してください。最後に『あなた専用AIを作ることもできます』と案内してください。"
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    });

    const reply = ai.choices[0].message.content;

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: reply
    });

  }

  res.status(200).end();

}
