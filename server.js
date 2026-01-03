// server.js
import express from "express";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
const upload = multer({ dest: "uploads/" });
const app = express();
app.use(express.static("public"));
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function transcribe(filePath) {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));
  formData.append("model", "whisper-1");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
    body: formData
  });
  const data = await response.json();
  return data.text;
}

async function generateATCReply(text) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an ATC controller using correct radio phraseology." },
        { role: "user", content: text }
      ]
    })
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

async function textToSpeech(text, path) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text
    })
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path, buffer);
}

app.post("/atc", upload.single("audio"), async (req, res) => {
  try {
    const transcript = await transcribe(req.file.path);
    const reply = await generateATCReply(transcript);
    const outPath = `public/response.mp3`;
    await textToSpeech(reply, outPath);
    res.json({ audio: "/response.mp3" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ATC server error" });
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));
