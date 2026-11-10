const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { cloudinary, cloudinaryReady } = require('../services/cloudinary');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

// Files are held in memory so they can be sent to the AI layer, then uploaded to Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 6 },
});

const AUDIO_EXT = { 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3' };
const IMAGE_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => (err ? reject(err) : resolve(result)));
    stream.end(buffer);
  });
}

// Uploads an image or voice note to Cloudinary and returns its https URL.
// Falls back to local disk only when Cloudinary credentials are not configured (dev without keys).
async function persist(file, kind) {
  if (!file) return null;
  const table = kind === 'voice' ? AUDIO_EXT : IMAGE_EXT;
  const base = (file.mimetype || '').split(';')[0];
  const ext = table[base];
  if (!ext) return null;

  if (cloudinaryReady()) {
    try {
      const result = await uploadToCloudinary(file.buffer, {
        folder: `roshanrozgar/${kind === 'voice' ? 'voice' : kind === 'document' ? 'documents' : 'images'}`,
        // Cloudinary stores audio under the "video" resource type.
        resource_type: kind === 'voice' ? 'video' : 'image',
      });
      return result.secure_url;
    } catch (err) {
      console.error('Cloudinary upload failed:', err.message);
      const e = new Error('Could not upload the file. Please try again.');
      e.status = 502;
      throw e;
    }
  }

  const dir = path.join(UPLOAD_ROOT, kind === 'voice' ? 'voice' : 'images');
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(dir, name), file.buffer);
  return `/uploads/${kind === 'voice' ? 'voice' : 'images'}/${name}`;
}

function asAI(file) {
  if (!file) return null;
  return { buffer: file.buffer, mime: (file.mimetype || '').split(';')[0] };
}

const fieldsAudioImage = upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'image', maxCount: 3 },
]);

const fieldsDocs = upload.fields([
  { name: 'idFront', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]);

module.exports = { upload, fieldsDocs, persist, asAI, fieldsAudioImage, UPLOAD_ROOT };
