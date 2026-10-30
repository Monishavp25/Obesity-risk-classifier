# Dataset

This project uses the **"Estimation of Obesity Levels Based On Eating Habits
and Physical Condition"** dataset (UCI Machine Learning Repository, ID 544).

- 2,111 records, 17 attributes (16 features + 1 target)
- People from Mexico, Peru and Colombia
- Target column: `NObeyesdad` — 7 classes:
  `Insufficient_Weight`, `Normal_Weight`, `Overweight_Level_I`,
  `Overweight_Level_II`, `Obesity_Type_I`, `Obesity_Type_II`, `Obesity_Type_III`

## Option A — easiest (recommended): use the `ucimlrepo` package

`train_model.py` already does this automatically the first time you run it —
it downloads the data straight from UCI and caches a local copy at
`backend/data/obesity_data.csv`. You need internet access and:

```bash
pip install ucimlrepo
```

No manual download needed — just run `train_model.py`.

## Option B — manual download

If you'd rather download it yourself (e.g. no internet on the training
machine, or you want to inspect it first):

1. Go to the UCI page: https://archive.ics.uci.edu/dataset/544
   (or search "Obesity Levels" on Kaggle — same dataset, filename
   `ObesityDataSet_raw_and_data_sinthetic.csv`)
2. Download `ObesityDataSet_raw_and_data_sinthetic.csv`
3. Rename it to `obesity_data.csv`
4. Place it in this folder: `backend/data/obesity_data.csv`

Either way, `train_model.py` will find it at
`backend/data/obesity_data.csv` and use it directly, skipping the download.

## Columns

| Column | Meaning | Type |
|---|---|---|
| Gender | Male / Female | categorical |
| Age | years | numeric |
| Height | meters | numeric |
| Weight | kg | numeric |
| family_history_with_overweight | yes/no | categorical |
| FAVC | frequent high-calorie food | yes/no |
| FCVC | vegetable consumption frequency | numeric (1-3) |
| NCP | number of main meals | numeric |
| CAEC | eating between meals | categorical |
| SMOKE | smokes | yes/no |
| CH2O | daily water intake (liters) | numeric |
| SCC | monitors calorie intake | yes/no |
| FAF | physical activity frequency | numeric |
| TUE | tech device usage time | numeric |
| CALC | alcohol consumption | categorical |
| MTRANS | usual transportation | categorical |
| NObeyesdad | **target** — obesity level | categorical (7 classes) |
