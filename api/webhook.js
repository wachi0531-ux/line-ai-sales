export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("webhook alive");
  }

  if (req.method === "POST") {
    return res.status(200).send("ok");
  }

  return res.status(405).send("Method Not Allowed");
}
