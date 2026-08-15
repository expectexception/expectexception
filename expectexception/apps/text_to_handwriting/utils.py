import os
import random
from PIL import Image, ImageDraw, ImageFont
from django.conf import settings

# Path to fonts
FONTS_DIR = os.path.join(settings.BASE_DIR, 'apps', 'text_to_handwriting', 'assets', 'fonts')

FONT_MAP = {
    'caveat': 'Caveat-Regular.ttf',
    'indie_flower': 'IndieFlower-Regular.ttf',
    'shadows': 'ShadowsIntoLight-Regular.ttf',
    'dancing': 'DancingScript-Regular.ttf',
}

PAPER_TYPES = ['plain', 'lined', 'dark']
INK_COLORS = ['blue', 'black', 'red']

from functools import lru_cache

@lru_cache(maxsize=10)
def load_font(font_path, font_size):
    try:
        return ImageFont.truetype(font_path, font_size)
    except OSError:
        return ImageFont.load_default()

def generate_handwriting_image(text, font_name='caveat', paper_type='plain', ink_color='blue', font_size=32):
    """
    Generates a realistic handwriting image from text using specified font and paper.
    Adds random perturbations to simulate human writing variations.
    
    Args:
        text: Text to convert to handwriting
        font_name: Font style (caveat, indie_flower, shadows, dancing)
        paper_type: Paper background (plain, lined, dark)
        ink_color: Text color (blue, black, red)
        font_size: Base font size in pixels (default: 32)
    """
    if font_name not in FONT_MAP:
        font_name = 'caveat'
    
    font_path = os.path.join(FONTS_DIR, FONT_MAP[font_name])
    
    # Configuration
    line_height = max(int(font_size * 1.4), 40)
    margin_left = 50
    margin_top = 50
    margin_right = 50
    page_width = 800
    
    lines = text.split('\n')
    wrapped_lines = []
    
    font = load_font(font_path, font_size)

    # Wrap text to fit page width
    dummy_draw = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    for line in lines:
        if not line.strip():
            wrapped_lines.append('')
            continue
            
        words = line.split(' ')
        current_line = []
        for word in words:
            test_line = ' '.join(current_line + [word])
            bbox = dummy_draw.textbbox((0, 0), test_line, font=font)
            width = bbox[2] - bbox[0]
            if width < (page_width - margin_left - margin_right):
                current_line.append(word)
            else:
                if current_line:
                    wrapped_lines.append(' '.join(current_line))
                current_line = [word]
        if current_line:
            wrapped_lines.append(' '.join(current_line))
    
    # Calculate page height based on content
    page_height = max(1000, margin_top + max(1, len(wrapped_lines)) * line_height + margin_top)
    
    # Create background
    if paper_type == 'lined':
        img = Image.new('RGB', (page_width, page_height), (255, 255, 255))
        draw = ImageDraw.Draw(img)
        # Draw horizontal lines
        for y in range(margin_top, page_height, line_height):
            draw.line([(0, y), (page_width, y)], fill=(200, 200, 255), width=1)
        # Draw margin line
        draw.line([(margin_left - 10, 0), (margin_left - 10, page_height)], fill=(255, 200, 200), width=2)
    elif paper_type == 'dark':
        img = Image.new('RGB', (page_width, page_height), (30, 30, 30))
    else:  # plain
        img = Image.new('RGB', (page_width, page_height), (253, 253, 250))  # Slight off-white

    draw = ImageDraw.Draw(img)
    
    # Set ink color
    if ink_color == 'blue':
        fill_color = (0, 0, 150)
    elif ink_color == 'black':
        fill_color = (20, 20, 20)
    elif ink_color == 'red':
        fill_color = (150, 0, 0)
    else:
        fill_color = (20, 20, 20)
    
    # Adjust for dark paper
    if paper_type == 'dark':
        fill_color = (220, 220, 220)

    # Draw text with realistic perturbations
    cursor_y = margin_top
    
    for line_idx, line in enumerate(wrapped_lines):
        cursor_x = margin_left
        
        # Add slight line slope variation (simulate page tilt)
        line_y_offset = random.uniform(-1, 1)
        
        for char in line:
            if not char.strip():
                # Handle spaces
                space_bbox = dummy_draw.textbbox((0, 0), 'a', font=font)
                space_width = (space_bbox[2] - space_bbox[0]) * 0.5
                cursor_x += space_width
                continue
            
            # Random character-level perturbations (more realistic)
            char_angle = random.uniform(-3, 3)  # Slight rotation
            char_y_offset = random.uniform(-2, 3)  # Vertical jitter
            char_x_offset = random.uniform(-1, 1)  # Horizontal jitter
            
            # Get character bounding box
            bbox = draw.textbbox((0, 0), char, font=font)
            char_w = bbox[2] - bbox[0]
            char_h = bbox[3] - bbox[1]
            
            if char_w <= 0 or char_h <= 0:
                continue
            
            # Create image for character to apply rotation
            char_img_size = (int(char_w * 2) + 20, int(char_h * 2) + 20)
            char_img = Image.new('RGBA', char_img_size, (0, 0, 0, 0))
            char_draw = ImageDraw.Draw(char_img)
            
            # Draw character with slight color variation
            char_draw.text(
                (10, 10),
                char,
                font=font,
                fill=fill_color + (255,)
            )
            
            # Rotate character
            try:
                rotated_char = char_img.rotate(char_angle, expand=True, resample=Image.Resampling.BILINEAR)
            except Exception:
                rotated_char = char_img
            
            # Paste character onto main image
            paste_x = int(cursor_x + char_x_offset)
            paste_y = int(cursor_y + line_y_offset + char_y_offset)
            
            img.paste(rotated_char, (paste_x, paste_y), rotated_char)
            
            # Move cursor, with variable character spacing
            cursor_x += char_w + random.uniform(-0.5, 1)
        
        cursor_y += line_height

    return img
