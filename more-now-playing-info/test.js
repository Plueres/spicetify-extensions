async function displayReleaseDate() {
    try {
        var trackId = Spicetify.Player.data.item.uri.split(":")[2];
        console.log('Track ID:', trackId);
        var trackDetails = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/tracks/${trackId}`);
        console.log('Track details:', trackDetails);//try to get other information for future development
        var releaseDate = new Date(trackDetails.album.release_date);
        var formattedReleaseDate = `${String(releaseDate.getDate()).padStart(2, '0')}-${String(releaseDate.getMonth() + 1).padStart(2, '0')}-${releaseDate.getFullYear()}`;
        console.log('Release date:', formattedReleaseDate);

        // Remove the existing release date div, if it exists.
        var existingReleaseDateElement = document.getElementById('releaseDate');
        if (existingReleaseDateElement) {
            existingReleaseDateElement.remove();
        }

        // Display the release date in the same div as the artist.
        var releaseDateElement = document.createElement("div");
        releaseDateElement.id = 'releaseDate';
        releaseDateElement.textContent = ` • ${formattedReleaseDate}`;

        var container = document.querySelector('.main-trackInfo-artists'); // Use the correct selector for the artist div.
        var artistElement = container.querySelector('a'); // Get the first <a> element within the artist div.

        // Apply the same styles to the release date element as the artist element.
        var artistStyles = window.getComputedStyle(artistElement);
        releaseDateElement.style.fontSize = artistStyles.fontSize;
        releaseDateElement.style.fontWeight = artistStyles.fontWeight;

        container.appendChild(releaseDateElement);
    } catch (error) {
        console.log('Error displaying release date:', error);
    }
}