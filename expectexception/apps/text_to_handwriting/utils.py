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

from functools import lru_cache

@lru_cache(maxsize=10)
def load_font(font_path, font_size):
    try:
        return ImageFont.truetype(font_path, font_size)
    except OSError:
        return ImageFont.load_default()

def generate_handwriting_image(text, font_name='caveat', paper_type='plain', ink_color='blue'):
    """
    Generates a handwriting image from text using specified font and paper.
    Adds random perturbations to simulate human writing.
    """
    if font_name not in FONT_MAP:
        font_name = 'caveat'
    
    font_path = os.path.join(FONTS_DIR, FONT_MAP[font_name])
    
    # Configuration
    font_size = 32
    # ... (rest of config)
    line_height = 40
    margin_left = 50
    margin_top = 50
    page_width = 800
    
    lines = text.split('\n')
    wrapped_lines = []
    
    font = load_font(font_path, font_size)

    # Wrap text
    dummy_draw = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    for line in lines:
        words = line.split(' ')
        current_line = []
        for word in words:
            test_line = ' '.join(current_line + [word])
            bbox = dummy_draw.textbbox((0, 0), test_line, font=font)
            width = bbox[2] - bbox[0]
            if width < (page_width - margin_left * 2):
                current_line.append(word)
            else:
                wrapped_lines.append(' '.join(current_line))
                current_line = [word]
        wrapped_lines.append(' '.join(current_line))
            
    page_height = max(1000, margin_top + len(wrapped_lines) * line_height + 100)
    
    # Background
    if paper_type == 'lined':
        img = Image.new('RGB', (page_width, page_height), (255, 255, 255))
        draw = ImageDraw.Draw(img)
        # Draw lines
        for y in range(margin_top, page_height, line_height):
            draw.line([(0, y), (page_width, y)], fill=(200, 200, 255), width=1)
        # Draw margin line
        draw.line([(margin_left - 10, 0), (margin_left - 10, page_height)], fill=(255, 200, 200), width=1)
    elif paper_type == 'dark':
        img = Image.new('RGB', (page_width, page_height), (30, 30, 30))
    else:
        # Plain white/crumpled look could be added
        img = Image.new('RGB', (page_width, page_height), (253, 253, 250)) # Slight off-white

    draw = ImageDraw.Draw(img)
    
    # Ink Color
    if ink_color == 'blue':
        fill_color = (0, 0, 150)
    elif ink_color == 'black':
        fill_color = (20, 20, 20)
    elif ink_color == 'red':
        fill_color = (150, 0, 0)
    else:
        fill_color = (20, 20, 20)
        
    if paper_type == 'dark':
        fill_color = (220, 220, 220)

    # Drawing Text with Perturbations
    cursor_y = margin_top
    
    for line in wrapped_lines:
        cursor_x = margin_left
        
        # Randomize line slope slightly? simulating page tilt
        # For now, keep lines straight but jitter characters
        
        for char in line:
            # Random jitter
            angle = random.uniform(-2, 2)
            y_offset = random.uniform(-2, 2)
            
            # Create a separate image for the character to rotate it
            # We need to know char size
            bbox = draw.textbbox((0, 0), char, font=font)
            char_w = bbox[2] - bbox[0]
            char_h = bbox[3] - bbox[1]
            
            if char.strip() == '':
                cursor_x += char_w if char_w > 0 else 10 # Space width
                continue
                
            # Render char to small image
            # Add padding to avoid clipping
            char_img_size = (int(char_w * 1.5) + 10, int(char_h * 1.5) + 10)
            char_img = Image.new('RGBA', char_img_size, (0, 0, 0, 0))
            char_draw = ImageDraw.Draw(char_img)
            char_draw.text((5, 5), char, font=font, fill=fill_color + (255,)) # Add alpha
            
            # Rotate
            rotated_char = char_img.rotate(angle, expand=1, resample=Image.BILINEAR)
            
            # Paste
            paste_x = int(cursor_x)
            paste_y = int(cursor_y + y_offset - 5) # -5 to align baseline roughly
            
            img.paste(rotated_char, (paste_x, paste_y), rotated_char)
            
            cursor_x += char_w + random.uniform(-1, 2) # Variable tracking
            
        cursor_y += line_height

    return img
