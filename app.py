import os
import random
import math
from flask import Flask, request, redirect, session, render_template, jsonify, url_for
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from PIL import Image, ImageDraw
import base64
from io import BytesIO
from colormath.color_objects import LabColor, sRGBColor
from colormath.color_conversions import convert_color
from colormath.color_diff import delta_e_cie2000
import numpy as np

def patch_asscalar(a):
    return a.item()

setattr(np, "asscalar", patch_asscalar)

app = Flask(__name__)
app.secret_key = os.urandom(24)

SPOTIPY_CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID")
SPOTIPY_CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET")
SPOTIPY_REDIRECT_URI = os.getenv("SPOTIPY_REDIRECT_URI")

sp_oauth = SpotifyOAuth(
    client_id=SPOTIPY_CLIENT_ID,
    client_secret=SPOTIPY_CLIENT_SECRET,
    redirect_uri=SPOTIPY_REDIRECT_URI,
    scope="user-library-read playlist-read-private playlist-modify-public playlist-modify-private user-read-private user-read-playback-state user-top-read ugc-image-upload",
    cache_handler=spotipy.cache_handler.FlaskSessionCacheHandler(session),
    show_dialog=True
)

HEX_COLOR_MAP = {
    "#ff0000": "red", "#0000ff": "blue", "#000000": "black", "#ffff00": "yellow",
    "#008000": "green", "#800080": "purple", "#ffffff": "white", "#ffa500": "orange",
    "#ffc0cb": "pink", "#a52a2a": "brown", "#808080": "grey"
}

COLOR_MOOD_MAP = {
    "red": {
        "genres": ["r&b", "soul", "sensual pop"],
        "artists": [
            "The Weeknd", "Sade", "Frank Ocean", "D'Angelo", "Alina Baraz",
            "Lana Del Rey", "Giveon", "Bryson Tiller", "Miguel", "Kali Uchis",
            "Amy Winehouse", "John Legend", "Maxwell", "Mary J. Blige", "Erykah Badu"
        ]
    },
    "blue": {
        "genres": ["indie folk", "slowcore", "sad alternative"],
        "artists": [
            "Phoebe Bridgers", "Bon Iver", "The Smiths", "Radiohead", "Cigarettes After Sex",
            "Elliott Smith", "Mazzy Star", "Sufjan Stevens", "Nick Drake", "Damien Rice",
            "Iron & Wine", "Fleet Foxes", "Angel Olsen", "Julien Baker", "Big Thief"
        ]
    },
    "black": {
        "genres": ["dark hip-hop", "industrial", "metal"],
        "artists": [
            "Kanye West (Yeezus era)", "Ghostemane", "Death Grips", "Nine Inch Nails", "Pusha T",
            "Metallica", "Slipknot", "Marilyn Manson", "Travis Scott (dark tracks)", "J. Cole (dark themes)",
            "Ramo", "Denzel Curry", "Power Trip", "Cave In", "Neurosis"
        ]
    },
    "yellow": {
        "genres": ["funk", "soul", "groove"],
        "artists": [
            "Stevie Wonder", "James Brown", "Earth, Wind & Fire", "Anderson .Paak", "Bruno Mars",
            "Prince", "Chic", "Bee Gees", "Toots & The Maytals", "Michael Jackson",
            "Tower of Power", "Kool & The Gang", "Shalamar", "The Meters", "Cameo"
        ]
    },
    "green": {
        "genres": ["neo-soul", "chill beats", "jazz"],
        "artists": [
            "Tom Misch", "Norah Jones", "Erykah Badu", "Frank Ocean", "John Coltrane",
            "Chet Baker", "Mac DeMarco", "Billie Eilish (chill tracks)", "Daniel Caesar", "FKJ",
            "Hiatus Kaiyote", "Kamasi Washington", "Robert Glasper", " BADBADNOTGOOD", "Christian Scott"
        ]
    },
    "purple": {
        "genres": ["psychedelic rock", "dream pop", "synthwave"],
        "artists": [
            "Tame Impala", "Pink Floyd", "The Flaming Lips", "Beach House", "Toro y Moi",
            "MGMT", "The Neighbourhood", "Blood Orange", "FKA Twigs", "Melody's Echo Chamber",
            "Khruangbin", "Wavves", "DIIV", "Japandroids", "The Jesus and Mary Chain"
        ]
    },
    "white": {
        "genres": ["ambient", "modern classical", "new age"],
        "artists": [
            "Ludovico Einaudi", "Ólafur Arnalds", "Max Richter", "Brian Eno", "Nils Frahm",
            "Joe Hisaishi", "Philip Glass", "Hans Zimmer", "John Williams", "Yiruma",
            "Arvo Pärt", "Jóhann Jóhannsson", "Holly Herndon", "Oneohtrix Point Never", "William Basinski"
        ]
    },
    "orange": {
        "genres": ["blues rock", "classic country", "roots"],
        "artists": [
            "Johnny Cash", "The Black Keys", "Elvis Presley", "Chris Stapleton", "Muddy Waters",
            "Robert Johnson", "Little Richard", "Chuck Berry", "Ray Charles", "The Rolling Stones (bluesy era)",
            "Eric Clapton", "B.B. King", "Howlin' Wolf", "Etta James", "Albert King"
        ]
    },
    "pink": {
        "genres": ["bubblegum pop", "k-pop", "dance"],
        "artists": [
            "Ariana Grande", "BLACKPINK", "Taylor Swift (pop era)", "Lady Gaga", "Kylie Minogue",
            "Twice", "Dua Lipa", "Charli XCX", "BTS", "Madonna",
            "Little Mix", "Fifth Harmony", "Camila Cabello", "Selena Gomez", "Olivia Rodrigo"
        ]
    },
    "brown": {
        "genres": ["americana", "folk rock", "country-folk"],
        "artists": [
            "Fleetwood Mac", "The Lumineers", "Neil Young", "The Avett Brothers", "Johnny Flynn",
            "Mumford & Sons", "Trampled By Turtles", "Creedence Clearwater Revival", "Leon Bridges", "The Eagles",
            "The Band", "Simon & Garfunkel", "James Taylor", "Carole King", " Crosby, Stills, Nash & Young"
        ]
    },
    "grey": {
        "genres": ["trip-hop", "post-rock", "electronic noir"],
        "artists": [
            "Massive Attack", "Portishead", "Thom Yorke", "Sigur Rós", "Explosions in the Sky",
            "Mogwai", "UNKLE", "Bonobo", "Boards of Canada", "Godspeed You! Black Emperor",
            "The XX", "Nine Inch Nails (ambient works)", "William Basinski", "Tim Hecker", "Oneohtrix Point Never (ambient works)"
        ]
    }
}

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_lab(rgb_color):
    rgb = sRGBColor(rgb_color[0], rgb_color[1], rgb_color[2], is_upscaled=True)
    return convert_color(rgb, LabColor)

def color_distance(color1, color2):
    lab1 = rgb_to_lab(hex_to_rgb(color1))
    lab2 = rgb_to_lab(hex_to_rgb(color2))

    # Using CIEDE2000 for accurate color difference calculation
    delta_e = delta_e_cie2000(lab1, lab2)

    print(f"delta_e: {delta_e}, type: {type(delta_e)}")  # Debugging line

    # Ensure delta_e is returned as a scalar
    return np.asscalar(delta_e) if isinstance(delta_e, np.ndarray) else delta_e

def closest_color(hex_color):
    weights = {}

    for color_hex, color_name in HEX_COLOR_MAP.items():
        distance = color_distance(hex_color, color_hex)
        weights[color_name] = 1 / (distance + 0.01)  # Avoid division by zero

    # Normalize weights
    total_weight = sum(weights.values())
    for color_name in weights:
        weights[color_name] /= total_weight

    # Sort colors by weight in descending order
    sorted_weights = sorted(weights.items(), key=lambda x: x[1], reverse=True)

    # Select top 3 colors
    top_3_weights = {}
    for color, weight in sorted_weights[:3]:
        top_3_weights[color] = weight

    return top_3_weights

def get_spotify_client():
    token_info = session.get("token_info", None)
    if not token_info:
        print("❌ ERROR: No token found. User needs to log in.")
        return None  

    if sp_oauth.is_token_expired(token_info):
        print("🔄 Token expired, refreshing...")
        try:
            token_info = sp_oauth.refresh_access_token(token_info["refresh_token"])
            session["token_info"] = token_info  
            print("✅ Token refreshed successfully.")
        except Exception as e:
            print(f"❌ Error refreshing token: {e}")
            session.clear()
            return None

    return spotipy.Spotify(auth=token_info["access_token"])

def generate_playlist_name(mood_weights):
    color_mood_words = {
        "red": {
            "adjectives": ["Passionate", "Fiery", "Velvet", "Crimson", "Blazing"],
            "nouns": ["Flames", "Desire", "Horizon", "Rush", "Embers"]
        },
        "blue": {
            "adjectives": ["Tranquil", "Deep", "Misty", "Melancholy", "Ethereal"],
            "nouns": ["Waves", "Drift", "Skyline", "Echoes", "Currents"]
        },
        "black": {
            "adjectives": ["Shadowy", "Nocturnal", "Obsidian", "Abyssal", "Midnight"],
            "nouns": ["Void", "Silence", "Twilight", "Phantom", "Eclipse"]
        },
        "yellow": {
            "adjectives": ["Golden", "Radiant", "Bright", "Sunkissed", "Luminous"],
            "nouns": ["Sunbeams", "Glow", "Horizon", "Spark", "Dawn"]
        },
        "green": {
            "adjectives": ["Verdant", "Earthy", "Evergreen", "Mellow", "Soothing"],
            "nouns": ["Oasis", "Meadows", "Breeze", "Jungle", "Serenity"]
        },
        "purple": {
            "adjectives": ["Mystical", "Psychedelic", "Violet", "Celestial", "Dreamlike"],
            "nouns": ["Nebula", "Vortex", "Spirals", "Cosmos", "Euphoria"]
        },
        "white": {
            "adjectives": ["Pure", "Minimal", "Angelic", "Celestial", "Luminous"],
            "nouns": ["Clouds", "Light", "Stillness", "Horizon", "Daydream"]
        },
        "orange": {
            "adjectives": ["Warm", "Rustic", "Spiced", "Amber", "Golden"],
            "nouns": ["Dusk", "Harvest", "Glow", "Campfire", "Twilight"]
        },
        "pink": {
            "adjectives": ["Playful", "Rosy", "Blush", "Dreamy", "Ethereal"],
            "nouns": ["Petals", "Lullaby", "Glow", "Cotton Candy", "Wanderlust"]
        },
        "brown": {
            "adjectives": ["Vintage", "Raw", "Folksy", "Woodland", "Earthen"],
            "nouns": ["Roots", "Timber", "Wilderness", "Dust", "Driftwood"]
        },
        "grey": {
            "adjectives": ["Stormy", "Cinematic", "Overcast", "Dystopian", "Moody"],
            "nouns": ["Mist", "Shadows", "Fog", "Horizon", "Dusk"]
        }
    }

    adjectives = []
    nouns = []
    for color, weight in mood_weights.items():
        if color not in color_mood_words:
            continue
        adjectives.extend(color_mood_words[color]["adjectives"] * int(weight * 10))
        nouns.extend(color_mood_words[color]["nouns"] * int(weight * 10))

    if not adjectives:
        adjectives = color_mood_words["blue"]["adjectives"]
        nouns = color_mood_words["blue"]["nouns"]

    name = f"{random.choice(adjectives)} {random.choice(nouns)} 🎶"
    return name

def generate_gradient_image(hex_color, mood_weights):
    img_size = (640, 640)
    img = Image.new("RGB", img_size, "#000000")
    draw = ImageDraw.Draw(img)

    def hex_to_rgb(hex_str):
        hex_str = hex_str.lstrip("#")
        return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

    base_rgb = hex_to_rgb(hex_color)
    weighted_colors = []
    total_weight = sum(mood_weights.values())

    for color, weight in mood_weights.items():
        color_hex = next(k for k, v in HEX_COLOR_MAP.items() if v == color)
        weighted_colors.append((hex_to_rgb(color_hex), weight / total_weight))

    for i in range(320, 0, -1):
        alpha = i / 320
        blended_rgb = [
            int(sum(c[j] * w for c, w in weighted_colors) + base_rgb[j] * (1 - alpha)) 
            for j in range(3)
        ]
        draw.rectangle([320 - i, 320 - i, 320 + i, 320 + i], fill=tuple(blended_rgb))

    return img

def upload_playlist_cover(sp, playlist_id, hex_color, mood_weights):
    try:
        img = generate_gradient_image(hex_color, mood_weights)
        buffer = BytesIO()
        img.save(buffer, format="JPEG")

        image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        sp.playlist_upload_cover_image(playlist_id, image_base64)
        print("✅ Cover uploaded successfully.")
    except Exception as e:
        print(f"❌ Cover upload failed: {e}")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/check_login")
def check_login():
    """Checks if the user is logged in."""
    is_logged_in = False
    token_info = session.get("token_info")

    if token_info:
        if not sp_oauth.is_token_expired(token_info):
            is_logged_in = True
        else:
            session.pop("token_info", None)  # Remove expired token

    return jsonify({"logged_in": is_logged_in})

@app.route("/login")
def login():
    """Initiates Spotify login."""
    session.clear()  # Ensure fresh session
    state = os.urandom(16).hex()
    session["state"] = state

    auth_url = sp_oauth.get_authorize_url(state=state)
    return redirect(auth_url)

@app.route("/callback")
def callback():
    """Handles the OAuth callback and retrieves the access token."""
    stored_state = session.get("state")
    received_state = request.args.get("state")

    if not stored_state or stored_state != received_state:
        print("❌ OAuth State Mismatch! Possible CSRF attack.")
        return redirect(url_for("login"))

    code = request.args.get("code")
    try:
        token_info = sp_oauth.get_access_token(code, as_dict=True)
    except Exception as e:
        print(f"❌ Error getting access token: {e}")
        return redirect(url_for("login"))

    if not token_info:
        print("❌ Failed to get token from Spotify.")
        return redirect(url_for("login"))

    # Store token in session
    session["token_info"] = token_info
    print(f"✅ Stored Token Info: {session['token_info']}")

    return redirect(url_for("home"))

@app.route("/logout")
def logout():
    """Logs the user out by clearing the session and revoking access."""
    session.clear()  # Remove user session

    try:
        token_info = sp_oauth.get_cached_token()
        if token_info:
            refresh_token = token_info.get("refresh_token")
            if refresh_token:
                sp_oauth.revoke_access_token(refresh_token)
                print("✅ Successfully revoked Spotify token.")
    except Exception as e:
        print(f"❌ Error revoking token: {e}")

    return redirect(url_for("login"))

@app.route("/get_playlist", methods=["POST"])
def get_playlist():
    sp = get_spotify_client()
    if not sp:
        print("❌ Spotify client is None. User needs to log in again.")
        return jsonify({"error": "User is not logged in or token expired. Please log in again."}), 401

    data = request.json
    hex_color = data.get("color", "#000000")

    mood_weights = closest_color(hex_color)
    print(f"🎨 Mood weights: {mood_weights}")

    track_pool = []
    artist_set = set()
    genres_to_avoid = {"classical", "instrumental", "ambient", "new age"}

    # Get user's top artists for personalization
    try:
        top_artists = sp.current_user_top_artists(limit=5, time_range='medium_term')
        user_top_artists = [artist['name'] for artist in top_artists['items']]
    except spotipy.SpotifyException as e:
        print(f"❌ Error getting user's top artists: {e}")
        user_top_artists = []

    for color, weight in mood_weights.items():
        if color not in COLOR_MOOD_MAP:
            continue

        mood_data = COLOR_MOOD_MAP[color]

        # More artists, fewer tracks per artist for variety
        num_artists_to_search = int(20 * weight)  # More artists for stronger colors
        num_tracks_per_artist = 2  # Only 2 tracks per artist

        # Ensure we don't exceed available artists
        selected_artists = random.sample(mood_data["artists"], 
                                        min(num_artists_to_search, len(mood_data["artists"])))

        for artist in selected_artists:
            if artist in artist_set:
                continue
            artist_set.add(artist)

            query = f"artist:{artist}"
            print(f"🔍 Searching for: {query}")

            try:
                results = sp.search(q=query, type="track", limit=num_tracks_per_artist)
                tracks = results.get("tracks", {}).get("items", [])

                for track in tracks:
                    if track["popularity"] > 30:  # Include more varied popularity levels
                        track_info = {
                            "name": track["name"],
                            "artist": track["artists"][0]["name"],
                            "link": track["external_urls"]["spotify"],
                            "uri": track["uri"]
                        }
                        track_pool.append(track_info)

            except spotipy.SpotifyException as e:
                print(f"❌ Spotify search error for {artist}: {e}")
                continue  # Skip this artist and continue with others

    # Add user's top artists tracks (personalization) filtered by mood
    if user_top_artists:
        for artist in user_top_artists[:3]:  # Take top 3 artists
            if artist in artist_set:
                continue
            artist_set.add(artist)

            # Check if this artist fits the current mood
            mood_artists = [a for artists in COLOR_MOOD_MAP.values() for a in artists["artists"]]
            if artist not in mood_artists:
                continue

            query = f"artist:{artist}"
            print(f"🔍 Searching for user's top artist: {query}")

            try:
                results = sp.search(q=query, type="track", limit=2)
                tracks = results.get("tracks", {}).get("items", [])

                for track in tracks:
                    if track["popularity"] > 60:  # More popular tracks for user's favorites
                        track_info = {
                            "name": track["name"],
                            "artist": track["artists"][0]["name"],
                            "link": track["external_urls"]["spotify"],
                            "uri": track["uri"]
                        }
                        track_pool.append(track_info)

            except spotipy.SpotifyException as e:
                print(f"❌ Spotify search error for user's top artist {artist}: {e}")
                continue  # Skip this artist and continue with others

    # Add recommended tracks based on user's top tracks and current mood
    try:
        top_tracks = sp.current_user_top_tracks(limit=3, time_range='medium_term')
        seed_tracks = [track['id'] for track in top_tracks['items']]
        
        # Verify seed tracks are valid
        valid_seed_tracks = []
        for track_id in seed_tracks:
            try:
                sp.track(track_id)
                valid_seed_tracks.append(track_id)
            except spotipy.SpotifyException:
                print(f"❌ Track {track_id} is not valid")
        
        if valid_seed_tracks:
            print(f"🔍 Fetching recommendations for seed tracks: {valid_seed_tracks}")
            recommendations = sp.recommendations(seed_tracks=valid_seed_tracks, limit=5)
            for track in recommendations['tracks']:
                # Check if recommendation fits the mood
                artist = track['artists'][0]['name']
                if any(artist in mood_data["artists"] for mood_data in COLOR_MOOD_MAP.values()):
                    track_info = {
                        "name": track["name"],
                        "artist": artist,
                        "link": track["external_urls"]["spotify"],
                        "uri": track["uri"]
                    }
                    track_pool.append(track_info)
        else:
            print("❌ No valid seed tracks for recommendations")
        
    except spotipy.SpotifyException as e:
        print(f"❌ Spotify API error fetching recommendations: {e}")
    except Exception as e:
        print(f"❌ Error fetching recommendations: {e}")

    # Ensure we have enough tracks
    if len(track_pool) < 20:
        # Add more tracks from the mood pool if needed
        for color, weight in mood_weights.items():
            if color not in COLOR_MOOD_MAP:
                continue

            mood_data = COLOR_MOOD_MAP[color]
            additional_artists = random.sample(mood_data["artists"], 
                                            min(10, len(mood_data["artists"])))

            for artist in additional_artists:
                if artist in artist_set:
                    continue
                artist_set.add(artist)

                query = f"artist:{artist}"
                print(f"🔍 Searching for additional tracks: {query}")

                try:
                    results = sp.search(q=query, type="track", limit=2)
                    tracks = results.get("tracks", {}).get("items", [])

                    for track in tracks:
                        if track["popularity"] > 20:
                            track_info = {
                                "name": track["name"],
                                "artist": track["artists"][0]["name"],
                                "link": track["external_urls"]["spotify"],
                                "uri": track["uri"]
                            }
                            track_pool.append(track_info)

                except spotipy.SpotifyException as e:
                    print(f"❌ Spotify search error for additional artist {artist}: {e}")
                    continue  # Skip this artist and continue with others

    # Shuffle and select final tracks
    random.shuffle(track_pool)
    final_tracks = track_pool[:max(20, random.randint(25, 40))]  # Ensure at least 20 tracks

    print(f"🎵 Retrieved {len(final_tracks)} songs:")
    for song in final_tracks:
        print(f"   - {song['name']} by {song['artist']} (URI: {song['uri']})")

    return jsonify({
        "songs": final_tracks,
        "count": len(final_tracks)
    })

@app.route("/save_playlist", methods=["POST"])
def save_playlist():
    data = request.json
    tracks = data.get("tracks", [])
    hex_color = data.get("color", "#000000")

    sp = get_spotify_client()
    if not sp:
        return jsonify({"error": "User not authenticated"}), 401

    user_id = sp.current_user()["id"]
    mood_weights = closest_color(hex_color)

    playlist_name = generate_playlist_name(mood_weights)

    playlist = sp.user_playlist_create(user=user_id, name=playlist_name, public=True)

    if not playlist or "id" not in playlist or "external_urls" not in playlist:
        return jsonify({"error": "Failed to create playlist"}), 500

    playlist_id = playlist["id"]
    playlist_url = playlist["external_urls"].get("spotify", "#")

    track_uris = [
        track["uri"] if isinstance(track, dict) else track
        for track in tracks if track
    ]

    if track_uris:
        try:
            sp.playlist_add_items(playlist_id, track_uris)
            print(f"✅ Successfully added {len(track_uris)} tracks!")
        except spotipy.exceptions.SpotifyException as e:
            print(f"❌ Error adding tracks: {e}")

    upload_playlist_cover(sp, playlist_id, hex_color, mood_weights)

    return jsonify({
        "message": f"Playlist '{playlist_name}' saved!",
        "playlist_url": playlist_url
    })

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))  # Get PORT from environment, default 5000
    app.run(host="0.0.0.0", port=port, debug=True)  # ✅ Bind to 0.0.0.0 for Render