async function getSettings(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/dashboard-settings`);
    if (!res.ok) throw new Error("settings fetch failed");
    return await res.json();
  } catch {
    return {
      autoReply: true,
      humanOnly: false,
      promptMode: "sales",
      bookingUrl: "https://example.com/book",
      productMessage: "AIを教えるだけではなく、あなた専用AIを作って納品できます。",
      faq: []
    };
  }
}

function buildSystemPrompt(settings) {
  const modeMap = {
    soft: "やさしく、共感から入り、短く親しみやすく返答してください。",
    sales: "共感→質問→提案の順で返し、無料相談や専用AI提案につなげてください。",
    reserve: "相手の悩みを整理し、自然に無料相談予約へ誘導してください。",
    faq: "簡潔でわかりやすく答え、必要に応じて詳細相談へつなげてください。"
  };

  const faqText = (settings.faq || [])
    .map((item) => `Q: ${item.q}\nA: ${item.a}`)
    .join("\n\n");

  return `
あなたはLINE営業アシスタントです。
相手はAI初心者が多いです。
専門用語を避けて、短く、やさしく答えてください。

返信ルール:
・最初に共感
・次に質問
・最後に提案

現在の返信モード:
${modeMap[settings.promptMode] || modeMap.sales}

商品説明:
${settings.productMessage}

予約URL:
${settings.bookingUrl}

FAQ:
${faqText}
  `.trim();
}

async function replyToLine(replyToken, text) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: text.slice(0, 1000) }]
    })
  });
}

export default async function handler(req, res) {

  if (req.method === "GET") {
    return res.status(200).send("webhook alive");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {

    const host = req.headers.host;
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const settings = await getSettings(baseUrl);

    const events = req.body?.events ?? [];

    for (const event of events) {

      if (event.type !== "message") continue;
      if (event.message?.type !== "text") continue;

      if (!settings.autoReply || settings.humanOnly) {

        await replyToLine(
          event.replyToken,
          "現在は手動対応中です😊 少しお待ちください。"
        );

        continue;
      }

      const userMessage = event.message.text;

      const aiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content: buildSystemPrompt(settings)
              },
              {
                role: "user",
                content: userMessage
              }
            ],
            temperature: 0.7
          })
        }
      );

      const aiData = await aiResponse.json();

      const replyText =
        aiData.choices?.[0]?.message?.content ||
        "すみません、今うまく返答できませんでした。";

      await replyToLine(event.replyToken, replyText);
    }

    return res.status(200).send("ok");

  } catch (error) {

    console.error(error);

    return res.status(500).send("server error");

  }
}

