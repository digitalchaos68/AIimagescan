document.getElementById('imageInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            displayImage(imageDataUrl);
            // This is where you would call your defect detection function.
            // Example:
            // detectDefects(imageDataUrl);
        };
        reader.readAsDataURL(file);
    }
});

function displayImage(dataUrl) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = ''; // Clear previous content
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.maxWidth = '100%';
    resultDiv.appendChild(img);
}