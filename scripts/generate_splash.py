from PIL import Image

def generate_splash_assets():
    # 1. Open the source image (we will load logo_v3.jpeg which we know contains the cropped logo)
    source_path = '/home/h1sham/dev/App/logo_v3.jpeg'
    img = Image.open(source_path)
    
    # Locate the clean artwork bounding box (using threshold 30)
    w, h = img.size
    pixels = img.load()
    xmin, xmax, ymin, ymax = w, 0, h, 0
    for y in range(h):
        for x in range(w):
            r, g, b = pixels[x, y][:3]
            dist = (255 - r) + (255 - g) + (255 - b)
            if dist > 30:
                if x < xmin: xmin = x
                if x > xmax: xmax = x
                if y < ymin: ymin = y
                if y > ymax: ymax = y
                
    cropped = img.crop((xmin, ymin, xmax, ymax))
    print(f"Detected clean artwork size: {cropped.width}x{cropped.height}")
    
    # Define target files and resolutions
    targets = [
        ('/home/h1sham/dev/App/assets/logo_v3.jpeg', 1024, 'JPEG'),
        ('/home/h1sham/dev/App/logo_v3.jpeg', 1024, 'JPEG'),
        ('/home/h1sham/dev/App/android/app/src/main/res/drawable-mdpi/splashscreen_logo.png', 288, 'PNG'),
        ('/home/h1sham/dev/App/android/app/src/main/res/drawable-hdpi/splashscreen_logo.png', 432, 'PNG'),
        ('/home/h1sham/dev/App/android/app/src/main/res/drawable-xhdpi/splashscreen_logo.png', 576, 'PNG'),
        ('/home/h1sham/dev/App/android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png', 864, 'PNG'),
        ('/home/h1sham/dev/App/android/app/src/main/res/drawable-xxxhdpi/splashscreen_logo.png', 1152, 'PNG')
    ]
    
    # We want the artwork width to be 70% of the canvas width
    width_percentage = 0.70
    # Shift right to balance the visual weight of the 'W' vs dots on the right
    base_shift_right = 10  # Shift in pixels on a 1024x1024 canvas
    
    for path, size, fmt in targets:
        # Calculate scaled dimensions
        target_art_w = int(size * width_percentage)
        target_art_h = int((target_art_w / cropped.width) * cropped.height)
        
        # Resize artwork
        resized_art = cropped.resize((target_art_w, target_art_h), Image.Resampling.LANCZOS)
        
        # Create new white background canvas (RGB for JPEG, RGBA for PNG)
        mode = 'RGB' if fmt == 'JPEG' else 'RGBA'
        bg_color = (255, 255, 255) if mode == 'RGB' else (255, 255, 255, 255)
        canvas = Image.new(mode, (size, size), bg_color)
        
        # Calculate centering and shift
        shift = int(base_shift_right * size / 1024)
        x = (size - target_art_w) // 2 + shift
        y = (size - target_art_h) // 2
        
        # Paste artwork onto canvas
        canvas.paste(resized_art, (x, y))
        
        # Save file
        canvas.save(path, fmt)
        print(f"Generated {path} ({size}x{size})")

if __name__ == '__main__':
    generate_splash_assets()
