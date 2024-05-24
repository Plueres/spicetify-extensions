console.log('Now Playing Release Date loaded');


// This is where the settings for the Positions, Date formats and separator style are located
const positions = [
    { value: ".main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-artists", text: "Artist" },
    { value: ".main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-name", text: "Song name" }
];
const dateformat = [
    { value: "DD-MM-YYYY", text: "DD-MM-YYYY" },
    { value: "MM-DD-YYYY", text: "MM-DD-YYYY" },
    { value: "YYYY-MM-DD", text: "YYYY-MM-DD" }
];
const separator = [
    { value: "•", text: "Dot" },
    { value: "-", text: "Dash" }
]

const ReleaseDateStyle = document.createElement('style');
ReleaseDateStyle.innerHTML = `
    #settingsMenu {
        display: none;
        position: absolute;
        background-color: var(--spice-player);
        padding: 16px;
        margin: 24px 0;
        border-radius: 12px;
        flex-direction: column;
        min-width: 16vw;
        max-width: 20vw;
    }
    #settingsMenu h2, #settingsMenu #optionsDiv, #settingsMenu a {
        padding: 10px;
    }
    #optionsDiv {
        display: flex;
        flex-direction: column;
    }
    #settingsMenu a {
        display: flex;
        align-items: center;
        max-width: 100%;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    #settingsMenu a:hover {
        color: var(--text-bright-accent, #117a37);
    }
    .Dropdown-container {
        overflow: visible; 
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
        gap: 10px;
    }
    .releaseDateDropdown-control {
        flex-grow: 1;
        display: inline;
        justify-content: space-between;
        border: 1px solid #ccc;
        padding: 5px;
        cursor: pointer;
        min-width: fit-content;
        max-width: 10rem;
    }
    .Dropdown-optionsList {
        position: fixed;
        background-color:  var(--spice-player);
        z-index: 1;
    }
    .Dropdown-option {
        padding: 5px;
        cursor: pointer;
    }
    .Dropdown-option:hover {
        background-color: #f0f0f0;
    }
    
    /* spacing and inline alignment */
    .main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-artists,
    .main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-name,
    #releaseDate {
        display: flex;
        gap: 3px;
        white-space: nowrap;
    }
    /* padding for readability */
    #releaseDate {
        padding-left: 8px;
        margin-right: 8px;
    }
    /*
    .main-trackInfo-artists #releaseDate p:contains("•") {
        transform: translateY(-1px);
    }
    */
    .main-trackInfo-overlay {
        margin-right: -8px;
    }
    `;

// Default settings if none are found
//* remove the ! if you are testing, and/or the settings are set wrong in the localStorage
if (!localStorage.getItem('position')) {
    localStorage.setItem('position', positions[1].value);
    localStorage.setItem('dateFormat', dateformat[0].value);
    localStorage.setItem('separator', separator[0].value);
} else if (localStorage.getItem('position') != positions[0].value && localStorage.getItem('position') != positions[1].value) {
    // Fallback for the position setting if it's not found in the positions array
    localStorage.setItem('position', positions[1].value);
}

// Get the track details from the Spotify API
async function getTrackDetailsRD() {
    let trackId = Spicetify.Player.data.item.uri.split(":")[2];
    let trackDetails = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/tracks/${trackId}`);
    let album = trackDetails.album;
    let releaseDate = new Date(trackDetails.album.release_date);
    //? Uncomment the line below to see the track details in the console
    console.log('Track details:', trackDetails);
    console.log("currently playing: ", await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/player/currently-playing`));

    return { album, releaseDate, trackDetails };
}


// Start after 3 seconds to ensure it starts even on slower devices
setTimeout(() => initializeRD(ReleaseDateStyle), 3000);


// Wait for spicetify to load initially
async function waitForSpicetify() {
    while (!Spicetify || !Spicetify.showNotification) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function initializeRD(styleElement) {
    try {
        await waitForSpicetify();
        // Debounce the song change event to prevent multiple calls
        let debounceTimer;
        Spicetify.Player.addEventListener("songchange", async () => {
            // Remove the existing release date element immediately when the song changes
            removeExistingReleaseDateElement();
            // If there's no pending displayReleaseDate call, set a new timeout
            if (!debounceTimer) {
                debounceTimer = setTimeout(async () => {
                    await displayReleaseDate();
                    // Clear the timeout after displayReleaseDate has been called
                    debounceTimer = null;
                }, 3000);
            }
        });
        Spicetify.Player.dispatchEvent(new Event('songchange'));
    } catch (error) {
        console.error('Error initializing: ', error, "\nCreate a new issue on the github repo to get this resolved");
    }

    // Add the style element to the head of the document
    document.head.appendChild(styleElement);
}

async function displayReleaseDate() {
    try {
        const { releaseDate } = await getTrackDetailsRD();

        let formattedReleaseDate;

        // Set formatting for selected date
        switch (localStorage.getItem('dateformat')) {
            case "DD-MM-YYYY":
                formattedReleaseDate = `${String(releaseDate.getDate()).padStart(2, '0')}-${String(releaseDate.getMonth() + 1).padStart(2, '0')}-${releaseDate.getFullYear()}`;
                break;
            case "MM-DD-YYYY":
                formattedReleaseDate = `${String(releaseDate.getMonth() + 1).padStart(2, '0')}-${String(releaseDate.getDate()).padStart(2, '0')}-${releaseDate.getFullYear()}`;
                break;
            case "YYYY-MM-DD":
                formattedReleaseDate = `${releaseDate.getFullYear()}-${String(releaseDate.getMonth() + 1).padStart(2, '0')}-${String(releaseDate.getDate()).padStart(2, '0')}`;
                break;
            default:
                formattedReleaseDate = releaseDate;
        }

        removeExistingReleaseDateElement();

        // Refresh the release date element to not create duplicates
        setTimeout(() => {
            const releaseDateElement = createReleaseDateElement(localStorage.getItem('separator'), formattedReleaseDate);
            const container = document.querySelector(localStorage.getItem('position'));
            container.appendChild(releaseDateElement);
        }, 1000);
    } catch (error) {
        console.error('Error displaying release date:', error);
    }
}

function removeExistingReleaseDateElement() {
    const existingReleaseDateElement = document.getElementById('releaseDate');
    const existingReleaseDateSettingsElement = document.getElementById('settingsMenu');
    if (existingReleaseDateElement) {
        existingReleaseDateElement.remove();
        existingReleaseDateSettingsElement.remove();
    }
}

function createReleaseDateElement(separator, formattedReleaseDate) {
    const releaseDateElement = createDivElement('releaseDate');

    const separatorElement = document.createElement("p");
    separatorElement.textContent = separator;
    releaseDateElement.appendChild(separatorElement);

    const dateElement = createAnchorElement(formattedReleaseDate);
    releaseDateElement.appendChild(dateElement);

    const targetedElement = document.querySelector(localStorage.getItem('position') + ' a');
    const targetedStyles = window.getComputedStyle(targetedElement);
    setElementStyles(releaseDateElement, targetedStyles);

    const existingSettingsMenu = document.getElementById('settingsMenu');
    if (existingSettingsMenu) {
        document.body.removeChild(existingSettingsMenu);
    }

    const settingsMenu = createSettingsMenu();

    document.body.appendChild(settingsMenu);

    dateElement.addEventListener('click', function (event) {
        event.preventDefault();
        toggleSettingsMenu(dateElement, settingsMenu);
    });

    return releaseDateElement;
}

// Create outer shell element
function createDivElement(id) {
    const divElement = document.createElement("div");
    divElement.id = id;
    return divElement;
}

// Create clickable element to open pop-up
function createAnchorElement(textContent) {
    const anchorElement = document.createElement("a");
    anchorElement.textContent = textContent;
    anchorElement.style.cursor = 'pointer';
    return anchorElement;
}

// Add styling to the release date element
function setElementStyles(element, styles) {
    element.style.fontSize = styles.fontSize;
    element.style.fontWeight = styles.fontWeight;
    element.style.minWidth = "75px";
}

function createSettingsMenu() {
    const settingsMenu = createDivElement('settingsMenu');

    const title = document.createElement("h2");
    title.textContent = 'NPRD Settings';
    settingsMenu.appendChild(title);

    const optionsDiv = document.createElement("div");
    optionsDiv.id = 'optionsDiv';

    const positionDropdown = createDropdown("position", "Position", positions);
    optionsDiv.appendChild(positionDropdown);

    const dateFormatDropdown = createDropdown("dateformat", "Date Format", dateformat);
    optionsDiv.appendChild(dateFormatDropdown);

    const separatorDropdown = createDropdown("separator", "Separator style", separator);
    optionsDiv.appendChild(separatorDropdown);

    settingsMenu.appendChild(optionsDiv);

    getTrackDetailsRD().then(({ album }) => {
        // Create album link
        const albumLinkElement = document.createElement('a');
        albumLinkElement.href = album.external_urls.spotify;

        // Create album image
        const albumImageElement = document.createElement('img');
        albumImageElement.src = album.images[2].url;
        albumImageElement.width = album.images[2].width / 3 * 2;
        albumImageElement.height = album.images[2].height / 3 * 2;
        albumImageElement.style.marginRight = '1rem';

        const albumNameElement = document.createElement('p');
        albumNameElement.textContent = `${album.name} - ${album.artists[0].name} \n`;

        const albumTypeElement = document.createElement('p');
        albumTypeElement.textContent = album.album_type;
        albumTypeElement.style.cssText = "text-transform: capitalize;";

        // Create a new container
        const albumContainer = document.createElement('div');

        albumContainer.appendChild(albumNameElement);
        albumContainer.appendChild(albumTypeElement);
        // Append the image and the text to the album link
        albumLinkElement.appendChild(albumImageElement);
        albumLinkElement.appendChild(albumContainer);

        settingsMenu.appendChild(albumLinkElement);
    });

    return settingsMenu;
}

function createDropdown(id, label, options) {
    const dropdownContainer = document.createElement("div");
    dropdownContainer.classList.add('Dropdown-container');

    const labelElement = document.createElement("label");
    labelElement.textContent = label;
    dropdownContainer.appendChild(labelElement);

    const dropdown = document.createElement("div");
    dropdown.id = id;
    dropdown.classList.add('Dropdown-control');
    dropdown.classList.add('releaseDateDropdown-control');

    const selectedOption = document.createElement("div");

    const currentSelectedOptionValue = localStorage.getItem(id);
    const currentSelectedOption = options.find(option => option.value === currentSelectedOptionValue);

    selectedOption.textContent = currentSelectedOption ? currentSelectedOption.text : options[0].text;

    dropdown.appendChild(selectedOption);

    const optionsList = document.createElement("div");
    optionsList.classList.add('Dropdown-optionsList');
    optionsList.style.display = 'none';

    options.forEach(option => {
        const optionElement = createOption(option.value, option.text, dropdown, selectedOption);
        optionsList.appendChild(optionElement);
    });

    dropdown.appendChild(optionsList);

    dropdown.addEventListener('click', function (event) {
        event.stopPropagation();
        if (event.target.classList.contains('Dropdown-option')) {
            return;
        }

        optionsList.style.display = optionsList.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', function () {
        optionsList.style.display = 'none';
    });
    dropdownContainer.appendChild(dropdown);

    return dropdownContainer;
}

function createOption(value, text, dropdown, selectedOption) {
    const option = document.createElement("div");
    option.value = value;
    option.textContent = text;
    option.classList.add('Dropdown-option');

    option.addEventListener('click', async function () {
        selectedOption.textContent = text;

        localStorage.setItem(dropdown.id, value);

        // Hide the settings menu
        const settingsMenu = document.getElementById('settingsMenu');
        if (settingsMenu) {
            settingsMenu.style.display = 'none';
        }

        await displayReleaseDate();
    });

    return option;
}

function toggleSettingsMenu(dateElement, settingsMenu) {
    const rect = dateElement.getBoundingClientRect();

    settingsMenu.style.position = 'fixed';
    settingsMenu.style.left = `${rect.left}px`;
    settingsMenu.style.bottom = `${window.innerHeight - rect.top}px`;

    if (settingsMenu.style.display === '') {
        settingsMenu.style.display = 'flex';
    } else {
        settingsMenu.style.display = settingsMenu.style.display === 'none' ? 'flex' : 'none';
    }
}