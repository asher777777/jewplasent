/**
 * Utility for compressing images on the client side and converting them to high-efficiency JPEG (.jpg).
 * Resizes dimensions to max 1200px, optimizes byte size, and converts transparency to white background.
 */
export async function compressAndConvertToJpg(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Robust image check (supports empty file.type on Windows)
    const isImage = 
      (file.type && file.type.startsWith('image/')) || 
      /\.(jpe?g|png|webp|gif|bmp|jfif|heic|avif)$/i.test(file.name);

    if (!isImage && file.type) {
      return reject(new Error('הקובץ שנבחר אינו תמונה תקינה'));
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width === 0 || height === 0) {
          return reject(new Error('גודל התמונה אינו תקין'));
        }

        // Downscale if larger than max boundaries while preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('שגיאה ביצירת רכיב עיבוד התמונה (Canvas)'));
        }

        // Fill background with white in case of transparent PNG/WebP
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('שגיאה בכיווץ והמרת התמונה ל-JPG'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('לא ניתן לקרוא את קובץ התמונה. אנא נסה תמונה אחרת בפורמט JPG או PNG.'));
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = (err) => {
      reject(new Error('שגיאה בקריאת הקובץ מהמחשב: ' + (err?.target?.error?.message || err)));
    };

    reader.readAsDataURL(file);
  });
}
