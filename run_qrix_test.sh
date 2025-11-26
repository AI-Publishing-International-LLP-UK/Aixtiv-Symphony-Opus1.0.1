#!/bin/bash

# qRIX ARC Offline Test - Activation Script
# This script activates the virtual environment and provides options to run the test

echo "🎯 qRIX ARC Offline Test Environment"
echo "====================================="

# Activate the virtual environment
source qrix_arc_env/bin/activate

echo "✅ Virtual environment activated"
echo "📦 Packages available: numpy, matplotlib, pandas, jupyter notebook"
echo ""

# Check if ARC data files exist
if [ -f "./arc-agi_evaluation-challenges.json" ]; then
    echo "📁 Found ARC evaluation dataset"
elif [ -f "./arc-agi_test-challenges.json" ]; then
    echo "📁 Found ARC test dataset (Kaggle)"
else
    echo "📁 No ARC dataset files found - will use sample data"
fi

echo ""
echo "Choose how to run the qRIX test:"
echo "1. Run Python script directly (python3 qrix_arc_offline_test.py)"
echo "2. Start Jupyter Notebook (jupyter notebook)"
echo "3. Just activate environment (for manual commands)"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "🚀 Running Python script..."
        python3 qrix_arc_offline_test.py
        ;;
    2)
        echo "🚀 Starting Jupyter Notebook..."
        echo "💡 Open qrix_arc_offline_test.ipynb in your browser"
        echo "💡 Use Shift+Enter to run each cell"
        jupyter notebook
        ;;
    3)
        echo "🔧 Environment activated. You can now run:"
        echo "   python3 qrix_arc_offline_test.py"
        echo "   jupyter notebook"
        echo ""
        echo "💡 To deactivate when done: deactivate"
        $SHELL
        ;;
    *)
        echo "❌ Invalid choice. Exiting..."
        exit 1
        ;;
esac

echo ""
echo "🎯 qRIX ARC Offline Test Complete!"
