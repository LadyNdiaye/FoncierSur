const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const multer = require('multer');

const parcelDocumentDirectory = path.resolve(__dirname, '../../uploads/parcelles');
const acceptedTypes = new Map([
  ['.pdf', 'application/pdf'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
]);

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(parcelDocumentDirectory, { recursive: true }, (error) => {
      callback(error, parcelDocumentDirectory);
    });
  },
  filename(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomBytes(16).toString('hex')}${extension}`);
  },
});

const uploadParcelDocument = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (acceptedTypes.get(extension) !== file.mimetype) {
      const error = new Error('Le document doit être un PDF, un JPG ou un PNG valide.');
      error.statusCode = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
}).single('titrePlan');

module.exports = { uploadParcelDocument, parcelDocumentDirectory };
