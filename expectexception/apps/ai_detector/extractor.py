"""
Image Metadata Extractor Module
Ported from the original Streamlit app
"""
import PIL.Image
import PIL.ExifTags
import PIL.ImageChops
import PIL.ImageEnhance
import os
from datetime import datetime
import numpy as np
import tempfile
import logging

logger = logging.getLogger(__name__)


def extract_metadata(image_path):
    """
    Extracts basic metadata and EXIF data from an image
    
    Args:
        image_path: Path to the image file
        
    Returns:
        dict: Metadata including filename, size, format, EXIF data, etc.
    """
    info = {
        "Filename": os.path.basename(image_path),
        "Size": os.path.getsize(image_path),
        "Format": None,
        "Mode": None,
        "Dimensions": None,
        "EXIF": {},
        "Creation Date": None
    }
    
    try:
        with PIL.Image.open(image_path) as img:
            info["Format"] = img.format
            info["Mode"] = img.mode
            info["Dimensions"] = f"{img.width}x{img.height}"
            
            exif_data = img._getexif()
            if exif_data:
                for tag, value in exif_data.items():
                    tag_name = PIL.ExifTags.TAGS.get(tag, tag)
                    if tag_name == "DateTime":
                        info["Creation Date"] = str(value)
                    # Filter out binary data for readability
                    if isinstance(value, bytes):
                        continue
                    info["EXIF"][tag_name] = str(value)
    except Exception as e:
        logger.error(f"Error extracting metadata: {str(e)}")
        info["Error"] = str(e)
        
    return info


def perform_ela(image_path, quality=90):
    """
    Performs Error Level Analysis (ELA) on an image
    
    Args:
        image_path: Path to the image file
        quality: JPEG quality for comparison (default: 90)
        
    Returns:
        PIL.Image or None: ELA result image or None on error
    """
    temp_ela = None
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            temp_ela = tmp.name
        
        original = PIL.Image.open(image_path).convert('RGB')
        original.save(temp_ela, 'JPEG', quality=quality)
        temporary = PIL.Image.open(temp_ela)
        
        ela_image = PIL.ImageChops.difference(original, temporary)
        
        extrema = ela_image.getextrema()
        max_diff = max([ex[1] for ex in extrema])
        if max_diff == 0:
            max_diff = 1
        scale = 255.0 / max_diff
        
        ela_image = PIL.ImageEnhance.Brightness(ela_image).enhance(scale)
        
        return ela_image
    except Exception as e:
        logger.error(f"Error performing ELA: {str(e)}")
        return None
    finally:
        # Always clean up temp file
        if temporary:
            try:
                temporary.close()
            except Exception:
                pass
        if temp_ela and os.path.exists(temp_ela):
            try:
                os.remove(temp_ela)
            except Exception as cleanup_error:
                logger.warning(f"Failed to cleanup temp file {temp_ela}: {cleanup_error}")


def get_image_stats(image_path):
    """
    Calculates advanced image statistics
    
    Args:
        image_path: Path to the image file
        
    Returns:
        dict: Image statistics including color distribution, entropy, brightness
    """
    stats = {}
    try:
        with PIL.Image.open(image_path) as img:
            img_rgb = img.convert('RGB')
            img_array = np.array(img_rgb)
            
            # Color distribution
            stats["Mean R"] = round(float(np.mean(img_array[:,:,0])), 2)
            stats["Mean G"] = round(float(np.mean(img_array[:,:,1])), 2)
            stats["Mean B"] = round(float(np.mean(img_array[:,:,2])), 2)
            stats["Std Dev"] = round(float(np.std(img_array)), 2)
            
            # Entropy (measure of complexity/noise)
            greyscale = img.convert('L')
            hist = greyscale.histogram()
            hist_norm = [float(i) / sum(hist) for i in hist]
            entropy = -sum([p * np.log2(p) for p in hist_norm if p != 0])
            stats["Entropy"] = round(float(entropy), 4)
            
            # Top colors - limit maxcolors to prevent memory issues with large images
            max_colors = min(100000, img.size[0] * img.size[1])
            colors = img_rgb.getcolors(maxcolors=max_colors)
            if colors:
                colors.sort(key=lambda x: x[0], reverse=True)
                # Convert to serializable format
                top_colors = []
                for count, color in colors[:5]:
                    if isinstance(color, (tuple, list)):
                        top_colors.append([int(count), list(color)])
                    else:
                        top_colors.append([int(count), int(color)])
                stats["Top Colors"] = top_colors
            else:
                stats["Top Colors"] = []  # Image has too many unique colors
            
            stats["Average Brightness"] = round(float(np.mean(greyscale)), 2)
            
    except Exception as e:
        logger.error(f"Error getting image stats: {str(e)}")
        stats["Error"] = str(e)
    
    return stats
