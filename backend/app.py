# app.py

import os
from flask import Flask, request, render_template

# initialize the flask app
app = Flask(__name__)

# configure the upload folder
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/', methods=['GET', 'POST'])
def upload_files():
    # this block handles the post request when files are uploaded
    if request.method == 'POST':
        # get the list of files from the form
        files = request.files.getlist('files')
        
        uploaded_files_info = []
        for file in files:
            # check if the file has a name
            if file.filename != '':
                # save the file to the uploads folder
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
                file.save(filepath)

                # get the file type from its extension
                file_type = file.filename.rsplit('.', 1)[-1].lower()
                
                # store file info
                uploaded_files_info.append({'name': file.filename, 'type': file_type})
        
        # render the page again, this time with the uploaded files info
        return render_template('index.html', files=uploaded_files_info)

    # this block handles the get request when the page is first loaded
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)