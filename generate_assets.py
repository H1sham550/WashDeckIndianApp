import os
from PIL import Image

def generate_assets():
    logo_path = "logo.jpeg"
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found in current directory.")
        return

    # Create assets directory if it doesn't exist
    os.makedirs("assets", exist_ok=True)

    # Load original logo
    img = Image.open(logo_path)
    width, height = img.size
    pixels = img.load()

    # Find bounding box of non-white pixels
    min_col, max_col = width, 0
    min_row, max_row = height, 0
    for x in range(width):
        for y in range(height):
            r, g, b = pixels[x, y][:3]
            # Consider any pixel with any channel < 240 as part of the logo
            if r < 240 or g < 240 or b < 240:
                if x < min_col: min_col = x
                if x > max_col: max_col = x
                if y < min_row: min_row = y
                if y > max_row: max_row = y

    print(f"Full logo bounds: Col {min_col} to {max_col}, Row {min_row} to {max_row}")

    # Separator column is roughly around 287 (determined via analysis)
    # Let's verify that the separator is within range and use it.
    separator_col = 287
    
    # 1. Extract the Shield Icon (left side)
    # Left: min_col, Right: separator_col, Top: min_row, Bottom: max_row
    # Add a small padding (10 pixels)
    shield_box = (
        max(0, min_col - 10),
        max(0, min_row - 10),
        min(width, separator_col + 10),
        min(height, max_row + 10)
    )
    shield_crop = img.crop(shield_box)
    
    # Make the shield crop square by padding with white
    sc_w, sc_h = shield_crop.size
    square_size = max(sc_w, sc_h)
    shield_square = Image.new("RGB", (square_size, square_size), "white")
    # Paste shield in center
    paste_x = (square_size - sc_w) // 2
    paste_y = (square_size - sc_h) // 2
    shield_square.paste(shield_crop, (paste_x, paste_y))

    # Save 1024x1024 App Icon
    app_icon = shield_square.resize((1024, 1024), Image.Resampling.LANCZOS)
    app_icon.save("assets/icon.png", "PNG")
    print("Saved assets/icon.png")

    # Save favicon (48x48)
    favicon = shield_square.resize((48, 48), Image.Resampling.LANCZOS)
    favicon.save("assets/favicon.png", "PNG")
    print("Saved assets/favicon.png")

    # 2. Extract Adaptive Icon (Android) - Transparent background, Shield in center
    # Create RGBA image from shield_square
    shield_rgba = shield_square.convert("RGBA")
    rgba_pixels = shield_rgba.load()
    sr_w, sr_h = shield_rgba.size
    
    for x in range(sr_w):
        for y in range(sr_h):
            r, g, b, a = rgba_pixels[x, y]
            # If it is white/near-white, make it transparent
            if r > 240 and g > 240 and b > 240:
                rgba_pixels[x, y] = (255, 255, 255, 0)

    # Let's resize it to 1024x1024 with transparent background
    adaptive_foreground = Image.new("RGBA", (1024, 1024), (255, 255, 255, 0))
    # We want the icon to occupy about 60% of the adaptive icon size (614px)
    target_shield_size = 614
    resized_shield_rgba = shield_rgba.resize((target_shield_size, target_shield_size), Image.Resampling.LANCZOS)
    # Re-apply transparency after resize to clean up edges
    rr_pixels = resized_shield_rgba.load()
    for x in range(target_shield_size):
        for y in range(target_shield_size):
            r, g, b, a = rr_pixels[x, y]
            if r > 230 and g > 230 and b > 230:
                rr_pixels[x, y] = (255, 255, 255, 0)
                
    paste_x = (1024 - target_shield_size) // 2
    paste_y = (1024 - target_shield_size) // 2
    adaptive_foreground.paste(resized_shield_rgba, (paste_x, paste_y), resized_shield_rgba)
    adaptive_foreground.save("assets/adaptive-icon.png", "PNG")
    print("Saved assets/adaptive-icon.png")

    # 3. Create Splash Screen (2048x2048) - centered full logo on white
    full_logo_box = (
        max(0, min_col - 20),
        max(0, min_row - 20),
        min(width, max_col + 20),
        min(height, max_row + 20)
    )
    full_logo_crop = img.crop(full_logo_box)
    fl_w, fl_h = full_logo_crop.size

    # We want the logo to span about 60% of the splash screen width (1228px)
    target_logo_w = 1228
    target_logo_h = int((target_logo_w / fl_w) * fl_h)
    
    resized_logo = full_logo_crop.resize((target_logo_w, target_logo_h), Image.Resampling.LANCZOS)
    
    splash = Image.new("RGB", (2048, 2048), "white")
    paste_x = (2048 - target_logo_w) // 2
    paste_y = (2048 - target_logo_h) // 2
    splash.paste(resized_logo, (paste_x, paste_y))
    splash.save("assets/splash.png", "PNG")
    print("Saved assets/splash.png")

if __name__ == "__main__":
    generate_assets()
