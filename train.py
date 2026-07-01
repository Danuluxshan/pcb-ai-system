from ultralytics import YOLO

model = YOLO("yolo11n.pt")

model.train(
    data="data.yaml",
    epochs=100,
    imgsz=640,
    batch=16,          # T4 GPU-க்கு நல்ல starting value
    workers=2,
    device=0,
    project="runs",
    name="pcb_component_detector",
    patience=20,
    cache=True
)