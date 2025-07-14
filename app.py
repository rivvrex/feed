import os
import json
from flask import Flask, render_template, request, jsonify
import re

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32 MB

# Demo in-memory post data (simulate DB)
POSTS_FILE = 'posts.json'

def load_posts():
    if os.path.exists(POSTS_FILE):
        with open(POSTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return [
        {
            'id': 1,
            'user': 'Alex Thompson',
            'avatar': 'https://randomuser.me/api/portraits/men/32.jpg',
            'location': 'Lake Louise, Banff National Park',
            'image': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
            'content': 'Discovering the pristine beauty of Canadian Rockies. The emerald waters of Lake Louise never cease to amaze me. Perfect morning for hiking and photography.',
            'hashtags': ['#BanffNationalPark', '#CanadianRockies', '#TravelPhotography'],
            'likes': 15200,
            'comments': [
                {'user': 'Sarah Chen', 'text': 'This place looks absolutely magical! Adding it to my bucket list.'},
                {'user': 'David Miller', 'text': 'The lighting in this shot is incredible!'},
                {'user': 'Emma Wilson', 'text': 'Have you been to Moraine Lake too?'}
            ]
        },
        {
            'id': 2,
            'user': 'Sarah Parker',
            'avatar': 'https://randomuser.me/api/portraits/women/44.jpg',
            'location': 'Santorini, Greece',
            'image': 'https://images.unsplash.com/photo-1465101178521-c1a9136a3fd9?auto=format&fit=crop&w=800&q=80',
            'content': 'Sunset views from Oia never disappoint. The white-washed buildings against the Aegean Sea create the perfect backdrop for an unforgettable evening.',
            'hashtags': ['#Santorini', '#Greece', '#TravelPhotography'],
            'likes': 2400,
            'comments': [
                {'user': 'Emily Parker', 'text': 'Thanks for the tip about timing! Did you need a guide to find the waterfall?'},
                {'user': 'Travel Enthusiast 1', 'text': 'Amazing insights! The local food recommendations were particularly helpful.'}
            ]
        },
        {
            'id': 3,
            'user': 'Liam Chen',
            'avatar': 'https://randomuser.me/api/portraits/men/65.jpg',
            'location': 'Bali, Indonesia',
            'image': 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80',
            'content': 'Exploring the beaches and temples of Bali. The food is amazing!',
            'hashtags': ['#Bali', '#Beach', '#Temple'],
            'likes': 3100,
            'comments': []
        },
        {
            'id': 4,
            'user': 'Sara Muller',
            'avatar': 'https://randomuser.me/api/portraits/women/68.jpg',
            'location': 'Santorini, Greece',
            'image': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=80',
            'content': 'Sunsets and white-washed buildings in Santorini. A dream come true!',
            'hashtags': ['#Santorini', '#DreamTrip'],
            'likes': 1800,
            'comments': []
        },
        {
            'id': 5,
            'user': 'Kenji Sato',
            'avatar': 'https://randomuser.me/api/portraits/men/77.jpg',
            'location': 'Tokyo, Japan',
            'image': 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80',
            'content': 'Cherry blossoms in full bloom. Tokyo is magical in spring!',
            'hashtags': ['#Tokyo', '#Sakura', '#Spring'],
            'likes': 2900,
            'comments': []
        }
    ]

def save_posts():
    with open(POSTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(POSTS, f, ensure_ascii=False, indent=2)

POSTS = load_posts()

@app.route('/')
def home():
    return render_template('feed.html', posts=POSTS)

@app.route('/my_trips')
def my_trips():
    # Filter posts to only show those created by the current user
    user_posts = [post for post in POSTS if post.get('user') == 'You']
    print('User posts:', [post['id'] for post in user_posts])
    return render_template('my_trips.html', posts=user_posts)

@app.route('/saved')
def saved():
    # Pass all posts to the template, but the JavaScript will filter to show only saved ones
    return render_template('saved.html', posts=POSTS)

@app.route('/groups')
def groups():
    # Only show posts not created by the current user
    random_posts = [post for post in POSTS if post.get('user') != 'You']
    return render_template('travel_groups.html', posts=random_posts)

@app.route('/create_post', methods=['GET', 'POST'])
def create_post_page():
    if request.method == 'POST':
        print('Received form data:', dict(request.form))
        user = request.form.get('user', 'You')
        avatar = request.form.get('avatar', 'https://randomuser.me/api/portraits/men/32.jpg')
        image = request.form.get('image', '')
        post_type = request.form.get('type', 'post')
        if not image or not image.startswith('data:image/'):
            return jsonify({'success': False, 'error': 'Image is required and must be a valid image.'}), 400
        if len(image) > 10_485_760:
            return jsonify({'success': False, 'error': 'Image is too large (max 10MB).'}), 400
        if post_type == 'guide':
            guide_title = request.form.get('guide_title', '')
            guide_steps = request.form.getlist('guide_steps[]')
            new_post = {
                'id': max([p['id'] for p in POSTS]) + 1 if POSTS else 1,
                'user': user,
                'avatar': avatar,
                'image': image,
                'type': 'guide',
                'guide_title': guide_title,
                'guide_steps': guide_steps,
                'likes': 0,
                'comments': []
            }
        elif post_type == 'story':
            story_content = request.form.get('story_content', '')
            new_post = {
                'id': max([p['id'] for p in POSTS]) + 1 if POSTS else 1,
                'user': user,
                'avatar': avatar,
                'image': image,
                'type': 'story',
                'story_content': story_content,
                'likes': 0,
                'comments': []
            }
        else:
            location = request.form.get('location', '')
            content = request.form.get('content', '')
            hashtags = request.form.get('hashtags', '')
            hashtags_from_content = re.findall(r'#\w+', content)
            hashtags_from_field = [tag.strip() for tag in hashtags.split() if tag.strip().startswith('#')]
            hashtags = list(set(hashtags_from_content + hashtags_from_field))
            visibility = request.form.get('visibility', 'Public')
            category = request.form.get('category', 'Adventure')
            new_post = {
                'id': max([p['id'] for p in POSTS]) + 1 if POSTS else 1,
                'user': user,
                'avatar': avatar,
                'image': image,
                'content': content,
                'hashtags': hashtags,
                'location': location,
                'visibility': visibility,
                'category': category,
                'type': 'post',
                'likes': 0,
                'comments': []
            }
        POSTS.insert(0, new_post)
        save_posts()
        print('New post created:', new_post)
        return jsonify({'success': True, 'post': new_post})
    return render_template('create_post.html')

@app.route('/explore')
def explore():
    return render_template('explore.html')

# Removed /reports route to ensure only standalone blank layout is used for Report section

@app.route('/booking')
def booking():
    return render_template('booking.html')

@app.route('/discover')
def discover():
    return render_template('discover.html')

@app.route('/report')
def report():
    return render_template('report.html')

@app.route('/profile')
def profile():
    return render_template('profile.html')

# --- Comment System API ---
@app.route('/comment', methods=['POST'])
def add_comment():
    post_id = int(request.form['post_id'])
    user = request.form['user']
    text = request.form['text']
    for post in POSTS:
        if post['id'] == post_id:
            post['comments'].append({'user': user, 'text': text})
            save_posts()
            return jsonify({'success': True, 'comments': post['comments']})
    return jsonify({'success': False}), 404

@app.route('/delete_post/<int:post_id>', methods=['POST'])
def delete_post(post_id):
    global POSTS
    posts = load_posts()
    new_posts = [p for p in posts if p.get('id') != post_id]
    if len(new_posts) == len(posts):
        return jsonify({'success': False, 'error': 'Post not found'})
    with open(POSTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(new_posts, f, ensure_ascii=False, indent=2)
    POSTS = new_posts  # Update in-memory posts
    return jsonify({'success': True})

@app.route('/like_post', methods=['POST'])
def like_post():
    post_id = int(request.form['post_id'])
    for post in POSTS:
        if post['id'] == post_id:
            post['likes'] += 1
            save_posts()
            return jsonify({'success': True, 'likes': post['likes']})
    return jsonify({'success': False}), 404

@app.route('/unlike_post', methods=['POST'])
def unlike_post():
    post_id = int(request.form['post_id'])
    for post in POSTS:
        if post['id'] == post_id and post['likes'] > 0:
            post['likes'] -= 1
            save_posts()
            return jsonify({'success': True, 'likes': post['likes']})
    return jsonify({'success': False}), 404

@app.route('/api/feed')
def api_feed():
    try:
        offset = int(request.args.get('offset', 0))
        limit = int(request.args.get('limit', 10))
    except ValueError:
        offset = 0
        limit = 10
    posts = load_posts()
    paginated = posts[offset:offset+limit]
    return jsonify({'posts': paginated, 'has_more': offset+limit < len(posts)})

@app.route('/api/my_trips')
def api_my_trips():
    try:
        offset = int(request.args.get('offset', 0))
        limit = int(request.args.get('limit', 10))
    except ValueError:
        offset = 0
        limit = 10
    posts = [p for p in load_posts() if p.get('user') == 'You']
    paginated = posts[offset:offset+limit]
    return jsonify({'posts': paginated, 'has_more': offset+limit < len(posts)})

if __name__ == '__main__':
    app.run(debug=True) 