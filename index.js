import { SpeechToText, generateImage, GPT } from "./models.js";

// SpeechToText("cold.mp3");

// let imagePrompt =
//   "Design a sophisticated wide banner with a central empty space for adding text later. The banner should have a little dark background which suits for displaying black text properly, luxurious gradient background with a lighter central area to highlight where the text will be. The edges should feature subtle, abstract designs that hint at elegance and the fluidity of hair, suggesting the theme of hair care. The color palette should be rich and deep, with shades that convey premium quality.";
// generateImage(prompt);

let gptPrompt = "Hi, can you help me with coding";

GPT(gptPrompt);
