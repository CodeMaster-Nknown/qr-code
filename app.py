import os
import uuid
import qrcode
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory, url_for
from extensions import db
from models import QRCodeRecord

def create_app():
    app = Flask(__name__)
    
    # --- VERCEL CONFIGURATION ---
    # Use /tmp for storage because Vercel file system is Read-Only
    # Note: /tmp is ephemeral and will be cleared eventually.
    tmp_dir = '/tmp'
    
    # Database
    db_path = os.path.join(tmp_dir, 'qrcodes_v2.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Images Directory in /tmp
    images_dir = os.path.join(tmp_dir, 'images')
    os.makedirs(images_dir, exist_ok=True)

    db.init_app(app)

    with app.app_context():
        db.create_all()

    @app.route('/')
    def index():
        return render_template('index.html')

    # Route to serve images from /tmp
    @app.route('/tmp_images/<path:filename>')
    def serve_tmp_image(filename):
        return send_from_directory(images_dir, filename)

    @app.route('/generate', methods=['POST'])
    def generate_qr():
        data = request.get_json()
        url = data.get('url')

        if not url:
            return jsonify({'error': 'URL is required'}), 400

        # Logic for Domain and Styling
        domain = "unknown"
        category = "Other"
        fill_color = "black"
        back_color = "white"

        try:
            from urllib.parse import urlparse
            parsed_uri = urlparse(url)
            domain = parsed_uri.netloc.lower()
            if domain.startswith('www.'):
                domain = domain[4:]
            
            # Simple Category/Color Map
            if 'youtube.com' in domain or 'youtu.be' in domain:
                category = 'YouTube'
                fill_color = '#FF0000' # Red
            elif 'instagram.com' in domain:
                category = 'Instagram'
                fill_color = '#C13584' # Insta Purple-ish
            elif 'facebook.com' in domain:
                category = 'Facebook'
                fill_color = '#1877F2' # FB Blue
            elif 'twitter.com' in domain or 'x.com' in domain:
                category = 'Twitter/X'
                fill_color = '#1DA1F2' # Twitter Blue
            elif 'linkedin.com' in domain:
                category = 'LinkedIn'
                fill_color = '#0A66C2' # LinkedIn Blue
            elif 'github.com' in domain:
                category = 'GitHub'
                fill_color = '#181717' # GitHub Black/Dark
            
        except Exception as e:
            print(f"Error parsing domain: {e}")

        # Generate QR Code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H, # Higher error correction for colored QRs
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)

        # Apply colors
        img = qr.make_image(fill_color=fill_color, back_color=back_color)
        
        # Save unique filename to /tmp/images
        filename = f"qr_{uuid.uuid4().hex}.png"
        full_path = os.path.join(images_dir, filename)
        
        img.save(full_path)

        # Get URL for the image
        # We use our new serve_tmp_image route
        image_url = url_for('serve_tmp_image', filename=filename)

        # Save to DB
        # Note: We store the URL now, or the filename. storing filename is better if we rebuild the url.
        # But for compatibility with existing frontend, let's store the serve path.
        record = QRCodeRecord(
            url=url, 
            image_path=image_url, # Storing the serve URL directly
            domain=domain,
            category=category
        )
        db.session.add(record)
        db.session.commit()

        return jsonify({
            'message': 'QR Code generated successfully',
            'qr_image': image_url,
            'original_url': url,
            'domain': domain,
            'category': category
        })

    @app.route('/history', methods=['GET'])
    def history():
        # Re-creating DB context if it was lost (optional check could go here)
        records = QRCodeRecord.query.order_by(QRCodeRecord.created_at.desc()).limit(10).all()
        return jsonify([record.to_dict() for record in records])

    @app.route('/clear_history', methods=['POST'])
    def clear_history():
        try:
            db.session.query(QRCodeRecord).delete()
            db.session.commit()
            return jsonify({'message': 'History cleared successfully'})
        except Exception as e:
            db.session.rollback()
            print(f"Error clearing history: {e}")
            return jsonify({'error': 'Failed to clear history'}), 500

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
