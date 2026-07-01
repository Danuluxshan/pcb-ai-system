import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml_training.scripts.dataset.loader import DatasetLoader
from ml_training.scripts.dataset.cleaner import DatasetCleaner

dataset_path = Path(r"E:\PCB_AI_DATASETS\PCB Components")

loader = DatasetLoader(dataset_path)
dataset = loader.load()

cleaner = DatasetCleaner(dataset)

# empty = cleaner.check_empty_labels()
# invalid_format = cleaner.check_invalid_label_format()
# invalid_class = cleaner.check_invalid_class_ids()
# missing = cleaner.check_missing_images()

# print("=" * 60)
# print("DATASET CLEANING REPORT")
# print("=" * 60)

# print(f"Empty Labels     : {len(empty)}")
# for file in empty:
#     print("   ", file)

# print()

# print(f"Invalid Format   : {len(invalid_format)}")
# for file in invalid_format:
#     print("   ", file)

# print()

# print(f"Invalid Class ID : {len(invalid_class)}")
# for file in invalid_class:
#     print("   ", file)

# print()

# print(f"Missing Images   : {len(missing)}")
# for file in missing:
#     print("   ", file)

# print("=" * 60)

# print("\nLabel Files Found:")
# print("-" * 50)

# for file in cleaner.get_label_files():
#     print(file)


# empty = cleaner.check_empty_labels()
# invalid_format = cleaner.check_invalid_label_format()
# invalid_class = cleaner.check_invalid_class_ids()
# missing = cleaner.check_missing_images()

# print("=" * 60)
# print("DATASET CLEANING REPORT")
# print("=" * 60)

# print(f"Empty Labels     : {len(empty)}")
# print(f"Invalid Format   : {len(invalid_format)}")
# print(f"Invalid Class ID : {len(invalid_class)}")
# print(f"Missing Images   : {len(missing)}")

# print("=" * 60)

# label = cleaner.get_label_files()[0]

# print("Label :", label)

# image_dir = Path(str(label.parent).replace("labels", "images"))
# image_name = label.stem

# print("Image Directory :", image_dir)
# print("Image Name :", image_name)

# expected_image = image_dir / f"{image_name}.jpg"

# print("Expected :", expected_image)
# print("Exists :", expected_image.exists())

# missing = cleaner.check_missing_images()

# print(len(missing))

# print()

# print(missing[:10])

# print("Images :", len(cleaner.get_image_files()))
# print("Labels :", len(cleaner.get_label_files()))

# print()

# print(cleaner.get_image_files()[:5])

missing = cleaner.check_missing_images()

print("\nMissing:", len(missing))