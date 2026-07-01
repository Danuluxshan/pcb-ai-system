from ultralytics import YOLO

model = YOLO("yolo11n.pt")

model.train(
    data=r"E:\PCB_AI_DATASETS\unified_components\data.yaml",
    epochs=100,
    imgsz=640,
    batch=16,
    workers=4,
    device=0,
    project="runs",
    name="component_detector"
)