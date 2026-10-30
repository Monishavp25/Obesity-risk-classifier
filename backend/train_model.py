"""
train_model.py
---------------
Loads the obesity dataset, preprocesses it, trains a Random Forest
classifier, evaluates it, and saves everything the Flask API needs
(model, scaler, encoders, feature order) into backend/model/.

Run this once before starting app.py:
    python train_model.py
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "obesity_data.csv")
MODEL_DIR = os.path.join(BASE_DIR, "model")
os.makedirs(MODEL_DIR, exist_ok=True)

TARGET_COL = "NObeyesdad"
CATEGORICAL_COLS = [
    "Gender", "family_history_with_overweight", "FAVC",
    "CAEC", "SMOKE", "SCC", "CALC", "MTRANS",
]
NUMERIC_COLS = ["Age", "Height", "Weight", "FCVC", "NCP", "CH2O", "FAF", "TUE"]
FEATURE_COLS = CATEGORICAL_COLS + NUMERIC_COLS


def load_data() -> pd.DataFrame:
    """Load from local CSV if present, otherwise fetch from UCI and cache it."""
    if os.path.exists(DATA_PATH):
        print(f"Loading cached dataset from {DATA_PATH}")
        return pd.read_csv(DATA_PATH)

    print("No local CSV found — fetching dataset from UCI (ucimlrepo)...")
    try:
        from ucimlrepo import fetch_ucirepo
    except ImportError as exc:
        raise SystemExit(
            "Dataset not found locally and 'ucimlrepo' isn't installed.\n"
            "Either run: pip install ucimlrepo\n"
            "or manually download the CSV as described in data/README.md"
        ) from exc

    dataset = fetch_ucirepo(id=544)  # Estimation of Obesity Levels
    df = pd.concat([dataset.data.features, dataset.data.targets], axis=1)
    df.to_csv(DATA_PATH, index=False)
    print(f"Downloaded and cached dataset to {DATA_PATH}")
    return df


def main():
    df = load_data()
    df = df.dropna().drop_duplicates().reset_index(drop=True)
    print(f"Dataset shape: {df.shape}")
    print(df[TARGET_COL].value_counts())

    # --- Encode categorical feature columns ---
    encoders = {}
    for col in CATEGORICAL_COLS:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le

    # --- Encode target ---
    target_encoder = LabelEncoder()
    y = target_encoder.fit_transform(df[TARGET_COL].astype(str))

    X = df[FEATURE_COLS].copy()

    # --- Scale numeric columns ---
    scaler = StandardScaler()
    X[NUMERIC_COLS] = scaler.fit_transform(X[NUMERIC_COLS])

    # --- Train/test split ---
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # --- Train model ---
    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # --- Evaluate ---
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nTest accuracy: {acc:.4f}\n")
    print(classification_report(
        y_test, y_pred, target_names=target_encoder.classes_
    ))

    # --- Feature importance (nice to see) ---
    importances = pd.Series(model.feature_importances_, index=FEATURE_COLS)
    print("\nTop feature importances:")
    print(importances.sort_values(ascending=False).head(8))

    # --- Save everything the API needs ---
    joblib.dump(model, os.path.join(MODEL_DIR, "model.pkl"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
    joblib.dump(encoders, os.path.join(MODEL_DIR, "encoders.pkl"))
    joblib.dump(target_encoder, os.path.join(MODEL_DIR, "target_encoder.pkl"))
    joblib.dump(FEATURE_COLS, os.path.join(MODEL_DIR, "feature_columns.pkl"))
    joblib.dump(CATEGORICAL_COLS, os.path.join(MODEL_DIR, "categorical_columns.pkl"))
    joblib.dump(NUMERIC_COLS, os.path.join(MODEL_DIR, "numeric_columns.pkl"))

    print(f"\nSaved model + preprocessing artifacts to {MODEL_DIR}")


if __name__ == "__main__":
    main()
