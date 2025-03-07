import os
import json
from jsonschema import Draft7Validator

# Define input and output directories
DATASET_DIR = os.path.expanduser("data/datasets")
OUTPUT_FILE = os.path.expanduser("docs/assets/datasets.json")
SCHEMA_FILE = os.path.expanduser("data/schemas/dataset.json")

# Attributes to extract (note: prov:qualifiedAttribution will be used only to extract dataOwner)
ATTRIBUTES = [
    "dct:identifier",
    "dct:title",
    "dct:description",
    "dct:issued",
    "dcat:keyword",
    "prov:qualifiedAttribution",
    "schema:image"
]

def load_schema(schema_path):
    """Load JSON schema from file."""
    try:
        with open(schema_path, "r", encoding="utf-8") as schema_file:
            schema = json.load(schema_file)
        return schema
    except Exception as e:
        print(f"Error loading schema from {schema_path}: {e}")
        return None

def count_schema_violations(data, schema):
    """Count the number of schema violations using jsonschema's Draft7Validator."""
    validator = Draft7Validator(schema)
    errors = list(validator.iter_errors(data))
    return len(errors)

def get_schema_violation_messages(data, schema):
    """Return a list of error messages for schema violations."""
    validator = Draft7Validator(schema)
    errors = list(validator.iter_errors(data))
    return [error.message for error in errors]

def extract_relevant_data(file_path, schema):
    """
    Extract relevant attributes from a JSON file, perform schema check,
    add dataOwner if exists, and remove prov:qualifiedAttribution.
    Also, include the schema violation count and messages.
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Count schema violations and get their messages for the entire JSON file
        violations_count = count_schema_violations(data, schema)
        violation_messages = get_schema_violation_messages(data, schema)
        
        # Extract only the defined attributes
        extracted_data = {key: data[key] for key in ATTRIBUTES if key in data}
        
        # Extract the dataOwner if exists from prov:qualifiedAttribution
        if "prov:qualifiedAttribution" in extracted_data:
            for role in extracted_data["prov:qualifiedAttribution"]:
                if role.get("dcat:hadRole") == "businessDataOwner":
                    extracted_data["businessDataOwner"] = role.get("prov:agent")
                    break
            # Remove prov:qualifiedAttribution from the output
            extracted_data.pop("prov:qualifiedAttribution", None)
        
        # Add the schema violations count and messages
        extracted_data["schemaViolations"] = violations_count
        extracted_data["schemaViolationMessages"] = violation_messages
        
        return extracted_data
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

def process_all_files():
    """Process all JSON files in the dataset directory and write them into one output file."""
    schema = load_schema(SCHEMA_FILE)
    if schema is None:
        print("Schema could not be loaded. Exiting.")
        return

    combined_data = []
    
    for filename in os.listdir(DATASET_DIR):
        if filename.endswith(".json"):
            input_path = os.path.join(DATASET_DIR, filename)
            extracted_data = extract_relevant_data(input_path, schema)
            if extracted_data:
                combined_data.append(extracted_data)
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out_f:
        json.dump(combined_data, out_f, ensure_ascii=False, indent=4)
    print("All data combined into", OUTPUT_FILE)

if __name__ == "__main__":
    process_all_files()
    print("Processing complete.")
