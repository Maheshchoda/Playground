import OpenAI from "openai";
import "dotenv/config";

import fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//image
export async function generateImage(prompt, size = "1792x1024") {
  // const image = await openai.images.generate({ model: "dall-e-3", prompt: "A cute baby sea otter" });

  const imageResponse = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: size,
  });
  let imageData = imageResponse.data[0];
  console.log(imageData);
}

//model names:- gpt-4, gpt-4-32k, gpt-4-vision-preview, gpt-4-1106-preview
export async function GPT() {
  // response_format: { type: "json_object" },
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: `could you write this title in 6 words
        Nature's Bounty Breakfast: Energise Your Day the Organic Way`,
      },
    ],
    model: "gpt-4-1106-preview",
  });

  console.log(completion.choices[0]);
}

export async function SpeechToText(fileName) {
  const audioFile = fs.createReadStream(fileName);
  console.log("Started Processing the Audio File");

  try {
    const transcript = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      language: "en",
      response_format: "text",
    });

    // Write the transcript to a text file
    fs.writeFile(`${fileName}.txt`, transcript, (err) => {
      if (err) {
        console.error("Error writing to file:", err);
      } else {
        console.log("Transcript written to transcript.txt");
      }
    });
  } catch (error) {
    console.error("Error during transcription:", error);
  }
}
