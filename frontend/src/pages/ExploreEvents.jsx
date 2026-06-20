import { useState } from "react";
import Navbar from "../components/Navbar";
import "./ExploreEvents.css";

function ExploreEvents() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["Culture", "Fun", "Education", "Business", "Sports"];

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setFreeOnly(false);
    setSearchQuery("");
  };

  return (
    <div className="explore-page">
      <Navbar />

      {/* CSS gradient background with geometric shapes */}
      <div className="explore-bg">
        <div className="explore-content">

          {/* Title */}
          <h1 className="explore-title">Explore Events</h1>

          {/* Category filter buttons */}
          <div className="explore-categories">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-btn category-btn--${cat.toLowerCase()} ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Date/filter boxes + Free only checkbox */}
          <div className="explore-filters">
            <div className="filter-box" />
            <div className="filter-box" />
            <div className="filter-box" />
            <div className="free-only">
              <input
                type="checkbox"
                id="freeOnly"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
              />
              <label htmlFor="freeOnly">Free only</label>
            </div>
          </div>

          {/* Search bar + See results */}
          <div className="explore-search-row">
            <input
              type="text"
              className="explore-search-input"
              placeholder=""
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="explore-search-btn">See results</button>
          </div>

          {/* Clear filters */}
          <button className="explore-clear-btn" onClick={handleClearFilters}>
            Clear filters <span className="clear-icon">⊗</span>
          </button>

        </div>
      </div>
    </div>
  );
}

export default ExploreEvents;
