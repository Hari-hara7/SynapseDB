# app.py

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

# initialize the flask app
app = Flask(__name__)

# Enable CORS for Next.js frontend
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:3003"]}})

# configure the upload folder
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# Allowed file extensions
ALLOWED_EXTENSIONS = {'txt', 'md', 'text', 'markdown', 'csv', 'docx', 'pdf', 'doc'}

# ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload', methods=['POST'])
def upload_files():
    """API endpoint for file uploads"""
    try:
        # Check if files are in request
        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400
        
        # get the list of files from the form
        files = request.files.getlist('files')
        
        if not files or len(files) == 0:
            return jsonify({'error': 'No files selected'}), 400
        
        uploaded_files_info = []
        errors = []
        
        for file in files:
            # check if the file has a name
            if file.filename == '':
                errors.append('Empty filename detected')
                continue
            
            # Secure the filename
            filename = secure_filename(file.filename)
            
            # Check if file type is allowed
            if not allowed_file(filename):
                errors.append(f'{filename}: File type not allowed')
                continue
            
            try:
                # save the file to the uploads folder
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)

                # get the file type from its extension
                file_type = filename.rsplit('.', 1)[-1].lower()
                
                # Get file size
                file_size = os.path.getsize(filepath)
                
                # store file info
                uploaded_files_info.append({
                    'name': filename,
                    'type': file_type,
                    'size': file_size,
                    'path': filepath
                })
            except Exception as e:
                errors.append(f'{filename}: Upload failed - {str(e)}')
        
        # Prepare response
        response_data = {
            'success': len(uploaded_files_info) > 0,
            'uploaded': [f['name'] for f in uploaded_files_info],
            'files': uploaded_files_info,
            'total': len(uploaded_files_info),
            'errors': errors if errors else None
        }
        
        status_code = 200 if len(uploaded_files_info) > 0 else 400
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/files', methods=['GET'])
def list_files():
    """API endpoint to list uploaded files"""
    try:
        files = []
        for filename in os.listdir(app.config['UPLOAD_FOLDER']):
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.isfile(filepath):
                files.append({
                    'name': filename,
                    'size': os.path.getsize(filepath),
                    'type': filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'unknown'
                })
        
        return jsonify({
            'success': True,
            'files': files,
            'total': len(files)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to list files: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'upload_folder': app.config['UPLOAD_FOLDER'],
        'max_file_size': app.config['MAX_CONTENT_LENGTH'],
        'allowed_extensions': list(ALLOWED_EXTENSIONS)
    }), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)