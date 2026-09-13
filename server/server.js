const express = require("express");
const multer = require("multer");
const cors = require("cors");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 3000;

// ===============================
// Middleware
// ===============================

app.use(cors());
app.use(express.json());

// ===============================
// Check API Key
// ===============================

console.log(
    "API KEY LOADED:",
    process.env.OPENAI_API_KEY ? "YES" : "NO"
);

if (!process.env.OPENAI_API_KEY) {
    console.log("⚠️ OPENAI_API_KEY is missing in server/.env");
}

// ===============================
// OpenAI Client
// ===============================

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.error("❌ OPENAI_API_KEY not loaded");
    process.exit(1);
}

console.log("✅ OPENAI_API_KEY loaded");

const client = new OpenAI({
    apiKey: apiKey
});
// ===============================
// Upload Folder
// ===============================

const uploadFolder = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, {
        recursive: true
    });
}

// ===============================
// Multer Upload Configuration
// ===============================

const upload = multer({
    dest: uploadFolder,

    limits: {
        fileSize: 500 * 1024 * 1024
    }
});

// ===============================
// Home Route
// ===============================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "MediaMind AI Backend Running 🚀"
    });
});

// ===============================
// API Key Test Route
// ===============================

app.get("/api/status", (req, res) => {

    const keyLoaded = Boolean(
        process.env.OPENAI_API_KEY
    );

    res.json({
        success: true,
        apiKeyLoaded: keyLoaded,
        message: keyLoaded
            ? "API key is loaded"
            : "API key is missing"
    });
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

            // -------------------------------
            // Check API Key
            // -------------------------------

            if (!process.env.OPENAI_API_KEY) {

                return res.status(500).json({
                    success: false,
                    error:
                        "OPENAI_API_KEY is missing in server/.env"
                });
            }

            // -------------------------------
            // Check Video
            // -------------------------------

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    error: "Video file is required"
                });
            }

            uploadedFile = req.file.path;

            console.log("");
            console.log("================================");
            console.log("🎤 Starting transcription");
            console.log("================================");

            console.log(
                "File:",
                req.file.originalname
            );

            console.log(
                "Size:",
                req.file.size,
                "bytes"
            );

            console.log(
                "Temporary file:",
                req.file.path
            );

            // -------------------------------
            // OpenAI Whisper Transcription
            // -------------------------------

            const transcription =
                await client.audio.transcriptions.create({

                    file: fs.createReadStream(
                        req.file.path
                    ),

                    model: "whisper-1",

                    response_format: "verbose_json",

                    timestamp_granularities: [
                        "segment"
                    ]
                });

            console.log("");
            console.log(
                "✅ Transcription completed"
            );

            // -------------------------------
            // Get Segments
            // -------------------------------

            const segments =
                (transcription.segments || [])
                    .map((segment) => {

                        return {

                            id: segment.id,

                            start: segment.start,

                            end: segment.end,

                            text:
                                segment.text
                                    ? segment.text.trim()
                                    : ""
                        };
                    });

            // -------------------------------
            // Response
            // -------------------------------

            res.json({

                success: true,

                text:
                    transcription.text || "",

                language:
                    transcription.language || null,

                duration:
                    transcription.duration || null,

                segments: segments
            });

        } catch (error) {

            console.log("");
            console.log(
                "❌ Transcription error"
            );

            console.error(error);

            // -------------------------------
            // Invalid API Key
            // -------------------------------

            if (
                error &&
                error.code === "invalid_api_key"
            ) {

                return res.status(401).json({

                    success: false,

                    error:
                        "Invalid OpenAI API key. Please check server/.env"
                });
            }

            // -------------------------------
            // Other Errors
            // -------------------------------

            res.status(500).json({

                success: false,

                error:
                    error?.message ||
                    "Transcription failed"
            });

        } finally {

            // -------------------------------
            // Delete Temporary Video
            // -------------------------------

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
// Multer / Server Error Handler
// ===============================

app.use(
    (error, req, res, next) => {

        console.error(
            "❌ Server error:",
            error
        );

        if (
            error instanceof multer.MulterError
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
// Start Server
// ===============================

app.listen(
    PORT,
    () => {

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
    }
);