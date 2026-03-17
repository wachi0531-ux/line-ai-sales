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
- 最初に共感
- 次に短い質問または整理
- 最後に必要なら提案
- 押し売りしない
- 返信は日本語
- 長すぎず、LINEで読みやすく
- 必要なら改行して見やすくする
- AIプレゼント、鑑定、相談、予約の流れを自然につなぐ

現在の返信モード:
${modeMap[settings.promptMode] || modeMap.sales}

商品説明の軸:
${settings.productMessage}

予約URL:
${settings.bookingUrl}

よくある質問:
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
      messages: [
        {
          type: "text",
          text: String(text || "").slice(0, 1000)
        }
      ]
    })
  });
}

function normalizeText(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[！!]/g, "!")
    .replace(/[？?]/g, "?");
}

function includesAny(text, keywords = []) {
  return keywords.some((keyword) => text.includes(keyword));
}

function buildPresentReply(type, urls) {
  switch (type) {
    case "all":
      return `AIプレゼント一覧をどうぞ😊

▼ 全てまとめて受け取る
${urls.all}

個別でも受け取れます👇
・AIプレゼント
・AI金門
・AIプレゼント全

使い方が分からなければ
「AI相談」と送ってください。`;

    case "kinmon":
      return `AI金門をご用意しました😊

【KINMON ORACLE（金運モンスター神託）】
${urls.kinmon}

他のAIプレゼントも見たい場合は
「AIプレゼント全」と送ってください。`;

    case "present":
    default:
      return `AIプレゼントをご用意しました😊

【宇宙三命鑑定】
${urls.present}

他のAIプレゼントも見たい場合は
「AIプレゼント全」と送ってください。`;
  }
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
    const protocol = host?.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;
    const settings = await getSettings(baseUrl);

    const events = req.body?.events ?? [];

    // ===== Google Drive ファイルID / フォルダURL を設定 =====
    // 1) AIプレゼント → 宇宙三命鑑定
    const PRESENT_FILE_ID = "1S3hXzhNufwrSu3BU-87P-qBeHErYOgjC";

    // 2) AI金門 → KINMON ORACLE（金運モンスター神託）
    const KINMON_FILE_ID = "1WJxWcvp7moJFx1X38MPzAAfuzG5ewLrA";

    // 3) AIプレゼント全 → 全プレゼント一覧ページ or フォルダURL
    // DriveフォルダでもLPページでもOK
    const ALL_PRESENTS_URL = "https://drive.google.com/drive/folders/16VR-2fyLiJriaj_kBHj_n4PNv5jnCmy5?usp=drive_link";

    const urls = {
      present: `https://drive.google.com/uc?export=download&id=${PRESENT_FILE_ID}`,
      kinmon: `https://drive.google.com/uc?export=download&id=${KINMON_FILE_ID}`,
      all: ALL_PRESENTS_URL
    };

    for (const event of events) {
      if (event.type !== "message") continue;
      if (event.message?.type !== "text") continue;

      const rawUserMessage = event.message.text || "";
      const userMessage = rawUserMessage.trim();
      const normalized = normalizeText(userMessage);

      // =========================
      // ① AIプレゼント分岐
      // =========================

      // AIプレゼント全 / 全て / ぜんぶ
      if (
        includesAny(normalized, [
          "aiプレゼント全",
          "aiﾌﾟﾚｾﾞﾝﾄ全",
          "全て",
          "ぜんぶ",
          "全部",
          "all"
        ])
      ) {
        await replyToLine(event.replyToken, buildPresentReply("all", urls));
        continue;
      }

      // AI金門 / KINMON / KINMON ORACLE
      if (
        includesAny(normalized, [
          "ai金門",
          "金門",
          "kinmon",
          "kinmonoracle",
          "金運モンスター神託"
        ])
      ) {
        await replyToLine(event.replyToken, buildPresentReply("kinmon", urls));
        continue;
      }

      // AIプレゼント / 宇宙三命鑑定
      if (
        includesAny(normalized, [
          "aiプレゼント",
          "aiﾌﾟﾚｾﾞﾝﾄ",
          "宇宙三命鑑定",
          "宇宙鑑定"
        ])
      ) {
        await replyToLine(event.replyToken, buildPresentReply("present", urls));
        continue;
      }

      // メニュー表示
      if (
        includesAny(normalized, [
          "メニュー",
          "menu",
          "ai一覧",
          "プレゼント一覧"
        ])
      ) {
        await replyToLine(
          event.replyToken,
          `受け取れるAIはこちらです😊

【送るキーワード】
・AIプレゼント
→ 宇宙三命鑑定

・AI金門
→ KINMON ORACLE（金運モンスター神託）

・AIプレゼント全
→ 全てまとめて受け取り

気になるキーワードをそのまま送ってください。`
        );
        continue;
      }

      // =========================
      // ② 自動返信OFF / 人間対応のみ
      // =========================
      if (!settings.autoReply || settings.humanOnly) {
        await replyToLine(
          event.replyToken,
          "現在は手動対応中です😊 少しお待ちください。"
        );
        continue;
      }

      // =========================
      // ③ それ以外はAI返信
      // =========================
      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
      });

      const aiData = await aiResponse.json();

      let replyText =
        aiData?.choices?.[0]?.message?.content ||
        "すみません、今うまく返答できませんでした。もう一度送ってください。";

      if (
        settings.promptMode === "reserve" &&
        settings.bookingUrl &&
        !replyText.includes(settings.bookingUrl)
      ) {
        replyText += `\n\n無料相談はこちらです😊\n${settings.bookingUrl}`;
      }

      await replyToLine(event.replyToken, replyText);
    }

    return res.status(200).send("ok");
  } catch (error) {
    console.error(error);
    return res.status(500).send("server error");
  }
}
