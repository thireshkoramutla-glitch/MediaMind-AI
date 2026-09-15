const express = require("express");
const multer = require("multer");
const cors = require("cors");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 3000;

const serverFolder = __dirname;
const projectFolder = path.join(__dirname, "..");

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());
app.use(express.static(projectFolder));

// ===============================
// OPENAI
// ===============================

console.log(
    "API KEY LOADED:",
    process.env.OPENAI_API_KEY ? "YES" : "NO"
);

if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is missing in server/.env");
    process.exit(1);
}

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

console.log("✅ OPENAI_API_KEY loaded");

// ===============================
// UPLOAD FOLDER
// ===============================

const uploadFolder = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, {
        recursive: true
    });
}

const upload = multer({
    dest: uploadFolder,
    limits: {
        fileSize: 500 * 1024 * 1024
    }
});

// ===============================
// STORY TO IMAGES PAGE
// ===============================

app.get("/story-to-images.html", (req, res) => {

    const filePath = path.join(
        serverFolder,
        "story-to-images.html"
    );

    res.sendFile(filePath);
});

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "MediaMind AI Backend Running 🚀"
    });
});

// ===============================
// API STATUS
// ===============================

app.get("/api/status", (req, res) => {

    res.json({
        success: true,
        apiKeyLoaded: Boolean(
            process.env.OPENAI_API_KEY
        ),
        message: "API is running"
    });
});

// ===============================
// STORY TO IMAGE PROMPTS
// ===============================

app.post("/api/story-to-images", async (req, res) => {

    try {

        const { story } = req.body;

        if (!story || !story.trim()) {

            return res.status(400).json({
                success: false,
                error: "Please enter your story."
            });
        }

        console.log("");
        console.log("==============================");
        console.log("📖 STORY TO IMAGES");
        console.log("==============================");

        const response = await client.responses.create({

            model: "gpt-5.6-luna",

            input: [
                {
                    role: "system",
                    content:
                        "You are an expert cinematic AI image prompt writer."
                },

                {
                    role: "user",
                    content: `
Convert the story below into exactly 5 detailed cinematic AI image prompts.

Rules:

1. Create exactly 5 scenes.
2. Each scene must describe an important moment.
3. Include characters.
4. Include environment.
5. Include lighting.
6. Include camera angle.
7. Include mood.
8. Make the prompts suitable for AI image generation.
9. Do not give explanations.
10. Return only the 5 numbered prompts.

Story:

${story}
`
                }
            ]
        });

        const prompts = response.output_text || "";

        console.log("✅ Prompts generated");

        res.json({
            success: true,
            prompts: prompts
        });

    } catch (error) {

        console.error("");
        console.error("❌ STORY TO IMAGES ERROR");
        console.error(error);

        res.status(500).json({
            success: false,
            error:
                error?.message ||
                "Failed to generate image prompts."
        });
    }
});

// ===============================
// VIDEO TRANSCRIPTION
// ===============================

app.post(
    "/api/transcribe",
    upload.single("video"),
    async (req, res) => {

        let uploadedFile = null;

        try {

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    error: "Video file is required."
                });
            }

            uploadedFile = req.file.path;

            console.log("");
            console.log("==============================");
            console.log("🎤 STARTING TRANSCRIPTION");
            console.log("==============================");

            console.log(
                "File:",
                req.file.originalname
            );

            console.log(
                "Size:",
                req.file.size,
                "bytes"
            );

            const transcription =
                await client.audio.transcriptions.create({

                    file: fs.createReadStream(
                        req.file.path
                    ),

                    model: "whisper-1",

                    response_format:
                        "verbose_json",

                    timestamp_granularities:
                        ["segment"]
                });

            const segments =
                (transcription.segments || [])
                    .map((segment) => ({

                        id: segment.id,

                        start: segment.start,

                        end: segment.end,

                        text:
                            segment.text
                                ? segment.text.trim()
                                : ""
                    }));

            console.log("✅ Transcription completed");

            res.json({

                success: true,

                text:
                    transcription.text || "",

                language:
                    transcription.language || null,

                duration:
                    transcription.duration || null,

                segments:
                    segments
            });

        } catch (error) {

            console.error(
                "❌ Transcription error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error?.message ||
                    "Transcription failed."
            });

        } finally {

            if (uploadedFile) {

                try {

                    if (
                        fs.existsSync(
                            uploadedFile
                        )
                    ) {

                        fs.unlinkSync(
                            uploadedFile
                        );

                        console.log(
                            "🗑️ Temporary video deleted"
                        );
                    }

                } catch (deleteError) {

                    console.error(
                        "⚠️ Could not delete temporary file:",
                        deleteError.message
                    );
                }
            }
        }
    }
);

// ===============================
// MULTER ERROR
// ===============================

app.use(
    (error, req, res, next) => {

        console.error(
            "❌ Server error:",
            error
        );

        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Video file is too large. Maximum size is 500 MB."
                });
            }
        }

        res.status(500).json({

            success: false,

            error:
                error?.message ||
                "Server error"
        });
    }
);

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {

    console.log("");
    console.log(
        "======================================"
    );

    console.log(
        "🚀 MediaMind AI Backend Running"
    );

    console.log(
        `🌐 http://localhost:${PORT}`
    );

    console.log(
        "======================================"
    );

    console.log("");
});