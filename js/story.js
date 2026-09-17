const storyInput = document.getElementById("storyInput");
const generateBtn = document.getElementById("generateBtn");
const results = document.getElementById("results");
const imageResults = document.getElementById("imageResults");

generateBtn.addEventListener("click", () => {

    const story = storyInput.value.trim();

    if (!story) {
        alert("Please enter your story.");
        return;
    }

    // Split story into sentences
    const sentences = story
        .split(/[.!?]+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0);

    if (sentences.length === 0) {
        alert("Please enter a valid story.");
        return;
    }

    imageResults.innerHTML = "";

    sentences.forEach((sentence, index) => {

        const prompt = `
Cinematic AI image for scene ${index + 1}.
Story scene: ${sentence}.
Create a highly detailed, realistic cinematic scene,
dramatic lighting, beautiful composition,
professional photography, 16:9 aspect ratio.
        `.trim();

        const card = document.createElement("div");

        card.style.cssText = `
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 20px;
            margin-top: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.06);
        `;

        card.innerHTML = `
            <h3 style="color:#2563eb; margin-bottom:10px;">
                Scene ${index + 1}
            </h3>

            <p style="line-height:1.6; margin-bottom:15px;">
                <strong>Story:</strong> ${escapeHTML(sentence)}
            </p>

            <div style="
                background:#f8fafc;
                padding:15px;
                border-radius:10px;
                line-height:1.6;
            ">
                <strong>AI Image Prompt:</strong><br>
                ${escapeHTML(prompt)}
            </div>

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

        const copyBtn = card.querySelector(".copy-btn");

        copyBtn.addEventListener("click", async () => {
            await navigator.clipboard.writeText(prompt);
            copyBtn.textContent = "Copied ✓";

            setTimeout(() => {
                copyBtn.textContent = "Copy Prompt";
            }, 1500);
        });

        imageResults.appendChild(card);
    });

    results.style.display = "block";

    results.scrollIntoView({
        behavior: "smooth"
    });
});


function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}