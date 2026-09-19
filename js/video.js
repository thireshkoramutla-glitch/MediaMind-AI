import { FFmpeg } from "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js";
import { fetchFile, toBlobURL } from "https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js";

const ffmpeg = new FFmpeg();

let ffmpegLoaded = false;
let selectedVideo = null;
let videoURL = null;
let reelURL = null;
let videoDuration = 0;

let captionSegments = [];
let captionFullText = "";

// =====================================
// ELEMENTS
// =====================================

const videoInput = document.getElementById("videoInput");
const previewSection = document.getElementById("videoPreview");
const previewPlayer = document.getElementById("previewPlayer");
const fileName = document.getElementById("fileName");
const durationText = document.getElementById("durationText");

const trimSection = document.getElementById("trimSection");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");

const reelDurationInput = document.getElementById("reelDuration");
const aspectRatioInput = document.getElementById("aspectRatio");

const ffmpegStatus = document.getElementById("ffmpegStatus");

const progressContainer =
    document.getElementById("progressContainer");

const progressBar =
    document.getElementById("progressBar");

const progressText =
    document.getElementById("progressText");

const reelResult =
    document.getElementById("reelResult");

const resultVideo =
    document.getElementById("resultVideo");

const reelDetails =
    document.getElementById("reelDetails");

const downloadReel =
    document.getElementById("downloadReel");

const autoCaption =
    document.getElementById("autoCaption");

const captionStatus =
    document.getElementById("captionStatus");

const captionText =
    document.getElementById("captionText");

// =====================================
// FFMPEG PROGRESS
// =====================================

ffmpeg.on("progress", ({ progress }) => {

    const percent =
        Math.max(
            0,
            Math.min(
                100,
                Math.round(progress * 100)
            )
        );

    if (progressContainer) {
        progressContainer.style.display = "block";
    }

    if (progressBar) {
        progressBar.style.width =
            percent + "%";
    }

    if (progressText) {
        progressText.textContent =
            percent + "%";
    }

});

// =====================================
// LOAD FFMPEG
// =====================================

async function loadFFmpeg() {

    if (ffmpegLoaded) {
        return true;
    }

    try {

        if (ffmpegStatus) {
            ffmpegStatus.textContent =
                "🟡 Loading FFmpeg...";
        }

        const baseURL =
            "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

        await ffmpeg.load({

            coreURL:
                await toBlobURL(
                    `${baseURL}/ffmpeg-core.js`,
                    "text/javascript"
                ),

            wasmURL:
                await toBlobURL(
                    `${baseURL}/ffmpeg-core.wasm`,
                    "application/wasm"
                )

        });

        ffmpegLoaded = true;

        if (ffmpegStatus) {
            ffmpegStatus.textContent =
                "🟢 FFmpeg Ready";
        }

        console.log(
            "✅ FFmpeg loaded successfully"
        );

        return true;

    } catch (error) {

        console.error(
            "❌ FFmpeg Loading Error:",
            error
        );

        if (ffmpegStatus) {
            ffmpegStatus.textContent =
                "⚪ FFmpeg not loaded";
        }

        return false;
    }

}

// =====================================
// CLEAR OLD REEL
// =====================================

function clearOldReel() {

    if (reelURL) {

        URL.revokeObjectURL(
            reelURL
        );

        reelURL = null;
    }

    if (resultVideo) {

        resultVideo.pause();

        resultVideo.removeAttribute(
            "src"
        );

        resultVideo.load();

        resultVideo.style.display =
            "none";
    }

    if (downloadReel) {

        downloadReel.removeAttribute(
            "href"
        );

        downloadReel.style.display =
            "none";
    }

    if (reelResult) {
        reelResult.style.display =
            "none";
    }

}

// =====================================
// CLEAN CAPTION TEXT
// =====================================

function cleanCaptionText(text) {

    if (!text) {
        return "";
    }

    return String(text)
        .replace(
            /[\r\n]+/g,
            " "
        )
        .replace(
            /[^A-Za-z0-9 ]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}

// =====================================
// VIDEO FILTER
// =====================================

function makeVideoFilter(ratio) {

    if (ratio === "1:1") {

        return [
            "scale=1080:1080:force_original_aspect_ratio=decrease",
            "pad=1080:1080:(ow-iw)/2:(oh-ih)/2"
        ].join(",");

    }

    return [
        "scale=720:1280:force_original_aspect_ratio=decrease",
        "pad=720:1280:(ow-iw)/2:(oh-ih)/2"
    ].join(",");

}

// =====================================
// CREATE CAPTION FILTER
// =====================================

function createCaptionFilter(
    startTime,
    finalDuration
) {

    if (
        !captionSegments ||
        captionSegments.length === 0
    ) {
        return "";
    }

    const filters = [];

    for (const segment of captionSegments) {

        const segStart =
            Number(segment?.start);

        const segEnd =
            Number(segment?.end);

        if (
            !Number.isFinite(segStart) ||
            !Number.isFinite(segEnd)
        ) {
            continue;
        }

        if (
            segEnd <= startTime
        ) {
            continue;
        }

        if (
            segStart >=
            startTime + finalDuration
        ) {
            continue;
        }

        let relativeStart =
            Math.max(
                0,
                segStart - startTime
            );

        let relativeEnd =
            Math.min(
                finalDuration,
                segEnd - startTime
            );

        if (
            relativeEnd <=
            relativeStart
        ) {
            continue;
        }

        const text =
            cleanCaptionText(
                segment?.text
            );

        if (!text) {
            continue;
        }

        const escapedText =
            text.replace(
                /:/g,
                "\\:"
            );

        const filter =
            "drawtext=" +
            "text='" +
            escapedText +
            "':" +
            "fontcolor=white:" +
            "fontsize=42:" +
            "borderw=4:" +
            "bordercolor=black:" +
            "x=(w-text_w)/2:" +
            "y=h-180:" +
            "enable='between(t\\," +
            relativeStart.toFixed(2) +
            "\\," +
            relativeEnd.toFixed(2) +
            ")'";

        filters.push(filter);

    }

    return filters.join(",");

}

// =====================================
// VIDEO UPLOAD
// =====================================

if (videoInput) {

    videoInput.addEventListener(
        "change",
        async function () {

            const file =
                this.files?.[0];

            if (!file) {
                return;
            }

            if (
                !file.type.startsWith(
                    "video/"
                )
            ) {

                alert(
                    "Please select a video file."
                );

                this.value = "";

                return;
            }

            selectedVideo = file;

            console.log(
                "🎥 Selected video:",
                file.name
            );

            clearOldReel();

            captionSegments = [];
            captionFullText = "";

            if (captionText) {
                captionText.value = "";
            }

            if (captionStatus) {
                captionStatus.style.display =
                    "none";
            }

            if (videoURL) {

                URL.revokeObjectURL(
                    videoURL
                );
            }

            videoURL =
                URL.createObjectURL(
                    file
                );

            if (previewPlayer) {

                previewPlayer.src =
                    videoURL;

                previewPlayer.load();
            }

            if (previewSection) {
                previewSection.style.display =
                    "block";
            }

            if (trimSection) {
                trimSection.style.display =
                    "block";
            }

            if (fileName) {

                fileName.textContent =
                    "Selected: " +
                    file.name;
            }

            if (durationText) {

                durationText.textContent =
                    "Loading video...";
            }

            await loadFFmpeg();

        }
    );

}

// =====================================
// VIDEO METADATA
// =====================================

if (previewPlayer) {

    previewPlayer.addEventListener(
        "loadedmetadata",
        () => {

            videoDuration =
                previewPlayer.duration;

            if (durationText) {

                durationText.textContent =
                    "Duration: " +
                    videoDuration.toFixed(1) +
                    " seconds";
            }

            if (endTimeInput) {

                const selectedDuration =
                    Number(
                        reelDurationInput?.value ||
                        15
                    );

                endTimeInput.value =
                    Math.min(
                        selectedDuration,
                        Math.floor(
                            videoDuration
                        )
                    );
            }

        }
    );

}

// =====================================
// REEL DURATION CHANGE
// =====================================

if (reelDurationInput) {

    reelDurationInput.addEventListener(
        "change",
        () => {

            const duration =
                Number(
                    reelDurationInput.value ||
                    15
                );

            const start =
                Number(
                    startTimeInput?.value ||
                    0
                );

            if (
                endTimeInput &&
                videoDuration > 0
            ) {

                endTimeInput.value =
                    Math.min(
                        start + duration,
                        videoDuration
                    );
            }

        }
    );

}

// =====================================
// TRANSCRIBE VIDEO
// =====================================

async function transcribeVideo() {

    if (!selectedVideo) {

        throw new Error(
            "Please select a video first."
        );
    }

    if (captionStatus) {

        captionStatus.style.display =
            "block";

        captionStatus.textContent =
            "📝 Auto Captions: Converting speech to text...";
    }

    const formData =
        new FormData();

    formData.append(
        "video",
        selectedVideo
    );

    const response =
        await fetch(
            "https://mediamind-ai-backend.onrender.com/api/transcribe",
            {
                method: "POST",
                body: formData
            }
        );

    const data =
        await response.json();

    console.log(
        "TRANSCRIBE RESPONSE:",
        data
    );

    if (
        !response.ok ||
        !data.success
    ) {

        throw new Error(
            data.error ||
            "Transcription failed"
        );
    }

    captionFullText =
        data.text || "";

    captionSegments =
        Array.isArray(
            data.segments
        )
            ? data.segments
            : [];

    if (captionText) {

        captionText.value =
            captionFullText;
    }

    if (captionStatus) {

        captionStatus.style.display =
            "block";

        captionStatus.textContent =
            "✅ Auto Captions: Speech converted successfully!";
    }

    console.log(
        "🕒 Caption Segments:",
        captionSegments
    );

    return data;

}

// =====================================
// CREATE REEL
// =====================================

async function createReel() {

    if (!selectedVideo) {

        alert(
            "Please upload a video first."
        );

        return;
    }

    if (!ffmpegLoaded) {

        const loaded =
            await loadFFmpeg();

        if (!loaded) {

            alert(
                "FFmpeg could not be loaded. Please refresh the page."
            );

            return;
        }

    }

    const startTime =
        Number(
            startTimeInput?.value ||
            0
        );

    let endTime =
        Number(
            endTimeInput?.value ||
            videoDuration
        );

    const selectedDuration =
        Number(
            reelDurationInput?.value ||
            15
        );

    if (
        startTime < 0 ||
        startTime >= videoDuration
    ) {

        alert(
            "Invalid start time."
        );

        return;
    }

    if (endTime > videoDuration) {
        endTime = videoDuration;
    }

    if (endTime <= startTime) {

        alert(
            "End time must be greater than start time."
        );

        return;
    }

    const finalDuration =
        Math.min(
            endTime - startTime,
            selectedDuration
        );

    if (finalDuration <= 0) {

        alert(
            "Invalid reel duration."
        );

        return;
    }

    if (progressContainer) {
        progressContainer.style.display =
            "block";
    }

    if (progressBar) {
        progressBar.style.width =
            "0%";
    }

    if (progressText) {
        progressText.textContent =
            "0%";
    }

    // =================================
    // AUTO CAPTIONS
    // =================================

    let captionsEnabled =
        false;

    if (
        autoCaption &&
        autoCaption.checked
    ) {

        try {

            await transcribeVideo();

            captionsEnabled =
                captionSegments.length >
                0;

        } catch (error) {

            console.warn(
                "Auto caption failed:",
                error
            );

            captionsEnabled =
                false;

            if (captionStatus) {

                captionStatus.style.display =
                    "block";

                captionStatus.textContent =
                    "⚠️ Auto Captions unavailable. Creating reel without captions.";
            }
        }

    } else {

        captionSegments = [];
        captionFullText = "";

        if (captionStatus) {
            captionStatus.style.display =
                "none";
        }

    }

    const inputName =
        "input.mp4";

    const outputName =
        "mediamind-reel.mp4";

    const ratio =
        aspectRatioInput?.value ||
        "9:16";

    try {

        if (ffmpegStatus) {

            ffmpegStatus.textContent =
                "🟡 Loading video into FFmpeg...";
        }

        await ffmpeg.writeFile(
            inputName,
            await fetchFile(
                selectedVideo
            )
        );

        let finalVideoFilter =
            makeVideoFilter(
                ratio
            );

        if (captionsEnabled) {

            const captionFilter =
                createCaptionFilter(
                    startTime,
                    finalDuration
                );

            if (captionFilter) {

                finalVideoFilter +=
                    "," +
                    captionFilter;
            }
        }

        console.log(
            "🎬 Final FFmpeg filter:",
            finalVideoFilter
        );

        if (ffmpegStatus) {

            ffmpegStatus.textContent =
                captionsEnabled
                    ? "🟡 Burning captions into video..."
                    : "🟡 Creating Reel...";
        }

        await ffmpeg.exec([

            "-ss",
            String(startTime),

            "-i",
            inputName,

            "-t",
            String(finalDuration),

            "-vf",
            finalVideoFilter,

            "-c:v",
            "libx264",

            "-preset",
            "ultrafast",

            "-crf",
            "28",

            "-pix_fmt",
            "yuv420p",

            "-tag:v",
            "avc1",

            "-c:a",
            "aac",

            "-b:a",
            "128k",

            "-movflags",
            "+faststart",

            outputName

        ]);

        const data =
            await ffmpeg.readFile(
                outputName
            );

        const blob =
            new Blob(
                [data],
                {
                    type: "video/mp4"
                }
            );

        if (reelURL) {

            URL.revokeObjectURL(
                reelURL
            );
        }

        reelURL =
            URL.createObjectURL(
                blob
            );

        if (resultVideo) {

            resultVideo.pause();

            resultVideo.removeAttribute(
                "src"
            );

            resultVideo.load();

            resultVideo.src =
                reelURL;

            resultVideo.controls =
                true;

            resultVideo.playsInline =
                true;

            resultVideo.style.display =
                "block";

            resultVideo.load();
        }

        if (downloadReel) {

            downloadReel.href =
                reelURL;

            downloadReel.download =
                "MediaMind-AI-Reel.mp4";

            downloadReel.style.display =
                "inline-block";
        }

        if (reelDetails) {

            reelDetails.innerHTML = `

                <p>
                    <strong>Format:</strong>
                    MP4
                </p>

                <p>
                    <strong>Duration:</strong>
                    ${finalDuration.toFixed(1)}
                    seconds
                </p>

                <p>
                    <strong>Aspect Ratio:</strong>
                    ${ratio}
                </p>

                <p>
                    <strong>Start:</strong>
                    ${startTime.toFixed(1)}
                    seconds
                </p>

                <p>
                    <strong>Auto Captions:</strong>
                    ${
                        captionsEnabled
                            ? "Burned into video ✅"
                            : "Disabled"
                    }
                </p>

            `;
        }

        if (reelResult) {
            reelResult.style.display =
                "block";
        }

        if (ffmpegStatus) {

            ffmpegStatus.textContent =
                captionsEnabled
                    ? "🟢 Reel + Captions Created Successfully!"
                    : "🟢 Reel Created Successfully!";
        }

        if (progressBar) {
            progressBar.style.width =
                "100%";
        }

        if (progressText) {
            progressText.textContent =
                "100%";
        }

        // =================================
        // CLEANUP
        // =================================

        try {

            await ffmpeg.deleteFile(
                inputName
            );

            await ffmpeg.deleteFile(
                outputName
            );

        } catch (cleanupError) {

            console.log(
                "Cleanup:",
                cleanupError
            );
        }

    } catch (error) {

        console.error(
            "❌ Reel Creation Error:",
            error
        );

        if (ffmpegStatus) {

            ffmpegStatus.textContent =
                "🔴 Reel Creation Failed";
        }

        alert(
            "Reel creation failed.\n\n" +
            (
                error?.message ||
                "Unknown error"
            )
        );

    }

}

// =====================================
// PREVIEW
// =====================================

function previewReel() {

    if (!reelURL) {

        alert(
            "Create the reel first."
        );

        return;
    }

    if (resultVideo) {

        resultVideo.scrollIntoView({
            behavior: "smooth"
        });

        resultVideo
            .play()
            .catch(() => {});
    }

}

// =====================================
// GLOBAL FUNCTIONS
// =====================================

window.createReel =
    createReel;

window.previewReel =
    previewReel;

// =====================================
// INITIALIZE
// =====================================

console.log(
    "🎬 MediaMind AI Video Module Loaded"
);

if (ffmpegStatus) {

    ffmpegStatus.textContent =
        "🟡 FFmpeg Loading...";
}

loadFFmpeg();