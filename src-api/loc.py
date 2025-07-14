import requests
import json
import os
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

# ✅ User-Agent giả trình duyệt để tránh bị chặn
headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/114.0.0.0 Safari/537.36"
    )
}

# ✅ Kiểm tra link ảnh i.imgur.com có tồn tại thật hay không
def is_imgur_image_exists(url):
    if not url.startswith("https://i.imgur.com/") or not url.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
        return True  # Cho qua link không phải ảnh i.imgur.com

    try:
        image_id = os.path.basename(url).split('.')[0]
        html_url = f"https://imgur.com/{image_id}"

        response = requests.get(html_url, timeout=10, headers=headers)
        if response.status_code != 200:
            return False

        soup = BeautifulSoup(response.text, 'html.parser')
        meta_tag = soup.find("meta", property="og:image")

        if meta_tag:
            og_image_url = meta_tag.get("content", "")
            return image_id in og_image_url

        return False
    except Exception:
        return False

# ✅ Ghi nối tiếp vào JSON nhưng không trùng lặp
def append_unique_to_json_list(file_path, new_items):
    try:
        existing = []
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
        combined = list(set(existing + new_items))
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(combined, f, indent=2)
    except Exception as e:
        print(f"❌ Lỗi khi ghi file JSON: {e}")

# ✅ Ghi nối tiếp vào TXT không trùng lặp
def append_unique_lines(file_path, new_lines):
    try:
        existing_lines = set()
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                existing_lines = set(line.strip() for line in f if line.strip())
        combined = existing_lines.union(new_lines)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("\n".join(sorted(combined)) + "\n")
    except Exception as e:
        print(f"❌ Lỗi khi ghi file TXT: {e}")

# ✅ Hàm xử lý từng file JSON nhỏ
def filter_imgur_links_parallel(input_file, max_workers=50):
    base_output = "images_filtered.json"
    broken_log = "images_broken.txt"

    try:
        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Không tìm thấy file: {input_file}")
        return

    if not isinstance(data, list):
        print("⚠️ File JSON phải là danh sách các link.")
        return

    # 🧹 Loại bỏ trùng ngay từ đầu
    unique_links = list(set(data))
    print(f"🧹 Loại bỏ {len(data) - len(unique_links)} link trùng")

    valid_links = []
    broken_links = []

    print(f"🚀 Kiểm tra {len(unique_links)} link từ {input_file} với {max_workers} luồng...\n")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {executor.submit(is_imgur_image_exists, url): url for url in unique_links}

        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                if future.result():
                    print(f"✅ {url}")
                    valid_links.append(url)
                else:
                    print(f"❌ {url}")
                    broken_links.append(url)
            except Exception as e:
                print(f"⚠️ Lỗi với {url}: {e}")
                broken_links.append(url)

    # Ghi kết quả
    append_unique_to_json_list(base_output, valid_links)
    if broken_links:
        append_unique_lines(broken_log, broken_links)

    print("\n🎉 Hoàn tất!")
    print(f"✔️ Hợp lệ: {len(valid_links)} link")
    print(f"🗑️ Hỏng: {len(broken_links)} link")
    print(f"📁 Lưu vào: {base_output}")
    if broken_links:
        print(f"📄 Link lỗi: {broken_log}")

# ✅ Gọi từ dòng lệnh
if __name__ == "__main__":
    import sys
    input_file = sys.argv[1] if len(sys.argv) > 1 else "anime.json"
    filter_imgur_links_parallel(input_file, max_workers=50)
