import { google } from "googleapis";

const LEADS_SHEET_NAME = "Leads";
const CUSTOMERS_SHEET_NAME = "Customers";

// =========================
// 設定取得
// =========================
async function getSettings(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/dashboard-settings`);
    if (!res.ok) throw new Error("settings fetch failed");
    const data = await res.json();

    return {
      autoReply: data.autoReply ?? true,
      humanOnly: data.humanOnly ?? false,
      promptMode: data.promptMode ?? "sales",
      bookingUrl: data.bookingUrl || process.env.BOOKING_URL || "https://example.com/book",
      lowTicketUrl: data.lowTicketUrl || process.env.LOW_TICKET_URL || "https://example.com/offer",
      productMessage:
        data.productMessage ||
        "AIを教えるだけではなく、あなた専用AIを作って納品できます。",
      faq: Array.isArray(data.faq) ? data.faq : []
    };
  } catch {
    return {
      autoReply: true,
      humanOnly: false,
      promptMode: "sales",
      bookingUrl: process.env.BOOKING_URL || "https://example.com/book",
      lowTicketUrl: process.env.LOW_TICKET_URL || "https://example.com/offer",
      productMessage: "AIを教えるだけではなく、あなた専用AIを作って納品できます。",
      faq: []
    };
  }
}

// =========================
// AIプロンプト
// =========================
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
- 相談や予約に自然につなげる
- AIの活用例は具体的に短く伝える
- 予約URLの案内は自然に入れる
- 低単価商品と高単価相談を押しつけず分けて提案する

現在の返信モード:
${modeMap[settings.promptMode] || modeMap.sales}

商品説明の軸:
${settings.productMessage}

予約URL:
${settings.bookingUrl}

低単価商品URL:
${settings.lowTicketUrl || ""}

よくある質問:
${faqText}
  `.trim();
}

// =========================
// LINE返信
// =========================
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

// =========================
// 基本ユーティリティ
// =========================
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

function nowIso() {
  return new Date().toISOString();
}

function safeText(text, max = 1000) {
  return String(text || "").slice(0, max);
}

// =========================
// 配布URL
// =========================
function getPresentUrls() {
  const presentFileId = process.env.PRESENT_FILE_ID || "1-wYpxX_Ha77WHoOqq1kMz-dYGyokqtw5";
  const kinmonFileId = process.env.KINMON_FILE_ID || "ここにKINMONのファイルID";
  const allPresentsUrl =
    process.env.ALL_PRESENTS_URL ||
    "https://drive.google.com/drive/folders/ここに全体フォルダID";

  return {
    present: `https://drive.google.com/uc?export=download&id=${presentFileId}`,
    kinmon: `https://drive.google.com/uc?export=download&id=${kinmonFileId}`,
    all: allPresentsUrl
  };
}

// =========================
// 返信文
// =========================
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

この結果をもとに
あなた専用のAIも作れます。

興味があれば
「AI相談」と送ってください。`;

    case "kinmon":
      return `AI金門をご用意しました😊

【KINMON ORACLE（金運モンスター神託）】
${urls.kinmon}

他のAIプレゼントも見たい場合は
「AIプレゼント全」と送ってください。

金運だけでなく、
あなた向けのAI活用も提案できます。
興味があれば「AI相談」と送ってください。`;

    case "present":
    default:
      return `AIプレゼントをご用意しました😊

【宇宙三命鑑定】
${urls.present}

他のAIプレゼントも見たい場合は
「AIプレゼント全」と送ってください。

この結果をもとに
あなた専用のAIも作れます。
興味があれば「AI相談」と送ってください。`;
  }
}

function buildConsultMenu() {
  return `いいですね😊

今どんなことで困っていますか？

① 仕事効率化
② 副業・収益化
③ AIを使って何か作りたい
④ その他

番号で送ってください👇`;
}

function buildOfferByNumber(input, settings) {
  const bookingUrl = settings.bookingUrl || "https://example.com/book";
  const lowTicketUrl = settings.lowTicketUrl || "https://example.com/offer";

  switch (input) {
    case "1":
      return `仕事効率化ですね😊

同じ悩みの方はかなり多いです。
実際は、定型作業・文章作成・情報整理・返信対応などを
AIでかなり軽くできます。

おすすめはこの2つです👇

【すぐ試したい方向け】
AIテンプレ・自動化セット
${lowTicketUrl}

【あなた専用で作ってほしい方向け】
無料相談はこちら
${bookingUrl}

「購入」と送ると商品案内、
「予約」と送ると相談案内を出せます。`;

    case "2":
      return `副業・収益化ですね😊

AIは
・発信ネタ作成
・商品アイデア出し
・告知文作成
・販売導線づくり
がかなり得意です。

まずは低単価の実践用セットはこちら👇
${lowTicketUrl}

最短であなた向けに組みたい場合は
無料相談はこちらです👇
${bookingUrl}

「購入」または「予約」と送ってください。`;

    case "3":
      return `AIで何か作りたいのですね😊

かなり相性いいです。
たとえば
・診断AI
・占いAI
・自動返信AI
・業務効率化AI
・提案文作成AI
などが作れます。

まずは商品案内はこちら👇
${lowTicketUrl}

最初からあなた専用で作るなら
無料相談はこちら👇
${bookingUrl}

「購入」または「予約」と送ってください。`;

    case "4":
      return `ありがとうございます😊

内容に合わせて提案できます。
一度整理した方が早いので、
無料相談はこちらです👇
${bookingUrl}

ざっくりでも大丈夫なので、
今の悩みを一言で送ってもOKです。`;

    default:
      return null;
  }
}

function buildPriceMenu(settings) {
  const lowTicketUrl = settings.lowTicketUrl || "https://example.com/offer";
  const bookingUrl = settings.bookingUrl || "https://example.com/book";

  return `料金の目安です😊

① まず試したい方向け
AIテンプレ・ミニ導入
→ 低単価商品
${lowTicketUrl}

② 自分専用で欲しい方向け
専用AIの設計・作成・納品
→ 内容により個別見積

③ 相談して決めたい方向け
無料相談
${bookingUrl}

気になる方は
「購入」または「予約」と送ってください。`;
}

function buildPurchaseGuide(settings) {
  const lowTicketUrl = settings.lowTicketUrl || "https://example.com/offer";
  return `購入はこちらです😊

AIテンプレ・実践セット
${lowTicketUrl}

もっとあなた向けに作り込みたい場合は
「予約」と送ってください。`;
}

function buildBookingGuide(settings) {
  const bookingUrl = settings.bookingUrl || "https://example.com/book";
  return `無料相談はこちらです😊

${bookingUrl}

相談では
・何をAI化できるか
・どこまで自動化できるか
・完成版で納品できるか
を整理できます。`;
}

function buildMainMenu() {
  return `メニューはこちらです😊

【AIプレゼント】
・AIプレゼント
・AI金門
・AIプレゼント全

【相談・案内】
・AI相談
・料金
・購入
・予約

気になる言葉をそのまま送ってください。`;
}

// =========================
// リード判定
// =========================
function getLeadCategory(normalized) {
  if (includesAny(normalized, ["aiプレゼント全", "aiﾌﾟﾚｾﾞﾝﾄ全", "全て", "全部", "ぜんぶ", "all"])) {
    return { category: "present_all", presentType: "all", consultType: "", leadScore: "low" };
  }
  if (includesAny(normalized, ["ai金門", "金門", "kinmon", "kinmonoracle", "金運モンスター神託"])) {
    return { category: "present_kinmon", presentType: "kinmon", consultType: "", leadScore: "low" };
  }
  if (includesAny(normalized, ["aiプレゼント", "aiﾌﾟﾚｾﾞﾝﾄ", "宇宙三命鑑定", "宇宙鑑定"])) {
    return { category: "present", presentType: "present", consultType: "", leadScore: "low" };
  }
  if (includesAny(normalized, ["ai相談", "相談", "無料相談", "診断したい", "気になる"])) {
    return { category: "consult", presentType: "", consultType: "menu", leadScore: "medium" };
  }
  if (normalized === "1") {
    return { category: "offer_work", presentType: "", consultType: "work_efficiency", leadScore: "high" };
  }
  if (normalized === "2") {
    return { category: "offer_sidebiz", presentType: "", consultType: "monetize", leadScore: "high" };
  }
  if (normalized === "3") {
    return { category: "offer_build_ai", presentType: "", consultType: "build_ai", leadScore: "high" };
  }
  if (normalized === "4") {
    return { category: "offer_other", presentType: "", consultType: "other", leadScore: "medium" };
  }
  if (includesAny(normalized, ["料金", "値段", "価格", "費用", "いくら"])) {
    return { category: "price", presentType: "", consultType: "", leadScore: "high" };
  }
  if (includesAny(normalized, ["購入", "買う", "商品", "ほしい", "欲しい"])) {
    return { category: "purchase", presentType: "", consultType: "", leadScore: "hot" };
  }
  if (includesAny(normalized, ["予約", "面談", "申し込み", "申込", "相談予約"])) {
    return { category: "booking", presentType: "", consultType: "", leadScore: "hot" };
  }
  if (includesAny(normalized, ["メニュー", "menu", "一覧", "ai一覧", "プレゼント一覧"])) {
    return { category: "menu", presentType: "", consultType: "", leadScore: "low" };
  }
  return { category: "general", presentType: "", consultType: "", leadScore: "low" };
}

// =========================
// LINEプロフィール
// =========================
async function getLineProfile(userId) {
  if (!userId) return "";

  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    if (!res.ok) return "";
    const data = await res.json();
    return data?.displayName || "";
  } catch {
    return "";
  }
}

// =========================
// Google Sheets
// =========================
function getGoogleAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Google service account env is missing");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
}

function getSheetsClient() {
  const auth = getGoogleAuth();
  return google.sheets({ version: "v4", auth });
}

async function appendLeadRow(row) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is missing");

  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${LEADS_SHEET_NAME}!A:N`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row]
    }
  });
}

async function getCustomersSheetValues() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is missing");

  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CUSTOMERS_SHEET_NAME}!A:M`
  });

  return res.data.values || [];
}

async function upsertCustomerRow(customer) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is missing");

  const sheets = getSheetsClient();
  const rows = await getCustomersSheetValues();

  const userId = customer.userId;
  if (!userId) return;

  let targetRowNumber = -1;

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i]?.[0] || "") === userId) {
      targetRowNumber = i + 1;
      break;
    }
  }

  const values = [[
    customer.userId,
    customer.displayName,
    customer.lastMessageAt,
    customer.lastMessageText,
    customer.lastCategory,
    customer.leadScore,
    customer.presentType,
    customer.consultType,
    customer.bookingGuided ? "YES" : "NO",
    customer.purchaseGuided ? "YES" : "NO",
    customer.lastReplyText,
    customer.status || "",
    customer.memo || ""
  ]];

  if (targetRowNumber > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${CUSTOMERS_SHEET_NAME}!A${targetRowNumber}:M${targetRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${CUSTOMERS_SHEET_NAME}!A:M`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });
  }
}

// =========================
// 行データ作成
// =========================
function buildLeadRow({
  createdAt,
  userId,
  replyToken,
  displayName,
  messageText,
  normalizedText,
  categoryInfo,
  bookingGuided,
  purchaseGuided,
  rawEventType,
  source
}) {
  return [
    createdAt,
    userId,
    replyToken,
    displayName,
    messageText,
    normalizedText,
    categoryInfo.category,
    categoryInfo.leadScore,
    categoryInfo.presentType,
    categoryInfo.consultType,
    bookingGuided ? "YES" : "NO",
    purchaseGuided ? "YES" : "NO",
    rawEventType,
    source
  ];
}

function buildCustomerRecord({
  userId,
  displayName,
  lastMessageAt,
  lastMessageText,
  categoryInfo,
  bookingGuided,
  purchaseGuided,
  lastReplyText
}) {
  return {
    userId,
    displayName,
    lastMessageAt,
    lastMessageText: safeText(lastMessageText, 500),
    lastCategory: categoryInfo.category,
    leadScore: categoryInfo.leadScore,
    presentType: categoryInfo.presentType,
    consultType: categoryInfo.consultType,
    bookingGuided,
    purchaseGuided,
    lastReplyText: safeText(lastReplyText, 500),
    status: "",
    memo: ""
  };
}

// =========================
// メイン処理
// =========================
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
    const urls = getPresentUrls();
    const events = req.body?.events ?? [];

    for (const event of events) {
      if (event.type !== "message") continue;
      if (event.message?.type !== "text") continue;

      const rawUserMessage = event.message.text || "";
      const userMessage = rawUserMessage.trim();
      const normalized = normalizeText(userMessage);
      const userId = event.source?.userId || "";
      const displayName = await getLineProfile(userId);
      const categoryInfo = getLeadCategory(normalized);

      let bookingGuided = false;
      let purchaseGuided = false;
      let replyText = "";

      // ① プレゼント系
      if (
        includesAny(normalized, ["aiプレゼント全", "aiﾌﾟﾚｾﾞﾝﾄ全", "全て", "全部", "ぜんぶ", "all"])
      ) {
        replyText = buildPresentReply("all", urls);
        await replyToLine(event.replyToken, replyText);
      } else if (
        includesAny(normalized, ["ai金門", "金門", "kinmon", "kinmonoracle", "金運モンスター神託"])
      ) {
        replyText = buildPresentReply("kinmon", urls);
        await replyToLine(event.replyToken, replyText);
      } else if (
        includesAny(normalized, ["aiプレゼント", "aiﾌﾟﾚｾﾞﾝﾄ", "宇宙三命鑑定", "宇宙鑑定"])
      ) {
        replyText = buildPresentReply("present", urls);
        await replyToLine(event.replyToken, replyText);
      }

      // ② 相談分岐
      else if (
        includesAny(normalized, ["ai相談", "相談", "無料相談", "診断したい", "気になる"])
      ) {
        replyText = buildConsultMenu();
        await replyToLine(event.replyToken, replyText);
      } else if (["1", "2", "3", "4"].includes(normalized)) {
        replyText = buildOfferByNumber(normalized, settings) || "番号をもう一度送ってください😊";
        bookingGuided = !!replyText.includes(settings.bookingUrl || "");
        purchaseGuided = !!replyText.includes(settings.lowTicketUrl || "");
        await replyToLine(event.replyToken, replyText);
      }

      // ③ 商品・料金・予約
      else if (includesAny(normalized, ["料金", "値段", "価格", "費用", "いくら"])) {
        replyText = buildPriceMenu(settings);
        bookingGuided = true;
        purchaseGuided = true;
        await replyToLine(event.replyToken, replyText);
      } else if (includesAny(normalized, ["購入", "買う", "商品", "ほしい", "欲しい"])) {
        replyText = buildPurchaseGuide(settings);
        purchaseGuided = true;
        await replyToLine(event.replyToken, replyText);
      } else if (includesAny(normalized, ["予約", "面談", "申し込み", "申込", "相談予約"])) {
        replyText = buildBookingGuide(settings);
        bookingGuided = true;
        await replyToLine(event.replyToken, replyText);
      } else if (includesAny(normalized, ["メニュー", "menu", "一覧", "ai一覧", "プレゼント一覧"])) {
        replyText = buildMainMenu();
        await replyToLine(event.replyToken, replyText);
      }

      // ④ 手動対応モード
      else if (!settings.autoReply || settings.humanOnly) {
        replyText = "現在は手動対応中です😊 少しお待ちください。";
        await replyToLine(event.replyToken, replyText);
      }

      // ⑤ 通常AI返信
      else {
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

        replyText =
          aiData?.choices?.[0]?.message?.content ||
          "すみません、今うまく返答できませんでした。もう一度送ってください。";

        const shouldAppendSoftCTA =
          !includesAny(normalized, ["ありがとう", "了解", "ok", "わかった"]) &&
          !replyText.includes("AI相談") &&
          !replyText.includes(settings.bookingUrl || "") &&
          !replyText.includes("予約");

        if (shouldAppendSoftCTA) {
          replyText += `\n\n必要なら「AI相談」と送ってください😊`;
        }

        if (
          settings.promptMode === "reserve" &&
          settings.bookingUrl &&
          !replyText.includes(settings.bookingUrl)
        ) {
          replyText += `\n\n無料相談はこちらです😊\n${settings.bookingUrl}`;
          bookingGuided = true;
        }

        await replyToLine(event.replyToken, replyText);
      }

      // ⑥ Leads ログ保存
      const leadRow = buildLeadRow({
        createdAt: nowIso(),
        userId,
        replyToken: event.replyToken || "",
        displayName,
        messageText: userMessage,
        normalizedText: normalized,
        categoryInfo,
        bookingGuided,
        purchaseGuided,
        rawEventType: event.type || "",
        source: "LINE"
      });

      try {
        await appendLeadRow(leadRow);
      } catch (sheetError) {
        console.error("appendLeadRow error:", sheetError);
      }

      // ⑦ Customers 台帳更新
      try {
        await upsertCustomerRow(
          buildCustomerRecord({
            userId,
            displayName,
            lastMessageAt: nowIso(),
            lastMessageText: userMessage,
            categoryInfo,
            bookingGuided,
            purchaseGuided,
            lastReplyText: replyText
          })
        );
      } catch (customerError) {
        console.error("upsertCustomerRow error:", customerError);
      }
    }

    return res.status(200).send("ok");
  } catch (error) {
    console.error(error);
    return res.status(500).send("server error");
  }
}
