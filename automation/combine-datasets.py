import os
import json

# Define input and output directories
DATASET_DIR = os.path.expanduser("data/datasets")
OUTPUT_FILE = os.path.expanduser("docs/assets/datasets.json")

# Attributes to extract (note: schema:OrganizationRole will be used only to extract dataOwner)
ATTRIBUTES = [
    "dct:identifier",
    "dct:title",
    "dct:description",
    "dct:issued",
    "dcat:keyword",
    "schema:OrganizationRole",
    "schema:image"
]

def extract_relevant_data(file_path):
    """Extract relevant attributes from a JSON file, add dataOwner if exists, and remove schema:OrganizationRole."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        extracted_data = {key: data[key] for key in ATTRIBUTES if key in data}
        
        # Extract the dataOwner if exists from schema:OrganizationRole
        if "schema:OrganizationRole" in extracted_data:
            for role in extracted_data["schema:OrganizationRole"]:
                if role.get("schema:roleName") == "dataOwner":
                    extracted_data["dataOwner"] = role.get("schema:name")
                    break
            # Remove schema:OrganizationRole from the output
            extracted_data.pop("schema:OrganizationRole", None)
        
        return extracted_data
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

def process_all_files():
    """Process all JSON files in the dataset directory and write them into one output file."""
    combined_data = []
    
    for filename in os.listdir(DATASET_DIR):
        if filename.endswith(".json"):
            input_path = os.path.join(DATASET_DIR, filename)
            extracted_data = extract_relevant_data(input_path)
            if extracted_data:
                combined_data.append(extracted_data)
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out_f:
        json.dump(combined_data, out_f, ensure_ascii=False, indent=4)
    print("All data combined into", OUTPUT_FILE)

if __name__ == "__main__":
    process_all_files()
    print("Processing complete.")
