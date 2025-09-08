#!/bin/bash

# R/HOOD GitHub Setup Script
echo "🎵 R/HOOD GitHub Setup Script"
echo "=============================="
echo ""

# Check if git remote already exists
if git remote get-url origin >/dev/null 2>&1; then
    echo "✅ Git remote 'origin' already exists"
    echo "Current remote URL: $(git remote get-url origin)"
    echo ""
    echo "To update the remote URL, run:"
    echo "git remote set-url origin YOUR_NEW_GITHUB_URL"
    echo ""
else
    echo "📝 To connect your local repository to GitHub:"
    echo ""
    echo "1. Create a new repository on GitHub.com"
    echo "2. Copy the repository URL (e.g., https://github.com/yourusername/rhoodapp.git)"
    echo "3. Run these commands:"
    echo ""
    echo "   git remote add origin YOUR_GITHUB_URL"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
fi

echo "📋 Your repository is ready with:"
echo "   ✅ Git initialized"
echo "   ✅ .gitignore configured"
echo "   ✅ Initial commit made"
echo "   ✅ README.md updated"
echo "   ✅ All project files committed"
echo ""
echo "🎉 Ready to push to GitHub!"
