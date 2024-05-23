console.log('tags loaded');

// CSS styles
const tagStyle = document.createElement('style');
tagStyle.innerHTML = `
.main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-enhanced {
        align-items: center;
    }
.playing-tags {
    display: flex;
    gap: 3px;
    min-width: 0;
}
    `;

// Get the track details from the Spotify API
async function getTrackDetails_tags() {
    let trackId = Spicetify.Player.data.item.uri.split(":")[2];
    let trackDetails = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/tracks/${trackId}`);
    let savedTrack = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`);
    let downloadedSongs = await Spicetify.Platform.OfflineAPI._offline.getItems(0, Spicetify.Platform.OfflineAPI._offline.getItems.length)

    // console.log("Currently playing ", trackDetails);

    return { trackDetails, savedTrack, downloadedSongs };
}

const tagObserver = new MutationObserver(async (mutationsList, observer) => {
    // Look through all mutations that just occured
    for (let mutation of mutationsList) {
        // If the addedNodes property has one or more nodes
        if (mutation.addedNodes.length) {
            // Check if the first added node is an element node
            if (mutation.addedNodes[0].nodeType === Node.ELEMENT_NODE) {
                const spicetifyLoaded = mutation.addedNodes[0].querySelector('.main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-enhanced');
                if (spicetifyLoaded) {
                    initializeTags(tagStyle);
                    observer.disconnect();  // Stop observing
                    break;
                }
            }
        }
    }
});
// Start the script
tagObserver.observe(document, { childList: true, subtree: true });

// Wait for spicetify to load initially
async function waitForSpicetify() {
    while (!Spicetify || !Spicetify.showNotification) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}
async function initializeTags(styleElement) {
    try {
        await waitForSpicetify();
        // Debounce the song change event to prevent multiple calls
        let debounceTimer;
        Spicetify.Player.addEventListener("songchange", () => {
            // Remove the existing release date element immediately when the song changes
            removeExistingTagElement();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(displayTags, 3000);
        });
        Spicetify.Player.dispatchEvent(new Event('songchange'));
    } catch (error) {
        console.error('Error initializing: ', error, "\nCreate a new issue on the github repo to get this resolved");
    }

    // Add the style element to the head of the document
    document.head.appendChild(styleElement);
}

async function displayTags() {
    let downloaded = false;
    try {
        const { trackDetails, savedTrack, downloadedSongs } = await getTrackDetails_tags();

        // Get the artist name list element
        const Tagslist = document.querySelector('.main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-enhanced');
        // Create a new div element
        const tagsDiv = document.createElement('div');
        tagsDiv.setAttribute('class', 'playing-tags');

        downloadedSongs.items.forEach(song => {
            if (song.uri.includes(trackDetails.id)) {
                // console.log('curr song: ', song.uri, "\nDownloaded: ", true);
                downloaded = true;
            }
        });

        // Check if the song is downloaded
        if (downloaded) {
            // Create a new span element
            const downloadedSpan = document.createElement('span');

            downloadedSpan.setAttribute('class', 'encore-text encore-text-body-medium encore-internal-color-text-subdued main-trackList-rowBadges');
            downloadedSpan.setAttribute('data-encore-id', 'text');

            const downloadedSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            downloadedSvg.setAttribute('data-encore-id', 'icon');
            downloadedSvg.setAttribute('role', 'img');
            downloadedSvg.setAttribute('aria-hidden', 'false');
            downloadedSvg.setAttribute('viewBox', '0 0 16 16');
            downloadedSvg.setAttribute('class', 'Svg-sc-ytk21e-0 Svg-img-icon-small-textBrightAccent');

            const downloadedTitle = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            downloadedTitle.textContent = 'Available offline';
            const downloadedPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            downloadedPath.setAttribute('d', 'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-4.75a.75.75 0 0 0-.75.75v5.94L6.055 8.744a.75.75 0 1 0-1.06 1.06L8 12.811l3.005-3.006a.75.75 0 1 0-1.06-1.06L8.75 9.939V4A.75.75 0 0 0 8 3.25z');

            downloadedSvg.appendChild(downloadedTitle);
            downloadedSvg.appendChild(downloadedPath);
            downloadedSpan.appendChild(downloadedSvg);

            tagsDiv.appendChild(downloadedSpan);
        }
        // Check if the song is explicit
        if (trackDetails.explicit) {
            // Create a new span element
            const explicitTag = document.createElement('span');

            // Set the attributes and text content of the span
            explicitTag.setAttribute('aria-label', 'Explicit');
            explicitTag.setAttribute('class', 'main-tag-container playing-explicit-tag');
            explicitTag.setAttribute('title', 'Explicit');
            explicitTag.textContent = 'E';

            // Append the span to the div
            tagsDiv.appendChild(explicitTag);
        }
        if (savedTrack[0]) {
            // Create a new span element
            const savedTrackSpan = document.createElement('span');

            // Set the class of the span
            savedTrackSpan.setAttribute('class', 'Wrapper-sm-only Wrapper-small-only');

            // Create a new svg element
            const savedTrackSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

            // Set the attributes of the svg
            savedTrackSvg.setAttribute('role', 'img');
            savedTrackSvg.setAttribute('height', '24');
            savedTrackSvg.setAttribute('width', '24');
            savedTrackSvg.setAttribute('viewBox', '0 0 24 24');
            savedTrackSvg.setAttribute('class', 'Svg-img-icon-small-textBrightAccent playing-heart-tag');

            // Create a new path element
            const savedTrackPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            // Set the d attribute of the path
            savedTrackPath.setAttribute('d', 'M12 4.248c-3.148-5.402-12-3.825-12 2.944 0 4.661 5.571 9.427 12 15.808 6.43-6.381 12-11.147 12-15.808 0-6.792-8.875-8.306-12-2.944z');

            // Append the path to the svg
            savedTrackSvg.appendChild(savedTrackPath);

            // Append the svg to the span
            savedTrackSpan.appendChild(savedTrackSvg);

            // Append the span to the div
            tagsDiv.appendChild(savedTrackSpan);
        }
        // Append the div to Tagslist          
        if (downloaded || trackDetails.explicit || savedTrack[0]) Tagslist.prepend(tagsDiv);

    } catch (error) {
        console.error('Error displaying tags: ', error);
    }
}
function removeExistingTagElement() {
    const existingTagElements = document.querySelectorAll('.main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-enhanced .playing-tags');
    existingTagElements.forEach(element => element.remove());
}