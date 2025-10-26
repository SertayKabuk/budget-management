import fs from 'fs';
import path from 'path';

/**
 * Save a base64-encoded image to the uploads directory
 * @param base64Image - Base64 string (without data URL prefix)
 * @param prefix - Optional prefix for the filename (default: 'chat-image')
 * @returns The relative path to the saved file (e.g., '/uploads/chat-image-1234567890.jpg')
 */
export function saveBase64Image(base64Image: string, prefix: string = 'chat-image'): string {
  // Get upload directory from environment variable
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const uploadsPath = path.resolve(uploadDir);
  
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  // Generate unique filename
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filename = `${prefix}-${uniqueSuffix}.jpg`;
  const filePath = path.join(uploadsPath, filename);

  // Convert base64 to buffer and save
  const imageBuffer = Buffer.from(base64Image, 'base64');
  fs.writeFileSync(filePath, imageBuffer);

  // Return relative URL path
  return `/uploads/${filename}`;
}
