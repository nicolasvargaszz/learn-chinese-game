from flask import Flask, jsonify, render_template
import csv
import os

app = Flask(__name__)

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


if __name__ == "__main__":
    app.run(debug=True)
