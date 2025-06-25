from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Flask is working! Ready to build patent filing system.'

@app.route('/patent-status')
def patent_status():
    return {
        'status': 'ready',
        'system': 'vision-lake-patent-production',
        'customer': '20857'
    }

if __name__ == '__main__':
    app.run(debug=True, port=5000)
