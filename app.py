# Eventlet monkey patching must come FIRST before any other imports
import eventlet
eventlet.monkey_patch()

from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import csv
import os
import random
import string
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'chinese-game-secret-key-2024')

# Configure Socket.IO - use polling only for Render free tier compatibility
socketio = SocketIO(
    app, 
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_timeout=120,
    ping_interval=25,
    allow_upgrades=False  # Disable websocket upgrade, use polling only
)

def load_vocabulary_from_csv():
    """Load vocabulary from CSV file."""
    vocabulary = []
    csv_path = os.path.join(os.path.dirname(__file__), 'vocabulary.csv')
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Clean up the data
                traditional = row.get('Chinese (Traditional)', '').strip()
                pinyin = row.get('Pinyin', '').strip()
                english = row.get('English Meaning', '').strip()
                category = row.get('Category', '').strip()
                lesson = row.get('Lesson', '').strip()
                pos = row.get('POS', '').strip()
                
                if traditional and english:  # Only add if we have both
                    vocabulary.append({
                        "traditional": traditional,
                        "pinyin": pinyin,
                        "english": english,
                        "category": category,
                        "lesson": int(lesson) if lesson.isdigit() else 0,
                        "pos": pos,
                        "hint": f"{category} - {pos}" if pos else category
                    })
    except Exception as e:
        print(f"Error loading CSV: {e}")
        # Fallback vocabulary if CSV fails
        vocabulary = [
            {"traditional": "你好", "pinyin": "nǐ hǎo", "english": "hello", "category": "Greetings", "lesson": 1, "pos": "", "hint": "Common greeting"}
        ]
    
    return vocabulary

VOCABULARY = load_vocabulary_from_csv()

# ==================== BATTLE ROOMS STORAGE ====================
battle_rooms = {}

def generate_room_code():
    """Generate a unique 6-character room code."""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if code not in battle_rooms:
            return code

# Get unique lessons and categories for filtering
def get_lessons():
    lessons = sorted(set(word['lesson'] for word in VOCABULARY if word['lesson']))
    return lessons

def get_categories():
    categories = sorted(set(word['category'] for word in VOCABULARY if word['category']))
    return categories


@app.route("/")
def index():
    return render_template(
        "index.html", 
        total_words=len(VOCABULARY),
        lessons=get_lessons(),
        categories=get_categories()
    )


@app.route("/api/v1/words")
def get_words():
    return jsonify({"words": VOCABULARY})


@app.route("/api/v1/words/lesson/<int:lesson_id>")
def get_words_by_lesson(lesson_id):
    filtered = [w for w in VOCABULARY if w['lesson'] == lesson_id]
    return jsonify({"words": filtered, "lesson": lesson_id})


@app.route("/api/v1/words/category/<category>")
def get_words_by_category(category):
    filtered = [w for w in VOCABULARY if w['category'] == category]
    return jsonify({"words": filtered, "category": category})


@app.route("/api/v1/lessons")
def get_all_lessons():
    return jsonify({"lessons": get_lessons()})


@app.route("/api/v1/categories")
def get_all_categories():
    return jsonify({"categories": get_categories()})


# ==================== SOCKET.IO EVENTS ====================
@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')
    # Remove player from any room they were in
    for room_code, room in list(battle_rooms.items()):
        for player_id, player in list(room['players'].items()):
            if player['sid'] == request.sid:
                del room['players'][player_id]
                emit('player_left', {'player_id': player_id, 'name': player['name']}, room=room_code)
                if not room['players']:
                    del battle_rooms[room_code]
                else:
                    emit('lobby_update', {'players': list(room['players'].values())}, room=room_code)
                break

@socketio.on('create_room')
def handle_create_room(data):
    """Host creates a new battle room."""
    player_name = data.get('name', 'Host')
    room_code = generate_room_code()
    
    battle_rooms[room_code] = {
        'code': room_code,
        'host_sid': request.sid,
        'players': {},
        'status': 'waiting',
        'current_question': 0,
        'total_questions': 10,
        'questions': [],
        'start_time': None,
        'question_start_time': None,
        'answered_players': set(),
        'leaderboard_shown': False,  # Prevent duplicate leaderboard
        'advancing': False  # Prevent duplicate question advances
    }
    
    player_id = f"player_1"
    battle_rooms[room_code]['players'][player_id] = {
        'id': player_id,
        'sid': request.sid,
        'name': player_name,
        'score': 0,
        'streak': 0,
        'answers': [],
        'is_host': True
    }
    
    join_room(room_code)
    emit('room_created', {
        'room_code': room_code,
        'player_id': player_id,
        'is_host': True
    })
    emit('lobby_update', {'players': list(battle_rooms[room_code]['players'].values())}, room=room_code)

@socketio.on('join_room')
def handle_join_room(data):
    """Player joins an existing battle room."""
    room_code = data.get('room_code', '').upper()
    player_name = data.get('name', 'Player')
    
    if room_code not in battle_rooms:
        emit('join_error', {'message': 'Room not found! Check the code and try again.'})
        return
    
    room = battle_rooms[room_code]
    
    if room['status'] != 'waiting':
        emit('join_error', {'message': 'Game already in progress!'})
        return
    
    if len(room['players']) >= 20:
        emit('join_error', {'message': 'Room is full! (max 20 players)'})
        return
    
    player_id = f"player_{len(room['players']) + 1}"
    room['players'][player_id] = {
        'id': player_id,
        'sid': request.sid,
        'name': player_name,
        'score': 0,
        'streak': 0,
        'answers': [],
        'is_host': False
    }
    
    join_room(room_code)
    emit('room_joined', {
        'room_code': room_code,
        'player_id': player_id,
        'is_host': False
    })
    emit('lobby_update', {'players': list(room['players'].values())}, room=room_code)
    emit('player_joined', {'player_id': player_id, 'name': player_name}, room=room_code)

@socketio.on('start_battle')
def handle_start_battle(data):
    """Host starts the battle."""
    room_code = data.get('room_code')
    
    if room_code not in battle_rooms:
        return
    
    room = battle_rooms[room_code]
    
    if room['host_sid'] != request.sid:
        emit('error', {'message': 'Only the host can start the game!'})
        return
    
    if len(room['players']) < 1:
        emit('error', {'message': 'Need at least 1 player to start!'})
        return
    
    # Generate questions
    words = random.sample(VOCABULARY, min(room['total_questions'], len(VOCABULARY)))
    questions = []
    
    for word in words:
        distractors = random.sample([w for w in VOCABULARY if w['traditional'] != word['traditional']], 3)
        options = [word] + distractors
        random.shuffle(options)
        
        questions.append({
            'question': word['english'],
            'correct': word['traditional'],
            'pinyin': word['pinyin'],
            'options': [{'traditional': o['traditional'], 'pinyin': o['pinyin']} for o in options]
        })
    
    room['questions'] = questions
    room['status'] = 'playing'
    room['current_question'] = 0
    room['start_time'] = time.time()
    
    for player in room['players'].values():
        player['score'] = 0
        player['streak'] = 0
        player['answers'] = []
    
    emit('battle_starting', {'countdown': 3}, room=room_code)

@socketio.on('request_question')
def handle_request_question(data):
    """Send question after countdown."""
    room_code = data.get('room_code')
    if room_code not in battle_rooms:
        return
    
    room = battle_rooms[room_code]
    if room['host_sid'] != request.sid:
        return
    
    send_question(room_code)

def send_question(room_code):
    """Send the current question to all players."""
    if room_code not in battle_rooms:
        return
    
    room = battle_rooms[room_code]
    
    if room['current_question'] >= len(room['questions']):
        end_battle(room_code)
        return
    
    question = room['questions'][room['current_question']]
    room['question_start_time'] = time.time()
    room['answered_players'] = set()
    room['leaderboard_shown'] = False  # Reset for new question
    room['leaderboard_displayed'] = False  # Reset for new question
    room['advancing'] = False  # Reset for new question
    
    socketio.emit('new_question', {
        'question_num': room['current_question'] + 1,
        'total_questions': len(room['questions']),
        'question': question['question'],
        'options': question['options'],
        'time_limit': 15
    }, room=room_code)

def delayed_leaderboard(room_code):
    """Show leaderboard after a short delay (runs in background task)."""
    socketio.sleep(2)
    if room_code in battle_rooms:
        show_leaderboard(room_code)

def advance_to_next_question(room_code):
    """Advance to next question after leaderboard (runs in background task)."""
    socketio.sleep(5)
    if room_code in battle_rooms:
        room = battle_rooms[room_code]
        # Only advance if not already advancing
        if not room.get('advancing', False):
            room['advancing'] = True
            room['current_question'] += 1
            if room['current_question'] < len(room['questions']):
                send_question(room_code)
            else:
                end_battle(room_code)

@socketio.on('submit_answer')
def handle_submit_answer(data):
    """Player submits an answer."""
    room_code = data.get('room_code')
    player_id = data.get('player_id')
    answer = data.get('answer')
    
    if room_code not in battle_rooms:
        return
    
    room = battle_rooms[room_code]
    
    if room['status'] != 'playing':
        return
    
    if player_id not in room['players']:
        return
    
    if player_id in room.get('answered_players', set()):
        return
    
    room['answered_players'].add(player_id)
    player = room['players'][player_id]
    question = room['questions'][room['current_question']]
    
    time_taken = time.time() - room['question_start_time']
    time_bonus = max(0, int((15 - time_taken) * 50))
    
    is_correct = answer == question['correct']
    
    if is_correct:
        player['streak'] += 1
        streak_bonus = min(player['streak'] * 25, 200)
        points = 100 + time_bonus + streak_bonus
        player['score'] += points
        player['answers'].append({'correct': True, 'points': points})
    else:
        player['streak'] = 0
        player['answers'].append({'correct': False, 'points': 0})
    
    emit('answer_result', {
        'correct': is_correct,
        'correct_answer': question['correct'],
        'pinyin': question['pinyin'],
        'points_earned': player['answers'][-1]['points'],
        'total_score': player['score'],
        'streak': player['streak']
    })
    
    # Notify all about answer count
    socketio.emit('answer_count', {
        'answered': len(room['answered_players']),
        'total': len(room['players'])
    }, room=room_code)
    
    # Check if all players have answered - auto show leaderboard
    if len(room['answered_players']) >= len(room['players']):
        # Only trigger if leaderboard not already shown/scheduled
        if not room.get('leaderboard_shown', False):
            room['leaderboard_shown'] = True  # Mark as scheduled
            socketio.start_background_task(delayed_leaderboard, room_code)

@socketio.on('time_up')
def handle_time_up(data):
    """Question timer ran out."""
    room_code = data.get('room_code')
    
    if room_code not in battle_rooms:
        return
    
    room = battle_rooms[room_code]
    
    # Only host can trigger time_up, and only if leaderboard not shown
    if room['host_sid'] != request.sid:
        return
    
    if room.get('leaderboard_shown', False):
        return  # Already showing leaderboard
    
    room['leaderboard_shown'] = True  # Mark as scheduled
    
    # Mark unanswered players as wrong
    for player_id, player in room['players'].items():
        if player_id not in room.get('answered_players', set()):
            player['streak'] = 0
            player['answers'].append({'correct': False, 'points': 0})
    
    show_leaderboard(room_code)

@socketio.on('show_leaderboard')
def handle_show_leaderboard(data):
    """Show leaderboard after answers."""
    room_code = data.get('room_code')
    if room_code not in battle_rooms:
        return
    
    room = battle_rooms[room_code]
    if room['host_sid'] != request.sid:
        return
    
    # Only show if not already shown
    if not room.get('leaderboard_shown', False):
        room['leaderboard_shown'] = True
        show_leaderboard(room_code)

def show_leaderboard(room_code):
    """Show leaderboard after each question."""
    if room_code not in battle_rooms:
        return
    
    room = battle_rooms[room_code]
    
    # Prevent showing leaderboard multiple times for same question
    if room.get('leaderboard_displayed', False):
        return
    room['leaderboard_displayed'] = True
    
    question = room['questions'][room['current_question']]
    
    sorted_players = sorted(room['players'].values(), key=lambda p: p['score'], reverse=True)
    leaderboard = [{
        'rank': i + 1,
        'name': p['name'],
        'score': p['score'],
        'streak': p['streak']
    } for i, p in enumerate(sorted_players[:5])]
    
    socketio.emit('show_leaderboard', {
        'leaderboard': leaderboard,
        'question_num': room['current_question'] + 1,
        'total_questions': len(room['questions']),
        'correct_answer': question['correct'],
        'pinyin': question['pinyin']
    }, room=room_code)
    
    # Auto-advance to next question after 5 seconds
    socketio.start_background_task(advance_to_next_question, room_code)

@socketio.on('next_question')
def handle_next_question(data):
    """Move to next question (manual trigger - disabled to prevent skipping)."""
    # Disabled - questions now auto-advance
    pass

def end_battle(room_code):
    """End the battle and show final results."""
    if room_code not in battle_rooms:
        return
    
    room = battle_rooms[room_code]
    room['status'] = 'finished'
    
    sorted_players = sorted(room['players'].values(), key=lambda p: p['score'], reverse=True)
    final_leaderboard = [{
        'rank': i + 1,
        'name': p['name'],
        'score': p['score'],
        'correct_answers': sum(1 for a in p['answers'] if a['correct']),
        'total_questions': len(room['questions'])
    } for i, p in enumerate(sorted_players)]
    
    socketio.emit('battle_ended', {
        'final_leaderboard': final_leaderboard,
        'winner': sorted_players[0]['name'] if sorted_players else 'No winner'
    }, room=room_code)

@socketio.on('leave_battle')
def handle_leave_battle(data):
    """Player leaves the battle."""
    room_code = data.get('room_code')
    player_id = data.get('player_id')
    
    if room_code not in battle_rooms:
        return
    
    room = battle_rooms[room_code]
    
    if player_id in room['players']:
        player_name = room['players'][player_id]['name']
        del room['players'][player_id]
        leave_room(room_code)
        emit('player_left', {'player_id': player_id, 'name': player_name}, room=room_code)
        
        if not room['players']:
            del battle_rooms[room_code]
        else:
            emit('lobby_update', {'players': list(room['players'].values())}, room=room_code)


if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
