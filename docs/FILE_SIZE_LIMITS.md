# File Size Limits & Optimization Guide

## Current Limits

### Audio Files

- **Maximum Size**: 2 GB per file
- **Reason**: Increased limit for larger DJ mixes
- **Formats Supported**: MP3, WAV, M4A, AAC, OGG, FLAC

### Artwork Files

- **Maximum Size**: 10 MB per file
- **Formats Supported**: JPG, PNG, WebP
- **Recommended**: Square aspect ratio (1:1)

## Why 2GB?

Supabase Storage has the following limits:

- **Free Tier**: 1 GB total storage, 50 MB per file
- **Pro Tier**: 100 GB total storage, 5 GB per file
- **Custom Limit**: 2 GB per file (configured for DJ mixes)

## How to Reduce File Size

### For Audio Files

#### 1. Convert WAV to MP3

**Size Reduction**: ~90%

```bash
# Using ffmpeg (recommended)
ffmpeg -i input.wav -b:a 192k output.mp3

# Using online converters:
# - CloudConvert.com
# - Online-Convert.com
# - FreeConvert.com
```

#### 2. Reduce Bitrate

**Recommended Bitrates**:

- **128 kbps**: Good quality, smaller files
- **192 kbps**: High quality, balanced size
- **320 kbps**: Maximum quality, larger files

```bash
# Convert to 192kbps MP3
ffmpeg -i input.mp3 -b:a 192k output.mp3
```

#### 3. Trim Silence

Remove unnecessary silence at beginning/end:

```bash
ffmpeg -i input.mp3 -af silenceremove=1:0:-50dB output.mp3
```

#### 4. Use Compression

Apply audio compression to reduce dynamic range:

```bash
ffmpeg -i input.mp3 -af "compand" output.mp3
```

### For Artwork Files

#### 1. Resize Images

Recommended size: 1000x1000 pixels (1:1 ratio)

```bash
# Using ImageMagick
convert input.jpg -resize 1000x1000 output.jpg

# Using online tools:
# - TinyPNG.com
# - Squoosh.app
# - ImageOptim (Mac)
```

#### 2. Compress Images

Reduce quality without visible loss:

```bash
# JPEG (quality 85 is usually optimal)
convert input.jpg -quality 85 output.jpg

# PNG
pngquant input.png --output output.png
```

## File Size Examples

### Typical Audio File Sizes

| Format | Duration | Bitrate   | Size       |
| ------ | -------- | --------- | ---------- |
| WAV    | 60 min   | 1411 kbps | ~600 MB ❌ |
| MP3    | 60 min   | 320 kbps  | ~144 MB ❌ |
| MP3    | 60 min   | 192 kbps  | ~86 MB ❌  |
| MP3    | 60 min   | 128 kbps  | ~58 MB ❌  |
| MP3    | 30 min   | 192 kbps  | ~43 MB ✅  |
| MP3    | 30 min   | 128 kbps  | ~29 MB ✅  |

### Typical Artwork Sizes

| Format | Dimensions | Quality  | Size       |
| ------ | ---------- | -------- | ---------- |
| PNG    | 3000x3000  | Lossless | ~15 MB ❌  |
| JPG    | 3000x3000  | 100%     | ~5 MB ✅   |
| JPG    | 1000x1000  | 85%      | ~200 KB ✅ |
| WebP   | 1000x1000  | 80%      | ~150 KB ✅ |

## Recommended Workflow

### For DJs Uploading Mixes:

1. **Record/Export** your mix in high quality (WAV/320kbps)
2. **Convert** to MP3 at 192kbps for upload
3. **Keep** the high-quality version as backup
4. **Create** square artwork (1000x1000px)
5. **Compress** artwork to under 1MB
6. **Upload** to R/HOOD app

### Tools We Recommend

#### Desktop Tools (Free):

- **Audacity** - Audio editing & export
- **ffmpeg** - Command-line conversion
- **GIMP** - Image editing
- **ImageMagick** - Image conversion

#### Online Tools (Free):

- **CloudConvert** - Audio/image conversion
- **TinyPNG** - Image compression
- **Online Audio Converter** - Audio conversion

#### Mac Apps:

- **GarageBand** - Audio editing
- **Preview** - Image resizing
- **ImageOptim** - Image compression

#### Windows Apps:

- **Audacity** - Audio editing
- **IrfanView** - Image editing
- **HandBrake** - Media conversion

## Upgrading Storage

If you need to upload larger files regularly:

### Supabase Pro Plan

- **Cost**: $25/month
- **Storage**: 100 GB
- **File Size Limit**: 5 GB per file
- **Bandwidth**: 250 GB/month

### Contact Us

If you're a professional DJ needing larger storage, contact us at:

- **Email**: support@rhood.app
- **Discord**: [R/HOOD Community]

## Troubleshooting

### "Object exceeded maximum size allowed"

**Solution**: Your file is over 50MB. Convert to MP3 at 192kbps or lower.

### "Upload failed"

**Possible causes**:

1. File too large (>50MB)
2. Poor internet connection
3. Unsupported format
4. Storage quota exceeded

**Solutions**:

1. Reduce file size
2. Use WiFi instead of cellular
3. Convert to MP3/M4A
4. Delete old mixes or upgrade plan

### "Failed to play mix"

**Possible causes**:

1. File corrupted during upload
2. Unsupported codec
3. Network issues

**Solutions**:

1. Re-upload the file
2. Convert to standard MP3
3. Check internet connection

## Best Practices

1. ✅ **Use MP3 format** for best compatibility
2. ✅ **192kbps bitrate** for quality/size balance
3. ✅ **Square artwork** (1:1 aspect ratio)
4. ✅ **Compress images** before upload
5. ✅ **Test playback** after upload
6. ✅ **Keep backups** of high-quality originals
7. ❌ **Don't upload WAV** files (too large)
8. ❌ **Don't use very low bitrates** (<128kbps)
9. ❌ **Don't upload without testing** file first

## Future Plans

We're working on:

- **Automatic compression** during upload
- **Multiple quality options** (streaming)
- **Larger file support** for verified DJs
- **Cloud processing** for format conversion
- **Progressive upload** for large files

Stay tuned for updates!
