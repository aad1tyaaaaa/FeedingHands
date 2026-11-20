import React, { useState } from "react";
import "./PersonaTheme.css";
import "./LearnerCorner.css";
import Illustration from "./Illustration";
import resources from "../data/learnerResources.json";
import { paginate } from "../api/pager.mjs";

const PER_PAGE = 6;

const LearnerCorner = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const chooseCategory = (category) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  // The resource list lives in src/data/learnerResources.json.

  // Filter resources based on search query and active category
  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || resource.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  // Featured resource logic
  const getFeaturedResource = () => {
    const categoryResources =
      activeCategory === "all"
        ? resources
        : resources.filter((r) => r.category === activeCategory);

    return [...categoryResources].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    })[0];
  };

  const featuredResource = getFeaturedResource();

  const { items: currentItems, page, pages: totalPages } = paginate(filteredResources, currentPage, PER_PAGE);

  return (
    <div className="learners-corner fh-theme">
      <div className="fh-blob" aria-hidden="true" />
      <div className="learners-corner-content fh-page">
        {/* Left Column: Title, Subtitle, Search, and Categories */}
        <div className="learners-corner-left">
          <h2 className="learners-title fh-title">Learners <em>Corner</em></h2>
          <Illustration name="books" className="learners-art" />
          {/* <p className="learners-subtitle">
          Explore articles, videos, and resources on food waste management and sustainability.
          </p> */}

          {/* Search Bar */}
          {/* <div className="search-bar">
            <input
              type="text"
              placeholder="Search for resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button>Search</button>
          </div> */}

          {/* Category Filters */}
          <div className="category-filters" role="group" aria-label="Filter by category">
            <button
              aria-pressed={activeCategory === "all"}
              className={`category-btn ${activeCategory === "all" ? "active" : ""}`}
              onClick={() => chooseCategory("all")}
            >
              All Resources
            </button>
            <button
              aria-pressed={activeCategory === "composting"}
              className={`category-btn ${activeCategory === "composting" ? "active" : ""}`}
              onClick={() => chooseCategory("composting")}
            >
              Composting
            </button>
            <button
              aria-pressed={activeCategory === "recipes"}
              className={`category-btn ${activeCategory === "recipes" ? "active" : ""}`}
              onClick={() => chooseCategory("recipes")}
            >
              Recipes
            </button>
            <button
              aria-pressed={activeCategory === "storage"}
              className={`category-btn ${activeCategory === "storage" ? "active" : ""}`}
              onClick={() => chooseCategory("storage")}
            >
              Storage Tips
            </button>
          </div>
        </div>

        {/* Right Column: Featured Resource and Resource Grid */}
        <div className="learners-corner-right">
          {featuredResource && (
            <div className="featured-resource fh-card">
              <div className="featured-content">
                <div className="featured-image">
                  <img
                    src={featuredResource.imageSrc}
                    alt={featuredResource.title}
                  />
                </div>
                <div className="featured-text">
                  <span className="featured-badge fh-chip">Featured Resource</span>
                  <h3>{featuredResource.title}</h3>
                  <p>{featuredResource.description}</p>
                  <a href="#" className="btn-primary fh-btn">
                    {featuredResource.type === "video"
                      ? "Watch Video"
                      : "Read Full Article"}
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="resources-grid">
            {currentItems.length > 0 ? (
              currentItems.map((resource) => (
                <div className="resource-card fh-card" key={resource.id}>
                  <div className="card-image">
                    <img src={resource.imageSrc} alt={resource.title} />
                    <span className={`resource-type ${resource.type}`}>
                      {resource.type}
                    </span>
                  </div>
                  <div className="card-content">
                    <h3>{resource.title}</h3>
                    <p>{resource.description}</p>
                  </div>
                  <div className="card-footer">
                    {resource.type === "video" ? (
                      <a
                        href={resource.videoUrl}
                        className="read-more"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Watch Video
                      </a>
                    ) : (
                      <a href="#" className="read-more">
                        Read More
                      </a>
                    )}
                    <span className="card-meta">{resource.readTime}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results fh-card">
                <p>No resources found. Try different keywords or categories.</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Resource pages">
              <button type="button" className="fh-btn fh-btn--ghost" disabled={page === 1} onClick={() => setCurrentPage(page - 1)}>
                Prev
              </button>
              <span aria-live="polite">Page {page} of {totalPages}</span>
              <button type="button" className="fh-btn fh-btn--ghost" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)}>
                Next
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearnerCorner;
