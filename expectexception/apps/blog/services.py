"""
Blog services for content processing and management
"""
import re
from bs4 import BeautifulSoup
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
import os


def calculate_reading_time(content):
    """
    Calculate estimated reading time in minutes
    Assumes average reading speed of 200 words per minute
    """
    # Strip HTML tags
    soup = BeautifulSoup(content, 'html.parser')
    text = soup.get_text()
    
    # Count words
    words = len(text.split())
    
    # Calculate minutes (minimum 1 minute)
    minutes = max(1, round(words / 200))
    
    return minutes


def generate_table_of_contents(content):
    """
    Extract headings from HTML content to create table of contents
    Returns list of dicts with heading level, text, and id
    """
    soup = BeautifulSoup(content, 'html.parser')
    headings = []
    
    # Find all h1-h6 tags
    for heading in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        level = int(heading.name[1])  # Extract number from h1, h2, etc.
        text = heading.get_text().strip()
        
        # Generate ID from text (slugify)
        heading_id = re.sub(r'[^\w\s-]', '', text.lower())
        heading_id = re.sub(r'[-\s]+', '-', heading_id).strip('-')
        
        # Add or update id attribute
        heading['id'] = heading_id
        
        headings.append({
            'level': level,
            'text': text,
            'id': heading_id
        })
    
    return headings


def generate_excerpt(content, max_length=160):
    """
    Generate excerpt from HTML content
    Strips HTML and returns first max_length characters
    """
    # Strip HTML tags
    soup = BeautifulSoup(content, 'html.parser')
    text = soup.get_text()
    
    # Clean up whitespace
    text = ' '.join(text.split())
    
    # Truncate to max_length
    if len(text) <= max_length:
        return text
    
    # Find last space before max_length
    excerpt = text[:max_length]
    last_space = excerpt.rfind(' ')
    
    if last_space > 0:
        excerpt = excerpt[:last_space]
    
    return excerpt + '...'


def optimize_image(image_file, max_width=1200, max_height=1200, quality=85):
    """
    Optimize image by resizing and compressing
    Returns optimized image as ContentFile
    """
    try:
        # Open image
        img = Image.open(image_file)
        
        # Convert RGBA to RGB if necessary
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        # Calculate new dimensions maintaining aspect ratio
        img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        
        # Save to BytesIO
        output = BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)
        
        # Get original filename
        filename = os.path.splitext(image_file.name)[0] + '.jpg'
        
        return ContentFile(output.read(), name=filename)
    
    except Exception as e:
        # If optimization fails, return original
        print(f"Image optimization failed: {e}")
        return image_file


def sanitize_html(content):
    """
    Sanitize HTML content to prevent XSS attacks
    Allows safe HTML tags and attributes
    """
    from bleach import clean
    
    allowed_tags = [
        'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
        'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span',
        'hr', 'sup', 'sub', 'mark'
    ]
    
    allowed_attributes = {
        'a': ['href', 'title', 'target', 'rel'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'table': ['class'],
        'td': ['colspan', 'rowspan'],
        'th': ['colspan', 'rowspan'],
        'div': ['class', 'data-type'],
        'span': ['class', 'style'],
        'code': ['class'],
        'pre': ['class'],
        '*': ['id']
    }
    
    allowed_styles = ['color', 'background-color', 'text-align']
    
    return clean(
        content,
        tags=allowed_tags,
        attributes=allowed_attributes,
        styles=allowed_styles,
        strip=True
    )


def create_post_revision(post, created_by, revision_note=''):
    """
    Create a revision snapshot of a post
    """
    from .models import PostRevision
    
    revision = PostRevision.objects.create(
        post=post,
        title=post.title,
        content=post.content,
        created_by=created_by,
        revision_note=revision_note
    )
    
    return revision


def auto_save_draft(author, title='', content='', post=None):
    """
    Auto-save draft for a post
    Updates existing draft or creates new one
    """
    from .models import PostDraft
    
    # Try to get existing draft
    if post:
        draft, created = PostDraft.objects.get_or_create(
            post=post,
            author=author,
            defaults={'title': title, 'content': content}
        )
    else:
        # Get most recent draft for this author without a post
        draft = PostDraft.objects.filter(
            author=author,
            post__isnull=True
        ).first()
        
        if not draft:
            draft = PostDraft.objects.create(
                author=author,
                title=title,
                content=content
            )
            created = True
        else:
            created = False
    
    # Update if not newly created
    if not created:
        draft.title = title
        draft.content = content
        draft.save()
    
    return draft
