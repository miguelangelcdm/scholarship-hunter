import os
import json
import urllib.request
import zipfile
import tempfile

def fetch_and_process_ror_data():
    output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "universities.json")
    
    print("Fetching latest ROR data release info from Zenodo...")
    # Zenodo Concept ID 6347574 points to the latest ROR dataset
    req = urllib.request.Request("https://zenodo.org/api/records/6347574")
    
    with urllib.request.urlopen(req) as response:
        release_info = json.loads(response.read())
        
    # Find the zip asset
    zip_url = None
    for f in release_info.get("files", []):
        links = f.get("links", {})
        if "self" in links and (links["self"].endswith(".zip") or f.get("key", "").endswith(".zip") or "zip" in f.get("type", "").lower()):
            zip_url = links["self"]
            break
            
    if not zip_url:
        print("Could not find the ROR data zip file in the latest release.")
        return
        
    print(f"Downloading ROR data from {zip_url} (this may take a few minutes)...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        zip_path = os.path.join(temp_dir, "ror-data.zip")
        urllib.request.urlretrieve(zip_url, zip_path)
        
        print("Extracting zip...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
            
        # Find the JSON data file (ignoring schema files)
        json_file = None
        for filename in os.listdir(temp_dir):
            if filename.endswith(".json") and "schema" not in filename.lower():
                json_file = os.path.join(temp_dir, filename)
                break
                
        if not json_file:
            print("Could not find the ROR JSON file in the extracted archive.")
            return
            
        print(f"Processing ROR JSON: {json_file}")
        universities = []
        
        # Load the huge JSON and filter for universities
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Loaded {len(data)} total ROR records. Filtering for educational institutions...")
            
            for record in data:
                # In ROR v2, types are often in a list
                types = record.get("types", [])
                
                # Check if it's an educational institution
                is_edu = False
                for t in types:
                    if isinstance(t, str) and t.lower() in ["education", "university", "college"]:
                        is_edu = True
                    elif isinstance(t, dict) and t.get("type", "").lower() in ["education", "university", "college"]:
                        is_edu = True
                        
                if is_edu:
                    # Support ROR v1 and v2 schema
                    
                    # 1. Extract Name
                    name = record.get("name", "")
                    if not name and "names" in record:
                        for n in record["names"]:
                            if isinstance(n, dict) and "ror_display" in n.get("types", []):
                                name = n.get("value", "")
                                break
                        if not name and len(record["names"]) > 0:
                            if isinstance(record["names"][0], dict):
                                name = record["names"][0].get("value", "")
                            else:
                                name = str(record["names"][0])
                                
                    # 2. Extract Domains / Links
                    domains = record.get("domains", [])
                    urls = domains.copy() if domains else []
                    
                    links = record.get("links", [])
                    for link in links:
                        # v2: {"type": "website", "value": "http://..."}
                        if isinstance(link, dict) and link.get("value"):
                            url = link.get("value")
                            domain = url.split("//")[-1].split("/")[0]
                            urls.append(domain)
                        # v1: string links
                        elif isinstance(link, str) and link.startswith("http"):
                            domain = link.split("//")[-1].split("/")[0]
                            urls.append(domain)
                            
                    # Remove duplicates and clean
                    urls = list(set([u.replace("www.", "") for u in urls if u]))
                    
                    # 3. Extract Country
                    country = None
                    if "country" in record and isinstance(record["country"], dict):
                        country = record["country"].get("country_code", "")
                    elif "locations" in record and len(record["locations"]) > 0:
                        loc = record["locations"][0]
                        if "geonames_details" in loc:
                            country = loc["geonames_details"].get("country_code", "")
                    elif "addresses" in record and len(record["addresses"]) > 0:
                        addr = record["addresses"][0]
                        country = addr.get("country_code", "")
                        
                    if name and urls:
                        universities.append({
                            "name": name,
                            "domains": urls,
                            "country": country
                        })
                        
        print(f"Found {len(universities)} universities. Saving to {output_file}...")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(universities, f, indent=2, ensure_ascii=False)
            
        print("Done!")

if __name__ == "__main__":
    fetch_and_process_ror_data()
