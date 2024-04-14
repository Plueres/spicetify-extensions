// Wait for 2 second before running the script to ensure that Spicetify has loaded.
console.log('Now Playing Release Date loaded');
setTimeout(() => initialize(), 2000);

async function initialize() {
    try {
        await waitForSpicetify();
        Spicetify.Player.addEventListener("songchange", async () => {
            removeExistingReleaseDateElement(); // Remove the release date element immediately when the song changes.
            await displayReleaseDate();
        });
        await displayReleaseDate(); // Retrieve the release date on initial load.
    } catch (error) {
        console.error('Error initializing:', error);
    }
}

async function waitForSpicetify() {
    while (!Spicetify || !Spicetify.showNotification) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function displayReleaseDate() {
    try {
        const trackId = Spicetify.Player.data.item.uri.split(":")[2];
        const trackDetails = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/tracks/${trackId}`);
        const releaseDate = new Date(trackDetails.album.release_date);
        const formattedReleaseDate = `${String(releaseDate.getDate()).padStart(2, '0')}-${String(releaseDate.getMonth() + 1).padStart(2, '0')}-${releaseDate.getFullYear()}`;

        removeExistingReleaseDateElement();

        // Wait for 1 second before displaying the release date.
        setTimeout(() => {
            const releaseDateElement = createReleaseDateElement(formattedReleaseDate);
            const container = document.querySelector('.main-trackInfo-artists');
            container.appendChild(releaseDateElement);
        }, 1000);
    } catch (error) {
        console.error('Error displaying release date:', error);
    }
}

function removeExistingReleaseDateElement() {
    const existingReleaseDateElement = document.getElementById('releaseDate');
    if (existingReleaseDateElement) {
        existingReleaseDateElement.remove();
    }
}

function createReleaseDateElement(formattedReleaseDate) {
    const releaseDateElement = document.createElement("div");
    releaseDateElement.id = 'releaseDate';
    releaseDateElement.textContent = ` • ${formattedReleaseDate}`;

    const artistElement = document.querySelector('.main-trackInfo-artists a');
    const artistStyles = window.getComputedStyle(artistElement);
    releaseDateElement.style.fontSize = artistStyles.fontSize;
    releaseDateElement.style.fontWeight = artistStyles.fontWeight;
    releaseDateElement.style.minWidth = "fit-content";

    return releaseDateElement;
}