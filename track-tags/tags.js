console.log('[Track Tags] loaded');

// Wait for spicetify to load initially
async function waitForSpicetify() {
    while (!Spicetify || !Spicetify.showNotification) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}
// Wait for the track data to load
async function waitForTrackData() {
    while (!Spicetify.Player.data || !Spicetify.Player.data.item) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// Set global operating system variable
window.operatingSystem = window.operatingSystem || null;
(async function () {
    await waitForTrackData();
    if (window.operatingSystem == null) {
        let details = await getTrackDetailsTags();
        window.operatingSystem = details.operatingSystem;
    }
})();

async function tagCSS() {
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
    return tagStyle;
}

// Get the track details from the Spotify API
async function getTrackDetailsTags() {
    let trackId = Spicetify.Player.data.item.uri.split(":")[2];
    let [trackDetails, savedTrack, downloadedSongs] = await Promise.all([
        Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/tracks/${trackId}`),
        Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`),
        Spicetify.Platform.OfflineAPI._offline.getItems(0, Spicetify.Platform.OfflineAPI._offline.getItems.length)
    ]);
    //? only use this when a track is actually playing, not paused
    // let currentlyPlaying = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/player/currently-playing`);

    let operatingSystem = await Spicetify.Platform.operatingSystem;

    // console.log("TrackDetails ", trackDetails);
    // console.log("Currently playing ", currentlyPlaying);

    return { trackDetails, savedTrack, downloadedSongs, operatingSystem };
}


//* Initialize
(async function () {
    await initializeTags();
})();


async function initializeTags() {
    try {
        await waitForSpicetify();

        // Debounce the song change event to prevent multiple calls
        let debounceTimer;

        Spicetify.Player.addEventListener("songchange", async () => {
            // Remove the existing release date element immediately when the song changes
            removeExistingTagElement();
            // If there's no pending displayReleaseDate call, set a new timeout
            if (!debounceTimer) {
                debounceTimer = setTimeout(async () => {
                    await displayTags();
                    // Clear the timeout after displayReleaseDate has been called
                    debounceTimer = null;
                }, 10);
            }
        });

        if (window.operatingSystem === "Windows") {
            await Spicetify.Player.dispatchEvent(new Event('songchange'));
        } else {
            await displayTags();
        }

        // Add the style element to the head of the document
        document.head.appendChild(await tagCSS());
    } catch (error) {
        console.error('Error initializing: ', error, "\nCreate a new issue on the github repo to get this resolved");
    }
}

async function displayTags() {
    let downloaded = false;
    try {
        const { trackDetails, savedTrack, downloadedSongs } = await getTrackDetailsTags();

        // Get the artist name list element
        const Tagslist = document.querySelector('.main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-enhanced');
        // Create a new div element
        const tagsDiv = document.createElement('div');
        tagsDiv.setAttribute('class', 'playing-tags');

        downloadedSongs.items.forEach(song => {
            if (song.uri.includes(trackDetails.id)) {
                // console.log('current song: ', song.uri, "\nDownloaded: ", true);
                downloaded = true;
            }
        });

        // Check if the song is saved to liked songs collection
        if (savedTrack[0]) {
            const savedTrackSpan = document.createElement('span');

            savedTrackSpan.setAttribute('class', 'Wrapper-sm-only Wrapper-small-only');
            savedTrackSpan.setAttribute('title', 'This song is in your liked songs playlist');

            const savedTrackSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            savedTrackSvg.setAttribute('role', 'img');
            savedTrackSvg.setAttribute('height', '24');
            savedTrackSvg.setAttribute('width', '24');
            savedTrackSvg.setAttribute('viewBox', '0 0 24 24');
            savedTrackSvg.setAttribute('class', 'Svg-img-icon-small-textBrightAccent playing-heart-tag');

            const savedTrackPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            savedTrackPath.setAttribute('d', 'M12 4.248c-3.148-5.402-12-3.825-12 2.944 0 4.661 5.571 9.427 12 15.808 6.43-6.381 12-11.147 12-15.808 0-6.792-8.875-8.306-12-2.944z');

            savedTrackSvg.appendChild(savedTrackPath);
            savedTrackSpan.appendChild(savedTrackSvg);

            tagsDiv.appendChild(savedTrackSpan);
        }
        // Check if the song is downloaded
        if (downloaded) {
            const downloadedSpan = document.createElement('span');

            downloadedSpan.setAttribute('class', 'encore-text encore-text-body-medium encore-internal-color-text-subdued main-trackList-rowBadges');
            downloadedSpan.setAttribute('data-encore-id', 'text');
            downloadedSpan.setAttribute('title', 'This song is downloaded');

            const downloadedSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            downloadedSvg.setAttribute('data-encore-id', 'icon');
            downloadedSvg.setAttribute('role', 'img');
            downloadedSvg.setAttribute('aria-hidden', 'false');
            downloadedSvg.setAttribute('viewBox', '0 0 16 16');
            downloadedSvg.setAttribute('class', 'Svg-sc-ytk21e-0 Svg-img-icon-small-textBrightAccent');

            const downloadedPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            downloadedPath.setAttribute('d', 'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-4.75a.75.75 0 0 0-.75.75v5.94L6.055 8.744a.75.75 0 1 0-1.06 1.06L8 12.811l3.005-3.006a.75.75 0 1 0-1.06-1.06L8.75 9.939V4A.75.75 0 0 0 8 3.25z');

            downloadedSvg.appendChild(downloadedPath);
            downloadedSpan.appendChild(downloadedSvg);

            tagsDiv.appendChild(downloadedSpan);
        }
        // Check if the song is explicit
        if (trackDetails.explicit) {
            // Create a new span element
            const explicitSpan = document.createElement('span');

            // Set the attributes and text content of the span
            explicitSpan.setAttribute('aria-label', 'Explicit');
            explicitSpan.setAttribute('class', 'main-tag-container playing-explicit-tag');
            explicitSpan.setAttribute('title', 'Warning!, This song is explicit and may contain strong language or themes.');
            explicitSpan.textContent = 'E';

            // Append the span to the div
            tagsDiv.appendChild(explicitSpan);
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