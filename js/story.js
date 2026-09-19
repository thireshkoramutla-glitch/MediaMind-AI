const storyInput = document.getElementById("storyInput");
const generateBtn = document.getElementById("generateBtn");
const results = document.getElementById("results");
const imageResults = document.getElementById("imageResults");

generateBtn.addEventListener("click", async () => {

    const story = storyInput.value.trim();

    if (!story) {
        alert("Please enter your story.");
        return;
    }

    const sentences = story
        .split(/[.!?]+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0);

    if (sentences.length === 0) {
        alert("Please enter a valid story.");
        return;
    }

    imageResults.innerHTML = "";

    results.style.display = "block";

    for (let index = 0; index < sentences.length; index++) {

        const sentence = sentences[index];

        const prompt = `
Create a highly detailed realistic cinematic image.

Scene:
${sentence}

Style:
cinematic photography,
dramatic lighting,
beautiful composition,
realistic details,
professional photography,
16:9 aspect ratio.
        `.trim();

        const card = document.createElement("div");

        card.style.cssText = `
            background:white;
            border:1px solid #e5e7eb;
            border-radius:14px;
            padding:20px;
            margin-top:20px;
            box-shadow:0 5px 15px rgba(0,0,0,0.06);
        `;

        card.innerHTML = `
            <h3 style="color:#2563eb;">
                Scene ${index + 1}
            </h3>

            <p style="line-height:1.6;">
                <strong>Story:</strong>
                ${escapeHTML(sentence)}
            </p>

            <div style="
                margin-top:15px;
                background:#f8fafc;
                padding:15px;
                border-radius:10px;
                line-height:1.6;
            ">
                <strong>AI Image Prompt:</strong><br>
                ${escapeHTML(prompt)}
            </div>

            <p class="image-status" style="
                margin-top:20px;
                font-weight:bold;
            ">
                🖼️ Generating image...
            </p>

            <div class="image-container"></div>

            <button
                class="copy-btn"
                style="
                    margin-top:15px;
                    padding:10px 18px;
                    border:none;
                    border-radius:8px;
                    background:#2563eb;
                    color:white;
                    cursor:pointer;
                "
            >
                Copy Prompt
            </button>
        `;

        imageResults.appendChild(card);

        const status = card.querySelector(".image-status");
        const imageContainer = card.querySelector(".image-container");
        const copyBtn = card.querySelector(".copy-btn");

        copyBtn.addEventListener("click", async () => {

            await navigator.clipboard.writeText(prompt);

            copyBtn.textContent = "Copied ✓";

            setTimeout(() => {
                copyBtn.textContent = "Copy Prompt";
            }, 1500);
        });

        try {

            const response = await fetch(
                "http://localhost:3000/api/generate-image",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        prompt: prompt
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error || "Image generation failed"
                );
            }

            const image = document.createElement("img");

            image.src = `data:image/png;base64,${data.image}`;

            image.alt = `AI generated image for Scene ${index + 1}`;

            image.style.cssText = `
                width:100%;
                max-width:900px;
                display:block;
                margin-top:20px;
                border-radius:12px;
            `;

            imageContainer.appendChild(image);

            const downloadBtn = document.createElement("a");

            downloadBtn.href = image.src;
            downloadBtn.download = `mediamind-scene-${index + 1}.png`;

            downloadBtn.textContent = "⬇️ Download Image";

            downloadBtn.style.cssText = `
                display:inline-block;
                margin-top:15px;
                padding:10px 18px;
                background:#2563eb;
                color:white;
                text-decoration:none;
                border-radius:8px;
            `;

            imageContainer.appendChild(downloadBtn);

            status.textContent = "✅ Image generated successfully";

        } catch (error) {

            console.error("Image generation error:", error);

            status.textContent =
                "❌ Image generation failed: " + error.message;

            status.style.color = "red";
        }
    }

    results.scrollIntoView({
        behavior: "smooth"
    });
});


function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}