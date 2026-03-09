export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("webhook alive");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const events = req.body?.events ?? [];

    for (const event of events) {
      if (event.type !== "message") continue;
      if (event.message?.type !== "text") continue;

      const userMessage = event.message.text;

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: "あなたはAI営業アシスタントです。初心者にも分かるように、やさしく短く答えてください。最後に必要なら『あなた専用AIを作ることもできます』と案内してください。"
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          temperature: 0.7
        })
      });

      const aiData = await aiResponse.json();
      const replyText =
        aiData.choices?.[0]?.message?.content ||
        "すみません、今うまく返答できませんでした。もう一度送ってください。";

      await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages: [
            {
              type: "text",
              text: replyText.slice(0, 1000)
            }
          ]
        })
      });
    }

    return res.status(200).send("ok");
  } catch (error) {
    console.error(error);
    return res.status(500).send("server error");
  }
}
