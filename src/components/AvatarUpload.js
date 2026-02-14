import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader, X } from 'lucide-react';
import './AvatarUpload.css';

function AvatarUpload({ currentAvatar, onAvatarChange }) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    // Resize and compress image
    const resizeImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    // Create canvas
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Calculate new dimensions (max 400x400 for avatar)
                    let width = img.width;
                    let height = img.height;
                    const maxSize = 400;

                    if (width > height) {
                        if (width > maxSize) {
                            height = (height * maxSize) / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = (width * maxSize) / height;
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Draw resized image
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to base64 with compression
                    const base64 = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
                    resolve(base64);
                };

                img.onerror = reject;
                img.src = e.target.result;
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 10MB before compression)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image too large. Maximum size is 10MB');
            return;
        }

        try {
            setUploading(true);

            // Resize and compress
            const resizedBase64 = await resizeImage(file);

            // Check final size
            const finalSizeKB = (resizedBase64.length * 3 / 4) / 1024;
            if (finalSizeKB > 500) {
                alert('Image still too large after compression. Please use a smaller image.');
                setUploading(false);
                return;
            }

            // Set preview
            setPreview(resizedBase64);
            setUploading(false);

        } catch (error) {
            console.error('Error processing image:', error);
            alert('Failed to process image. Please try another file.');
            setUploading(false);
        }
    };

    const handleUpload = () => {
        if (preview) {
            onAvatarChange(preview);
            setPreview(null);
        }
    };

    const handleCancel = () => {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleChooseFile = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="avatar-upload-container">
            <h3 className="avatar-upload-title">
                <Camera size={20} />
                Ảnh đại diện
            </h3>

            <div className="avatar-display">
                {/* Current avatar */}
                <div className="avatar-current">
                    {currentAvatar && currentAvatar.startsWith('data:image/') ? (
                        <img src={currentAvatar} alt="Avatar" className="avatar-img" />
                    ) : (
                        <div className="avatar-emoji">{currentAvatar || '👤'}</div>
                    )}
                </div>

                {/* Preview if uploading new one */}
                {preview && (
                    <div className="avatar-preview">
                        <div className="preview-arrow">→</div>
                        <img src={preview} alt="Preview" className="avatar-img" />
                    </div>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {/* Buttons */}
            <div className="avatar-upload-actions">
                {preview ? (
                    <>
                        <button
                            className="avatar-btn primary"
                            onClick={handleUpload}
                            disabled={uploading}
                        >
                            <Upload size={18} />
                            Lưu ảnh đại diện
                        </button>
                        <button
                            className="avatar-btn secondary"
                            onClick={handleCancel}
                        >
                            <X size={18} />
                            Hủy
                        </button>
                    </>
                ) : (
                    <button
                        className="avatar-btn primary"
                        onClick={handleChooseFile}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <>
                                <Loader size={18} className="spinner" />
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <Camera size={18} />
                                Chọn ảnh mới
                            </>
                        )}
                    </button>
                )}
            </div>

            <p className="avatar-upload-hint">
                💡 Ảnh sẽ tự động resize về 400x400px. Tối đa 500KB.
            </p>
        </div>
    );
}

export default AvatarUpload;