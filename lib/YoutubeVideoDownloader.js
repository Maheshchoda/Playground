import fs from "fs";
import path from "path";
import ytpl from "ytpl";
import ytdl from "ytdl-core";
import readline from "readline";
import { exec } from "child_process";
import chalk from "chalk";
import cliProgress from "cli-progress";

// Helper function to format bitrate
function formatBitrate(bitrate) {
  const MBps = bitrate / 8 / 1000000;
  return `${MBps.toFixed(2)} MBps`;
}

async function selectVideoFormat(videoUrl) {
  const info = await ytdl.getInfo(videoUrl);
  const formats = ytdl.filterFormats(info.formats, "videoonly");

  console.log("Available Formats:");
  console.log("---------------------------------------------------");
  console.log("No. | Format | Resolution | Bitrate");
  console.log("---------------------------------------------------");

  formats.forEach((format, index) => {
    console.log(
      `${String(index + 1).padEnd(4)}| ${format.container.padEnd(
        7
      )} | ${format.qualityLabel.padEnd(10)} | ${formatBitrate(format.bitrate)}`
    );
  });

  console.log("---------------------------------------------------");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const selectedFormatIndex = await new Promise((resolve) => {
    rl.question("Select a format (number): ", (answer) => {
      rl.close();
      resolve(parseInt(answer) - 1);
    });
  });

  return formats[selectedFormatIndex];
}

// Function to merge audio and video
async function mergeAudioAndVideo(videoPath, audioPath, outputPath) {
  let spinner = ["|", "/", "-", "\\"];
  let i = 0;

  // Display a simple spinner
  const spinnerInterval = setInterval(() => {
    process.stdout.write(`\rMerging ${spinner[i++ % spinner.length]} `);
  }, 100); // Adjust the speed of the spinner as needed

  return new Promise((resolve, reject) => {
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac "${outputPath}"`;
    exec(ffmpegCommand, (error, stdout, stderr) => {
      clearInterval(spinnerInterval); // Stop the spinner
      process.stdout.write("\n"); // Ensure new line after spinner

      if (error) {
        console.log(chalk.red("\nError during merging."));
        reject(error);
        return;
      }

      console.log(chalk.green("\nMerging finished!"));
      resolve();
    });
  });
}

// Function to initialize the progress bar
function initProgressBar(totalSize, title, type) {
  const progressBar = new cliProgress.SingleBar(
    {
      format:
        `${chalk.green("Downloading")} ${type} of ${title} |` +
        chalk.blue("{bar}") +
        "| {percentage}%",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );

  progressBar.start(totalSize, 0);
  return progressBar;
}

// Function to download the stream
// Function to download the stream and update progress
async function downloadStream(stream, filePath, title, type, progressBar) {
  stream.pipe(fs.createWriteStream(filePath));

  return new Promise((resolve, reject) => {
    stream.on("response", (response) => {
      const totalSize = parseInt(response.headers["content-length"], 10);
      progressBar.setTotal(totalSize);
    });

    stream.on("data", (chunk) => {
      progressBar.increment(chunk.length);
    });

    stream.on("end", () => {
      progressBar.stop();
      console.log(
        `\n${chalk.green("Finished downloading")} ${type} of ${title}`
      );
      resolve();
    });

    stream.on("error", (error) => {
      progressBar.stop();
      reject(error);
    });
  });
}

// Function to download and merge
async function downloadAndMerge(videoUrl, downloadPath, title) {
  // Initializing progress bars
  const multiBar = new cliProgress.MultiBar(
    {
      clearOnComplete: true,
      hideCursor: true,
      format: `${chalk.green("{filename}")}: [{bar}] {percentage}%`,
    },
    cliProgress.Presets.shades_grey
  );
  const videoPath = path.join(downloadPath, `${title}_video.mp4`);
  const audioPath = path.join(downloadPath, `${title}_audio.mp4`);
  const outputPath = path.join(downloadPath, `${title}.mp4`);

  if (fs.existsSync(outputPath)) {
    console.log(`Skipping ${title} - already downloaded.`);
    return;
  }

  console.log(`Downloading video from URL: ${videoUrl}`);

  const videoBar = multiBar.create(100, 0, { filename: `${title} (Video)` });
  const audioBar = multiBar.create(100, 0, { filename: `${title} (Audio)` });

  const videoStream = ytdl(videoUrl, { quality: "highestvideo" });
  const audioStream = ytdl(videoUrl, { quality: "highestaudio" });

  // Download video and audio simultaneously
  await Promise.all([
    downloadStream(videoStream, videoPath, title, "video", videoBar),
    downloadStream(audioStream, audioPath, title, "audio", audioBar),
  ]);

  // Merge Audio and Video
  await mergeAudioAndVideo(videoPath, audioPath, outputPath);

  // Cleanup
  fs.unlinkSync(videoPath);
  fs.unlinkSync(audioPath);

  console.log(`Downloaded and merged: ${title}\n`);
}

// Function to download a playlist
async function downloadPlaylist(downloadOptions) {
  try {
    const { url: playlistUrl, downloadPath, format } = downloadOptions;
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }

    console.log(`Processing playlist: ${playlistUrl}`);

    let videos = [];
    let selectedFormat = null;

    if (ytpl.validateID(playlistUrl)) {
      const playlist = await ytpl(playlistUrl);
      videos = playlist.items
        .filter((item) => item.isPlayable)
        .map((item) => item.shortUrl);
      console.log(`Found ${videos.length} playable videos in the playlist.`);
    } else if (ytdl.validateURL(playlistUrl)) {
      videos = [playlistUrl];
    } else {
      console.error("Invalid YouTube URL or Playlist ID.");
      return;
    }

    if (videos.length === 0) {
      console.log("No videos found to download.");
      return;
    }

    if (format === "video") {
      if (ytdl.validateURL(videos[0])) {
        selectedFormat = await selectVideoFormat(videos[0]);
      } else {
        console.error("Invalid video URL found in the playlist.");
        return;
      }
    }

    for (const videoUrl of videos) {
      if (!ytdl.validateURL(videoUrl)) {
        console.error(`Invalid video URL: ${videoUrl}`);
        continue;
      }

      const info = await ytdl.getInfo(videoUrl);
      const title = info.videoDetails.title
        .replace(/[<>:"\/\\|?*]+/g, "")
        .replace(/\s{2,}/g, " ");
      await downloadAndMerge(videoUrl, downloadPath, title);
    }
  } catch (error) {
    console.error(
      chalk.red(`Error in download and merge for ${title}: ${error.message}`)
    );
  } finally {
    // Cleanup
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }
}

async function main() {
  try {
    const downloadOptions = {
      url: "https://www.youtube.com/watch?v=kXvOwXbdhPY",
      downloadPath: "/Users/maheshbabuchoda/Desktop/Youtube Videos",
      downloadFormat: "video",
    };
    await downloadPlaylist(downloadOptions);
  } catch (error) {
    console.error(chalk.red(`Error in download playlist: ${error.message}`));
  }
}

main();
