import pywhatkit
import os
import argparse
import sys

def get_ink_color(color_name):
    """Returns RGB tuple for realistic ink colors."""
    colors = {
        'blue': (0, 0, 138),      # Dark Blue (Ballpoint style)
        'black': (0, 0, 0),       # Standard Black
        'red': (139, 0, 0),       # Grading Red
        'grey': (50, 50, 50)      # Faded Pencil style
    }
    return colors.get(color_name.lower(), (0, 0, 138))

def generate_handwriting(source, output_filename, color_name):
    """
    Converts text to handwriting image.
    Handles both direct text strings and file paths.
    """
    text_content = ""

    # 1. Determine if source is a file path or raw text
    if os.path.isfile(source):
        print(f"[*] Reading text from file: {source}")
        try:
            with open(source, 'r', encoding='utf-8') as f:
                text_content = f.read()
        except Exception as e:
            print(f"[!] Error reading file: {e}")
            sys.exit(1)
    else:
        print("[*] Using provided raw text string.")
        text_content = source

    if not text_content.strip():
        print("[!] Error: Text content is empty.")
        sys.exit(1)

    # 2. Get Ink Color
    rgb = get_ink_color(color_name)
    print(f"[*] processing with {color_name} ink {rgb}...")

    # 3. Generate Image
    try:
        # pywhatkit.text_to_handwriting(string, save_to, rgb)
        pywhatkit.text_to_handwriting(text_content, save_to=output_filename, rgb=rgb)
        
        # 4. Verification
        if os.path.exists(output_filename):
            print(f"[{chr(10004)}] Success! Image saved to: {os.path.abspath(output_filename)}")
        else:
            print("[!] Error: File was not created.")
            
    except Exception as e:
        print(f"[!] Critical Error during generation: {e}")

if __name__ == "__main__":
    # Setup Argument Parser for CLI usage
    parser = argparse.ArgumentParser(description="Convert Text or Files to Handwritten Images")
    
    parser.add_argument("input", help="Text string OR path to a .txt file")
    parser.add_argument("-o", "--output", default="homework_output.png", help="Output filename (default: homework_output.png)")
    parser.add_argument("-c", "--color", default="blue", choices=['blue', 'black', 'red', 'grey'], help="Ink color (default: blue)")

    args = parser.parse_args()

    generate_handwriting(args.input, args.output, args.color)