import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();

// =============================
// ELEMENTS
// =============================

const autoCaption =
    document.getElementById("autoCaption");

const captionStatus =
    document.getElementById("captionStatus");

const captionText =
    document.getElementById("captionText");

const progressContainer =
    document.getElementById("progressContainer");

const progressBar =
    document.getElementById("progressBar");

const progressText =
    document.getElementById("progressText");

const videoInput =
    document.getElementById("videoInput");

const previewSection =
    document.getElementById("videoPreview");

const previewPlayer =
    document.getElementById("previewPlayer");

const fileName =
    document.getElementById("fileName");

const durationText =
    document.getElementById("durationText");

const trimSection =
    document.getElementById("trimSection");

const startTimeInput =
    document.getElementById("startTime");

const endTimeInput =
    document.getElementById("endTime");

const reelDurationInput =
    document.getElementById("reelDuration");

const aspectRatioInput =
    document.getElementById("aspectRatio");

const ffmpegStatus =
    document.getElementById("ffmpegStatus");

const reelResult =
    document.getElementById("reelResult");

const resultVideo =
    document.getElementById("resultVideo");

const reelDetails =
    document.getElementById("reelDetails");

const downloadReel =
    document.getElementById("downloadReel");

// =============================
// VARIABLES
// =============================

let selectedVideo = null;
let videoURL = null;
let videoDuration = 0;
let reelURL = null;
let ffmpegLoaded = false;

// Caption data
let captionSegments = [];
let captionFullText = "";

// =============================
// FFMPEG PROGRESS
// =============================

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

        progressContainer.style.display =
            "block";

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

// =============================
// LOAD FFMPEG
// =============================

async function loadFFmpeg() {

    if (ffmpegLoaded) {
        return;
    }

    try {

        ffmpegStatus.textContent =
            "🟡 Loading FFmpeg...";

        const baseURL =
            "/node_modules/@ffmpeg/core/dist/esm";

        await ffmpeg.load({

            coreURL:
                await toBlobURL(
                    baseURL +
                    "/ffmpeg-core.js",
                    "text/javascript"
                ),

            wasmURL:
                await toBlobURL(
                    baseURL +
                    "/ffmpeg-core.wasm",
                    "application/wasm"
                )

        });

        ffmpegLoaded = true;

        ffmpegStatus.textContent =
            "🟢 FFmpeg Ready";

        console.log(
            "FFmpeg loaded successfully"
        );

    } catch (error) {

        console.error(
            "FFmpeg Loading Error:",
            error
        );

        ffmpegStatus.textContent =
            "🔴 FFmpeg Loading Failed";

        throw error;

    }

}

// =============================
// VIDEO UPLOAD
// =============================

if (videoInput) {

    videoInput.addEventListener(
        "change",
        function () {

            const file =
                this.files[0];

            if (!file) {
                return;
            }

            if (!file.type.startsWith("video/")) {

                alert(
                    "Please select a video file."
                );

                return;
            }

            selectedVideo = file;

            // Reset captions
            captionSegments = [];
            captionFullText = "";

            if (captionText) {
                captionText.value = "";
            }

            videoURL =
                URL.createObjectURL(file);

            if (previewPlayer) {

                previewPlayer.src =
                    videoURL;

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

            loadFFmpeg();

        }
    );

}

// =============================
// VIDEO METADATA
// =============================

if (previewPlayer) {

    previewPlayer.addEventListener(
        "loadedmetadata",
        function () {

            videoDuration =
                previewPlayer.duration;

            if (durationText) {

                durationText.textContent =
                    "Duration: " +
                    videoDuration.toFixed(1) +
                    " seconds";

            }

            if (endTimeInput) {

                endTimeInput.value =
                    Math.min(
                        15,
                        Math.floor(videoDuration)
                    );

            }

        }
    );

}

// =============================
// REEL DURATION UPDATE
// =============================

if (reelDurationInput) {

    reelDurationInput.addEventListener(
        "change",
        function () {

            const duration =
                Number(this.value);

            const start =
                Number(
                    startTimeInput.value
                );

            if (videoDuration > 0) {

                endTimeInput.value =
                    Math.min(
                        start + duration,
                        videoDuration
                    );

            }

        }
    );

}

// =============================
// REAL AUTO CAPTION
// SPEECH → TEXT + SEGMENTS
// =============================

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
            "http://localhost:3000/api/transcribe",
            {
                method: "POST",
                body: formData
            }
        );

    const data =
        await response.json();

    if (!response.ok || !data.success) {

        throw new Error(
            data.error ||
            "Transcription failed"
        );

    }

    console.log(
        "🎤 Transcription:",
        data
    );

    // Full text
    captionFullText =
        data.text || "";

    // Timestamp segments
    captionSegments =
        Array.isArray(data.segments)
            ? data.segments
            : [];

    if (captionText) {

        captionText.value =
            captionFullText;

    }

    console.log(
        "🕒 Caption Segments:",
        captionSegments
    );

    if (captionStatus) {

        captionStatus.textContent =
            "✅ Auto Captions: Speech converted successfully!";

    }

    return data;

}

// =============================
// ESCAPE CAPTION TEXT
// =============================

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
            /\\/g,
            ""
        )

        .replace(
            /'/g,
            ""
        )

        .replace(
            /"/g,
            ""
        )

        .replace(
            /%/g,
            ""
        )

        .trim();

}

// =============================
// CREATE CAPTION FILTER
// =============================

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

    captionSegments.forEach(
        (segment, index) => {

            if (
                !segment ||
                typeof segment.start !== "number" ||
                typeof segment.end !== "number"
            ) {

                return;

            }

            // Original video timing
            let segmentStart =
                Number(segment.start);

            let segmentEnd =
                Number(segment.end);

            // Convert to reel timing
            let relativeStart =
                segmentStart -
                startTime;

            let relativeEnd =
                segmentEnd -
                startTime;

            // Skip segments outside reel
            if (
                relativeEnd <= 0 ||
                relativeStart >= finalDuration
            ) {

                return;

            }

            relativeStart =
                Math.max(
                    0,
                    relativeStart
                );

            relativeEnd =
                Math.min(
                    finalDuration,
                    relativeEnd
                );

            const text =
                cleanCaptionText(
                    segment.text
                );

            if (!text) {
                return;
            }

            /*
             * drawtext:
             * white text
             * black outline
             * center bottom
             */

            const filter =
                "drawtext=" +
                "text='" +
                text +
                "':" +
                "fontcolor=white:" +
                "fontsize=42:" +
                "fontweight=bold:" +
                "borderw=4:" +
                "bordercolor=black:" +
                "x=(w-text_w)/2:" +
                "y=h-180:" +
                "enable='between(t," +
                relativeStart.toFixed(2) +
                "," +
                relativeEnd.toFixed(2) +
                ")'";

            filters.push(filter);

        }
    );

    return filters.join(",");

}

// =============================
// CREATE REEL
// =============================

async function createReel() {

    if (!selectedVideo) {

        alert(
            "Please upload a video first."
        );

        return;
    }

    const startTime =
        Number(
            startTimeInput.value
        );

    let endTime =
        Number(
            endTimeInput.value
        );

    const selectedDuration =
        Number(
            reelDurationInput.value
        );

    // =============================
    // VALIDATION
    // =============================

    if (startTime < 0) {

        alert(
            "Start time cannot be negative."
        );

        return;
    }

    if (startTime >= videoDuration) {

        alert(
            "Start time is outside the video."
        );

        return;
    }

    if (endTime <= startTime) {

        alert(
            "End time must be greater than start time."
        );

        return;
    }

    if (endTime > videoDuration) {

        endTime =
            videoDuration;

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

    // =============================
    // LOAD FFMPEG
    // =============================

    try {

        if (!ffmpegLoaded) {

            await loadFFmpeg();

        }

    } catch (error) {

        alert(
            "FFmpeg could not be loaded."
        );

        return;

    }

    if (!ffmpegLoaded) {

        alert(
            "FFmpeg is not ready."
        );

        return;
    }

    // =============================
    // UI STATUS
    // =============================

    if (ffmpegStatus) {

        ffmpegStatus.textContent =
            "🟡 Creating Reel... Please wait";

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

    // =============================
    // AUTO CAPTION
    // =============================

    let captionsEnabled =
        false;

    if (
        autoCaption &&
        autoCaption.checked
    ) {

        try {

            await transcribeVideo();

            captionsEnabled =
                captionSegments.length > 0;

            if (
                !captionsEnabled &&
                captionFullText
            ) {

                console.log(
                    "No timestamp segments found."
                );

            }

        } catch (error) {

            console.error(
                "Caption Error:",
                error
            );

            captionsEnabled =
                false;

            if (captionStatus) {

                captionStatus.style.display =
                    "block";

                captionStatus.textContent =
                    "❌ Auto Captions failed: " +
                    error.message;

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

    // =============================
    // CREATE FILES
    // =============================

    try {

        const inputName =
            "input.mp4";

        const outputName =
            "mediamind-reel.mp4";

        // =============================
        // WRITE VIDEO
        // =============================

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

        // =============================
        // ASPECT RATIO
        // =============================

        let videoFilter;

        if (
            aspectRatioInput.value ===
            "9:16"
        ) {

            videoFilter =
                "scale=720:1280:" +
                "force_original_aspect_ratio=decrease," +
                "pad=720:1280:" +
                "(ow-iw)/2:" +
                "(oh-ih)/2";

        } else {

            videoFilter =
                "scale=1080:1080:" +
                "force_original_aspect_ratio=decrease," +
                "pad=1080:1080:" +
                "(ow-iw)/2:" +
                "(oh-ih)/2";

        }

        // =============================
        // CAPTION FILTER
        // =============================

        let finalVideoFilter =
            videoFilter;

        if (captionsEnabled) {

            try {

                const captionFilter =
                    createCaptionFilter(
                        startTime,
                        finalDuration
                    );

                if (captionFilter) {

                    finalVideoFilter =
                        videoFilter +
                        "," +
                        captionFilter;

                    console.log(
                        "📝 Caption filter created:",
                        finalVideoFilter
                    );

                }

            } catch (captionFilterError) {

                console.error(
                    "Caption Filter Error:",
                    captionFilterError
                );

            }

        }

        // =============================
        // RUN FFMPEG
        // =============================

        if (ffmpegStatus) {

            ffmpegStatus.textContent =
                captionsEnabled
                    ? "🟡 Burning captions into video..."
                    : "🟡 Creating Reel...";

        }

        console.log(
            "🎬 Final FFmpeg Filter:",
            finalVideoFilter
        );

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

            "-c:a",
            "aac",

            "-b:a",
            "128k",

            "-movflags",
            "+faststart",

            outputName

        ]);

        // =============================
        // READ OUTPUT
        // =============================

        const data =
            await ffmpeg.readFile(
                outputName
            );

        const blob =
            new Blob(
                [data.buffer],
                {
                    type: "video/mp4"
                }
            );

        // =============================
        // CREATE URL
        // =============================

        if (reelURL) {

            URL.revokeObjectURL(
                reelURL
            );

        }

        reelURL =
            URL.createObjectURL(
                blob
            );

        // =============================
        // SHOW RESULT
        // =============================

        if (resultVideo) {

            resultVideo.src =
                reelURL;

            resultVideo.style.display =
                "block";

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
                    ${aspectRatioInput.value}
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
                            : (
                                autoCaption &&
                                autoCaption.checked
                            )
                                ? "Enabled but no caption segments"
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

        // =============================
        // CLEANUP
        // =============================

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
            "Reel Creation Error:",
            error
        );

        if (ffmpegStatus) {

            ffmpegStatus.textContent =
                "🔴 Reel Creation Failed";

        }

        console.error(
            "Full Error:",
            error.message
        );

        alert(
            "Reel creation failed.\n\n" +
            error.message
        );

    }

}

// =============================
// PREVIEW REEL
// =============================

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

        resultVideo.play();

    }

}

// =============================
// MAKE FUNCTIONS AVAILABLE
// =============================

window.createReel =
    createReel;

window.previewReel =
    previewReel;