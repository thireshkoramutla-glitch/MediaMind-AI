let generatedScenes = [];

function generateScenes() {

    const storyInput = document.getElementById("storyInput");
    const styleSelect = document.getElementById("styleSelect");
    const sceneCountInput = document.getElementById("sceneCount");

    const resultSection = document.getElementById("resultSection");
    const sceneContainer = document.getElementById("sceneContainer");

    if (!storyInput || !styleSelect || !sceneCountInput) {
        return;
    }

    const story = storyInput.value.trim();

    if (story.length < 20) {
        alert("దయచేసి కనీసం 20 characters ఉన్న story ఇవ్వండి.");
        return;
    }

    const style = styleSelect.value;
    const sceneCount = parseInt(sceneCountInput.value);

    const sentences = story
        .split(/[.!?]+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0);

    generatedScenes = [];

    for (let i = 0; i < sceneCount; i++) {

        let text;

        if (sentences[i]) {
            text = sentences[i];
        } else {
            text = sentences[i % sentences.length];
        }

        const prompt =
            `${style} style cinematic scene: ${text}, `
            + `high quality, detailed, dramatic lighting`;

        generatedScenes.push({
            scene: i + 1,
            text: text,
            prompt: prompt
        });
    }

    sceneContainer.innerHTML = "";

    generatedScenes.forEach(function (scene) {

        const card = document.createElement("div");

        card.className = "feature-card";

        card.style.marginBottom = "20px";

        card.innerHTML = `
            <h3>Scene ${scene.scene}</h3>

            <p style="margin:15px 0;">
                ${escapeHTML(scene.text)}
            </p>

            <textarea readonly>${escapeHTML(scene.prompt)}</textarea>

            <br><br>

            <button class="btn primary"
                onclick="copyPrompt(${scene.scene - 1})">
                📋 Copy Prompt
            </button>
        `;

        sceneContainer.appendChild(card);

    });

    resultSection.style.display = "block";

    resultSection.scrollIntoView({
        behavior: "smooth"
    });
}


function copyPrompt(index) {

    if (!generatedScenes[index]) {
        return;
    }

    const prompt = generatedScenes[index].prompt;

    navigator.clipboard.writeText(prompt)
        .then(function () {
            alert("Prompt copied!");
        })
        .catch(function () {
            alert("Prompt copy failed.");
        });

}


function escapeHTML(text) {

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}