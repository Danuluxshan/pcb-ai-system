from pathlib import Path


class UnifiedDatasetValidator:

    IMAGE_EXTENSIONS = {
        ".jpg",
        ".jpeg",
        ".png",
        ".bmp"
    }

    def __init__(self, dataset_root: Path):

        self.dataset_root = dataset_root

    def count_split(self, split: str):

        image_dir = self.dataset_root / split / "images"
        label_dir = self.dataset_root / split / "labels"

        image_count = 0
        label_count = 0

        if image_dir.exists():

            for image in image_dir.iterdir():

                if image.suffix.lower() in self.IMAGE_EXTENSIONS:
                    image_count += 1

        if label_dir.exists():

            label_count = len(
                list(label_dir.glob("*.txt"))
            )

        return image_count, label_count

    def validate(self):

        print("\nUnified Dataset Validation")
        print("=" * 45)

        total_images = 0
        total_labels = 0

        for split in ["train", "valid", "test"]:

            images, labels = self.count_split(split)

            total_images += images
            total_labels += labels

            print(
                f"{split:<5} Images: {images:<6} Labels: {labels}"
            )

        print("=" * 45)

        print(f"Total Images : {total_images}")
        print(f"Total Labels : {total_labels}")

        print("=" * 45)

        if total_images == total_labels:

            print("Dataset Validation PASSED")

        else:

            print("Dataset Validation FAILED")