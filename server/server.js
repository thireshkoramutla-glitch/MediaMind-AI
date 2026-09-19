const express = require("express");
const multer = require("multer");
const cors = require("cors");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 3000;

const projectFolder = path.join(__dirname, "..");
const uploadFolder = path.join(__dirname, "uploads");

// =====================================
// MIDDLEWARE
// =====================================

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(projectFolder));

// =====================================
// API KEYS
// =====================================

console.log(
    "POLLINATIONS API KEY LOADED:",
    process.env.POLLINATIONS_API_KEY ? "YES" : "NO"
);

if (!process.env.POLLINATIONS_API_KEY) {
    console.error(
        "❌ POLLINATIONS_API_KEY is missing in server/.env"
    );
    process.exit(1);
}

console.log("✅ POLLINATIONS_API_KEY loaded");

// OpenAI is optional
let openaiClient = null;

if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    console.log("✅ OPENAI_API_KEY loaded");
} else {
    console.log("ℹ️ OPENAI_API_KEY not found");
}

// =====================================
// UPLOAD FOLDER
// =====================================

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, {
        recursive: true
    });
}

// =====================================
// MULTER
// =====================================

const upload = multer({
    dest: uploadFolder,
    limits: {
        fileSize: 500 * 1024 * 1024
    }
});

// =====================================
// HOME
// =====================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "MediaMind AI Backend Running 🚀"
    });
});

// =====================================
// STATUS
// =====================================

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        pollinationsKeyLoaded:
            Boolean(process.env.POLLINATIONS_API_KEY),

        openAIKeyLoaded:
            Boolean(process.env.OPENAI_API_KEY),

        message:
            "MediaMind AI API is running"
    });
});

// =====================================
// STORY PAGE
// =====================================

app.get("/story-to-images.html", (req, res) => {

    const filePath = path.join(
        projectFolder,
        "story-to-images.html"
    );

    res.sendFile(filePath);
});

// =====================================
// 🖼️ POLLINATIONS IMAGE GENERATION
// =====================================

app.post(
    "/api/generate-image",
    async (req, res) => {

        try {

            const { prompt } = req.body;

            if (!prompt || !prompt.trim()) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Image prompt is required."
                });
            }

            console.log("");
            console.log("==============================");
            console.log("🖼️ POLLINATIONS IMAGE");
            console.log("==============================");

            console.log(
                "⏳ Generating image..."
            );

            const encodedPrompt =
                encodeURIComponent(
                    prompt.trim()
                );

            const imageUrl =
                `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&width=1536&height=864`;

            const response =
                await fetch(
                    imageUrl,
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Bearer ${process.env.POLLINATIONS_API_KEY}`,

                            "Accept":
                                "image/*"
                        }
                    }
                );

            if (!response.ok) {

                const errorText =
                    await response.text();

                console.error(
                    "Pollinations Status:",
                    response.status
                );

                console.error(
                    "Pollinations Error:",
                    errorText
                );

                return res.status(
                    response.status
                ).json({

                    success: false,

                    error:
                        `Pollinations error ${response.status}: ${errorText}`
                });
            }

            const imageBuffer =
                Buffer.from(
                    await response.arrayBuffer()
                );

            const imageBase64 =
                imageBuffer.toString(
                    "base64"
                );

            const mimeType =
                response.headers.get(
                    "content-type"
                ) || "image/jpeg";

            console.log(
                "✅ Image generated successfully"
            );

            res.json({

                success: true,

                image:
                    imageBase64,

                mimeType:
                    mimeType
            });

        } catch (error) {

            console.error(
                "❌ POLLINATIONS IMAGE ERROR:",
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    error.message ||
                    "Image generation failed."
            });
        }
    }
);

// =====================================
// 📖 STORY TO AI PROMPTS
// =====================================

app.post(
    "/api/story-to-images",
    async (req, res) => {

        try {

            const { story } = req.body;

            if (!story || !story.trim()) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Please enter your story."
                });
            }

            if (!openaiClient) {

                return res.status(503).json({

                    success: false,

                    error:
                        "OPENAI_API_KEY is not configured."
                });
            }

            console.log("");
            console.log("==============================");
            console.log("📖 STORY TO IMAGES");
            console.log("==============================");

            const response =
                await openaiClient.responses.create({

                    model:
                        "gpt-5.6-luna",

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

            const prompts =
                response.output_text ||
                "";

            console.log(
                "✅ Prompts generated"
            );

            res.json({

                success: true,

                prompts:
                    prompts
            });

        } catch (error) {

            console.error(
                "❌ STORY ERROR:",
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    error.message ||
                    "Failed to generate prompts."
            });
        }
    }
);

// =====================================
// 🎤 VIDEO TRANSCRIPTION
// POLLINATIONS
// =====================================

app.post(
    "/api/transcribe",
    upload.single("video"),

    async (req, res) => {

        let uploadedFile = null;

        try {

            // ---------------------------------
            // CHECK API KEY
            // ---------------------------------

            if (!process.env.POLLINATIONS_API_KEY) {

                return res.status(503).json({

                    success: false,

                    error:
                        "POLLINATIONS_API_KEY is not configured."
                });
            }

            // ---------------------------------
            // CHECK VIDEO
            // ---------------------------------

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Video file is required."
                });
            }

            uploadedFile =
                req.file.path;

            console.log("");
            console.log("==============================");
            console.log(
                "🎤 POLLINATIONS TRANSCRIPTION"
            );
            console.log("==============================");

            console.log(
                "⏳ Converting speech to text..."
            );

            // ---------------------------------
            // READ VIDEO FILE
            // ---------------------------------

            const fileBuffer =
                fs.readFileSync(
                    req.file.path
                );

            // ---------------------------------
            // CREATE FORM DATA
            // ---------------------------------

            const formData =
                new FormData();

            formData.append(
                "file",

                new Blob(
                    [fileBuffer],

                    {
                        type:
                            req.file.mimetype ||
                            "video/mp4"
                    }
                ),

                req.file.originalname ||
                "video.mp4"
            );

            // ---------------------------------
            // TRANSCRIPTION MODEL
            // ---------------------------------

            formData.append(
                "model",
                "whisper-1"
            );

            formData.append(
                "response_format",
                "verbose_json"
            );

            formData.append(
                "timestamp_granularities",
                "segment"
            );

            // ---------------------------------
            // SEND TO POLLINATIONS
            // ---------------------------------

            const response =
                await fetch(

                    "https://gen.pollinations.ai/v1/audio/transcriptions",

                    {

                        method: "POST",

                        headers: {

                            "Authorization":
                                `Bearer ${process.env.POLLINATIONS_API_KEY}`
                        },

                        body:
                            formData
                    }
                );

            const responseText =
                await response.text();

            console.log(
                "Pollinations Transcription Status:",
                response.status
            );

            // ---------------------------------
            // ERROR
            // ---------------------------------

            if (!response.ok) {

                console.error(
                    "❌ Transcription Error:",
                    responseText
                );

                return res.status(
                    response.status
                ).json({

                    success: false,

                    error:
                        `Pollinations transcription error ${response.status}: ${responseText}`
                });
            }

            // ---------------------------------
            // PARSE RESULT
            // ---------------------------------

            const transcription =
                JSON.parse(
                    responseText
                );

            // ---------------------------------
            // SEGMENTS
            // ---------------------------------

            const segments =
                Array.isArray(
                    transcription.segments
                )

                    ?

                    transcription.segments.map(
                        (segment, index) => ({

                            id:
                                segment.id ??
                                index,

                            start:
                                Number(
                                    segment.start ||
                                    0
                                ),

                            end:
                                Number(
                                    segment.end ||
                                    0
                                ),

                            text:
                                segment.text
                                    ? segment.text.trim()
                                    : ""
                        })
                    )

                    :

                    [];

            console.log(
                "✅ Transcription completed"
            );

            // ---------------------------------
            // SEND RESULT
            // ---------------------------------

            res.json({

                success: true,

                text:
                    transcription.text ||
                    "",

                language:
                    transcription.language ||
                    null,

                duration:
                    transcription.duration ||
                    null,

                segments:
                    segments
            });

        } catch (error) {

            console.error(
                "❌ TRANSCRIPTION ERROR:",
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    error.message ||
                    "Transcription failed."
            });

        } finally {

            // ---------------------------------
            // DELETE TEMP VIDEO
            // ---------------------------------

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
                        "⚠️ Delete error:",
                        deleteError.message
                    );
                }
            }
        }
    }
);

// =====================================
// ERROR HANDLER
// =====================================

app.use(
    (error, req, res, next) => {

        console.error(
            "❌ Server Error:",
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
                error.message ||
                "Server error"
        });
    }
);

// =====================================
// 🚀 START SERVER
// =====================================

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