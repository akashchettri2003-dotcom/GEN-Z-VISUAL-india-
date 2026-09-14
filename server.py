from flask import Flask, render_template, request, redirect, session, jsonify
from pymongo import MongoClient
from datetime import datetime, timedelta
import os, razorpay
from bson.objectid import ObjectId

app = Flask(__name__)
app.secret_key = "genzvisual2026"

# DB - will connect after you add MONGODB_URI in Render
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client.geng_visual

# Razorpay for Paytm/GPay/PhonePe
RAZOR_KEY = os.getenv("RAZORPAY_KEY", "")
RAZOR_SECRET = os.getenv("RAZORPAY_SECRET", "")
razor_client = razorpay.Client(auth=(RAZOR_KEY, RAZOR_SECRET)) if RAZOR_KEY else None

@app.route('/')
def home():
    novels = list(db.novels.find())
    comics = list(db.comics.find())
    return render_template('index.html', novels=novels, comics=comics, user=session.get('user'))

@app.route('/register', methods=['GET','POST'])
def register():
    if request.method == 'POST':
        if db.users.find_one({"email": request.form['email']}):
            return "Email exists"
        db.users.insert_one({
            "email": request.form['email'],
            "password": request.form['password'],
            "role": request.form['role'], # reader or author
            "coins": 20, # free 20 coins
            "is_subscribed": False,
            "sub_end": None,
            "purchased": [],
            "earning": 0
        })
        return redirect('/login')
    return render_template('register.html')

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        user = db.users.find_one({"email": request.form['email'], "password": request.form['password']})
        if user:
            session['user'] = {"email": user['email'], "role": user['role'], "coins": user['coins']}
            return redirect('/')
    return render_template('login.html')

@app.route('/novel/<id>')
def novel_detail(id):
    novel = db.novels.find_one({"_id": ObjectId(id)})
    user = None
    if 'user' in session:
        user = db.users.find_one({"email": session['user']['email']})
    return render_template('novel.html', novel=novel, user=user, razor_key=RAZOR_KEY)

# --- AUTHOR DASHBOARD ---
@app.route('/author')
def author_dash():
    if 'user' not in session or session['user']['role'] != 'author':
        return redirect('/login')
    my_novels = list(db.novels.find({"author_email": session['user']['email']}))
    return render_template('author.html', novels=my_novels)

@app.route('/author/create_novel', methods=['POST'])
def create_novel():
    db.novels.insert_one({
        "title": request.form['title'],
        "cover": request.form['cover'],
        "description": request.form['desc'],
        "price_coins": int(request.form['price']),
        "author_email": session['user']['email'],
        "chapters": []
    })
    return redirect('/author')

@app.route('/author/add_chapter/<id>', methods=['POST'])
def add_chapter(id):
    db.novels.update_one({"_id": ObjectId(id)}, {"$push": {"chapters": {
        "id": str(ObjectId()),
        "title": request.form['ch_title'],
        "content": request.form['ch_content']
    }}})
    return redirect(f'/novel/{id}')

# --- PAYMENT - PAYTM/GPAY/PHONEPE (UPI) ---
@app.route('/create_order', methods=['POST'])
def create_order():
    data = request.json
    amount = int(data['amount']) * 100 # paise
    order = razor_client.order.create({"amount": amount, "currency": "INR", "receipt": data['email']})
    return jsonify(order)

@app.route('/verify_payment', methods=['POST'])
def verify_payment():
    data = request.json
    # Add coins or subscription
    if data['type'] == 'coins':
        db.users.update_one({"email": data['email']}, {"$inc": {"coins": int(data['value'])}})
    else:
        db.users.update_one({"email": data['email']}, {"$set": {"is_subscribed": True, "sub_end": datetime.now() + timedelta(days=30)}})
    return jsonify({"ok": True})

@app.route('/unlock/<novel_id>/<chapter_id>', methods=['POST'])
def unlock_ch(novel_id, chapter_id):
    email = session['user']['email']
    user = db.users.find_one({"email": email})
    if user.get('is_subscribed') and user.get('sub_end') and user['sub_end'] > datetime.now():
        return jsonify({"unlocked": True})
    if chapter_id in user.get('purchased', []):
        return jsonify({"unlocked": True})
    novel = db.novels.find_one({"_id": ObjectId(novel_id)})
    price = novel.get('price_coins', 10)
    if user['coins'] >= price:
        db.users.update_one({"email": email}, {"$inc": {"coins": -price, "earning": 0}, "$push": {"purchased": chapter_id}})
        db.users.update_one({"email": novel['author_email']}, {"$inc": {"earning": price*0.7}})
        return jsonify({"unlocked": True})
    return jsonify({"unlocked": False, "need": price})

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

if __name__ == '__main__':
    app.run()
