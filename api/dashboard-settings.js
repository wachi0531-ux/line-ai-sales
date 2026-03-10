let settings = {
  autoReply: true,
  humanOnly: false,
  promptMode: "sales",
  bookingUrl: "https://example.com/book",
  productMessage: "AIを教えるだけではなく、あなた専用AIを作って納品できます。",
  faq: [
    {
      q: "何ができますか？",
      a: "文章作成AI、営業返信AI、SNS投稿AI、業務効率化AIなどを、あなたの仕事に合わせて作れます。"
    },
    {
      q: "料金はいくらですか？",
      a: "内容によりますが、ミニ・標準・仕組み化の3段階で案内できます。まずは無料相談で整理する形がおすすめです。"
    }
  ]
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(settings);
  }

  if (req.method === "POST") {
    settings = {
      ...settings,
      ...(req.body || {})
    };
    return res.status(200).json({ ok: true, settings });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
