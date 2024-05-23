console.log('tags loaded');

// CSS styles
const tagStyle = document.createElement('style');
tagStyle.innerHTML = `
    .main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-artists {
            align-items: center;
        }
    `;

// Get the track details from the Spotify API
async function getTrackDetails_tags() {
    let trackId = Spicetify.Player.data.item.uri.split(":")[2];
    let trackDetails = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/tracks/${trackId}`);
    let savedTracks = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/tracks`);
    //? Uncomment the line below to see the saved tracks in the console
    // console.log('tag:', savedTracks);

    return { trackDetails, savedTracks };
}
// Wait for spicetify to load initially
async function waitForSpicetify() {
    while (!Spicetify || !Spicetify.showNotification) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// Start after 3 seconds to ensure it starts even on slower devices
setTimeout(() => initializeTags(tagStyle), 3000);

async function initializeTags(styleElement) {
    try {
        await waitForSpicetify();
        // Debounce the song change event to prevent multiple calls
        let debounceTimer;
        Spicetify.Player.addEventListener("songchange", async () => {
            // Remove the existing release date element immediately when the song changes
            removeExistingTagElement();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => { await displayTags(); }, 1000);
        });
        await displayTags();
    } catch (error) {
        console.error('Error initializing: ', error, "\nCreate a new issue on the github repo to get this resolved");
    }

    // Add the style element to the head of the document
    document.head.appendChild(styleElement);
}

async function displayTags() {
    try {
        const { trackDetails } = await getTrackDetails_tags();

        // Check if the song is explicit
        if (trackDetails.explicit) {
            // Create a new span element
            const explicitTag = document.createElement('span');

            // Set the attributes and text content of the span
            explicitTag.setAttribute('aria-label', 'Explicit');
            explicitTag.setAttribute('class', 'main-tag-container playing-tag-container');
            explicitTag.setAttribute('title', 'Explicit');
            explicitTag.textContent = 'E';

            // Get the artist name list element (replace 'artistNameList' with the actual id or class of the element)
            const Tagslist = document.querySelector('.main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-enhanced');
            console.log("anl: ", Tagslist);

            // Insert the span before the artist name list
            if (Tagslist) {
                Tagslist.appendChild(explicitTag);
            }
        }

        // Check if the song is downloaded

    } catch (error) {
        console.error('Error displaying tags: ', error);
    }
}
function removeExistingTagElement() {
    const existingTagElements = document.getElementsByClassName('playing-tag-container');
    while (existingTagElements[0]) {
        existingTagElements[0].parentNode.removeChild(existingTagElements[0]);
    }
}