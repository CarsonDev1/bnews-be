#!/bin/bash

# create-upload-directories.sh
# Script to create upload directory structure

echo "📁 Creating upload directory structure..."

# Create main uploads directory
mkdir -p uploads

# Create subdirectories
mkdir -p uploads/avatars
mkdir -p uploads/posts
mkdir -p uploads/categories
mkdir -p uploads/editor
mkdir -p uploads/temp

# Create .gitkeep files to maintain directory structure in git
touch uploads/.gitkeep
touch uploads/avatars/.gitkeep
touch uploads/posts/.gitkeep
touch uploads/categories/.gitkeep
touch uploads/editor/.gitkeep
touch uploads/temp/.gitkeep

# Set appropriate permissions (optional)
chmod 755 uploads
chmod 755 uploads/avatars
chmod 755 uploads/posts
chmod 755 uploads/categories
chmod 755 uploads/editor
chmod 755 uploads/temp

echo "✅ Upload directory structure created successfully!"
echo ""
echo "Directory structure:"
echo "uploads/"
echo "├── avatars/"
echo "├── posts/"
echo "├── categories/"
echo "├── editor/"
echo "└── temp/"
echo ""
echo "📝 Note: Add this to your package.json scripts:"
echo '  "setup:uploads": "chmod +x create-upload-directories.sh && ./create-upload-directories.sh"'