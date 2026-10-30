"""
app.py
------
Flask API that serves the trained obesity-risk classifier.

Run:
    python app.py

Then POST to http://localhost:5000/predict with JSON body, e.g.:
{
  "Gender": "Male",
  "Age": 21,
  "Height": 1.75,
  "Weight": 78,
  "family_history_with_overweight": "yes",
  "FAVC": "yes",
  "FCVC": 2,
  "NCP": 3,
  "CAEC": "Sometimes",
  "SMOKE": "no",
  "CH2O": 2,
  "SCC": "no",
  "FAF": 1,
  "TUE": 1,
  "CALC": "Sometimes",
  "MTRANS": "Public_Transportation"
}
"""

import os
import joblib
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")

app = Flask(__name__)
CORS(app)  # allow the frontend (served from a different port/file) to call this API

# --- Load trained artifacts once, at startup ---
try:
    model = joblib.load(os.path.join(MODEL_DIR, "model.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
    encoders = joblib.load(os.path.join(MODEL_DIR, "encoders.pkl"))
    target_encoder = joblib.load(os.path.join(MODEL_DIR, "target_encoder.pkl"))
    FEATURE_COLS = joblib.load(os.path.join(MODEL_DIR, "feature_columns.pkl"))
    CATEGORICAL_COLS = joblib.load(os.path.join(MODEL_DIR, "categorical_columns.pkl"))
    NUMERIC_COLS = joblib.load(os.path.join(MODEL_DIR, "numeric_columns.pkl"))
    MODEL_READY = True
except FileNotFoundError:
    MODEL_READY = False
    print(
        "\n[WARNING] No trained model found in backend/model/.\n"
        "Run `python train_model.py` first, then restart this server.\n"
    )

# Friendly display labels for the 7 classes
LABEL_DISPLAY = {
    "Insufficient_Weight": "Insufficient Weight",
    "Normal_Weight": "Normal Weight",
    "Overweight_Level_I": "Overweight (Level I)",
    "Overweight_Level_II": "Overweight (Level II)",
    "Obesity_Type_I": "Obesity (Type I)",
    "Obesity_Type_II": "Obesity (Type II)",
    "Obesity_Type_III": "Obesity (Type III)",
}


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_ready": MODEL_READY})


@app.route("/predict", methods=["POST"])
def predict():
    if not MODEL_READY:
        return jsonify({
            "error": "Model not trained yet. Run 'python train_model.py' first."
        }), 503

    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Request body must be JSON."}), 400

    missing = [c for c in FEATURE_COLS if c not in payload]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    try:
        row = {}
        for col in CATEGORICAL_COLS:
            le = encoders[col]
            value = str(payload[col])
            if value not in le.classes_:
                return jsonify({
                    "error": f"Invalid value '{value}' for '{col}'. "
                             f"Expected one of: {list(le.classes_)}"
                }), 400
            row[col] = le.transform([value])[0]

        for col in NUMERIC_COLS:
            row[col] = float(payload[col])

        X = pd.DataFrame([row])[FEATURE_COLS]
        X[NUMERIC_COLS] = scaler.transform(X[NUMERIC_COLS])

        pred_idx = model.predict(X)[0]
        pred_label = target_encoder.inverse_transform([pred_idx])[0]

        probs = model.predict_proba(X)[0]
        prob_by_class = {
            target_encoder.classes_[i]: round(float(p), 4)
            for i, p in enumerate(probs)
        }
        prob_by_class = dict(
            sorted(prob_by_class.items(), key=lambda kv: kv[1], reverse=True)
        )

        return jsonify({
            "prediction": pred_label,
            "prediction_display": LABEL_DISPLAY.get(pred_label, pred_label),
            "confidence": round(float(max(probs)), 4),
            "probabilities": prob_by_class,
        })

    except (ValueError, TypeError) as exc:
        return jsonify({"error": f"Invalid input: {exc}"}), 400


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
