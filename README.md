# Paper2Notebook 📄→📓

Transform research papers into executable Jupyter notebooks in seconds. Powered by Gemini 2.5 Pro.

![Paper2Notebook](https://img.shields.io/badge/AI-Powered-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Python](https://img.shields.io/badge/python-3.9+-blue)
![Next.js](https://img.shields.io/badge/next.js-14-black)

## 🚀 Features

- **📄 PDF to Notebook Conversion**: Upload research papers and get runnable PyTorch notebooks
- **🔗 arXiv Integration**: Direct support for arXiv papers - just paste the URL
- **📐 LaTeX Extraction**: Automatically extracts and renders mathematical equations
- **🐍 PyTorch Implementation**: Real ML implementations at reduced scale for CPU execution
- **☁️ Google Colab Ready**: One-click "Open in Colab" functionality
- **🔧 Auto Dependencies**: Automatically detects and installs required libraries
- **🎯 Structured Output**: Organized into Abstract, Methodology, Experiments, and Conclusion sections

## 🛠️ Tech Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **Gemini 2.5 Pro**: State-of-the-art LLM for code generation
- **PyMuPDF**: PDF processing and text extraction
- **nbformat**: Jupyter notebook generation

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations
- **shadcn/ui**: Beautiful UI components

## 📋 Prerequisites

- Python 3.9+
- Node.js 18+
- Gemini API key ([Get one here](https://aistudio.google.com/apikey))

## 🚀 Quick Start

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Add your Gemini API key to .env

# Run the server
uvicorn app:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🌐 Deployment

### Railway Deployment

This project is designed to deploy on Railway with two separate services:

#### Deploy Backend
1. Create new Railway project
2. Connect your GitHub repository
3. Set root directory to `/backend`
4. Add environment variable: `GEMINI_API_KEY=your_key_here`
5. Deploy
6. Copy the backend URL

#### Deploy Frontend
1. In the same Railway project, add a new service
2. Connect the same GitHub repository
3. Set root directory to `/frontend`
4. Add environment variable: `NEXT_PUBLIC_API_URL=your_backend_url`
5. Deploy

### Vercel Deployment (Frontend Only)

```bash
cd frontend
vercel --prod
```

Set environment variable: `NEXT_PUBLIC_API_URL=your_backend_url`

## 📖 Usage

1. **Upload a Paper**: Drag and drop a PDF or paste an arXiv URL
2. **Enter API Key**: Provide your Gemini API key (bring your own key)
3. **Generate**: Click generate and watch as the notebook is created
4. **Download or Open in Colab**: Get your executable notebook instantly

## 🏗️ Project Structure

```
paper-to-notebook/
├── backend/                 # FastAPI backend
│   ├── app.py              # Main application file
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variables template
├── frontend/               # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── public/           # Static assets
│   └── package.json      # Node dependencies
├── railway.toml          # Railway deployment config
└── README.md            # This file
```

## 🎯 How It Works

1. **PDF Processing**: Extracts text and structure from research papers
2. **AI Analysis**: Gemini 2.5 Pro analyzes the paper's methodology and algorithms
3. **Code Generation**: Generates PyTorch implementation based on the paper
4. **Notebook Assembly**: Creates structured Jupyter notebook with:
   - Abstract and introduction
   - LaTeX equations
   - Python code cells
   - Experiment structure
   - Comments and documentation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- Raj Abhijit Dandekar - [GitHub](https://github.com/VizuaraAI)

## 🙏 Acknowledgments

- Powered by Google Gemini 2.5 Pro
- Built with ❤️ for the research community
- Special thanks to all contributors and users

## 📧 Contact

For any queries, mail us at: [raj.dandekar8@gmail.com](mailto:raj.dandekar8@gmail.com)

## 🔗 Links

- **Live Demo**: [paper2notebook.vizuara.ai](https://paper2notebook.vizuara.ai)
- **GitHub**: [VizuaraAI/paper-to-notebook](https://github.com/VizuaraAI/paper-to-notebook)
- **Other Products**:
  - [Vizz-AI](https://vizz.vizuara.ai) - Personalized AI tutor
  - [Dynaroute](https://dynaroute.vizuara.ai) - Smart routing solution

---

**Note**: This tool is designed for educational and research purposes. Always verify generated code before use in production.
