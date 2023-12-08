import fs from "fs";
import path from "path";

// Replace with the path where you want to create the folders
const parentDir = "/Users/maheshbabuchoda/Desktop/Yoga for Physical Stamina";

for (let i = 17; i <= 40; i++) {
  let folderName = `Module ${i}`;
  let folderPath = path.join(parentDir, folderName);

  fs.mkdir(folderPath, { recursive: true }, (err) => {
    if (err) {
      return console.error(err);
    }
    console.log(`Folder created: ${folderPath}`);
  });
}
