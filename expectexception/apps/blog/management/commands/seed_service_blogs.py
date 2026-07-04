"""
Seeds one SEO-optimised "how to use" blog post per flagship service.

Each post is rendered from a structured spec into clean HTML (the blog detail
page renders content as HTML and syntax-highlights <pre><code> blocks), with
seo_title / seo_description / keywords populated so every service has a
dedicated, search-indexable landing article that links back to the live tool.

Idempotent: re-running updates existing posts (matched by slug) rather than
creating duplicates. Add new services by appending to SERVICES below.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify
from datetime import datetime, timezone as dt_timezone

from apps.users.models import User
from apps.blog.models import Post, Tag

SITE = 'https://expectexception.com'

# ---------------------------------------------------------------------------
# Per-service content specs. Keep prose concrete and benefit-led — these double
# as the SEO landing copy for each tool.
# ---------------------------------------------------------------------------
SERVICES = [
    {
        'slug': 'how-to-download-youtube-videos-free',
        'title': 'How to Download YouTube Videos Free (MP4 & MP3) — No Software',
        'seo_title': 'Download YouTube Videos Free — MP4 & MP3, No Signup',
        'seo_description': 'Download any YouTube video as MP4 or extract MP3 audio online, free and with no software or account. Step-by-step guide.',
        'keywords': ['youtube video downloader', 'download youtube videos free', 'yt to mp4', 'youtube to mp3', 'save youtube video', 'online video downloader no signup'],
        'tool_path': '/services/yt-downloader',
        'tool_cta': 'Open the YouTube Downloader',
        'tags': ['video', 'download', 'tools'],
        'date': datetime(2026, 6, 2, 10, 0, tzinfo=dt_timezone.utc),
        'intro': "Saving a YouTube video for offline viewing — a tutorial you keep re-watching, a talk you want on a flight, a clip you're citing — shouldn't require installing sketchy software. This guide shows how to download YouTube videos as MP4 or pull the audio as MP3 directly in your browser, free and without an account.",
        'what': "The YouTube Downloader fetches the source streams for a public video and lets you save the full video (MP4) or just the audio track (MP3). Everything runs through our backend so you don't install anything, and there's no watermark on the output.",
        'steps': [
            ('Copy the video link', 'Open the video on YouTube and copy its URL from the address bar or the Share button.'),
            ('Paste it into the tool', 'Paste the link into the downloader and let it fetch the available formats and qualities.'),
            ('Pick a format and quality', 'Choose MP4 for video (720p, 1080p, and up where available) or MP3 if you only want the audio.'),
            ('Download the file', 'Click download — the file is prepared and saved straight to your device.'),
        ],
        'features': [
            'MP4 video and MP3 audio output',
            'Multiple resolutions up to the source quality',
            'No account, no watermark, no install',
            'Works on desktop and mobile browsers',
        ],
        'use_cases': [
            'Save tutorials and lectures for offline study',
            'Extract audio from music, podcasts, or talks',
            'Archive your own uploads in original quality',
        ],
        'faq': [
            ('Is it free to download YouTube videos here?', 'Yes — the downloader is completely free with no signup and no per-download limits for normal use.'),
            ('Can I download just the audio as MP3?', 'Yes. Choose the MP3 option and the tool extracts the audio track only, ideal for music and podcasts.'),
            ('Do I need to install anything?', 'No. It runs entirely in your browser — there is nothing to install and no browser extension required.'),
        ],
    },
    {
        'slug': 'how-to-detect-ai-generated-images',
        'title': 'How to Detect AI-Generated Images (Free Online AI Image Detector)',
        'seo_title': 'AI Image Detector — Check If a Photo Is AI-Generated (Free)',
        'seo_description': 'Find out if an image was made by AI (Midjourney, DALL·E, Stable Diffusion) with a free online AI image detector. Upload and get a confidence score.',
        'keywords': ['ai image detector', 'detect ai generated images', 'is this image ai', 'midjourney detector', 'stable diffusion detector', 'deepfake image checker', 'chatgpt image detector'],
        'tool_path': '/services/ai-detector',
        'tool_cta': 'Open the AI Image Detector',
        'tags': ['ai-agents', 'ai', 'tools'],
        'date': datetime(2026, 6, 9, 10, 0, tzinfo=dt_timezone.utc),
        'intro': "As image generators get better, telling a real photo from an AI-generated one by eye gets harder. Whether you're vetting a news image, a profile photo, or a submission, an AI image detector gives you a fast, model-backed second opinion.",
        'what': "The AI Image Detector runs an uploaded image through an ensemble of detection models trained to spot the statistical fingerprints of generators like Midjourney, DALL·E, and Stable Diffusion, then reports a confidence score for whether it's AI-generated or a real photograph.",
        'steps': [
            ('Upload the image', 'Drop in a JPG, PNG, or WebP file you want to check.'),
            ('Run the analysis', 'The detector passes it through multiple models and aggregates their verdicts.'),
            ('Read the confidence score', 'You get a clear AI-vs-real probability rather than a vague yes/no.'),
            ('Cross-check if it matters', 'For high-stakes calls, test a few related images — detectors give probabilities, not certainties.'),
        ],
        'features': [
            'Ensemble of specialised detection models',
            'Confidence score, not just a binary label',
            'Supports common image formats',
            'No account required',
        ],
        'use_cases': [
            'Verify photos before publishing or sharing',
            'Screen marketplace or dating profile images',
            'Check submissions in contests and moderation queues',
        ],
        'faq': [
            ('How accurate is AI image detection?', 'It is strong but not infallible — detectors output a probability. Treat a high score as strong evidence, and corroborate for anything consequential.'),
            ('Which generators can it detect?', 'It is tuned for the common diffusion and GAN generators including Midjourney, DALL·E, and Stable Diffusion outputs.'),
            ('Is my uploaded image stored?', 'Images are used only to run the detection and are not published or shared.'),
        ],
    },
    {
        'slug': 'how-to-convert-pdf-to-word',
        'title': 'How to Convert PDF to Word (DOCX) Online — Free & Editable',
        'seo_title': 'PDF to Word Converter — Free, Editable DOCX, No Email',
        'seo_description': 'Convert PDF to an editable Word (DOCX) document online for free, with OCR for scanned files. No email, no watermark. Step-by-step.',
        'keywords': ['pdf to word converter', 'pdf to docx', 'convert pdf to word free', 'pdf to word no email', 'editable word from pdf', 'ocr pdf to word'],
        'tool_path': '/services/pdf-to-doc',
        'tool_cta': 'Open the PDF to Word Converter',
        'tags': ['pdf', 'converter', 'tools'],
        'date': datetime(2026, 6, 14, 10, 0, tzinfo=dt_timezone.utc),
        'intro': "You've got a PDF and you need to actually edit it — fix a typo, update a figure, reuse a section. Rather than retyping, convert the PDF to an editable Word document while keeping the layout intact. Here's how to do it free, including for scanned PDFs.",
        'what': "The PDF to Word converter turns a PDF into a DOCX file you can open and edit in Microsoft Word, Google Docs, or LibreOffice. For scanned or image-based PDFs it can run OCR to recognise the text so the result is genuinely editable, not just pictures of text.",
        'steps': [
            ('Upload your PDF', 'Select the PDF file you want to convert.'),
            ('Enable OCR for scans', 'If your PDF is a scan or photo, turn on OCR so the text becomes selectable and editable.'),
            ('Convert', 'The tool rebuilds the document as DOCX, preserving headings, paragraphs, and layout where possible.'),
            ('Download and edit', 'Open the DOCX in Word or Google Docs and edit freely.'),
        ],
        'features': [
            'Editable DOCX output',
            'OCR support for scanned PDFs (12+ languages)',
            'Layout and formatting preserved where possible',
            'No email or watermark',
        ],
        'use_cases': [
            'Edit contracts, reports, and forms locked in PDF',
            'Reuse content from a PDF without retyping',
            'Make scanned documents searchable and editable',
        ],
        'faq': [
            ('Will the formatting be preserved?', 'The converter preserves headings, paragraphs, and general layout. Very complex multi-column designs may need minor cleanup.'),
            ('Can it convert scanned PDFs?', 'Yes — enable OCR and it recognises the text in scanned or image-based PDFs so the DOCX is editable.'),
            ('Is there a watermark or email wall?', 'No. The output is clean and there is no email required to download.'),
        ],
    },
    {
        'slug': 'how-to-compress-images-without-losing-quality',
        'title': 'How to Compress Images Without Losing Quality (Free Online)',
        'seo_title': 'Compress Images Online Free — Smaller Files, Same Quality',
        'seo_description': 'Reduce image file size online for free without visible quality loss. Compress JPG, PNG, and WebP for faster sites and email. Step-by-step.',
        'keywords': ['compress image online', 'reduce image file size', 'image compressor free', 'compress jpg', 'compress png', 'shrink image without losing quality'],
        'tool_path': '/services/image-compressor',
        'tool_cta': 'Open the Image Compressor',
        'tags': ['image', 'converter', 'tools'],
        'date': datetime(2026, 6, 18, 10, 0, tzinfo=dt_timezone.utc),
        'intro': "Big images slow down websites, bounce off email size limits, and eat storage. The good news: most images carry far more data than they need. Here's how to compress images online and cut file size dramatically without a visible drop in quality.",
        'what': "The Image Compressor re-encodes your image with smarter compression settings, stripping redundant data and unnecessary metadata while keeping the visual result virtually identical. It works on JPG, PNG, and WebP.",
        'steps': [
            ('Upload your image', 'Drop in a JPG, PNG, or WebP file.'),
            ('Choose a quality level', 'Pick a compression level — the preview shows the trade-off between size and quality.'),
            ('Compress', 'The tool re-encodes the image and reports how much smaller it is.'),
            ('Download the optimised file', 'Save the smaller image, ready for the web or email.'),
        ],
        'features': [
            'JPG, PNG, and WebP support',
            'Large size reduction with minimal visible loss',
            'Metadata stripping for extra savings',
            'Runs fast, no account needed',
        ],
        'use_cases': [
            'Speed up website and Core Web Vitals scores',
            'Fit images under email and upload limits',
            'Save storage and bandwidth at scale',
        ],
        'faq': [
            ('Will compression ruin my image quality?', 'No — at sensible levels the difference is invisible to the eye while the file gets much smaller. The preview lets you find the sweet spot.'),
            ('Which formats are supported?', 'JPG, PNG, and WebP. For photos, WebP usually gives the best size-to-quality ratio.'),
            ('Is it free with no limits?', 'Yes, it is free to use with no signup for normal usage.'),
        ],
    },
    {
        'slug': 'how-to-remove-image-background-free',
        'title': 'How to Remove an Image Background Free (Automatic, Online)',
        'seo_title': 'Remove Background from Image Free — Automatic & Online',
        'seo_description': 'Remove the background from any photo automatically and free. Get a clean transparent PNG in seconds — no manual masking. Step-by-step guide.',
        'keywords': ['remove background from image', 'background remover free', 'transparent png maker', 'remove bg online', 'cut out image background', 'automatic background removal'],
        'tool_path': '/services/background-remover',
        'tool_cta': 'Open the Background Remover',
        'tags': ['image', 'ai', 'tools'],
        'date': datetime(2026, 6, 24, 10, 0, tzinfo=dt_timezone.utc),
        'intro': "Cutting out a subject by hand with the pen tool is slow and fiddly. Modern background removal does it automatically in seconds and returns a clean transparent PNG. Here's how to remove an image background free, online.",
        'what': "The Background Remover uses a segmentation model to detect the main subject of a photo and erase everything else, outputting a transparent PNG you can drop onto any new background.",
        'steps': [
            ('Upload your photo', 'Choose an image with a clear subject — a person, product, or object.'),
            ('Let it process', 'The model automatically detects the subject and removes the background.'),
            ('Review the cut-out', 'Check the edges; the transparent PNG is generated for you.'),
            ('Download the PNG', 'Save the transparent image, ready to composite anywhere.'),
        ],
        'features': [
            'Fully automatic subject detection',
            'Transparent PNG output',
            'Great for people, products, and objects',
            'No manual masking required',
        ],
        'use_cases': [
            'Product photos for stores and marketplaces',
            'Profile pictures and avatars',
            'Design assets, thumbnails, and collages',
        ],
        'faq': [
            ('Does it work on any photo?', 'It works best on images with a clear main subject. Busy scenes with no obvious subject are harder for any automatic tool.'),
            ('What format do I get back?', 'A transparent PNG, so you can place the cut-out onto any background.'),
            ('Is manual editing needed?', 'Usually not — the removal is automatic. You can always touch up edges in an editor if you want pixel-perfect results.'),
        ],
    },
    {
        'slug': 'how-to-upscale-images-with-ai',
        'title': 'How to Upscale Images with AI (Enlarge Photos Without Blur)',
        'seo_title': 'AI Image Upscaler — Enlarge Photos Free Without Losing Quality',
        'seo_description': 'Upscale and enlarge images with AI for free — increase resolution without the blur of normal resizing. Step-by-step guide.',
        'keywords': ['ai image upscaler', 'upscale image', 'enlarge image without losing quality', 'increase image resolution', 'photo enhancer', 'image upscaler free'],
        'tool_path': '/services/image-upscaler',
        'tool_cta': 'Open the Image Upscaler',
        'tags': ['image', 'ai', 'tools'],
        'date': datetime(2026, 6, 27, 10, 0, tzinfo=dt_timezone.utc),
        'intro': "Enlarging a small image the normal way just stretches the pixels and makes it blurry. AI upscaling reconstructs detail as it scales, so you can enlarge a photo and keep it sharp. Here's how to upscale images free.",
        'what': "The Image Upscaler increases an image's resolution while intelligently reconstructing edges and texture, with optional sharpening, denoise, and colour boost, so the enlarged result looks crisp rather than pixelated.",
        'steps': [
            ('Upload a low-resolution image', 'Choose the small or soft image you want to enlarge.'),
            ('Set the scale and options', 'Pick a scale factor and toggle sharpening, denoise, or colour boost as needed.'),
            ('Upscale', 'The tool enlarges and enhances the image.'),
            ('Download the result', 'Save the higher-resolution version.'),
        ],
        'features': [
            'AI detail reconstruction while scaling',
            'Optional sharpen, denoise, and colour boost',
            'Turns small images into usable resolutions',
            'Free, browser-based',
        ],
        'use_cases': [
            'Rescue small or old photos',
            'Prepare images for print at larger sizes',
            'Improve thumbnails and low-res assets',
        ],
        'faq': [
            ('How is this better than normal resizing?', 'Normal resizing interpolates pixels and blurs. AI upscaling reconstructs plausible detail, so edges and textures stay sharp.'),
            ('How much can I enlarge?', 'You can choose a scale factor; results are best when the source has some detail to work with.'),
            ('Is it free?', 'Yes — the upscaler is free to use online.'),
        ],
    },
    {
        'slug': 'how-to-extract-text-from-image-ocr',
        'title': 'How to Extract Text from an Image (Free OCR, 12+ Languages)',
        'seo_title': 'Image to Text (OCR) Online Free — Extract Text from Photos',
        'seo_description': 'Extract text from images and screenshots with free online OCR in 12+ languages. Upload a photo and copy the recognised text. Step-by-step.',
        'keywords': ['image to text', 'ocr online free', 'extract text from image', 'photo to text', 'screenshot to text', 'ocr no signup', 'picture to text converter'],
        'tool_path': '/services/image-to-text',
        'tool_cta': 'Open the Image to Text tool',
        'tags': ['ocr', 'tools', 'ai'],
        'date': datetime(2026, 6, 29, 10, 0, tzinfo=dt_timezone.utc),
        'intro': "When the text you need is trapped inside a photo, screenshot, or scan, OCR (optical character recognition) pulls it back out as real, copyable text. Here's how to extract text from an image free, in over a dozen languages.",
        'what': "The Image to Text tool runs OCR on an uploaded image and returns the recognised text for you to copy, edit, or search. It supports 12+ languages, so it handles more than just English.",
        'steps': [
            ('Upload the image', 'Add a photo, screenshot, or scan that contains text.'),
            ('Pick the language', 'Select the language of the text for the best recognition accuracy.'),
            ('Extract', 'The OCR engine reads the image and returns the text.'),
            ('Copy or edit', 'Copy the extracted text with one click and use it anywhere.'),
        ],
        'features': [
            'OCR in 12+ languages',
            'Works on photos, screenshots, and scans',
            'One-click copy of extracted text',
            'No account needed',
        ],
        'use_cases': [
            'Digitise printed documents and receipts',
            'Grab text from screenshots and images',
            'Make scanned material searchable',
        ],
        'faq': [
            ('Which languages are supported?', 'More than 12, including major European and Asian languages. Pick the correct language for best accuracy.'),
            ('How accurate is the OCR?', 'Accuracy is high for clear, well-lit text. Low-resolution or skewed images reduce accuracy — straighten and sharpen where possible.'),
            ('Is it free?', 'Yes, the OCR tool is free to use online.'),
        ],
    },
    {
        'slug': 'how-to-separate-vocals-from-a-song',
        'title': 'How to Separate Vocals from a Song (Free AI Stem Splitter)',
        'seo_title': 'Vocal Remover & Stem Splitter — Separate Vocals Free (AI)',
        'seo_description': 'Separate vocals from instrumentals in any song with free AI stem splitting. Get isolated vocals and a karaoke instrumental. Step-by-step.',
        'keywords': ['vocal remover', 'separate vocals from song', 'stem splitter', 'karaoke maker', 'isolate vocals', 'acapella extractor', 'ai audio separator'],
        'tool_path': '/services/audio-separator',
        'tool_cta': 'Open the Audio Separator',
        'tags': ['audio', 'ai', 'tools'],
        'date': datetime(2026, 7, 1, 10, 0, tzinfo=dt_timezone.utc),
        'intro': "Want just the vocals for a remix, or the instrumental for karaoke? AI stem separation splits a finished track back into its parts. Here's how to separate vocals from a song free.",
        'what': "The Audio Separator uses a source-separation model (Demucs) to split a song into an isolated vocal track and an instrumental/accompaniment track, which you can download individually.",
        'steps': [
            ('Upload your track', 'Add an audio file (MP3, WAV, and similar).'),
            ('Start the separation', 'The AI model processes the track — heavier songs take a little longer.'),
            ('Preview the stems', 'Listen to the isolated vocals and the instrumental.'),
            ('Download the stems', 'Save the vocal and instrumental tracks, or the full zip.'),
        ],
        'features': [
            'AI-powered vocal / instrumental split',
            'Downloadable isolated stems',
            'Great for karaoke and remixing',
            'No install required',
        ],
        'use_cases': [
            'Make karaoke instrumentals',
            'Extract acapellas for remixes and mashups',
            'Practice or transcribe a specific part',
        ],
        'faq': [
            ('How clean is the separation?', 'AI separation is very good but not perfect — you may hear faint artefacts. Results are strongest on well-mixed studio recordings.'),
            ('What do I get to download?', 'An isolated vocal track and an instrumental track, individually or as a zip.'),
            ('Does it take long?', 'It depends on the song length and server load, since it is real AI processing rather than a simple filter.'),
        ],
    },
    {
        'slug': 'how-to-convert-text-to-speech-free',
        'title': 'How to Convert Text to Speech Free (Natural AI Voices)',
        'seo_title': 'Text to Speech Online Free — Natural AI Voices, Download MP3',
        'seo_description': 'Turn text into natural-sounding speech online for free and download the MP3. Multiple neural voices, no signup. Step-by-step guide.',
        'keywords': ['text to speech free', 'tts online', 'natural ai voice', 'text to mp3', 'text to speech download', 'ai voice generator free'],
        'tool_path': '/services/text-to-speech',
        'tool_cta': 'Open the Text to Speech tool',
        'tags': ['audio', 'ai', 'tools'],
        'date': datetime(2026, 7, 2, 10, 0, tzinfo=dt_timezone.utc),
        'intro': "Text to speech turns written words into natural-sounding audio — for accessibility, voiceovers, or just listening to an article instead of reading it. Here's how to convert text to speech free and download the MP3.",
        'what': "The Text to Speech tool synthesises your text into speech using neural voices that sound natural rather than robotic, and lets you download the result as an audio file.",
        'steps': [
            ('Paste your text', 'Enter or paste the text you want spoken.'),
            ('Choose a voice', 'Pick from the available natural neural voices.'),
            ('Generate the audio', 'The tool synthesises the speech.'),
            ('Play or download', 'Listen in the browser or download the MP3.'),
        ],
        'features': [
            'Natural neural voices',
            'Downloadable audio output',
            'Good for accessibility and voiceovers',
            'Free, no signup',
        ],
        'use_cases': [
            'Voiceovers for videos and slideshows',
            'Listen to articles and notes hands-free',
            'Accessibility for reading difficulties',
        ],
        'faq': [
            ('Do the voices sound natural?', 'Yes — they use neural synthesis, which is far more lifelike than older robotic TTS.'),
            ('Can I download the audio?', 'Yes, you can download the generated speech as an audio file.'),
            ('Is it free?', 'Yes, the text to speech tool is free to use online.'),
        ],
    },
    {
        'slug': 'how-to-generate-a-qr-code-free',
        'title': 'How to Generate a QR Code Free (Custom, High-Resolution)',
        'seo_title': 'QR Code Generator Free — Custom, High-Res, No Signup',
        'seo_description': 'Create a free QR code for any link, text, or contact in seconds. High-resolution, downloadable, no signup or expiry. Step-by-step.',
        'keywords': ['qr code generator', 'free qr code', 'create qr code', 'qr code for url', 'high resolution qr code', 'qr code no expiry'],
        'tool_path': '/services/qr-generator',
        'tool_cta': 'Open the QR Code Generator',
        'tags': ['tools', 'utility', 'frontend'],
        'date': datetime(2026, 7, 3, 10, 0, tzinfo=dt_timezone.utc),
        'intro': "QR codes bridge print and digital — a poster, a business card, a product label that links straight to a URL. Here's how to generate a QR code free, in high resolution, with no signup and no expiry.",
        'what': "The QR Code Generator encodes any link or text into a scannable QR code you can download as a crisp, high-resolution image and use anywhere — print or screen.",
        'steps': [
            ('Enter your content', 'Type or paste the URL, text, or data you want the QR code to contain.'),
            ('Generate the code', 'The QR code updates instantly as you type.'),
            ('Download it', 'Save the high-resolution image.'),
            ('Test the scan', 'Scan it with your phone camera to confirm it points where you expect.'),
        ],
        'features': [
            'Encodes links, text, and more',
            'High-resolution downloadable image',
            'No signup and no expiry',
            'Runs entirely in your browser',
        ],
        'use_cases': [
            'Posters, flyers, and business cards',
            'Product packaging and menus',
            'Event check-ins and Wi-Fi sharing',
        ],
        'faq': [
            ('Do the QR codes expire?', 'No. The code encodes your content directly, so it never expires and does not depend on our servers to keep working.'),
            ('Can I use it for commercial print?', 'Yes — download the high-resolution image and use it on any print or digital material.'),
            ('Is it free?', 'Yes, the QR generator is completely free.'),
        ],
    },
    {
        'slug': 'how-to-share-a-secret-securely',
        'title': 'How to Share a Password or Secret Securely (Self-Destructing Link)',
        'seo_title': 'Share a Secret Securely — Self-Destructing Encrypted Link',
        'seo_description': 'Share passwords and sensitive text safely with a one-time, self-destructing encrypted link that is destroyed after it is read. Step-by-step.',
        'keywords': ['share password securely', 'self destructing message', 'one time secret link', 'encrypted note', 'send password safely', 'secret sharer'],
        'tool_path': '/services/secret-sharer',
        'tool_cta': 'Open the Secret Sharer',
        'tags': ['security', 'tools', 'utility'],
        'date': datetime(2026, 7, 3, 12, 0, tzinfo=dt_timezone.utc),
        'intro': "Sending a password over chat or email leaves it sitting in someone's history forever. A self-destructing secret link fixes that: the recipient opens it once, reads it, and it's gone. Here's how to share a secret securely.",
        'what': "The Secret Sharer stores your message encrypted and gives you a one-time link. As soon as the recipient opens it, the secret is revealed once and then destroyed, so it can't be read again or scraped from a chat log later.",
        'steps': [
            ('Enter your secret', 'Type the password, key, or sensitive note you need to send.'),
            ('Create the one-time link', 'The tool encrypts it and gives you a single-use URL.'),
            ('Send the link', 'Share the link with your recipient over any channel.'),
            ('It self-destructs', 'Once opened, the secret is shown once and permanently deleted.'),
        ],
        'features': [
            'One-time, self-destructing links',
            'Encrypted storage',
            'No account required',
            'Nothing left behind in chat history',
        ],
        'use_cases': [
            'Send a password or API key to a teammate',
            'Share credentials with a client safely',
            'Pass along any sensitive one-time note',
        ],
        'faq': [
            ('What happens after the link is opened?', 'The secret is revealed once and then permanently destroyed, so it cannot be read a second time.'),
            ('Why is this safer than email or chat?', 'Email and chat keep a permanent copy in the thread. A one-time link leaves nothing behind after it is read.'),
            ('Is it free?', 'Yes, sharing a secret is free and requires no account.'),
        ],
    },
    {
        'slug': 'how-to-convert-text-to-handwriting',
        'title': 'How to Convert Text to Realistic Handwriting (Free Online)',
        'seo_title': 'Text to Handwriting Converter Free — Realistic, Downloadable',
        'seo_description': 'Turn typed text into realistic handwriting online for free. Choose pen colour and paper, then download the image. Step-by-step guide.',
        'keywords': ['text to handwriting', 'handwriting converter', 'text to handwriting free', 'realistic handwriting generator', 'convert text to handwriting online'],
        'tool_path': '/services/text-to-handwriting',
        'tool_cta': 'Open the Text to Handwriting tool',
        'tags': ['tools', 'utility', 'frontend'],
        'date': datetime(2026, 7, 3, 13, 0, tzinfo=dt_timezone.utc),
        'intro': "A text-to-handwriting converter turns typed text into a page that looks handwritten — handy for assignments that ask for handwriting, personalised notes, or just a natural, human look. Here's how to convert text to handwriting free.",
        'what': "The Text to Handwriting tool renders your typed text in a realistic handwriting style on a paper background, with control over pen colour and paper type, and lets you download the result as an image.",
        'steps': [
            ('Type or paste your text', 'Enter the text you want rendered as handwriting.'),
            ('Pick a style', 'Choose the ink colour and paper type.'),
            ('Generate the page', 'The tool renders your text as handwriting.'),
            ('Download the image', 'Save the handwritten page as an image.'),
        ],
        'features': [
            'Realistic handwriting rendering',
            'Ink colour and paper options',
            'Downloadable image output',
            'Free and browser-based',
        ],
        'use_cases': [
            'Handwritten-look assignments and notes',
            'Personalised cards and letters',
            'Creative and social media content',
        ],
        'faq': [
            ('Does it look genuinely handwritten?', 'Yes — natural spacing and a paper background make the output look convincingly handwritten rather than typed.'),
            ('Can I change the pen colour and paper?', 'Yes, you can choose the ink colour and paper style before generating.'),
            ('Is it free?', 'Yes, the text to handwriting tool is free to use.'),
        ],
    },
]


def render_html(spec: dict) -> str:
    """Build a clean, SEO-friendly HTML article from a service spec."""
    tool_url = f"{SITE}{spec['tool_path']}"
    parts: list[str] = []

    parts.append(f"<p>{spec['intro']}</p>")

    parts.append(
        f'<p><a href="{tool_url}"><strong>{spec["tool_cta"]} →</strong></a></p>'
    )

    parts.append(f"<h2>What it does</h2><p>{spec['what']}</p>")

    parts.append(f"<h2>How to use it — step by step</h2><ol>")
    for name, text in spec['steps']:
        parts.append(f"<li><strong>{name}.</strong> {text}</li>")
    parts.append("</ol>")

    parts.append("<h2>Key features</h2><ul>")
    for feat in spec['features']:
        parts.append(f"<li>{feat}</li>")
    parts.append("</ul>")

    parts.append("<h2>Common use cases</h2><ul>")
    for uc in spec['use_cases']:
        parts.append(f"<li>{uc}</li>")
    parts.append("</ul>")

    parts.append("<h2>Frequently asked questions</h2>")
    for q, a in spec['faq']:
        parts.append(f"<h3>{q}</h3><p>{a}</p>")

    parts.append(
        f'<h2>Try it now</h2><p>Ready to go? <a href="{tool_url}">'
        f'{spec["tool_cta"]}</a> — it\'s free and needs no signup.</p>'
    )

    return "\n".join(parts)


class Command(BaseCommand):
    help = 'Seeds one SEO-optimised how-to blog post per flagship service.'

    def handle(self, *args, **options):
        # Author: prefer an existing superuser, else the demo user.
        author = User.objects.filter(is_superuser=True).order_by('id').first()
        if author is None:
            author, _ = User.objects.get_or_create(
                email='demo@example.com',
                defaults={'is_active': True},
            )
            self.stdout.write('No superuser found — using demo@example.com as author.')

        created_count = 0
        updated_count = 0

        for spec in SERVICES:
            content = render_html(spec)
            slug = spec['slug']

            tag_objs = []
            for tag_name in spec.get('tags', []):
                tag, _ = Tag.objects.get_or_create(name=tag_name)
                tag_objs.append(tag)

            post = Post.objects.filter(slug=slug).first()
            if post is None:
                post = Post(slug=slug)
                created_count += 1
                verb = 'Created'
            else:
                updated_count += 1
                verb = 'Updated'

            post.title = spec['title']
            post.content = content
            post.author = author
            post.status = Post.STATUS_PUBLISHED
            post.seo_title = spec['seo_title'][:70]
            post.seo_description = spec['seo_description'][:160]
            post.keywords = ', '.join(spec['keywords'])[:255]
            post.featured = spec.get('featured', False)
            post.save()  # triggers reading_time / excerpt / TOC generation

            if tag_objs:
                post.tags.set(tag_objs)

            # Backdate publish/created so posts don't all stack on today.
            Post.objects.filter(pk=post.pk).update(
                created_at=spec['date'],
                published_at=spec['date'],
            )

            self.stdout.write(f"{verb}: {spec['title']}")

        self.stdout.write(self.style.SUCCESS(
            f'Seeded service blogs — {created_count} created, {updated_count} updated.'
        ))
