# NTS Global Voyage

A Flask-based travel feed application with features like Home Feed, My Trips, Saved Posts, Travel Groups, Explore, Booking, Report, and Profile. Users can create, view, save, and delete travel posts, with infinite scroll and sharing options.

## Features
- **Home Feed:** View all travel posts with infinite scroll.
- **My Trips:** View and delete your own posts with infinite scroll.
- **Saved Posts:** See posts you have saved.
- **Travel Groups:** Discover posts from other users.
- **Explore:** Browse trending destinations (static demo cards).
- **Booking, Report, Profile:** Standalone pages for future features.
- **Create Post:** Add new posts (Post, Story, Guide) with image upload.
- **Share:** Share posts via link, WhatsApp, or Twitter.
- **Delete:** Remove your own posts from My Trips.

## Setup
1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd travel-feed-flask
   ```
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Run the Flask app:**
   ```bash
   python app.py
   ```
4. **Open in your browser:**
   Visit [http://127.0.0.1:5000](http://127.0.0.1:5000)

## Project Structure
- `app.py` — Main Flask backend
- `posts.json` — Stores all posts
- `templates/` — HTML templates (Jinja2)
- `static/` — CSS, JS, and images

## Notes
- Infinite scroll is enabled for Home Feed and My Trips.
- Explore page uses static demo cards.
- Some features (Booking, Report, Profile) are placeholders for future development.
- For best experience, run the app via Flask (not by opening HTML files directly).

## License
MIT 