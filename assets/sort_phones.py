import json

# input and output files
INPUT_FILE = "database.json"
OUTPUT_FILE = "database_sorted.json"

def sort_and_update_ids(data):
    # Sort phones by brand then model
    sorted_phones = sorted(
        data["phones"],
        key=lambda p: (p.get("brand", "").lower(), p.get("model", "").lower())
    )

    # Reassign IDs sequentially
    for index, phone in enumerate(sorted_phones, start=1):
        phone["id"] = index

    data["phones"] = sorted_phones
    return data


def main():
    # Load JSON file
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Sort phones and update IDs
    updated_data = sort_and_update_ids(data)

    # Save updated JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(updated_data, f, indent=2, ensure_ascii=False)

    print(f"Phones sorted and IDs updated. Saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()