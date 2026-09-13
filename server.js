const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const tmdb = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: process.env.TMDB_API_KEY,
  },
});

// Convert TMDB movie into the smaller format our frontend needs
function formatMovie(movie) {
  return {
    id: movie.id,
    title: movie.title || "Untitled",
    year: movie.release_date
      ? Number(movie.release_date.substring(0, 4))
      : null,
    rating: movie.vote_average || 0,
    overview: movie.overview || "No description available.",
    poster: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null,
    backdrop: movie.backdrop_path
      ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
      : null,
    genreIds: movie.genre_ids || [],
  };
}


// GET /api/movies
app.get("/api/movies", async (req, res) => {
  try {
    const {
      search = "",
      genre = "all",
      sort = "popular",
      page = 1,
    } = req.query;

    let endpoint;
    let params = {
      page: Number(page),
      language: "en-US",
    };

    if (search.trim()) {
      endpoint = "/search/movie";
      params.query = search.trim();
    } else {
      endpoint = "/discover/movie";

      if (genre !== "all") {
        params.with_genres = genre;
      }

      if (sort === "rating") {
        params.sort_by = "vote_average.desc";
        params["vote_count.gte"] = 100;
      } else if (sort === "newest") {
        params.sort_by = "primary_release_date.desc";
      } else {
        params.sort_by = "popularity.desc";
      }
    }

    const response = await tmdb.get(endpoint, { params });

    let movies = response.data.results.map(formatMovie);

    if (sort === "title") {
      movies.sort((a, b) =>
        a.title.localeCompare(b.title)
      );
    }

    res.json({
      movies,
      page: response.data.page,
      totalPages: Math.min(response.data.total_pages || 1, 20),
      totalResults: response.data.total_results || 0,
    });

  } catch (error) {
    console.error("TMDB error:", error.response?.data || error.message);

    res.status(500).json({
      message: "Unable to load movies right now.",
    });
  }
});


// GET /api/movies/:id
app.get("/api/movies/:id", async (req, res) => {
  try {
    const response = await tmdb.get(
      `/movie/${req.params.id}`,
      {
        params: {
          append_to_response: "credits",
        },
      }
    );

    const movie = response.data;

    res.json({
      id: movie.id,
      title: movie.title,
      year: movie.release_date
        ? Number(movie.release_date.substring(0, 4))
        : null,
      rating: movie.vote_average,
      runtime: movie.runtime
        ? `${Math.floor(movie.runtime / 60)}h ${
            movie.runtime % 60
          }m`
        : "Unknown",
      overview: movie.overview || "No description available.",
      poster: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      backdrop: movie.backdrop_path
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        : null,
      genres: movie.genres?.map((genre) => genre.name) || [],
    });

  } catch (error) {
    console.error("Movie detail error:", error.message);

    res.status(500).json({
      message: "Unable to load movie details.",
    });
  }
});


app.listen(PORT, () => {
  console.log(`FRAME backend running on http://localhost:${PORT}`);
});