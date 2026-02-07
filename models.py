from extensions import db
from datetime import datetime

class QRCodeRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(500), nullable=False)
    image_path = db.Column(db.String(255), nullable=False)
    domain = db.Column(db.String(100), nullable=True)     # e.g., 'youtube.com'
    category = db.Column(db.String(50), nullable=True)    # e.g., 'YouTube', 'Social', 'Other'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'url': self.url,
            'image_path': self.image_path,
            'domain': self.domain,
            'category': self.category,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
