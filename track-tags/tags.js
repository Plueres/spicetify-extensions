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
        .main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-enhanced { align-items: center; }
        .playing-tags {
            display: -webkit-inline-box;
            display: -ms-inline-flexbox;
            display: inline-flex;
            -webkit-box-align: center;
            -ms-flex-align: center;
            align-items: center;
            -webkit-box-pack: center;
            -ms-flex-pack: center;
            color: var(--text-subdued);
            gap: 4px;
            height: 16px;
            justify-content: center;
            min-width: 0;
        }
        .playing-tags span {
            display: flex;
            align-content: center;
            justify-content: center;
            width: 16px;
            height: 100%;
        }
        .playing-tags span * {
            height: 100%;
            width: 100%;
        }
        .playing-playlist-tag,
        .playing-heart-tag { cursor: pointer; }
        
        .playing-playlist-tag { border-radius: 50%; }
        .playing-tags span .playing-heart-tag { fill: var(--text-bright-accent); }
        .playing-tags span.playing-explicit-tag {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            display: -webkit-inline-box;
            display: -ms-inline-flexbox;
            display: inline-flex;
            -webkit-box-pack: center;
            -ms-flex-pack: center;
            justify-content: center;
            -webkit-box-align: center;
            -ms-flex-align: center;
            align-items: center;
            background-color: var(--text-subdued);
            border-radius: 2px;
            color: var(--background-base);
            -ms-flex-wrap: nowrap;
            flex-wrap: nowrap;
            font-size: 10.5px;
            font-weight: 600;
            gap: var(--encore-spacing-tighter-4);
            line-height: 14px;
            overflow: hidden;
            padding-block: 1px;
            padding-inline: 5px;
            text-transform: capitalize;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            width: 16px;
            height: 16px;
        }
        .main-trackInfo-enhanced { gap: 6px; }
    `;
    return tagStyle;
}

// Get the track details from the Spotify API
async function getTrackDetailsTags() {
    await waitForTrackData();
    let trackId = await Spicetify.Player.data.item.uri.split(":")[2];
    let [trackDetails, savedTrack, likedSongs, downloadedSongs] = await Promise.all([
        Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/tracks/${trackId}`),
        Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`),
        Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/tracks`),
        Spicetify.Platform.OfflineAPI._offline.getItems(0, Spicetify.Platform.OfflineAPI._offline.getItems.length)
    ]);
    let operatingSystem = await Spicetify.Platform.operatingSystem;

    return { trackDetails, savedTrack, likedSongs, downloadedSongs, operatingSystem };
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
            removeExistingTagElement();
            if (!debounceTimer) {
                debounceTimer = setTimeout(async () => {
                    await displayTags();
                    debounceTimer = null;
                }, 1);
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

        const Tagslist = document.querySelector('.main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-enhanced');

        const tagsDiv = document.createElement('div');
        tagsDiv.setAttribute('class', 'playing-tags');

        const nowPlayingPlaylistDetails = await Spicetify.Platform.PlayerAPI.getState();

        downloadedSongs.items.forEach(song => {
            if (song.uri.includes(trackDetails.id)) {
                // console.log('current song: ', song.uri, "\nDownloaded: ", true);
                downloaded = true;
            }
        });


        if (nowPlayingPlaylistDetails.context.uri) {
            const split = nowPlayingPlaylistDetails.context.uri.split(':');
            const playlistName = nowPlayingPlaylistDetails.context.metadata.format_list_type;

            const playlistSpan = document.createElement('span');
            playlistSpan.setAttribute('class', 'Wrapper-sm-only Wrapper-small-only');
            if (playlistName == "liked-songs") {
                playlistImgSrc = "https://misc.scdn.co/liked-songs/liked-songs-300.png";
                songLocation = `/${split[3]}/tracks?uri=${trackDetails.uri}`;
                playlistSpan.setAttribute('title', `Playing from Liked Songs`);
            } else {
                playlistImgSrc = "https://image-cdn-ak.spotifycdn.com/image/" + nowPlayingPlaylistDetails.context.metadata.image_url;
                songLocation = `/${split[1]}/${split[2]}?uid=${nowPlayingPlaylistDetails.item.uid}`;
                playlistSpan.setAttribute('title', `Playing from ${nowPlayingPlaylistDetails.context.metadata.context_description}`);
            }
            playlistSpan.onclick = function () { Spicetify.Platform.History.push(songLocation); };

            const playlistImg = document.createElement('img');
            playlistImg.setAttribute('src', playlistImgSrc);
            playlistImg.setAttribute('height', '24');
            playlistImg.setAttribute('width', '24');
            playlistImg.setAttribute('class', 'Svg-img-icon-small-textBrightAccent playing-playlist-tag');
            playlistImg.setAttribute('onerror', "this.onerror=null; this.src='https://raw.githubusercontent.com/Plueres/spicetify-extensions/main/track-tags/spotify_playlist.webp'");

            playlistSpan.appendChild(playlistImg);

            tagsDiv.appendChild(playlistSpan);
        }
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

            savedTrackSpan.onclick = async function () {
                if (confirm('Are you sure you want to remove this song from your liked songs?')) {
                    Spicetify.CosmosAsync.del(`https://api.spotify.com/v1/me/tracks?ids=${trackDetails.id}`);
                    await removeExistingTagElement();
                    setTimeout(() => {
                        displayTags();
                    }, 1000);
                }
            };

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
            downloadedSvg.setAttribute('class', 'Svg-sc-ytk21e-0 Svg-img-icon-small-textBrightAccent playing-downloaded-tag');

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
        Tagslist.prepend(tagsDiv);
    } catch (error) {
        console.error('Error displaying tags: ', error);
    }
}
function removeExistingTagElement() {
    const existingTagElements = document.querySelectorAll('.main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-enhanced .playing-tags');
    existingTagElements.forEach(element => element.remove());
}
