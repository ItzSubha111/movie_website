const API_URL = "http://localhost:5000/api";

const $ = (selector) => document.querySelector(selector);

const movieGrid = $("#movieGrid");
const searchInput = $("#searchInput");
const sortFilter = $("#sortFilter");

const loadingState = $("#loadingState");
const emptyState = $("#emptyState");
const errorState = $("#errorState");
const errorMessage = $("#errorMessage");

const loadMoreBtn = $("#loadMore");
const retryBtn = $("#retryBtn");
const resetFiltersBtn = $("#resetFilters");

const wishlistCount = $("#wishlistCount");

const movieDialog = $("#movieDialog");
const dialogContent = $("#dialogContent");
const modalClose = $("#modalClose");

const toast = $("#toast");

let state = {
    search: "",
    genre: "all",
    sort: "popular",
    page: 1,
    totalPages: 1,
    movies: [],
    wishlistOnly: false
};

let wishlist = [];
let searchTimer = null;
let toastTimer = null;


/* =========================
   WISHLIST
========================= */

function loadWishlist() {

    try {

        const stored = localStorage.getItem(
            "frame-wishlist"
        );

        wishlist = stored
            ? JSON.parse(stored)
            : [];

        if (!Array.isArray(wishlist)) {
            wishlist = [];
        }

    } catch {

        wishlist = [];
    }

    updateWishlistCount();
}


function saveWishlist() {

    localStorage.setItem(
        "frame-wishlist",
        JSON.stringify(wishlist)
    );

    updateWishlistCount();
}


function updateWishlistCount() {

    wishlistCount.textContent = wishlist.length;
}


function isSaved(id) {

    return wishlist.some(
        movie => Number(movie.id) === Number(id)
    );
}


function toggleWishlist(movie, event) {

    if (event) {
        event.stopPropagation();
    }

    const exists = isSaved(movie.id);

    if (exists) {

        wishlist = wishlist.filter(
            item => Number(item.id) !== Number(movie.id)
        );

        showToast("Removed from wishlist");

    } else {

        wishlist.push(movie);

        showToast("Saved to wishlist ♥");
    }

    saveWishlist();

    renderMovies();
}


/* =========================
   TOAST
========================= */

function showToast(message) {

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 2200);
}


/* =========================
   LOADING
========================= */

function showLoading() {

    loadingState.classList.remove("hidden");

    movieGrid.innerHTML = "";

    emptyState.classList.add("hidden");
    errorState.classList.add("hidden");
    loadMoreBtn.classList.add("hidden");
}


function hideLoading() {

    loadingState.classList.add("hidden");
}


/* =========================
   API
========================= */

async function fetchMovies() {

    const params = new URLSearchParams({

        search: state.search,

        genre: state.genre,

        sort: state.sort,

        page: state.page
    });

    const response = await fetch(
        `${API_URL}/movies?${params}`
    );

    if (!response.ok) {

        throw new Error(
            "Backend request failed"
        );
    }

    return response.json();
}


/* =========================
   LOAD MOVIES
========================= */

async function loadMovies(reset = true) {

    if (state.wishlistOnly) {

        renderWishlist();

        return;
    }

    if (reset) {

        state.page = 1;
        state.movies = [];
    }

    showLoading();

    try {

        const data = await fetchMovies();

        hideLoading();

        if (reset) {

            state.movies = data.movies || [];

        } else {

            state.movies.push(
                ...(data.movies || [])
            );
        }

        state.totalPages =
            data.totalPages || 1;

        errorState.classList.add("hidden");

        renderMovies();

        updateResultsInfo(
            data.totalResults || 0
        );

    } catch (error) {

        console.error(error);

        hideLoading();

        movieGrid.innerHTML = "";

        errorState.classList.remove("hidden");

        errorMessage.textContent =
            "Make sure the FRAME backend is running on http://localhost:5000";

        loadMoreBtn.classList.add("hidden");
    }
}


/* =========================
   RENDER MOVIES
========================= */

function renderMovies() {

    emptyState.classList.add("hidden");

    if (!state.movies.length) {

        movieGrid.innerHTML = "";

        emptyState.classList.remove("hidden");

        loadMoreBtn.classList.add("hidden");

        return;
    }

    movieGrid.innerHTML =
        state.movies
            .map(createMovieCard)
            .join("");

    if (
        state.page < state.totalPages &&
        !state.wishlistOnly
    ) {

        loadMoreBtn.classList.remove(
            "hidden"
        );

    } else {

        loadMoreBtn.classList.add(
            "hidden"
        );
    }
}


/* =========================
   MOVIE CARD
========================= */

function createMovieCard(movie) {

    const saved = isSaved(movie.id);

    const poster = movie.poster ||
        "https://placehold.co/500x750/151715/ffffff?text=No+Poster";

    const rating =
        movie.rating
            ? Number(movie.rating).toFixed(1)
            : "—";

    const year =
        movie.year || "Unknown";

    return `

        <article
            class="movie-card"
            data-id="${movie.id}"
        >

            <div class="poster-wrapper">

                <img
                    src="${escapeHTML(poster)}"
                    alt="${escapeHTML(movie.title)} poster"
                    loading="lazy"
                >

                <div class="poster-gradient"></div>

                <span class="rating">
                    ★ ${rating}
                </span>

                <button
                    class="save-btn ${saved ? "saved" : ""}"
                    data-save="${movie.id}"
                    aria-label="Save ${escapeHTML(movie.title)}"
                >
                    ${saved ? "♥" : "♡"}
                </button>

            </div>

            <div class="movie-info">

                <div class="movie-title">
                    ${escapeHTML(movie.title)}
                </div>

                <div class="movie-meta">
                    <span>${year}</span>
                    <span>•</span>
                    <span>Movie</span>
                </div>

            </div>

        </article>
    `;
}


/* =========================
   WISHLIST VIEW
========================= */

function renderWishlist() {

    state.movies = [...wishlist];

    $("#sectionTitle").textContent =
        "Your saved movies";

    $("#resultsInfo").textContent =
        `${wishlist.length} saved`;

    movieGrid.innerHTML = "";

    if (!wishlist.length) {

        emptyState.classList.remove(
            "hidden"
        );

        emptyState.querySelector("h3")
            .textContent =
            "Your wishlist is empty";

        emptyState.querySelector("p")
            .textContent =
            "Save movies you want to watch later.";

        loadMoreBtn.classList.add(
            "hidden"
        );

        return;
    }

    emptyState.classList.add(
        "hidden"
    );

    movieGrid.innerHTML =
        wishlist
            .map(createMovieCard)
            .join("");

    loadMoreBtn.classList.add(
        "hidden"
    );
}


/* =========================
   MOVIE DETAILS
========================= */

async function openMovie(id) {

    movieDialog.showModal();

    dialogContent.innerHTML = `

        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading movie...</p>
        </div>
    `;

    try {

        const response = await fetch(
            `${API_URL}/movies/${id}`
        );

        if (!response.ok) {
            throw new Error();
        }

        const movie =
            await response.json();

        const poster =
            movie.poster ||
            "https://placehold.co/500x750/151715/ffffff?text=No+Poster";

        dialogContent.innerHTML = `

            <div class="modal-content">

                <img
                    class="modal-poster"
                    src="${escapeHTML(poster)}"
                    alt="${escapeHTML(movie.title)}"
                >

                <div class="modal-details">

                    <span class="eyebrow">
                        MOVIE DETAILS
                    </span>

                    <h2>
                        ${escapeHTML(movie.title)}
                    </h2>

                    <div class="modal-meta">

                        <span>
                            ${movie.year || "Unknown"}
                        </span>

                        <span>
                            ★ ${Number(movie.rating || 0).toFixed(1)}
                        </span>

                        <span>
                            ${movie.runtime || "Unknown"}
                        </span>

                    </div>

                    <p>
                        ${escapeHTML(
                            movie.overview ||
                            "No description available."
                        )}
                    </p>

                    ${
                        movie.genres?.length
                        ? `
                            <p>
                                ${movie.genres
                                    .map(
                                        genre =>
                                            `#${escapeHTML(genre)}`
                                    )
                                    .join("  ")
                                }
                            </p>
                        `
                        : ""
                    }

                    <button
                        class="primary-btn"
                        id="modalSaveBtn"
                    >
                        ${
                            isSaved(movie.id)
                                ? "♥ Saved"
                                : "♡ Save to wishlist"
                        }
                    </button>

                </div>

            </div>
        `;

        $("#modalSaveBtn")
            .addEventListener(
                "click",
                () => {

                    toggleWishlist(movie);

                    $("#modalSaveBtn").textContent =
                        isSaved(movie.id)
                            ? "♥ Saved"
                            : "♡ Save to wishlist";
                }
            );

    } catch {

        dialogContent.innerHTML = `

            <div class="error-state">

                <h3>
                    Couldn't load this movie
                </h3>

                <p>
                    Please try again.
                </p>

            </div>
        `;
    }
}


/* =========================
   SEARCH
========================= */

searchInput.addEventListener(
    "input",
    () => {

        clearTimeout(searchTimer);

        searchTimer = setTimeout(
            () => {

                state.search =
                    searchInput.value.trim();

                state.wishlistOnly = false;

                setDiscoverActive();

                loadMovies(true);

            },
            450
        );
    }
);


/* =========================
   GENRES
========================= */

document
    .querySelectorAll(".genre-chip")
    .forEach(chip => {

        chip.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".genre-chip"
                    )
                    .forEach(item =>
                        item.classList.remove(
                            "active"
                        )
                    );

                chip.classList.add(
                    "active"
                );

                state.genre =
                    chip.dataset.genre;

                state.wishlistOnly = false;

                setDiscoverActive();

                loadMovies(true);
            }
        );
    });


/* =========================
   SORT
========================= */

sortFilter.addEventListener(
    "change",
    () => {

        state.sort =
            sortFilter.value;

        state.wishlistOnly = false;

        setDiscoverActive();

        loadMovies(true);
    }
);


/* =========================
   LOAD MORE
========================= */

loadMoreBtn.addEventListener(
    "click",
    () => {

        if (
            state.page >=
            state.totalPages
        ) {
            return;
        }

        state.page++;

        loadMovies(false);
    }
);


/* =========================
   CARD EVENTS
========================= */

movieGrid.addEventListener(
    "click",
    async (event) => {

        const saveButton =
            event.target.closest(
                "[data-save]"
            );

        if (saveButton) {

            const id =
                Number(saveButton.dataset.save);

            const movie =
                state.movies.find(
                    item =>
                        Number(item.id) === id
                );

            if (movie) {
                toggleWishlist(
                    movie,
                    event
                );
            }

            return;
        }

        const card =
            event.target.closest(
                ".movie-card"
            );

        if (card) {

            const id =
                Number(card.dataset.id);

            await openMovie(id);
        }
    }
);


/* =========================
   NAVIGATION
========================= */

$("#discoverBtn")
    .addEventListener(
        "click",
        () => {

            state.wishlistOnly = false;

            setDiscoverActive();

            $("#sectionTitle").textContent =
                "Trending movies";

            loadMovies(true);

            window.scrollTo({
                top: 700,
                behavior: "smooth"
            });
        }
    );


$("#wishlistBtn")
    .addEventListener(
        "click",
        () => {

            state.wishlistOnly = true;

            setWishlistActive();

            renderWishlist();

            window.scrollTo({
                top: 700,
                behavior: "smooth"
            });
        }
    );


$("#heroWishlist")
    .addEventListener(
        "click",
        () => {

            state.wishlistOnly = true;

            setWishlistActive();

            renderWishlist();

            window.scrollTo({
                top: 700,
                behavior: "smooth"
            });
        }
    );


$("#heroExplore")
    .addEventListener(
        "click",
        () => {

            state.wishlistOnly = false;

            setDiscoverActive();

            openMovie(157336);
        }
    );


/* =========================
   RESET
========================= */

resetFiltersBtn
    .addEventListener(
        "click",
        () => {

            searchInput.value = "";

            state.search = "";
            state.genre = "all";
            state.sort = "popular";

            sortFilter.value = "popular";

            document
                .querySelectorAll(
                    ".genre-chip"
                )
                .forEach(chip => {

                    chip.classList.toggle(
                        "active",
                        chip.dataset.genre === "all"
                    );
                });

            state.wishlistOnly = false;

            setDiscoverActive();

            loadMovies(true);
        }
    );


/* =========================
   RETRY
========================= */

retryBtn.addEventListener(
    "click",
    () => {

        errorState.classList.add(
            "hidden"
        );

        loadMovies(true);
    }
);


/* =========================
   MODAL CLOSE
========================= */

modalClose.addEventListener(
    "click",
    () => {

        movieDialog.close();
    }
);

movieDialog.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            movieDialog
        ) {
            movieDialog.close();
        }
    }
);


/* =========================
   HELPERS
========================= */

function setDiscoverActive() {

    $("#discoverBtn")
        .classList.add("active");

    $("#wishlistBtn")
        .classList.remove("active");

    $("#sectionTitle").textContent =
        state.search
            ? `Results for "${state.search}"`
            : "Trending movies";
}


function setWishlistActive() {

    $("#wishlistBtn")
        .classList.add("active");

    $("#discoverBtn")
        .classList.remove("active");

    $("#sectionTitle").textContent =
        "Your saved movies";
}


function updateResultsInfo(total) {

    $("#resultsInfo").textContent =
        total
            ? `${total.toLocaleString()} movies`
            : "";
}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================
   START
========================= */

loadWishlist();

loadMovies(true);